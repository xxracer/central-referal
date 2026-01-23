'use server';

import { findAgenciesForUser } from '@/lib/settings';

export async function checkUserAgencies(email: string) {
    if (!email) return { agencies: [] };

    try {
        const agencies = await findAgenciesForUser(email);
        return {
            agencies: agencies.map(a => ({
                id: a.id,
                name: a.companyProfile.name,
                slug: a.slug || a.id,
                logoUrl: a.branding?.logoUrl || a.companyProfile.logoUrl
            }))
        };
    } catch (error) {
        console.error("Error checking user agencies:", error);
        return { agencies: [] };
    }
}
