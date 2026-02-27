'use server';

import { verifySession } from '@/lib/auth-actions';
import { getAgencySettings } from '@/lib/settings';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia' as any,
});

export type SubscriptionDetails = {
    status: string;
    planAmount: number;
    currency: string;
    currentPeriodEnd: Date;
    interval: string;
    cancelAtPeriodEnd: boolean;
};

/**
 * Fetches real-time billing and subscription details from Stripe
 * based on the current agency's customerId.
 */
export async function getAgencySubscriptionDetails(): Promise<{ success: boolean; data?: SubscriptionDetails; error?: string }> {
    const user = await verifySession();
    if (!user) throw new Error('Unauthorized');

    try {
        const agency = await getAgencySettings(user.agencyId);

        // Ensure there is a Stripe Customer ID loaded
        const customerId = agency?.subscription?.customerId;
        if (!customerId) {
            return { success: false, error: 'No billing account linked to this agency.' };
        }

        // Fetch subscriptions for this customer
        const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active', // Only bring active ones
            limit: 1,
            expand: ['data.default_payment_method']
        });

        if (subscriptions.data.length === 0) {
            // Check if they are past due or another status
            const allSubs = await stripe.subscriptions.list({ customer: customerId, limit: 1 });
            if (allSubs.data.length > 0) {
                const sub = allSubs.data[0] as Stripe.Subscription;
                const price = sub.items.data[0].price as Stripe.Price;
                return {
                    success: true,
                    data: {
                        status: sub.status,
                        planAmount: price?.unit_amount || 0,
                        currency: price?.currency || 'usd',
                        currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
                        interval: price?.recurring?.interval || 'month',
                        cancelAtPeriodEnd: sub.cancel_at_period_end
                    }
                };
            }
            return { success: false, error: 'No active subscriptions found.' };
        }

        const sub = subscriptions.data[0] as Stripe.Subscription;
        const price = sub.items.data[0].price as Stripe.Price;

        return {
            success: true,
            data: {
                status: sub.status, // "active", "past_due", etc.
                planAmount: price?.unit_amount || 0, // Stripe uses cents
                currency: price?.currency || 'usd',
                currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
                interval: price?.recurring?.interval || 'month',
                cancelAtPeriodEnd: sub.cancel_at_period_end
            }
        };

    } catch (e: any) {
        console.error("Error fetching Stripe subscription:", e);
        return { success: false, error: 'An error occurred fetching your billing data.' };
    }
}

/**
 * Triggers an email to support staff requesting a refund. 
 * Does not process the refund immediately for security reasons.
 */
export async function requestRefundAction(reason: string): Promise<{ success: boolean; message: string }> {
    const user = await verifySession();
    if (!user) throw new Error('Unauthorized');

    if (!reason || reason.trim().length === 0) {
        return { success: false, message: 'Please provide a reason for the refund.' };
    }

    try {
        const agency = await getAgencySettings(user.agencyId);
        const customerId = agency?.subscription?.customerId || 'N/A';
        const userEmail = user.email || 'Unknown';

        // Use the existing email utility to send to admins
        const { sendReferralNotification } = await import('@/lib/email');

        // Here we send an email to the platform owners. We'll use the platform support email or the admin themselves.
        await sendReferralNotification('hello@thecocohodo.com', 'REFUND_REQUEST', {
            patientName: `Refund Request from Agency: ${user.agencyId}`, // Overloading variable names slightly for template compat
            agencyId: user.agencyId,
            status: 'NEW',
            dateTime: new Date().toISOString(),
            notes: `Customer ID: ${customerId}\nUser Email: ${userEmail}\n\nReason given:\n"${reason}"`
        });

        return { success: true, message: 'Your refund request has been sent to support. We will review it shortly.' };

    } catch (e: any) {
        console.error("Error requesting refund:", e);
        return { success: false, message: 'An error occurred while sending your request. Please try again or contact support directly.' };
    }
}
