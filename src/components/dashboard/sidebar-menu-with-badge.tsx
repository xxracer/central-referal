'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, ClipboardList } from 'lucide-react';
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

        // Optional: Poll every 30 seconds
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, [pathname]);

    return (
        <>
            <SidebarMenuItem>
                <SidebarMenuButton 
                    asChild 
                    tooltip="Analytics"
                    isActive={pathname === '/dashboard'}
                >
                    <Link href="/dashboard">
                        <LayoutDashboard className="size-4" />
                        <span>Analytics</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
                <SidebarMenuButton 
                    asChild 
                    tooltip="Referrals"
                    isActive={pathname === '/dashboard/referrals'}
                >
                    <Link href="/dashboard/referrals">
                        <ClipboardList className="size-4" />
                        <span>Referrals</span>
                    </Link>
                </SidebarMenuButton>
                {count > 0 && (
                    <SidebarMenuBadge className="bg-red-500 text-white hover:bg-red-600 hover:text-white transition-colors duration-200">
                        {count}
                    </SidebarMenuBadge>
                )}
            </SidebarMenuItem>
        </>
    );
}
