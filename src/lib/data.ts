
'use server';
import { adminDb } from '@/lib/firebase-admin';
import type { Referral } from '@/lib/types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

// Helper to get db instance (consistent with previous code style, though direct export is fine)
function getDb() {
    return adminDb;
}


// Converts Firestore Timestamps to JS Date objects recursively
function convertTimestampsToDates(obj: any): any {
    if (obj instanceof Timestamp) {
        return obj.toDate();
    }
    if (Array.isArray(obj)) {
        return obj.map(convertTimestampsToDates);
    }
    if (obj !== null && typeof obj === 'object') {
        const newObj: { [key: string]: any } = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                newObj[key] = convertTimestampsToDates(obj[key]);
            }
        }
        return newObj;
    }
    return obj;
}


export async function getReferrals(): Promise<Referral[]> {
    const firestore = getDb();
    const snapshot = await firestore.collection('referrals')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
    if (snapshot.empty) {
        return [];
    }
    return snapshot.docs.map(d => {
        const data = convertTimestampsToDates(d.data());
        // Migration logic for old notes
        if (data.internalNotes) {
            data.internalNotes = data.internalNotes.map((n: any) => {
                if (typeof n.author === 'string') {
                    return { ...n, author: { name: n.author, email: '', role: 'STAFF' } };
                }
                return n;
            });
        }
        // Migration logic for agencyId
        if (!data.agencyId) data.agencyId = 'default';

        return data as Referral;
    });
}

export async function getReferralById(id: string): Promise<Referral | undefined> {
    const firestore = getDb();
    if (!id) return undefined;
    const docRef = firestore.collection('referrals').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
        return undefined;
    }

    const data = convertTimestampsToDates(docSnap.data());
    // Migration logic
    if (data.internalNotes) {
        data.internalNotes = data.internalNotes.map((n: any) => {
            if (typeof n.author === 'string') {
                return { ...n, author: { name: n.author, email: '', role: 'STAFF' } };
            }
            return n;
        });
    }
    if (!data.agencyId) data.agencyId = 'default';

    return data as Referral;
}

export async function saveReferral(referral: Referral): Promise<Referral> {
    const firestore = getDb();
    const docRef = firestore.collection('referrals').doc(referral.id);

    // Ensure all Date objects are correctly converted to Timestamps before saving
    const dataToSave: any = { // Use 'any' to allow for dynamic property deletion
        ...referral,
        createdAt: Timestamp.fromDate(referral.createdAt),
        updatedAt: Timestamp.fromDate(referral.updatedAt),
        statusHistory: referral.statusHistory.map(h => ({
            ...h,
            changedAt: Timestamp.fromDate(h.changedAt),
        })),
        internalNotes: referral.internalNotes.map(n => ({
            ...n,
            createdAt: Timestamp.fromDate(n.createdAt),
        })),
        externalNotes: (referral.externalNotes || []).map(n => ({
            ...n,
            createdAt: Timestamp.fromDate(n.createdAt),
        })),
    };

    if (dataToSave.surgeryDate && typeof dataToSave.surgeryDate === 'string' && dataToSave.surgeryDate.trim() !== '') {
        dataToSave.surgeryDate = Timestamp.fromDate(new Date(dataToSave.surgeryDate));
    } else {
        // Explicitly delete if empty or invalid to avoid sending bad data to Firestore
        delete dataToSave.surgeryDate;
    }

    await docRef.set(dataToSave, { merge: true });
    return referral;
}

export async function findReferral(id: string): Promise<Referral | undefined> {
    const firestore = getDb();
    if (!id) return undefined;
    const docRef = firestore.collection('referrals').doc(id);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
        const data = convertTimestampsToDates(docSnap.data());
        if (data.internalNotes) {
            data.internalNotes = data.internalNotes.map((n: any) => {
                if (typeof n.author === 'string') {
                    return { ...n, author: { name: n.author, email: '', role: 'STAFF' } };
                }
                return n;
            });
        }
        if (!data.agencyId) data.agencyId = 'default';
        return data as Referral;
    }

    return undefined;
}
