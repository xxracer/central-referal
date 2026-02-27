'use server';

import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';

// Cookie name for the session
const SESSION_COOKIE_NAME = 'session';

export async function createSession(idToken: string) {
    try {
        // Verify the token to get the email BEFORE creating the session
        // This ensures the token is valid and gives us the user identity
        const claims = await adminAuth.verifyIdToken(idToken);
        const email = claims.email;

        if (!email) {
            throw new Error('No email in token');
        }

        // --- SECURITY CHECK ---
        // Verify the user actually belongs to an agency or is admin.
        // We import dynamically to avoid circular deps if any, though imports seem fine.
        const { findAgenciesForUser } = await import('@/lib/settings');
        const agencies = await findAgenciesForUser(email);

        const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
        const isAdmin = adminEmail && email.toLowerCase() === adminEmail.toLowerCase();

        if (agencies.length === 0 && !isAdmin) {
            console.error(`[Security] Blocked session creation for unauthorized user: ${email}`);
            return { success: false, error: 'Unauthorized: No active agency found.' };
        }
        // ----------------------

        // Update lastActiveAt timestamp for all agencies the user belongs to (Epic: Public "Last Seen Online")
        if (agencies.length > 0) {
            import('@/lib/settings').then(({ updateAgencySettings }) => {
                const { FieldValue } = require('firebase-admin/firestore');
                agencies.forEach(agency => {
                    updateAgencySettings(agency.id, { lastActiveAt: FieldValue.serverTimestamp() }).catch(e => {
                        console.error(`Failed to update lastActiveAt for agency ${agency.id}:`, e);
                    });
                });
            });
        }

        // Create the session cookie. This will also verify the ID token.
        // Set session expiration to 5 minutes.
        const expiresIn = 60 * 5 * 1000;

        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

        const cookieStore = await cookies();

        // Determine Cookie Domain
        // In Prod: .referralflow.health (Share across subdomains)
        // In Dev: undefined (Host only, but breaks subdomain sharing on localhost. Known limitation).
        const isProd = process.env.NODE_ENV === 'production';
        const cookieOptions: any = {
            maxAge: expiresIn,
            httpOnly: true,
            secure: isProd,
            path: '/',
            sameSite: 'lax',
        };

        if (isProd) {
            cookieOptions.domain = '.referralflow.health';
        }

        cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, cookieOptions);

        return { success: true };
    } catch (error) {
        console.error('Failed to create session cookie:', error);
        return { success: false, error: 'Unauthorized' };
    }
}

export async function verifySession() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) {
        return null; // No session
    }

    try {
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true /** checkRevoked */);
        return decodedClaims;
    } catch (error) {
        // Session invalid or expired
        return null;
    }
}

export async function deleteSession() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function pingPresence(agencyId?: string) {
    if (!agencyId || agencyId === 'default') return;

    const session = await verifySession();
    if (!session || !session.email) return;

    try {
        const { verifyUserAccess } = await import('@/lib/access-control');
        const hasAccess = await verifyUserAccess(session.email, agencyId);

        if (hasAccess) {
            const { updateAgencySettings } = await import('@/lib/settings');
            const { FieldValue } = require('firebase-admin/firestore');
            await updateAgencySettings(agencyId, { lastActiveAt: FieldValue.serverTimestamp() });
        }
    } catch (e) {
        console.error("Ping presence failed:", e);
    }
}
