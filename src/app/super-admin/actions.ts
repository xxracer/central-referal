'use server';

import { adminDb } from '@/lib/firebase-admin';
import { AgencySettings } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { getReferralCount } from '@/lib/data';

const SETTINGS_COLLECTION = 'agencySettings';

export async function getAllAgencies(): Promise<(AgencySettings & { referralCount: number })[]> {
    const { verifyAdmin } = await import('@/lib/auth-checks');
    await verifyAdmin();
    try {
        const snapshot = await adminDb.collection(SETTINGS_COLLECTION).get();

        const agencies = snapshot.docs.map(doc => {
            const data = doc.data() as any;

            // Basic data conversion (similar to settings.ts)
            const convert = (obj: any): any => {
                if (!obj) return obj;
                if (obj.toDate && typeof obj.toDate === 'function') return obj.toDate();
                if (Array.isArray(obj)) return obj.map(convert);
                if (typeof obj === 'object') {
                    return Object.fromEntries(
                        Object.entries(obj).map(([k, v]) => [k, convert(v)])
                    );
                }
                return obj;
            };

            const converted = convert(data);

            return {
                ...converted,
                id: doc.id,
                subscription: converted.subscription || { plan: 'FREE', status: 'ACTIVE' }
            } as AgencySettings;
        });

        // Fetch counts in parallel
        const agenciesWithCounts = await Promise.all(agencies.map(async (agency) => {
            const count = await getReferralCount(agency.id);
            return { ...agency, referralCount: count };
        }));

        return agenciesWithCounts;
    } catch (error) {
        console.error('Error fetching agencies:', error);
        return [];
    }
}

export async function toggleAgencyStatus(agencyId: string, currentStatus: string): Promise<{ success: boolean; message: string }> {
    const { verifyAdmin } = await import('@/lib/auth-checks');
    await verifyAdmin();
    try {
        const newStatus = currentStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
        await adminDb.collection(SETTINGS_COLLECTION).doc(agencyId).update({
            'subscription.status': newStatus,
            'subscription.updatedAt': new Date()
        });

        revalidatePath('/super-admin');
        revalidatePath('/'); // To update landing if needed

        // Send Activation Email if activating
        if (newStatus === 'ACTIVE') {
            const { getAgencySettings } = await import('@/lib/settings');
            const { sendReferralNotification } = await import('@/lib/email');

            const agency = await getAgencySettings(agencyId);
            const userEmail = agency.companyProfile.email;
            // Logic to find login link based on slug
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://referralflow.health';
            // If they have a custom slug, subdomains might be tricky locally vs prod, but we can direct them to main login or their sub.
            // Using standard login for now.
            const loginUrl = `${baseUrl}/login`;
            const portalUrl = agency.slug
                ? (agency.slug.includes('.') ? `http://${agency.slug}` : `http://${agency.slug}.referralflow.health`)
                : baseUrl;

            sendReferralNotification(agencyId, 'AGENCY_ACTIVATED', {
                firstName: agency.companyProfile.name, // Or a specific user name if we had it
                referralLink: portalUrl,
                loginUrl: loginUrl,
                recipientOverride: userEmail
            }).catch(e => console.error("Failed to send activation email", e));
        }

        return { success: true, message: `Agency ${agencyId} is now ${newStatus}` };
    } catch (error) {
        console.error('Error toggling agency status:', error);
        return { success: false, message: 'Failed to update agency status' };
    }
}

