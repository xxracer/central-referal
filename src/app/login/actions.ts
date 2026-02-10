'use server';

import { findAgenciesForUser } from '@/lib/settings';

export async function checkUserAgencies(email: string) {
    if (!email) return { agencies: [] };
    const normalizedEmail = email.toLowerCase();


    try {
        const agencies = await findAgenciesForUser(normalizedEmail);
        return {
            agencies: agencies.map(a => ({
                id: a.id,
                name: a.companyProfile.name,
                slug: a.slug || a.id,
                logoUrl: a.branding?.logoUrl || a.companyProfile.logoUrl,
                requiresPasswordReset: a.notifications?.staff?.find(s => s.email.toLowerCase() === normalizedEmail)?.requiresPasswordReset || false
            }))
        };
    } catch (error) {
        console.error("Error checking user agencies:", error);
        return { agencies: [] };
    }
}

export async function verifyCaptcha(token: string) {
    if (!token) {
        return { success: false, message: 'No token provided' };
    }

    try {
        const { verifyRecaptcha } = await import('@/lib/recaptcha');
        const success = await verifyRecaptcha(token);

        if (success) {
            return { success: true };
        } else {
            return { success: false, message: 'Security check failed. Please try again.' };
        }
    } catch (error) {
        console.error("Error verifying captcha:", error);
        return { success: false, message: 'Internal verification error' };
    }
}
