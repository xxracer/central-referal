'use client';

import { useEffect, useRef, useState } from 'react';

interface TurnstileWidgetProps {
    siteKey?: string;
    onVerify: (token: string) => void;
}

export function TurnstileWidget({ siteKey, onVerify }: TurnstileWidgetProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Load the script
        const script = document.createElement('script');
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);

        script.onload = () => {
            setIsLoaded(true);
        };

        return () => {
            // Cleanup tricky with external scripts, but we can remove it if needed
            // document.body.removeChild(script);
        };
    }, []);

    useEffect(() => {
        if (isLoaded && containerRef.current && (window as any).turnstile) {
            const isDev = process.env.NODE_ENV === 'development';
            const testingSiteKey = "1x00000000000000000000AA";
            const effectiveSiteKey = siteKey || (isDev ? testingSiteKey : process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) || "0x4AAAAAACaQtV2HCSGPHGiQ";

            const id = (window as any).turnstile.render(containerRef.current, {
                sitekey: effectiveSiteKey,
                callback: (token: string) => {
                    onVerify(token);
                },
            });
            return () => {
                if ((window as any).turnstile) {
                    (window as any).turnstile.remove(id);
                }
            };
        }
    }, [isLoaded, siteKey, onVerify]);

    return (
        <div ref={containerRef} className="min-h-[65px]" />
    );
}
