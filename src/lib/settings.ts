import { adminDb } from '@/lib/firebase-admin';
import type { AgencySettings } from './types';
import { Timestamp } from 'firebase-admin/firestore';

// Helper to convert Timestamps to Dates
const convertTimestamps = (obj: any): any => {
    if (obj instanceof Timestamp) return obj.toDate();
    if (Array.isArray(obj)) return obj.map(convertTimestamps);
    if (obj !== null && typeof obj === 'object') {
        return Object.fromEntries(
            Object.entries(obj).map(([key, val]) => [key, convertTimestamps(val)])
        );
    }
    return obj;
};

const SETTINGS_COLLECTION = 'agencySettings';

// Default settings for new agencies
const DEFAULT_SETTINGS: AgencySettings = {
    id: 'default',
    companyProfile: {
        name: 'Agency Name',
        phone: '',
        fax: '',
        email: '',
        homeInsurances: [],
    },
    branding: {
        logoUrl: '',
    },
    notifications: {
        emailRecipients: [],
        enabledTypes: ['NEW_REFERRAL', 'STATUS_UPDATE'],
        staff: [],
    },
    configuration: {
        acceptedInsurances: [],
        offeredServices: [
            'Skilled Nursing (SN)',
            'Physical Therapy (PT)',
            'Occupational Therapy (OT)',
            'Speech Therapy (ST)',
            'Home Health Aide (HHA)',
            'Medical Social Worker (MSW)',
            'Provider Attendant Services (Medicaid)',
            'Caregiver Services (Private Pay)',
        ],
    },
    userAccess: {
        authorizedDomains: [],
        authorizedEmails: [],
    },
    subscription: {
        plan: 'FREE',
        status: process.env.NODE_ENV === 'development' ? 'ACTIVE' : 'SUSPENDED',
    }
};

export async function getAgencySettings(idOrSlug: string): Promise<AgencySettings> {
    try {
        // 1. Try finding by ID first
        let docRef = adminDb.collection(SETTINGS_COLLECTION).doc(idOrSlug);
        let docSnap = await docRef.get();
        let agencyId = idOrSlug;

        // 2. If not found, try finding by slug
        if (!docSnap.exists) {
            const query = await adminDb.collection(SETTINGS_COLLECTION)
                .where('slug', '==', idOrSlug)
                .limit(1)
                .get();

            if (!query.empty) {
                docSnap = query.docs[0];
                agencyId = docSnap.id;
            }
        }

        if (!docSnap.exists) {
            // Return defaults if not found, but retain the ID
            return {
                ...DEFAULT_SETTINGS,
                id: idOrSlug,
                slug: idOrSlug,
                exists: false // Explicitly mark as not found/not configured
            };
        }

        // Merge with defaults to ensure all fields exist
        const rawData = docSnap.data();
        const data = convertTimestamps(rawData) as AgencySettings;
        return {
            ...DEFAULT_SETTINGS,
            ...data,
            id: agencyId,
            slug: data.slug || agencyId, // Fallback to ID if no slug
            exists: true, // Mark as existing
            companyProfile: {
                ...DEFAULT_SETTINGS.companyProfile,
                ...(data.companyProfile || {}),
                homeInsurances: data.companyProfile?.homeInsurances || DEFAULT_SETTINGS.companyProfile.homeInsurances
            },
            branding: { ...DEFAULT_SETTINGS.branding, ...(data.branding || {}) },
            notifications: {
                ...DEFAULT_SETTINGS.notifications,
                ...(data.notifications || {}),
                enabledTypes: data.notifications?.enabledTypes || DEFAULT_SETTINGS.notifications.enabledTypes,
                staff: data.notifications?.staff || DEFAULT_SETTINGS.notifications.staff
            },
            configuration: { ...DEFAULT_SETTINGS.configuration, ...(data.configuration || {}) },
            userAccess: { ...DEFAULT_SETTINGS.userAccess, ...(data.userAccess || {}) },
            subscription: { ...DEFAULT_SETTINGS.subscription, ...(data.subscription || {}) },
        };
    } catch (error) {
        console.error(`[getAgencySettings] Failed to fetch settings for ${idOrSlug}:`, error);
        // Fallback to default settings to prevent page crash
        return {
            ...DEFAULT_SETTINGS,
            id: idOrSlug,
            slug: idOrSlug,
            exists: false, // Mark as not found due to error
            companyProfile: {
                ...DEFAULT_SETTINGS.companyProfile,
                name: 'Agency Not Loaded (System Error)',
            }
        };
    }
}

