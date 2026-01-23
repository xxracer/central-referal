'use server';

import { adminDb } from '@/lib/firebase-admin';
import { AgencySettings } from '@/lib/types';
import { revalidatePath } from 'next/cache';

const SETTINGS_COLLECTION = 'agencySettings';

export async function getAllAgencies(): Promise<AgencySettings[]> {
    try {
        const snapshot = await adminDb.collection(SETTINGS_COLLECTION).get();
        return snapshot.docs.map(doc => {
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
    } catch (error) {
        console.error('Error fetching agencies:', error);
        return [];
    }
}

export async function toggleAgencyStatus(agencyId: string, currentStatus: string): Promise<{ success: boolean; message: string }> {
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
    try {
        const updateData: any = {};
        if (data.endDate) updateData['subscription.endDate'] = new Date(data.endDate);
        if (data.plan) updateData['subscription.plan'] = data.plan;
        if (data.status) updateData['subscription.status'] = data.status;
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
export async function deleteAgency(agencyId: string): Promise<{ success: boolean; message: string }> {
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