export async function updateAgencySubscription(
    agencyId: string,
    data: { endDate?: string; plan?: string; status?: string; slug?: string }
): Promise<{ success: boolean; message: string }> {
    const { verifyAdmin } = await import('@/lib/auth-checks');
    await verifyAdmin();
    try {
        const updateData: any = {};
        if (data.endDate) updateData['subscription.endDate'] = new Date(data.endDate);
        if (data.plan) updateData['subscription.plan'] = data.plan;
        if (data.status) {
            updateData['subscription.status'] = data.status;

            // Send email if status is being set to ACTIVE
            if (data.status === 'ACTIVE') {
                const { getAgencySettings } = await import('@/lib/settings');
                const { sendReferralNotification } = await import('@/lib/email');

                const agency = await getAgencySettings(agencyId);
                const userEmail = agency.companyProfile.email;
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://referralflow.health';
                const loginUrl = `${baseUrl}/login`;
                const portalUrl = data.slug
                    ? (data.slug.includes('.') ? `http://${data.slug}` : `http://${data.slug}.referralflow.health`)
                    : (agency.slug ? (agency.slug.includes('.') ? `http://${agency.slug}` : `http://${agency.slug}.referralflow.health`) : baseUrl);

                // Fire and forget email
                sendReferralNotification(agencyId, 'AGENCY_ACTIVATED', {
                    firstName: agency.companyProfile.name,
                    referralLink: portalUrl,
                    loginUrl: loginUrl,
                    recipientOverride: userEmail
                }).catch(e => console.error("Failed to send activation email during subscription update", e));
            }
        }
        if (data.slug) updateData['slug'] = data.slug.toLowerCase().replace(/[^a-z0-9-]/g, '');

        updateData['subscription.updatedAt'] = new Date();

        await adminDb.collection(SETTINGS_COLLECTION).doc(agencyId).update(updateData);

        revalidatePath('/super-admin');
        return { success: true, message: 'Subscription updated successfully' };
    } catch (error) {
        console.error('Error updating subscription:', error);
        return { success: false, message: 'Failed to update subscription' };
    }
}

export async function sendActivationEmail(agencyId: string): Promise<{ success: boolean; message: string }> {
    const { verifyAdmin } = await import('@/lib/auth-checks');
    await verifyAdmin();
    try {
        const { getAgencySettings } = await import('@/lib/settings');
        const { sendReferralNotification } = await import('@/lib/email');

        const agency = await getAgencySettings(agencyId);

        if (!agency.exists) {
            return { success: false, message: 'Agency not found' };
        }

        const userEmail = agency.companyProfile.email;
        if (!userEmail) {
            return { success: false, message: 'Agency has no email address' };
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://referralflow.health';
        const loginUrl = `${baseUrl}/login`;
        const portalUrl = agency.slug
            ? (agency.slug.includes('.') ? `http://${agency.slug}` : `http://${agency.slug}.referralflow.health`)
            : baseUrl;

        await sendReferralNotification(agencyId, 'AGENCY_ACTIVATED', {
            firstName: agency.companyProfile.name,
            referralLink: portalUrl,
            loginUrl: loginUrl,
            recipientOverride: userEmail
        });

        return { success: true, message: `Activation email sent to ${userEmail}` };
    } catch (error: any) {
        console.error('Error sending activation email:', error);
        return { success: false, message: 'Failed to send email: ' + error.message };
    }
}

export async function deleteAgency(agencyId: string): Promise<{ success: boolean; message: string }> {
    const { verifyAdmin } = await import('@/lib/auth-checks');
    await verifyAdmin();
    try {
        // 1. Delete Agency Settings
        await adminDb.collection(SETTINGS_COLLECTION).doc(agencyId).delete();

        // 2. Delete All Referrals associated with this agency
        // Note: Firestore requires deleting documents individually.
        const referralsRef = adminDb.collection('referrals');
        const snapshot = await referralsRef.where('agencyId', '==', agencyId).get();

        if (!snapshot.empty) {
            let batch = adminDb.batch();
            let opCount = 0;

            for (const doc of snapshot.docs) {
                batch.delete(doc.ref);
                opCount++;

                // Commit batches of 400 (safe limit)
                if (opCount >= 400) {
                    await batch.commit();
                    batch = adminDb.batch(); // Create new batch
                    opCount = 0;
                }
            }
            if (opCount > 0) {
                await batch.commit();
            }
        }

        revalidatePath('/super-admin');
        return { success: true, message: 'Agency and all data deleted successfully' };
    } catch (error) {
        console.error('Error deleting agency:', error);
        return { success: false, message: 'Failed to delete agency' };
    }
}
