'use server';

import { adminDb } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-actions';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type {
    ReferralSource,
    ReferralSourceContact,
    ReferralSourceMetrics,
    ReferralSourceStatus,
    ReferralSourceType,
    ReferralSourceCreatedFrom,
    ReferralSourceContactType
} from '@/lib/types';
import { normalizeName } from '@/lib/utils';

// Helper to remove undefined values for Firestore compatibility
const removeUndefined = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(removeUndefined);
    if (obj instanceof Date) return obj;
    if (obj instanceof Timestamp) return obj;
    if (obj instanceof FieldValue) return obj;
    if (obj !== null && typeof obj === 'object') {
        // Also safeguard against duck-typed FieldValues
        if (obj.constructor && obj.constructor.name === 'FieldValue') return obj;
        if (obj.isEqual && typeof obj.isEqual === 'function' && !Object.keys(obj).length) return obj;

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

// Converts Firestore Timestamps to JS Date objects recursively
function convertTimestampsToDates(obj: any): any {
    if (obj instanceof Timestamp) return obj.toDate();
    if (obj && typeof obj === 'object' && '_seconds' in obj && '_nanoseconds' in obj) {
        return new Date(obj._seconds * 1000); // Recover corrupted POJO timestamps
    }
    if (Array.isArray(obj)) return obj.map(convertTimestampsToDates);
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

/**
 * Creates a new Referral Source. Checks for exact duplicates based on normalized name.
 */
export async function createReferralSource(
    data: Omit<ReferralSource, 'id' | 'createdAt' | 'updatedAt' | 'nameNormalized'>,
    skipAuthCheck = false
): Promise<{ success: boolean; data?: ReferralSource; error?: string; existingId?: string }> {
    if (!skipAuthCheck) {
        const user = await verifySession();
        if (!user) throw new Error('Unauthorized');
    }

    const nameNormalized = normalizeName(data.name);

    if (!nameNormalized) {
        return { success: false, error: 'Name cannot be empty' };
    }

    try {
        // 1. Check for duplicates
        const existingQuery = await adminDb.collection('referral_sources')
            .where('agencyId', '==', data.agencyId)
            .where('nameNormalized', '==', nameNormalized)
            .limit(1)
            .get();

        if (!existingQuery.empty) {
            return {
                success: false,
                error: 'A referral source with this name already exists.',
                existingId: existingQuery.docs[0].id
            };
        }

        // 2. Create new source
        const docRef = adminDb.collection('referral_sources').doc();
        const now = new Date();

        const newSource: ReferralSource = {
            ...data,
            id: docRef.id,
            nameNormalized,
            createdAt: now,
            updatedAt: now,
        };

        const firestoreData = { ...newSource, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() };
        await docRef.set(removeUndefined(firestoreData));

        return { success: true, data: newSource };
    } catch (error: any) {
        console.error('Error creating referral source:', error);
        return { success: false, error: 'Failed to create referral source.' };
    }
}

/**
 * Updates an existing Referral Source. Ensures name uniqueness if name is changed.
 */
export async function updateReferralSource(id: string, agencyId: string, updates: Partial<ReferralSource>): Promise<{ success: boolean; error?: string }> {
    const user = await verifySession();
    if (!user) throw new Error('Unauthorized');

    try {
        const docRef = adminDb.collection('referral_sources').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists || docSnap.data()?.agencyId !== agencyId) {
            return { success: false, error: 'Referral source not found.' };
        }

        const updateData: any = { ...updates, updatedAt: FieldValue.serverTimestamp() };

        if (updates.name) {
            const nameNormalized = normalizeName(updates.name);

            // Check for duplicates if name changed
            if (nameNormalized !== docSnap.data()?.nameNormalized) {
                const existingQuery = await adminDb.collection('referral_sources')
                    .where('agencyId', '==', agencyId)
                    .where('nameNormalized', '==', nameNormalized)
                    .limit(1)
                    .get();

                if (!existingQuery.empty && existingQuery.docs[0].id !== id) {
                    return { success: false, error: 'Another referral source with this name already exists.' };
                }
            }
            updateData.nameNormalized = nameNormalized;
        }

        await docRef.update(removeUndefined(updateData));
        return { success: true };
    } catch (error: any) {
        console.error('Error updating referral source:', error);
        return { success: false, error: 'Failed to update referral source.' };
    }
}

export async function getReferralSourceById(id: string, agencyId: string): Promise<ReferralSource | null> {
    const user = await verifySession();
    if (!user) throw new Error('Unauthorized');

    try {
        const docSnap = await adminDb.collection('referral_sources').doc(id).get();
        if (!docSnap.exists || docSnap.data()?.agencyId !== agencyId) {
            return null;
        }
        return convertTimestampsToDates(docSnap.data()) as ReferralSource;
    } catch (e) {
        console.error('Error fetching referral source:', e);
        return null;
    }
}

/**
 * Ticket 2: Compute metrics by querying referrals globally for the agency and aggregating in memory.
 * This prevents N+1 queries.
 */
async function computeMetricsForSources(agencyId: string, sourceIds: string[]): Promise<Map<string, ReferralSourceMetrics>> {
    const metricsMap = new Map<string, ReferralSourceMetrics>();

    // Initialize empty metrics
    sourceIds.forEach(id => {
        metricsMap.set(id, {
            lastContactDate: null,
            latestNote: undefined,
            totalNotes: 0,
            referralsMtd: 0,
            referralsLast90Days: 0,
            lastReferralDate: null,
            totalReferralsAllTime: 0,
            totalAdmittedAllTime: 0,
            recentReferrals: [],
            insuranceStats: {}
        });
    });

    if (sourceIds.length === 0) return metricsMap;

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

    // 1. Fetch Referral Aggegrations
    // We fetch all referrals created in the last 90 days to minimize data transfer, 
    // plus we need the absolute `lastReferralDate` which might be older than 90 days.
    // In NoSQL (Firestore), efficiently getting the `lastReferralDate` for EVERY source without N+1 is hard.
    // Approach: Fetch ALL referrals for the agency. If the agency is huge, this is slow.
    // Better approach: We should ideally have these metrics denormalized on the ReferralSource document itself,
    // updated via triggers/actions on submission.
    // For now, doing an active memory aggregation of recent referrals (last 1 year maybe?)
    // Let's query recent 500 referrals for the agency.

    try {
        const referralsSnap = await adminDb.collection('referrals')
            .where('agencyId', '==', agencyId)
            // .orderBy('createdAt', 'desc') // Requires composite index if combined with other filters. Let's filter in memory
            .get();

        referralsSnap.docs.forEach(doc => {
            const data = doc.data();
            const rSourceId = data.referralSourceId;
            if (!rSourceId || !metricsMap.has(rSourceId)) return;

            const rCreatedAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt);
            const metrics = metricsMap.get(rSourceId)!;
            const status = data.status;

            // All-Time
            metrics.totalReferralsAllTime++;
            if (status === 'ACCEPTED' || status === 'COMPLETED') {
                metrics.totalAdmittedAllTime++;
            }

            // Last Referral Date
            if (!metrics.lastReferralDate || rCreatedAt > metrics.lastReferralDate) {
                metrics.lastReferralDate = rCreatedAt;
            }

            // Always add to the recent referrals list for display/linking
            metrics.recentReferrals.push({
                id: doc.id,
                patientName: data.patientName || 'Unknown',
                createdAt: rCreatedAt,
                status: data.status,
            });

            // 90 Days
            if (rCreatedAt >= ninetyDaysAgo) {
                metrics.referralsLast90Days++;
            }

            // MTD
            if (rCreatedAt >= firstDayOfMonth) {
                metrics.referralsMtd++;
            }

            // Insurance Stats
            const insurance = data.patientInsurance;
            if (insurance && typeof insurance === 'string') {
                const normalizedInsurance = insurance.trim();
                if (normalizedInsurance) {
                    metrics.insuranceStats[normalizedInsurance] = (metrics.insuranceStats[normalizedInsurance] || 0) + 1;
                }
            }
        });

        // 2. Fetch Last Contact Date
        // To get the latest contact date for each source without N+1, we can fetch all contacts and sort in memory.
        const contactsSnap = await adminDb.collection('referral_source_contacts')
            .where('agencyId', '==', agencyId)
            .get();

        contactsSnap.docs.forEach(doc => {
            const data = doc.data();
            const rSourceId = data.referralSourceId;
            if (!rSourceId || !metricsMap.has(rSourceId)) return;

            let cDate: Date;
            if (data.contactDate instanceof Timestamp) {
                cDate = data.contactDate.toDate();
            } else if (data.contactDate && typeof data.contactDate === 'object' && '_seconds' in data.contactDate) {
                cDate = new Date(data.contactDate._seconds * 1000);
            } else {
                cDate = new Date(data.contactDate);
            }

            const metrics = metricsMap.get(rSourceId)!;

            // Increment the notes count
            metrics.totalNotes++;

            if (!metrics.lastContactDate || cDate > metrics.lastContactDate) {
                metrics.lastContactDate = cDate;
                metrics.latestNote = data.summary;
            }
        });

    } catch (e) {
        console.error("Error computing metrics for sources:", e);
    }

    // Sort referrals descending by date and limit to top 50
    metricsMap.forEach(metrics => {
        metrics.recentReferrals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        if (metrics.recentReferrals.length > 50) {
            metrics.recentReferrals = metrics.recentReferrals.slice(0, 50);
        }
    });

    return metricsMap;
}


