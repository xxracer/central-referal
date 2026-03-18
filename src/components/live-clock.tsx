'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Clock } from 'lucide-react';

export function LiveClock() {
    const [time, setTime] = useState<Date | null>(null);

    useEffect(() => {
        setTime(new Date());

        // Update exactly on the second
        const updateTime = () => setTime(new Date());
        const interval = setInterval(updateTime, 1000);
        
        return () => clearInterval(interval);
    }, []);

    // Prevent hydration mismatch by rendering nothing until mounted
    if (!time) {
        return (
            <div className="flex flex-col items-center justify-center p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-primary/10 shadow-sm opacity-0">
                <div className="flex items-center gap-2 text-primary">
                    <Clock className="w-5 h-5" />
                    <span className="text-sm font-semibold tracking-wider uppercase">Texas Time (CT)</span>
                </div>
            </div>
        );
    }

    // Convert local time to Texas time
    const timeZone = 'America/Chicago';
    const zonedDate = toZonedTime(time, timeZone);
    const timeStr = format(zonedDate, 'hh:mm a');
    const dateStr = format(zonedDate, 'MM/dd/yyyy');

    return (
        <div className="flex flex-col items-center justify-center p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-primary/10 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2 text-primary">
                <Clock className="w-5 h-5" />
                <span className="text-sm font-semibold tracking-wider uppercase">Texas Time (CT)</span>
            </div>
            <div className="text-3xl font-headline font-bold text-slate-800 mt-1">
                {timeStr}
            </div>
            <div className="text-sm text-slate-500 font-medium">
                {dateStr}
            </div>
        </div>
    );
}
