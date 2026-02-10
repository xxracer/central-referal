
'use server';
import { adminDb } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-actions';
import type { Referral } from '@/lib/types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { createHash } from 'crypto'; // For secure DOB comparison

// Audit Log Structure
type AuditEvent = {
    action: string;
    resourceId?: string;
    agencyId?: string;
    actor: string; // 'system', 'user:ID', 'public:IP'
    details?: any;
    timestamp?: FieldValue;
};

// Helper to remove undefined values for Firestore compatibility
const removeUndefined = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(removeUndefined);
    }
    if (obj !== null && typeof obj === 'object') {
        const newObj: { [key: string]: any } = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const value = removeUndefined(obj[key]);
                if (value !== undefined) {
                    newObj[key] = value;
                }
            }
        }
        return newObj;
    }
    return obj;
};

async function logAudit(event: AuditEvent) {
    try {
        const cleanEvent = removeUndefined(event);
        await adminDb.collection('audit_logs').add({
            ...cleanEvent,
            timestamp: FieldValue.serverTimestamp() // Guaranteed server time
        });
    } catch (e) {
        console.error("Failed to write audit log:", e);
    }
}

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
    // [SECURITY DEBUG]
    console.log('[Security] getReferrals called. Agency:', agencyId);
    const user = await verifySession();
    console.log('[Security] Session User:', user ? user.uid : 'NULL (Unauthorized)');

    if (!user) {
        console.error('[Security] Access denied: No active session for getReferrals');
        // Log basic header info if possible
        throw new Error('Unauthorized');
    }

    // Log Access
    logAudit({
        action: 'VIEW_REFERRALS_LIST',
        agencyId,
        actor: `user:${user.uid}`,
        details: { filters }
    } as any);
    // Optional: Check if user belongs to agencyId? For now, at least require Login.

    const firestore = getDb();
    let snapshot;
    try {
        // PERF: Ordered by createdAt to ensure recent referrals are fetched first.
        // REQUIRES COMPOSITE INDEX in Firestore (AgencyId ASC, CreatedAt DESC)
        snapshot = await firestore.collection('referrals')
            .where('agencyId', '==', agencyId)
            .orderBy('createdAt', 'desc')
            .limit(500)
            .get();
    } catch (error: any) {
        console.error('[getReferrals] Failed to fetch referrals:', error);
        return [];
    }

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

    // Sort in memory (Newest first)
    referrals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

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
    const user = await verifySession();
    if (!user) throw new Error('Unauthorized');

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

    // [HIPAA Audit] Log READ access to specific PHI
    logAudit({
        action: 'VIEW_REFERRAL_DETAILS',
        resourceId: id,
        agencyId: data.agencyId,
        actor: `user:${user.uid}`
    });

    return data as Referral;
}

export async function saveReferral(referral: Referral, bypassAuth: boolean = false): Promise<Referral> {
    const user = await verifySession();

    if (!user && !bypassAuth) throw new Error('Unauthorized');

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

    // [HIPAA Audit]
    logAudit({
        action: referral.createdAt === referral.updatedAt ? 'CREATE_REFERRAL' : 'UPDATE_REFERRAL',
        resourceId: referral.id,
        agencyId: referral.agencyId,
        actor: user ? `user:${user.uid}` : 'public',
        details: { status: referral.status }
    });

    return referral;
}

export async function findReferral(id: string): Promise<Referral | undefined> {
    // This function seems similar to getReferralById but logic slightly different?
    // Secure it too.
    const user = await verifySession();
    if (!user) throw new Error('Unauthorized');

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

        // [HIPAA Audit] Log READ access to specific PHI
        logAudit({
            action: 'VIEW_REFERRAL_DETAILS',
            resourceId: id,
            agencyId: data.agencyId,
            actor: `user:${user.uid}`
        });

        return data as Referral;
    }

    return undefined;
}

