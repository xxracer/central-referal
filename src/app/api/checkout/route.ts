
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { checkRateLimit } from '@/lib/rate-limit';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia' as any,
});

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
        const { agency, name, email, promoCode } = body;

        // SECURITY: Hardcode the price to prevent client-side manipulation
        const price = 129.99;

        // 1. Verify Promo Code (if provided)
        let promotionCodeId = undefined;
        if (promoCode) {
            const codes = await stripe.promotionCodes.list({
                code: promoCode,
                active: true,
                limit: 1,
            });
            if (codes.data.length > 0) {
                promotionCodeId = codes.data[0].id;
            } else {
                return NextResponse.json({ error: `Invalid promotion code: ${promoCode}` }, { status: 400 });
            }
        }

        // 2. Create a Customer
        const customer = await stripe.customers.create({
            email,
            name,
            metadata: {
                agency,
            },
        });

        // 3. Create the Product and Price
        const product = await stripe.products.create({
            name: 'ReferralFlow Subscription for ' + agency,
        });

        const priceObject = await stripe.prices.create({
            unit_amount: Math.round(price * 100),
            currency: 'usd',
            recurring: { interval: 'month' },
            product: product.id,
        });

        // 4. Create a Subscription
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
        }

        const subscription = await stripe.subscriptions.create(subscriptionParams);

        const invoice = subscription.latest_invoice as Stripe.Invoice;
        const paymentIntent = (invoice as any).payment_intent as Stripe.PaymentIntent;

        return NextResponse.json({
            subscriptionId: subscription.id,
            clientSecret: paymentIntent.client_secret,
            discountApplied: !!promotionCodeId,
            total: invoice.total
        });
    } catch (err: any) {
        console.error('Error creating subscription:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