export async function getReferralSourcesWithMetrics(
    agencyId: string,
    filters?: { search?: string; status?: ReferralSourceStatus; type?: ReferralSourceType }
): Promise<(ReferralSource & { metrics: ReferralSourceMetrics })[]> {
    const user = await verifySession();
    if (!user) throw new Error('Unauthorized');

    try {
        let query: FirebaseFirestore.Query = adminDb.collection('referral_sources').where('agencyId', '==', agencyId);

        if (filters?.status) {
            query = query.where('status', '==', filters.status);
        }
        if (filters?.type) {
            query = query.where('type', '==', filters.type);
        }

        const snapshot = await query.get();
        let sources = snapshot.docs.map(doc => convertTimestampsToDates(doc.data()) as ReferralSource);

        sources.sort((a, b) => a.nameNormalized.localeCompare(b.nameNormalized));

        if (filters?.search) {
            const s = normalizeName(filters.search);
            sources = sources.filter(src => src.nameNormalized.includes(s));
        }

        // Fetch Metrics
        const sourceIds = sources.map(s => s.id);
        const metricsMap = await computeMetricsForSources(agencyId, sourceIds);

        return sources.map(source => ({
            ...source,
            metrics: metricsMap.get(source.id) || { lastContactDate: null, latestNote: undefined, totalNotes: 0, referralsMtd: 0, referralsLast90Days: 0, lastReferralDate: null, totalReferralsAllTime: 0, totalAdmittedAllTime: 0, recentReferrals: [], insuranceStats: {} }
        }));
    } catch (e) {
        console.error('Error fetching referral sources:', e);
        return [];
    }
}


