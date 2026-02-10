import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { checkRateLimit } from '@/lib/rate-limit';
import { createAgencySettings } from '@/lib/settings';
import { sendReferralNotification } from '@/lib/email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia' as any,
});

const slugify = (text: string) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')     // Replace spaces with -
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-');  // Replace multiple - with single -
};

export async function POST(request: Request) {
    try {
        // RATE LIMITING
        const forwardedFor = request.headers.get('x-forwarded-for');
        const ip = forwardedFor ? forwardedFor.split(',')[0] : '127.0.0.1';

        const limitResult = await checkRateLimit(ip, 'checkout_attempt', { intervalSeconds: 60 * 60, maxRequests: 5 });
        if (!limitResult.success) {
            return NextResponse.json({ error: `Too many attempts. Try again in ${limitResult.reset || 60} seconds.` }, { status: 429 });
        }

        const body = await request.json();
        const { name, email, promoCode, planType } = body;

        // SECURITY: Server-side pricing
        let price = 149.99;
        let interval: 'month' | 'year' = 'month';
        let productName = 'ReferralFlow Subscription (Monthly)';

        if (planType === 'annual') {
            price = 1559.88; // $129.99 * 12
            interval = 'year';
            productName = 'ReferralFlow Subscription (Annual)';
        }

        // 1. Verify Promo Code (if provided)
        let promotionCodeId = undefined;
        let couponId = undefined;

        if (promoCode) {
            // A. Try as a customer-facing Promotion Code
            const codes = await stripe.promotionCodes.list({
                code: promoCode,
                active: true,
                limit: 1,
            });

            if (codes.data.length > 0) {
                promotionCodeId = codes.data[0].id;
            } else {
                // B. Fallback: Try as a direct Coupon Name/ID
                // Many users confuse "Coupon Name" with "Promotion Code".
                try {
                    // Search for a coupon with this NAME (Stripe API doesn't have search by name easily, so we might need to assume ID match or list all)
                    // But actually, often people assume the ID is the Code. Let's try retrieving by ID equal to the code.
                    const coupon = await stripe.coupons.retrieve(promoCode);
                    if (coupon && coupon.valid) {
                        couponId = coupon.id;
                    } else {
                        console.log(`Coupon '${promoCode}' not found or invalid.`);
                        throw new Error("Invalid coupon");
                    }
                } catch (e) {
                    console.error("Stripe Lookup Error:", e);
                    return NextResponse.json({ error: `Invalid promotion code or coupon: ${promoCode}` }, { status: 400 });
                }
            }
        }

        // 3. Create a Customer (Stripe)
        // No agency metadata yet -- deferred to setup
        const customer = await stripe.customers.create({
            email,
            name,
            metadata: {
                // We'll update this later in /api/agency/setup
                pendingSetup: 'true'
            },
        });

        // 4. Create the Product and Price
        const product = await stripe.products.create({
            name: `${productName} (Pending Setup)`,
        });

        const priceObject = await stripe.prices.create({
            unit_amount: Math.round(price * 100),
            currency: 'usd',
            recurring: { interval: interval },
            product: product.id,
        });

        // 5. Create a Subscription
        const subscriptionParams: any = {
            customer: customer.id,
            items: [
                {
                    price: priceObject.id,
                },
            ],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
        };

        if (promotionCodeId) {
            subscriptionParams.promotion_code = promotionCodeId;
        } else if (couponId) {
            subscriptionParams.coupon = couponId;
        }

        const subscription = await stripe.subscriptions.create(subscriptionParams);

        const invoice = subscription.latest_invoice as Stripe.Invoice;

        // CHECK: If Free, we used to create agency here. NOW WE DO NOT.
        // We just return success and let client redirect to /setup/agency.
        const paymentIntent = (invoice as any).payment_intent as Stripe.PaymentIntent | null;

        return NextResponse.json({
            subscriptionId: subscription.id,
            clientSecret: paymentIntent ? paymentIntent.client_secret : null,
            discountApplied: !!promotionCodeId,
            total: invoice.total,
            promoCode: promotionCodeId || couponId ? promoCode : undefined,
            isFree: invoice.total === 0 || !paymentIntent
        });
    } catch (err: any) {
        console.error('Error creating subscription:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