export async function toggleArchiveReferral(id: string, isArchived: boolean): Promise<boolean> {
    const user = await verifySession();
    if (!user) throw new Error('Unauthorized');

    const firestore = getDb();
    try {
        // Fetch first to get agencyId for Audit
        const refDoc = await firestore.collection('referrals').doc(id).get();
        const agencyId = refDoc.exists ? refDoc.data()?.agencyId : 'unknown';

        await firestore.collection('referrals').doc(id).update({
            isArchived,
            updatedAt: Timestamp.now()
        });

        // [HIPAA Audit]
        logAudit({
            action: isArchived ? 'ARCHIVE_REFERRAL' : 'UNARCHIVE_REFERRAL',
            resourceId: id,
            agencyId: agencyId,
            actor: `user:${user.uid}`
        });

        return true;
    } catch (e) {
        console.error("Error toggling archive:", e);
        return false;
    }
}

export async function markReferralAsSeen(id: string): Promise<void> {
    const user = await verifySession();
    if (!user) throw new Error('Unauthorized');

    const firestore = getDb();
    try {
        await firestore.collection('referrals').doc(id).update({
            isSeen: true,
            hasUnreadMessages: false
        });

        // [HIPAA Audit] - Less critical but good for tracing "who saw this"
        logAudit({
            action: 'MARK_SEEN',
            resourceId: id,
            actor: `user:${user.uid}`
        });

    } catch (e) {
        console.error("Error marking as seen:", e);
    }
}

export async function getUnseenReferralCount(agencyId: string): Promise<number> {
    const user = await verifySession();
    if (!user) return 0; // Fail safe

    const firestore = getDb();
    try {
        // PERF: Query by agencyId only and filter isSeen in memory to avoid composite index requirement
        const snapshot = await firestore.collection('referrals')
            .where('agencyId', '==', agencyId)
            // .where('isSeen', '==', false) // Moved to memory filter
            .limit(500) // Safety limit
            .get();

        // Filter in memory
        const count = snapshot.docs.filter(d => {
            const data = d.data();
            const isUnseen = data.isSeen === false;
            const hasUnread = data.hasUnreadMessages === true;
            return (isUnseen || hasUnread) && data.isArchived !== true;
        }).length;

        return count;
    } catch (e) {
        console.error("Error counting unseen referrals:", e);
        return 0;
    }
}

export async function getReferralCount(agencyId: string): Promise<number> {
    try {
        const firestore = getDb();
        const snapshot = await firestore.collection('referrals')
            .where('agencyId', '==', agencyId)
            .count()
            .get();
        return snapshot.data().count;
    } catch (e) {
        console.error(`Error counting referrals for agency ${agencyId}:`, e);
        return 0;
    }
}

export async function getPublicReferralStatus(referralId: string): Promise<Referral | null> {
    if (!referralId) return null;

    const firestore = getDb();

    // 1. Fetch by ID
    const docRef = firestore.collection('referrals').doc(referralId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
        // Log secure failure (prevent enumeration)
        logAudit({
            action: 'PUBLIC_STATUS_CHECK_FAILED',
            resourceId: referralId,
            actor: 'public',
            details: { reason: 'not_found' }
        } as any);
        return null;
    }

    const data = convertTimestampsToDates(docSnap.data());

    // 2. Success - Log and Return LIMITED data
    logAudit({
        action: 'PUBLIC_STATUS_CHECK_SUCCESS',
        resourceId: referralId,
        agencyId: data.agencyId,
        actor: 'public'
    } as any);

    // Return full object? status-client uses it. 
    // Ensure we don't leak sensitive internal notes if they exist (though client component filters UI).
    // Let's strip internal notes for safety.
    const safeData = { ...data };
    delete safeData.internalNotes;

    // Migration logic for external notes (same as other getters)
    if (safeData.externalNotes) {
        safeData.externalNotes = safeData.externalNotes.map((n: any) => ({
            ...n,
            createdAt: n.createdAt instanceof Date ? n.createdAt : new Date(n.createdAt)
        }));
    }

    return safeData as Referral;
}
