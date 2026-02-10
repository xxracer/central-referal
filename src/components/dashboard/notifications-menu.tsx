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
import { fetchRecentUnseenReferralsAction, getUnseenReferralCountAction } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, FileText } from 'lucide-react';

export function NotificationsMenu() {
    const [open, setOpen] = useState(false);
    const [count, setCount] = useState(0);
    const [notifications, setNotifications] = useState<any[]>([]);
    const router = useRouter();

    const fetchData = async () => {
        // Fetch count for badge
        const countResult = await getUnseenReferralCountAction();
        if (countResult.success) {
            setCount(countResult.count);
        }

        // Fetch details for list
        const listResult = await fetchRecentUnseenReferralsAction();
        if (listResult.success) {
            setNotifications(listResult.data);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => {
            fetchData();
            router.refresh();
        }, 10000); // 10s polling
        return () => clearInterval(interval);
    }, []);

    const handleItemClick = (id: string) => {
        setOpen(false);
        router.push(`/dashboard/referrals/${id}`);
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {count > 0 && (
                        <span className="absolute top-0 right-0 h-4 w-4 bg-red-600 text-white text-[10px] flex items-center justify-center rounded-full animate-in zoom-in">
                            {count > 9 ? '9+' : count}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0 shadow-lg border-muted">
                <div className="flex items-center justify-between p-4 bg-muted/30 border-b">
                    <span className="font-semibold text-sm">Notifications</span>
                    {count > 0 && <Badge variant="destructive" className="text-[10px] h-5 px-1.5">{count} New</Badge>}
                </div>
                <div className="max-h-[350px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-xs italic flex flex-col items-center gap-2">
                            <Bell className="h-8 w-8 opacity-20" />
                            <p>No new notifications</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-muted/50">
                            {notifications.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleItemClick(item.id)}
                                    className="w-full text-left p-4 hover:bg-muted/50 transition-colors flex items-start gap-4 group"
                                >
                                    <div className={cn("p-2 rounded-full shrink-0",
                                        item.hasUnreadMessages ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                                    )}>
                                        {item.hasUnreadMessages ? <MessageSquare className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors">
                                            {item.patientName}
                                        </p>
                                        <p className="text-xs text-muted-foreground line-clamp-1">
                                            {item.hasUnreadMessages ? "New message received" : "New referral received"}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/70">
                                            {formatDate(item.updatedAt || item.createdAt)}
                                        </p>
                                    </div>
                                    {(!item.isSeen && !item.hasUnreadMessages) && (
                                        <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-2 border-t bg-muted/10">
                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => {
                        setOpen(false);
                        router.push('/dashboard');
                    }}>
                        View All Activity
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// Helper utility
function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}
