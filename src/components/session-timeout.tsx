'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

// Constants for timing
const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes inactivity
const WARNING_MS = 20 * 1000; // 20 seconds warning before timeout

/**
 * Placed in RootLayout.
 * Silently tracks activity across the entire app (all tabs, all pages)
 * to keep the session alive as long as the user is doing *something*.
 */
export function GlobalActivityTracker() {
    useEffect(() => {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        let lastUpdate = 0;

        const handleActivity = () => {
            // Only track if on a protected route to prevent public pages from keeping staff sessions alive
            if (!window.location.pathname.startsWith('/dashboard') && !window.location.pathname.startsWith('/status')) {
                return;
            }

            const now = Date.now();
            const lastActivityStr = localStorage.getItem('rf_last_activity');
            const lastActivity = lastActivityStr ? parseInt(lastActivityStr, 10) : now;

            // If the session has officially expired (meaning at least TIMEOUT_MS has passed since last activity),
            // moving the mouse shouldn't bring it back from the dead. Let SessionTimeout kill it.
            if (now - lastActivity >= TIMEOUT_MS) {
                return;
            }

            // Throttle localStorage writes to max once per second
            if (now - lastUpdate > 1000) {
                localStorage.setItem('rf_last_activity', now.toString());
                lastUpdate = now;
            }
        };

        // Initialize on mount
        handleActivity();

        events.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, []);

    return null;
}

/**
 * Placed in DashboardLayout.
 * Protects staff routes. Shows the warning modal and performs the actual logout
 * if `rf_last_activity` gets too old.
 */
export function SessionTimeout({ agencyId }: { agencyId?: string }) {
    const router = useRouter();
    const [showWarning, setShowWarning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const performLogout = useCallback(async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            console.error("Logout failed", e);
        } finally {
            router.push('/login?reason=timeout');
        }
    }, [router, isLoggingOut]);

    const extendSession = () => {
        localStorage.setItem('rf_last_activity', Date.now().toString());
        setShowWarning(false);
    };

    useEffect(() => {
        if (isLoggingOut) return;

        // Track when we last told the server we were active to avoid spamming
        let lastPingTime = Date.now();

        const checkActivityInterval = setInterval(() => {
            const lastActivityStr = localStorage.getItem('rf_last_activity');
            const lastActivity = lastActivityStr ? parseInt(lastActivityStr, 10) : Date.now();
            const now = Date.now();
            const timeSinceLastActivity = now - lastActivity;

            if (timeSinceLastActivity >= TIMEOUT_MS) {
                // Timeout reached
                performLogout();
                clearInterval(checkActivityInterval);
            } else if (timeSinceLastActivity >= (TIMEOUT_MS - WARNING_MS)) {
                // Warning state
                if (!showWarning) setShowWarning(true);
                setTimeLeft(Math.ceil((TIMEOUT_MS - timeSinceLastActivity) / 1000));
            } else {
                // Safe state
                if (showWarning) setShowWarning(false);

                // Real-time presence: If the user is actively using the app (activity < 60s),
                // ping the server every 60 seconds to keep them 'Online' to the public
                if (timeSinceLastActivity < 60000 && (now - lastPingTime > 60000)) {
                    if (agencyId && agencyId !== 'default') {
                        import('@/lib/auth-actions').then(m => m.pingPresence(agencyId)).catch(console.error);
                    }
                    lastPingTime = now;
                }
            }
        }, 1000); // Check every second to keep sync across tabs smooth

        return () => clearInterval(checkActivityInterval);
    }, [performLogout, showWarning, isLoggingOut, agencyId]);

    // Cleanup interval if unmounted
    useEffect(() => {
        // Just empty cleanup since the interval is handled in the other effect,
        // but this is good practice if we needed to hook anything else.
    }, []);


    if (!showWarning) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white border rounded-2xl shadow-2xl max-w-md w-full p-8 text-center relative overflow-hidden">
                {/* Progress bar at top */}
                <div className="absolute top-0 left-0 h-2 bg-slate-100 w-full">
                    <div
                        className="h-full bg-orange-500 transition-all duration-1000 ease-linear"
                        style={{ width: `${(timeLeft / (WARNING_MS / 1000)) * 100}%` }}
                    />
                </div>

                <div className="mx-auto w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-2">Session Expiring</h2>

                <p className="text-slate-600 mb-8">
                    For your security, you will be automatically logged out in <span className="font-bold text-orange-600 tabular-nums">{timeLeft}</span> seconds due to inactivity.
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={extendSession}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]"
                    >
                        Stay Logged In
                    </button>

                    <button
                        onClick={performLogout}
                        className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all"
                    >
                        Log Out Now
                    </button>
                </div>
            </div>
        </div>
    );
}
