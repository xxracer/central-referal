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

export async function verifyCaptcha(token: string) {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY || '6Ldf6FYsAAAAAIx3KBhJn8ViuPZmWg_IJVhaCJcJ'; // Fallback to provided key for now

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
