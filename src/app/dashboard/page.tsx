
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

    let referrals = await getReferrals(agencyId, { startDate, endDate, isArchived: false });

    if (search) {
        const q = search.toLowerCase();
        referrals = referrals.filter(r =>
            r.patientName.toLowerCase().includes(q) ||
            r.id.toLowerCase().includes(q) ||
            r.referrerName.toLowerCase().includes(q)
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-headline">Staff Dashboard</h1>
                    <p className="text-muted-foreground">
                        Manage and track patient referrals.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <ExportCsvButton data={referrals} />
                    <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                        <Link href="/refer">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New Referral
                        </Link>
                    </Button>
                </div>
            </div>

            <DashboardFilters />

            <Card className="border-primary/10 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle>Active Referrals</CardTitle>
                        <CardDescription>
                            {referrals.length === 0 ? 'No referrals found matching your criteria.' : `Showing ${referrals.length} active referrals.`}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-muted/50 font-medium text-xs text-muted-foreground uppercase tracking-wider rounded-t-md">
                        <div className="col-span-1">ID</div>
                        <div className="col-span-2">Name</div>
                        <div className="col-span-3">Source</div>
                        <div className="col-span-2">Insurance</div>
                        <div className="col-span-2">Date</div>
                        <div className="col-span-2 text-right">Status</div>
                    </div>
                    {referrals.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                            {referrals.map((referral) => (
                                <ReferralListItem key={referral.id} referral={referral} />
                            ))}
                        </Accordion>
                    ) : (
                        <div className="text-center h-32 flex flex-col items-center justify-center text-muted-foreground gap-2">
                            <FileText className="h-8 w-8 opacity-20" />
                            <p>No referrals found.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
