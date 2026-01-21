import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

interface RateLimitConfig {
    intervalSeconds: number;
    maxRequests: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
    intervalSeconds: 60, // 1 minute
    maxRequests: 5,      // 5 attempts per minute
};

export async function checkRateLimit(ip: string, action: string = 'global', config: RateLimitConfig = DEFAULT_CONFIG): Promise<{ success: boolean; reset?: number }> {
    const now = Date.now();
    const windowStart = now - (config.intervalSeconds * 1000);
    const docId = `${action}_${ip.replace(/[^a-zA-Z0-9]/g, '_')}`; // Sanitize IP
    const ref = adminDb.collection('rate_limits').doc(docId);

    try {
        const doc = await ref.get();
        let data = doc.data() || { timestamps: [] };

        // Filter out old timestamps
        let timestamps = (data.timestamps as number[]).filter(t => t > windowStart);

        if (timestamps.length >= config.maxRequests) {
            return {
                success: false,
                reset: Math.ceil((timestamps[0] + (config.intervalSeconds * 1000) - now) / 1000)
            };
        }

        // Add current timestamp
        timestamps.push(now);

        // Update valid timestamps, expiring old doc after 2x interval to keep DB clean
        await ref.set({ timestamps }, { merge: true });

        return { success: true };
    } catch (e) {
        console.error("Rate limit check failed, failing open:", e);
        return { success: true }; // Fail open if DB error to avoid blocking legit users during outage
    }
}
