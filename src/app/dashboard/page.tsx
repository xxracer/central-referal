
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

            <Card className="bg-white border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] rounded-2xl overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-slate-50/50 border-b border-slate-100 p-6">
                    <div>
                        <CardTitle className="text-lg font-bold text-slate-900 tracking-tight">Active Referrals</CardTitle>
                        <CardDescription className="text-slate-500 font-medium mt-1">
                            {referrals.length === 0 ? 'No referrals found matching your criteria.' : `Showing ${referrals.length} active referrals.`}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="hidden md:flex items-center justify-between px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 font-bold text-[11px] text-slate-400 uppercase tracking-widest">
                        <div className="grid grid-cols-12 gap-5 w-full items-center">
                            <div className="col-span-2">Referral ID</div>
                            <div className="col-span-2">Patient Name</div>
                            <div className="col-span-3">Source</div>
                            <div className="col-span-2">Insurance</div>
                            <div className="col-span-2">Date Received</div>
                            <div className="col-span-1 text-right">Status</div>
                        </div>
                        <div className="w-4 shrink-0 ml-0 transition-transform duration-200" /> {/* Accordion chevron spacer to align columns correctly */}
                    </div>
                    {referrals.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                            {referrals.map((referral) => (
                                <ReferralListItem key={referral.id} referral={referral} />
                            ))}
                        </Accordion>
                    ) : (
                        <div className="text-center py-24 flex flex-col items-center justify-center text-slate-500 gap-4 bg-slate-50/30">
                            <div className="h-16 w-16 bg-white border border-slate-100 shadow-sm rounded-full flex items-center justify-center">
                                <FileText className="h-8 w-8 text-slate-300" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-lg font-semibold text-slate-700">No active referrals</p>
                                <p className="text-sm">Adjust your filters or check back later.</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
