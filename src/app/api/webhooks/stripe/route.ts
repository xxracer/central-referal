
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

            const agencyName = customer.metadata?.agency;
            const agencyId = customer.metadata?.agencyId; // We added this in checkout route
            const email = customer.email;

            if (agencyName && email && agencyId) {
                console.log(`Processing successful payment for ${agencyName} (${agencyId})`);

                // 1. Create Agency Settings (Idempotent-ish via set)
                await createAgencySettings(agencyId, {
                    companyProfile: {
                        name: agencyName,
                        email: email,
                        phone: '',
                        fax: '',
                        homeInsurances: []
                    },
                    subscription: {
                        plan: 'PRO',
                        status: 'ACTIVE'
                    },
                    notifications: {
                        emailRecipients: [email],
                        enabledTypes: ['NEW_REFERRAL', 'STATUS_UPDATE'],
                        staff: [],
                        primaryAdminEmail: email
                    },
                    userAccess: {
                        authorizedEmails: [email],
                        authorizedDomains: []
                    }
                });

                // 2. Send Welcome Email
                await sendReferralNotification(agencyId, 'WELCOME_AGENCY', {
                    firstName: invoice.customer_name?.split(' ')[0] || 'Partner',
                    loginUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard/settings`,
                    referralLink: `${agencyId}.referralflow.health`
                }, email); // FIX: Pass recipient

                // ALERT OWNER (maijelcancines2@gmail.com)
                await sendReferralNotification(agencyId, 'WELCOME_ADMIN_ALERT', {
                    recipientOverride: 'maijelcancines2@gmail.com',
                    referralLink: agencyId,
                    patientName: customer.phone || 'N/A'
                }, 'maijelcancines2@gmail.com');

                console.log(`Agency created and welcome email sent for ${agencyId}`);
            } else {
                console.error("Missing metadata on customer for webhook processing", { agencyName, agencyId, email });
            }
        }
    } catch (error) {
        console.error("Webhook processing error:", error);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
