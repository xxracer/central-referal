import { findAgenciesForUser } from '@/lib/settings';

/**
 * Verifies if a user (by email) has access to a specific agency.
 * Returns true if the user is authorized for the agency.
 * Returns false otherwise.
 * 
 * Also handles the 'default' agency case: only Super Admins (or specific central staff if desired) should access 'default'.
 * For now, strict: 'default' is only for super-admins or we assume 'default' maps to no specific agency 
 * and thus regular agency logic doesn't apply, BUT we want to prevent random users from seeing it.
 */
export async function verifyUserAccess(email: string | undefined | null, agencyId: string): Promise<boolean> {
    if (!email) return false;

    // 1. Super Admin Bypass
    const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (adminEmail && email.toLowerCase() === adminEmail.toLowerCase()) {
        return true;
    }

    // 2. 'default' agency protection
    if (agencyId === 'default') {
        // Only allow super admin (already handled above)
        // Or if we have a specific list of "Central Staff"
        return false;
    }

    // 3. Regular Agency Check
    const agencies = await findAgenciesForUser(email);
    return agencies.some(a => a.id === agencyId || a.slug === agencyId);
}
