
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAgencySettings } from '@/lib/settings';
import { sendReferralNotification } from '@/lib/email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia' as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const slugify = (text: string) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
};

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
        if (!webhookSecret) {
            // If no secret, we can't verify signature. 
            // In dev without CLI, this might block testing if we enforce it.
            // But for production safety, we must enforce.
            console.warn("STRIPE_WEBHOOK_SECRET is missing.");
            throw new Error("Missing STRIPE_WEBHOOK_SECRET");
        }
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed.`, err.message);
        return NextResponse.json({ error: err.message }, { status: 400 });
    }

    try {
        if (event.type === 'invoice.payment_succeeded') {
            const invoice = event.data.object as Stripe.Invoice;

            // We need metadata. Often it's on the Subscription or Customer.
            // Invoice -> Subscription -> Metadata?
            // Or Invoice -> Customer -> Metadata?
            // In checkout/route.ts we saved metadata to Customer.

            const customerId = invoice.customer as string;
            const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;

            if (customer.deleted) {
                console.error("Customer deleted, cannot process webhook");
                return NextResponse.json({ received: true });
            }

            if (customer.email) {
                console.log(`Payment succeeded for ${customer.email}. Waiting for user to complete setup at /setup/agency`);
                // Ideally send email: "Click here to set up your workspace"
                // For now, we rely on the redirect from Checkout to /setup/agency.
            } else {
                console.warn("Payment succeeded but no email on customer.", invoice.id);
            }
        }
    } catch (error) {
        console.error("Webhook processing error:", error);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
