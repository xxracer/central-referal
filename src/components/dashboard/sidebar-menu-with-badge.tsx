'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Home } from 'lucide-react';
import { usePathname } from 'next/navigation';
import {
    SidebarMenuButton,
    SidebarMenuBadge,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { getUnseenReferralCountAction } from '@/lib/actions';

export function SidebarMenuWithBadge() {
    const [count, setCount] = useState(0);
    const pathname = usePathname();

    useEffect(() => {
        const fetchCount = async () => {
            const result = await getUnseenReferralCountAction();
            if (result.success) {
                setCount(result.count);
            }
        };

        // Fetch on mount
        fetchCount();

        // Optional: Poll every 30 seconds to keep it somewhat fresh
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, [pathname]); // Refetch when navigating, as marking as seen might change the count

    return (
        <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Dashboard">
                <Link href="/dashboard">
                    <Home />
                    <span>Dashboard</span>
                </Link>
            </SidebarMenuButton>
            {count > 0 && (
                <SidebarMenuBadge className="bg-red-500 text-white hover:bg-red-600 hover:text-white">
                    {count}
                </SidebarMenuBadge>
            )}
        </SidebarMenuItem>
    );
}
