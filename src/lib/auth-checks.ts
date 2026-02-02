import { verifySession } from '@/lib/auth-actions';
import { redirect } from 'next/navigation';

export async function verifyAdmin() {
    const session = await verifySession();

    if (!session) {
        redirect('/login');
    }

    // Get admin email(s) from env
    const adminEmails = (process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase());
    const userEmail = (session.email || '').toLowerCase();

    if (!userEmail || !adminEmails.includes(userEmail)) {
        console.error(`[Security] Unauthorized admin access attempt by: ${userEmail}`);
        // Redirect to user dashboard or show 403
        redirect('/dashboard');
    }

    return true;
}