export async function updateAgencySettings(agencyId: string, settings: Partial<AgencySettings>): Promise<void> {
    const docRef = adminDb.collection(SETTINGS_COLLECTION).doc(agencyId);
    await docRef.set(settings, { merge: true });
}

export async function createAgencySettings(agencyId: string, initialSettings: Partial<AgencySettings> = {}): Promise<void> {
    const docRef = adminDb.collection(SETTINGS_COLLECTION).doc(agencyId);
    const completeSettings = { ...DEFAULT_SETTINGS, ...initialSettings, id: agencyId };
    await docRef.set(completeSettings);
}

export async function findAgenciesForUser(email: string): Promise<AgencySettings[]> {
    if (!email) return [];
    const normalizedEmail = email.toLowerCase().trim();
    const domain = normalizedEmail.split('@')[1];
    const settingsColl = adminDb.collection(SETTINGS_COLLECTION);
    const agenciesMap = new Map<string, AgencySettings>();

    try {
        // 1. Check authorizedDomains
        // CRITICAL SECURITY: Block common public domains to prevent accidental exposure
        const bannedDomains = [
            'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'protonmail.com',
            'mail.com', 'zoho.com', 'yandex.com', 'live.com', 'msn.com', 'me.com', 'mac.com',
            'comcast.net', 'verizon.net', 'att.net', 'sbcglobal.net', 'cox.net', 'charter.net'
        ];

        if (domain && !bannedDomains.includes(domain.toLowerCase())) {
            const domainQuery = await settingsColl.where('userAccess.authorizedDomains', 'array-contains', domain).get();
            domainQuery.docs.forEach(doc => {
                console.log(`[Isolation Debug] Match by DOMAIN (${domain}) for Agency: ${doc.id}`);
                const data = convertTimestamps(doc.data()) as AgencySettings;
                agenciesMap.set(doc.id, {
                    ...DEFAULT_SETTINGS,
                    ...data,
                    id: doc.id,
                    slug: data.slug || doc.id
                });
            });
        }

        // 2. Check authorizedEmails
        const emailQuery = await settingsColl.where('userAccess.authorizedEmails', 'array-contains', normalizedEmail).get();
        emailQuery.docs.forEach(doc => {
            if (!agenciesMap.has(doc.id)) {
                console.log(`[Isolation Debug] Match by AUTHORIZED_EMAIL for Agency: ${doc.id}`);
                const data = convertTimestamps(doc.data()) as AgencySettings;
                agenciesMap.set(doc.id, {
                    ...DEFAULT_SETTINGS,
                    ...data,
                    id: doc.id,
                    slug: data.slug || doc.id
                });
            }
        });

        // 4. Check primary owner
        const ownerQuery = await settingsColl.where('companyProfile.email', '==', normalizedEmail).get();
        ownerQuery.docs.forEach(doc => {
            if (!agenciesMap.has(doc.id)) {
                console.log(`[Isolation Debug] Match by OWNER_EMAIL for Agency: ${doc.id}`);
                const data = convertTimestamps(doc.data()) as AgencySettings;
                agenciesMap.set(doc.id, {
                    ...DEFAULT_SETTINGS,
                    ...data,
                    id: doc.id,
                    slug: data.slug || doc.id
                });
            }
        });

        return Array.from(agenciesMap.values());
    } catch (error) {
        console.error("Error finding agencies for user:", error);
        return [];
    }
}