/**
 * Ticket 4: Typeahead Search. Returns limited top results.
 */
export async function searchReferralSources(agencyId: string, query: string, limit: number = 10): Promise<ReferralSource[]> {
    const user = await verifySession();
    // Allow bypass for public form submissions if no user, but strictly limited to agencyId.
    // Actually, in `submitReferral`, the user might not be logged in. 
    // We should either expose a public search action OR internal-only search. 
    // We will handle permissions in the server action layer.

    if (!query || query.trim() === '') return [];

    const normalizedQuery = normalizeName(query);

    try {
        // Because Firestore doesn't support 'LIKE', we use range queries on the normalized name
        const snapshot = await adminDb.collection('referral_sources')
            .where('agencyId', '==', agencyId)
            // .where('status', 'in', ['prospect', 'active', 'high_priority', 'cooling_off']) // Exclude inactive/lost maybe?
            .get();

        const allSources = snapshot.docs.map(doc => convertTimestampsToDates(doc.data()) as ReferralSource);

        const matched = allSources
            .filter(src => src.nameNormalized.includes(normalizedQuery))
            .sort((a, b) => a.nameNormalized.localeCompare(b.nameNormalized));

        return matched.slice(0, limit);
    } catch (e) {
        console.error("Error searching referral sources:", e);
        return [];
    }
}


// --- Contact Logs ---

