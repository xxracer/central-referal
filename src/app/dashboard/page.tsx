
export const dynamic = 'force-dynamic';

import { getReferrals } from '@/lib/data';
import Link from 'next/link';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import ReferralListItem from '@/components/dashboard/referral-list-item';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/referrals/status-badge';
import { formatDate } from '@/lib/utils';
import { FileText, PlusCircle, User, Stethoscope, Building, Download, ExternalLink, AlertCircle, Clock } from 'lucide-react';
import type { Referral } from '@/lib/types';
import DashboardFilters from '@/components/dashboard/dashboard-filters';
import DashboardAnalytics from '@/components/dashboard/dashboard-analytics';
import ExportCsvButton from '@/components/dashboard/export-csv-button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';



export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;
    const search = params.search as string;
    const startDateStr = params.startDate as string;
    const endDateStr = params.endDate as string;

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const { headers } = await import('next/headers');
    const headersList = await headers();
    let agencyId = headersList.get('x-agency-id');
    if (!agencyId || agencyId === 'undefined' || agencyId === 'null') {
        agencyId = 'default';
    }

    const referrals = await getReferrals(agencyId, { startDate, endDate, isArchived: false });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-headline font-bold text-slate-900 tracking-tight">Performance Analytics</h1>
                    <p className="text-muted-foreground font-medium">
                        Operational insights and key performance indicators.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm">
                        <Link href="/refer">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New Referral
                        </Link>
                    </Button>
                </div>
            </div>

            <DashboardFilters />

            <DashboardAnalytics referrals={referrals} />
        </div>
    );
}
