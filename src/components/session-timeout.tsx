'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';

const TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutes total
const WARNING_MS = 60 * 1000; // Show warning 60 seconds before timeout

export function SessionTimeout() {
    const router = useRouter();
    const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
    const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [showWarning, setShowWarning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);

    const performLogout = useCallback(async () => {
        try {
            // Call logout API to clear cookies server-side
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            console.error("Logout failed", e);
        } finally {
            router.push('/login?reason=timeout');
        }
    }, [router]);

    const startTimers = useCallback(() => {
        // Clear existing
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

        // Set Warning Timer (Total - Warning Duration)
        warningTimerRef.current = setTimeout(() => {
            setShowWarning(true);
            setTimeLeft(WARNING_MS / 1000);
        }, TIMEOUT_MS - WARNING_MS);

        // Set Final Logout Timer
        logoutTimerRef.current = setTimeout(() => {
            performLogout();
        }, TIMEOUT_MS);

    }, [performLogout]);

    const resetSession = useCallback(() => {
        if (showWarning) {
            setShowWarning(false);
            // Optionally ping server to extend cookie session if needed
            // fetch('/api/auth/extend-session'); 
        }
        startTimers();
    }, [showWarning, startTimers]);

    // Countdown effect for the modal
    useEffect(() => {
        if (!showWarning) return;

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [showWarning]);

    // Activity listeners (only reset if NOT showing warning)
    useEffect(() => {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

        const handleActivity = () => {
            // Only auto-reset if the warning isn't already shown
            if (!showWarning) {
                startTimers();
            }
        };

        // Initial start
        startTimers();

        events.forEach(event => window.addEventListener(event, handleActivity));

        return () => {
            if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
            if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
            events.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, [startTimers, showWarning]);

    if (!showWarning) return null;

    // Portal to ensuring high z-index visibility
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
                        onClick={resetSession}
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