export async function addReferralSourceContact(data: Omit<ReferralSourceContact, 'id' | 'createdAt'>): Promise<{ success: boolean; data?: ReferralSourceContact; error?: string }> {
    const user = await verifySession();
    if (!user) throw new Error('Unauthorized');

    try {
        const docRef = adminDb.collection('referral_source_contacts').doc();
        const now = new Date();

        const newContact: ReferralSourceContact = {
            ...data,
            id: docRef.id,
            createdAt: now,

            // Enforce reminder logic
            ...(data.reminderDate ? { reminderSent: false } : {})
        };

        const firestoreData: any = {
            ...newContact,
            agencyId: data.agencyId,
            referralSourceId: data.referralSourceId,
            contactDate: Timestamp.fromDate(new Date(data.contactDate)),
            createdAt: FieldValue.serverTimestamp()
        };

        // Convert reminderDate to Firebase Timestamp if it exists
        if (data.reminderDate) {
            firestoreData.reminderDate = Timestamp.fromDate(new Date(data.reminderDate));

            // Send the scheduled email immediately via Resend API if email is provided
            if (data.reminderEmail) {
                // We need the source name for the email
                let referrerName = 'Unknown Partner';
                try {
                    const sourceDoc = await adminDb.collection('referral_sources').doc(data.referralSourceId).get();
                    if (sourceDoc.exists) {
                        referrerName = sourceDoc.data()?.name || referrerName;
                    }
                } catch (e) {
                    console.error("Failed to fetch referral source name for email scheduling", e);
                }

                try {
                    const scheduledAtIso = new Date(data.reminderDate).toISOString();
                    const reminderDateStr = new Date(data.reminderDate).toLocaleString();

                    // Import dynamically or ensure it exists at module level
                    const { sendReferralNotification } = await import('@/lib/email');

                    await sendReferralNotification(
                        data.agencyId,
                        'REFERRAL_SOURCE_REMINDER',
                        {
                            referrerName: data.contactPerson ? `${data.contactPerson} (${referrerName})` : referrerName,
                            dateTime: reminderDateStr,
                            messageSnippet: data.summary || 'No summary provided.',
                            scheduledAt: scheduledAtIso
                        },
                        data.reminderEmail
                    );

                    // Since Resend has scheduled it, we mark the DB record as sent so Cron doesn't send a duplicate
                    firestoreData.reminderSent = true;
                    newContact.reminderSent = true;
                } catch (e) {
                    console.error("Failed to schedule email with Resend", e);
                }
            }
        }

        await docRef.set(removeUndefined(firestoreData));

        return { success: true, data: newContact };
    } catch (error: any) {
        console.error('Error creating contact log:', error);
        return { success: false, error: 'Failed to create contact log.' };
    }
}

export async function getReferralSourceContacts(agencyId: string, sourceId: string): Promise<ReferralSourceContact[]> {
    const user = await verifySession();
    if (!user) throw new Error('Unauthorized');

    try {
        console.log(`[DEBUG] Fetching contacts for Agency: ${agencyId}, Source: ${sourceId}`);
        const snapshot = await adminDb.collection('referral_source_contacts')
            .where('agencyId', '==', agencyId)
            .where('referralSourceId', '==', sourceId)
            .limit(100)
            .get();

        const docs = snapshot.docs.map(doc => convertTimestampsToDates(doc.data()) as ReferralSourceContact);
        // Sort in-memory to prevent index failures on corrupt POJO timestamps
        docs.sort((a, b) => {
            const dateA = a.contactDate ? new Date(a.contactDate).getTime() : 0;
            const dateB = b.contactDate ? new Date(b.contactDate).getTime() : 0;
            return dateB - dateA; // Descending
        });

        console.log(`[DEBUG] Found ${docs.length} contacts`);
        return docs.slice(0, 50);
    } catch (e) {
        console.error("Error fetching contact logs:", e);
        return [];
    }
}

export async function archiveReferralSourceContact(agencyId: string, contactId: string, isArchived: boolean): Promise<{ success: boolean; error?: string }> {
    const user = await verifySession();
    if (!user) throw new Error('Unauthorized');

    try {
        const docRef = adminDb.collection('referral_source_contacts').doc(contactId);
        const docSnap = await docRef.get();

        if (!docSnap.exists || docSnap.data()?.agencyId !== agencyId) {
            return { success: false, error: 'Contact not found.' };
        }

        await docRef.update({ isArchived, updatedAt: FieldValue.serverTimestamp() });
        return { success: true };
    } catch (error: any) {
        console.error('Error archiving contact:', error);
        return { success: false, error: 'Failed to archive contact log.' };
    }
}

