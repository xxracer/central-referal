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
