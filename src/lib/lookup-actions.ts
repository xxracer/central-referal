'use server';

import { adminDb } from '@/lib/firebase-admin';
import { checkRateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';
import { normalizeName } from '@/lib/utils';
import type { Referral, ReferralStatus } from '@/lib/types';

// The mask function from the other file is client-side or tied to that component. Let's redefine it here cleanly.
function maskName(name: string): string {
    if (!name) return 'Unknown';
    const parts = name.trim().split(/\s+/);
    return parts.map(part => {
        if (part.length <= 2) return part;
        return part.substring(0, 2) + '*'.repeat(Math.max(2, part.length - 2));
    }).join(' ');
}

export type LookupState = {
    message: string;
    success: boolean;
    data?: {
        id: string;
        maskedName: string;
        status: ReferralStatus;
        createdAt: string;
    } | null;
};

export async function lookupReferralAction(prevState: LookupState, formData: FormData): Promise<LookupState> {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || 'unknown-ip';

    const lastName = formData.get('lastName') as string;
    const dob = formData.get('dob') as string;
    const email = formData.get('email') as string;

    if (!lastName || !dob) {
        return { success: false, message: 'Patient Name and Date of Birth are required.' };
    }

    // 1. Rate Limiting (20 requests per hour per IP)
    const rateLimitRes = await checkRateLimit(ip, 'lookup_referral', { intervalSeconds: 3600, maxRequests: 20 });
    if (!rateLimitRes.success) {
        return { success: false, message: `Too many attempts. Please try again later.` };
    }

    // 2. Query Firestore
    try {
        const normalizedEmail = email ? email.toLowerCase().trim() : null;
        const normalizedLastName = lastName.toLowerCase().trim();

        // Audit log entry
        adminDb.collection('lookup_logs').add({
            ip: ip,
            email: normalizedEmail || 'not-provided',
            lastNameSearch: normalizedLastName,
            timestamp: new Date()
        }).catch(e => console.error("Failed to write lookup_logs:", e));

        let query: FirebaseFirestore.Query = adminDb.collection('referrals').where('patientDOB', '==', dob);

        if (normalizedEmail) {
            query = query.where('referrerEmail', '==', normalizedEmail);
        }
        const snapshot = await query.get();

        if (snapshot.empty) {
            return { success: false, message: 'No matching referral found.' };
        }

        let matchedReferral: any = null;
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const fullNormalizedName = normalizeName(data.patientName || '');
            // User can input first or last name, check if any part contains the search string
            if (fullNormalizedName.includes(normalizedLastName)) {
                matchedReferral = data;
                break;
            }
        }

        if (!matchedReferral) {
            return { success: false, message: 'No matching referral found.' };
        }

        let createdStr = 'Unknown';
        if (matchedReferral.createdAt) {
            const d = matchedReferral.createdAt.toDate ? matchedReferral.createdAt.toDate() : new Date(matchedReferral.createdAt);
            createdStr = d.toLocaleDateString();
        }

        return {
            success: true,
            message: 'Referral found.',
            data: {
                id: matchedReferral.id,
                maskedName: maskName(matchedReferral.patientName),
                status: matchedReferral.status,
                createdAt: createdStr
            }
        };

    } catch (error) {
        console.error('Lookup error:', error);
        return { success: false, message: 'An error occurred during lookup.' };
    }
}
