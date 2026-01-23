'use client';

import { useState, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { getUnseenReferralCountAction } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface SimpleReferral {
    id: string;
    patientName: string;
    createdAt: Date;
    isSeen?: boolean;
}

export function NotificationsMenu() {
    const [open, setOpen] = useState(false);
    const [count, setCount] = useState(0);
    const [recentUnseen, setRecentUnseen] = useState<SimpleReferral[]>([]);
    const router = useRouter();

    const fetchData = async () => {
        const countResult = await getUnseenReferralCountAction();
        if (countResult.success) {
            setCount(countResult.count);
            // In a real app we might fetch the specific items here, 
            // but for now we rely on the user navigating to dashboard to see the details.
            // Or we could add an action to fetch just the top 5 unseen.
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {count > 0 && (
                        <span className="absolute top-0 right-0 h-4 w-4 bg-red-600 text-white text-[10px] flex items-center justify-center rounded-full animate-in zoom-in">
                            {count}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between p-4 bg-muted/30 border-b">
                    <span className="font-semibold text-sm">Notifications</span>
                    {count > 0 && <Badge variant="destructive" className="text-[10px] h-5 px-1.5">{count} New</Badge>}
                </div>
                <div className="max-h-[300px] overflow-y-auto py-2">
                    {count === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-xs italic flex flex-col items-center gap-2">
                            <Bell className="h-8 w-8 opacity-20" />
                            <p>No new notifications</p>
                        </div>
                    ) : (
                        <div className="px-4 py-3 text-sm text-center">
                            <p className="font-medium text-foreground">You have {count} new referral{count !== 1 && 's'}.</p>
                            <p className="text-muted-foreground text-xs mt-1">Check the dashboard list for details.</p>

                            <Button size="sm" className="w-full mt-3" onClick={() => {
                                setOpen(false);
                                router.push('/dashboard?filter=unseen');
                            }}>
                                View All
                            </Button>
                        </div>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
