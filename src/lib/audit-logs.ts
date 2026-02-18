import { adminDb } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-actions';

export type AuditAction = 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';

export async function logAudit(action: AuditAction, resource: string, details?: any) {
    try {
        const session = await verifySession();
        const userId = session?.email || 'SYSTEM'; // Or proper user ID if available
        const agencyId = session?.agencyId || 'UNKNOWN';

        await adminDb.collection('auditLogs').add({
            action,
            resource, // e.g., 'referral/123'
            details: details || {},
            userId,
            agencyId,
            timestamp: new Date(),
            ip: 'N/A' // Could capture if passed from request context, but tricky in server actions deep down
        });
    } catch (error) {
        console.error('Failed to write audit log:', error);
        // Fail safe - audit logging failure shouldn't crash the app, but should be noted.
    }
}
