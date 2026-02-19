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

        const limitResult = await checkRateLimit(ip, 'checkout_attempt', { intervalSeconds: 60 * 60, maxRequests: 20 });
        if (!limitResult.success) {
            return NextResponse.json({ error: `Too many attempts. Try again in ${limitResult.reset || 60} seconds.` }, { status: 429 });
        }

        const body = await request.json();
        const { name, email, planType, legalConsent } = body;

        if (!legalConsent) {
            return NextResponse.json({ error: 'Legal consent is required.' }, { status: 400 });
        }

        // SKIP STRIPE IN DEVELOPMENT
        if (process.env.NODE_ENV === 'development') {
            console.log("Dev environment detected: Skipping Stripe Checkout");
            return NextResponse.json({
                url: `${request.headers.get('origin')}/setup/agency?session_id=mock_session_dev&email=${encodeURIComponent(email)}&bypass=true`
            });
        }

        let priceId = process.env.STRIPE_PRICE_ID_MONTHLY;
        if (planType === 'annual') {
            priceId = process.env.STRIPE_PRICE_ID_ANNUAL;
        }

        if (!priceId) {
            throw new Error("Server configuration error: Missing Price IDs.");
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer_email: email,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            // Allow promotion codes in Stripe Hosted Checkout
            allow_promotion_codes: true,
            success_url: `${request.headers.get('origin')}/setup/agency?session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(email)}`,
            cancel_url: `${request.headers.get('origin')}/subscribe?canceled=true`,
            metadata: {
                // We'll use this in the webhook to know it's a new subscription
                email: email,
                name: name,
                pendingSetup: 'true',
                legal_consent_ip: ip,
                legal_consent_time: new Date().toISOString()
            }
        });

        return NextResponse.json({ url: session.url });

    } catch (err: any) {
        console.error('Error creating checkout session:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
