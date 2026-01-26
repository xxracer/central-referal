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
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!token) {
        return { success: false, message: 'No token provided' };
    }

    try {
        const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `secret=${secretKey}&response=${token}`,
        });

        const data = await response.json();

        if (data.success) {
            return { success: true };
        } else {
            console.error("Captcha verification failed:", data['error-codes']);
            return { success: false, message: 'Captcha verification failed' };
        }
    } catch (error) {
        console.error("Error verifying captcha:", error);
        return { success: false, message: 'Internal verification error' };
    }
}
