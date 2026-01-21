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
        status: 'ACTIVE',
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
            return { ...DEFAULT_SETTINGS, id: idOrSlug, slug: idOrSlug };
        }

        // Merge with defaults to ensure all fields exist
        const rawData = docSnap.data();
        const data = convertTimestamps(rawData) as AgencySettings;
        return {
            ...DEFAULT_SETTINGS,
            ...data,
            id: agencyId,
            slug: data.slug || agencyId, // Fallback to ID if no slug
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