export async function updateReferralSourceContact(agencyId: string, contactId: string, updates: Partial<ReferralSourceContact>): Promise<{ success: boolean; error?: string }> {
    const user = await verifySession();
    if (!user) throw new Error('Unauthorized');

    try {
        const docRef = adminDb.collection('referral_source_contacts').doc(contactId);
        const docSnap = await docRef.get();

        if (!docSnap.exists || docSnap.data()?.agencyId !== agencyId) {
            return { success: false, error: 'Contact not found.' };
        }

        const cleanUpdates = removeUndefined({ ...updates, updatedAt: FieldValue.serverTimestamp() });

        if (updates.reminderDate) {
            cleanUpdates.reminderDate = Timestamp.fromDate(new Date(updates.reminderDate));
            cleanUpdates.reminderSent = false;

            // Schedule via Resend
            if (updates.reminderEmail) {
                let referrerName = 'Unknown Partner';
                try {
                    const sourceId = docSnap.data()?.referralSourceId || updates.referralSourceId;
                    if (sourceId) {
                        const sourceDoc = await adminDb.collection('referral_sources').doc(sourceId).get();
                        if (sourceDoc.exists) referrerName = sourceDoc.data()?.name || referrerName;
                    }
                } catch (e) { console.error("Failed to fetch referral source name for email scheduling", e); }

                try {
                    const scheduledAtIso = new Date(updates.reminderDate).toISOString();
                    const reminderDateStr = new Date(updates.reminderDate).toLocaleString();
                    const { sendReferralNotification } = await import('@/lib/email');

                    const finalContactPerson = updates.contactPerson !== undefined ? updates.contactPerson : docSnap.data()?.contactPerson;
                    const finalReferrerName = finalContactPerson ? `${finalContactPerson} (${referrerName})` : referrerName;

                    await sendReferralNotification(agencyId, 'REFERRAL_SOURCE_REMINDER', { referrerName: finalReferrerName, dateTime: reminderDateStr, messageSnippet: updates.summary || docSnap.data()?.summary || 'No summary provided.', scheduledAt: scheduledAtIso }, updates.reminderEmail);
                    cleanUpdates.reminderSent = true;
                } catch (e) { console.error("Failed to schedule email with Resend", e); }
            }
        } else if (updates.reminderDate === null) {
            cleanUpdates.reminderDate = null;
            cleanUpdates.reminderEmail = null;
        }

        if (updates.contactDate) {
            cleanUpdates.contactDate = Timestamp.fromDate(new Date(updates.contactDate));
        }

        await docRef.update(cleanUpdates);
        return { success: true };
    } catch (error: any) {
        console.error('Error updating contact:', error);
        return { success: false, error: 'Failed to update contact log.' };
    }
}

/**
 * Temporary utility to retroactively sync legacy referrals with missing sources.
 */
export async function syncLegacyReferralSources(agencyId: string): Promise<{ success: boolean; created: number }> {
    const user = await verifySession();
    if (!user) throw new Error('Unauthorized');

    let createdCount = 0;

    try {
        const referralsSnap = await adminDb.collection('referrals').where('agencyId', '==', agencyId).get();

        for (const doc of referralsSnap.docs) {
            const data = doc.data();
            const referrerName = data.referrerName;

            if (!referrerName) continue;

            const nameNormalized = normalizeName(referrerName);
            if (!nameNormalized) continue;

            // Check if source exists
            const existingQuery = await adminDb.collection('referral_sources')
                .where('agencyId', '==', agencyId)
                .where('nameNormalized', '==', nameNormalized)
                .limit(1)
                .get();

            let sourceId = data.referralSourceId;

            if (existingQuery.empty) {
                // Create it
                const docRef = adminDb.collection('referral_sources').doc();
                const now = new Date();
                await docRef.set({
                    id: docRef.id,
                    agencyId,
                    name: referrerName,
                    nameNormalized,
                    type: 'other',
                    status: 'prospect',
                    createdFrom: 'manual', // or referral_submission
                    notes: 'Auto-created by legacy backfill sync.',
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp()
                });
                sourceId = docRef.id;
                createdCount++;
            } else {
                sourceId = existingQuery.docs[0].id;
            }

            // Ensure referral points to it
            if (data.referralSourceId !== sourceId) {
                await doc.ref.update({
                    referralSourceId: sourceId,
                    updatedAt: FieldValue.serverTimestamp()
                });
            }
        }

        return { success: true, created: createdCount };
    } catch (e) {
        console.error("Sync error:", e);
        return { success: false, created: 0 };
    }
}
