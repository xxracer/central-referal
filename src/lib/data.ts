
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


export async function getReferrals(agencyId: string, filters?: { search?: string; startDate?: Date; endDate?: Date; isArchived?: boolean }): Promise<Referral[]> {
    const firestore = getDb();

    // Security: Filter by Agency ID at the query level
    // Note: We need a composite index for 'agencyId' + 'createdAt' to order by createdAt properly.
    // If index is missing, we can filter in memory for now but 'where' is essential.
    const snapshot = await firestore.collection('referrals')
        .where('agencyId', '==', agencyId)
        .orderBy('createdAt', 'desc')
        .limit(500)
        .get();

    if (snapshot.empty) {
        return [];
    }

    let referrals = snapshot.docs.map((d: any) => {
        const data = convertTimestampsToDates(d.data());
        // Migration logic for old notes
        if (data.internalNotes) {
            data.internalNotes = data.internalNotes.map((n: any) => {
                const note = { ...n };
                if (typeof note.author === 'string') {
                    note.author = { name: note.author, email: '', role: 'STAFF' };
                }
                note.createdAt = note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt);
                return note;
            });
        }
        if (data.externalNotes) {
            data.externalNotes = data.externalNotes.map((n: any) => ({
                ...n,
                createdAt: n.createdAt instanceof Date ? n.createdAt : new Date(n.createdAt)
            }));
        }

        return { ...data, id: d.id } as Referral;
    });

    // 1. Archive Filter (Handles legacy data where isArchived is undefined)
    if (filters?.isArchived !== undefined) {
        referrals = referrals.filter(r => (r.isArchived || false) === filters.isArchived);
    } else {
        // Default to showing only non-archived (including legacy docs)
        referrals = referrals.filter(r => !r.isArchived);
    }

    // 2. Date Filters
    if (filters?.startDate) {
        const start = filters.startDate;
        referrals = referrals.filter(r => r.createdAt >= start);
    }
    if (filters?.endDate) {
        const end = filters.endDate;
        referrals = referrals.filter(r => r.createdAt <= end);
    }

    // 3. Search
    if (filters?.search) {
        const q = filters.search.toLowerCase();
        referrals = referrals.filter(r =>
            r.patientName.toLowerCase().includes(q) ||
            r.id.toLowerCase().includes(q) ||
            r.referrerName.toLowerCase().includes(q)
        );
    }

    return referrals;
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

export async function toggleArchiveReferral(id: string, isArchived: boolean): Promise<boolean> {
    const firestore = getDb();
    try {
        await firestore.collection('referrals').doc(id).update({
            isArchived,
            updatedAt: Timestamp.now()
        });
        return true;
    } catch (e) {
        console.error("Error toggling archive:", e);
        return false;
    }
}

export async function markReferralAsSeen(id: string): Promise<void> {
    const firestore = getDb();
    try {
        await firestore.collection('referrals').doc(id).update({
            isSeen: true
        });
    } catch (e) {
        console.error("Error marking as seen:", e);
    }
}

export async function getUnseenReferralCount(agencyId: string): Promise<number> {
    const firestore = getDb();
    try {
        // Query for potentially unseen items for specific agency
        const snapshot = await firestore.collection('referrals')
            .where('agencyId', '==', agencyId)
            .where('isSeen', '==', false)
            .get();

        // Filter in memory for isArchived just to be safe about composite indexes again
        const count = snapshot.docs.filter(d => {
            const data = d.data();
            return data.isArchived !== true;
        }).length;

        return count;
    } catch (e) {
        console.error("Error counting unseen referrals:", e);
        return 0;
    }
}
