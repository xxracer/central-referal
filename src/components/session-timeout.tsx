'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

const TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutes
// const TIMEOUT_MS = 10000; // 10s for testing

export function SessionTimeout() {
    const router = useRouter();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const logout = useCallback(async () => {
        // Clear cookie on server via server action? 
        // Or just redirect to a route handler that clears it?
        // Simple fetch to an API route is best to ensure server-side clearing.
        // But verifySession cookie is server-side HttpOnly.
        // We need a server action or API route.
        // Let's use a server action if possible, but we can't import server action in client component easily without passing it down?
        // Actually we can import server actions in client components in Next.js 14+.
        // Let's verify existing deleteSession action.
        // It is in src/lib/auth-actions.ts: deleteSession

        try {
            // Dynamic import to avoid build issues if mixed environment?
            // No, direct import of server action works.
            // BUT, to be safe and simple, let's just push to a logout route or call the action.
            // Let's assume we will fetch a logout api route or just redirect to login with a flag?
            // Redirecting to login alone doesn't clear the cookie if HttpOnly.
            // We MUST clear the cookie.

            // Let's use a fetch to a standard NextJS API route if one exists, or create one.
            // Or use the server action.
            // Let's try importing the server action here. `deleteSession`

            // Actually, let's keep it simple: redirect to /logout if it exists? 
            // Check middleware? No specific logout path in middleware.
            // Check app/logout/page.tsx?

            // Create a server action wrapper?
            // FOR NOW: Let's assume we'll create a dedicated /api/auth/logout route or similar?
            // OR better: Just call `deleteSession()` imported from `auth-actions`.
            // I will create a separate file for this component to avoid import issues.

            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            console.error("Logout failed", e);
        } finally {
            router.push('/login?reason=timeout');
        }
    }, [router]);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(logout, TIMEOUT_MS);
    }, [logout]);

    useEffect(() => {
        const events = ['mousedown', 'keydown', 'scroll', 'mousemove', 'touchstart'];

        // Set initial timer
        resetTimer();

        // Add listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [resetTimer]);

    return null; // Invisible component
}
