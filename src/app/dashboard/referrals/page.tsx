
export const dynamic = 'force-dynamic';

import { getReferrals } from '@/lib/data';
import Link from 'next/link';
import {
    Accordion,
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
import { FileText, PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import DashboardFilters from '@/components/dashboard/dashboard-filters';
import ExportCsvButton from '@/components/dashboard/export-csv-button';
import PageSizeSelector from '@/components/dashboard/page-size-selector';

export default async function ReferralsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;
    const search = params.search as string;
    const startDateStr = params.startDate as string;
    const endDateStr = params.endDate as string;
    const page = parseInt(params.page as string || '1');
    const pageSize = parseInt(params.pageSize as string || '10');

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const { headers } = await import('next/headers');
    const headersList = await headers();
    let agencyId = headersList.get('x-agency-id');
    if (!agencyId || agencyId === 'undefined' || agencyId === 'null') {
        agencyId = 'default';
    }

    let allReferrals = await getReferrals(agencyId, { startDate, endDate, isArchived: false });

    if (search) {
        const q = search.toLowerCase();
        allReferrals = allReferrals.filter(r =>
            r.patientName.toLowerCase().includes(q) ||
            r.id.toLowerCase().includes(q) ||
            r.referrerName.toLowerCase().includes(q)
        );
    }

    // Pagination logic
    const totalItems = allReferrals.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const paginatedReferrals = allReferrals.slice((page - 1) * pageSize, page * pageSize);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-headline">Referral Management</h1>
                    <p className="text-muted-foreground">
                        Browse and manage all patient referrals.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <ExportCsvButton data={allReferrals} />
                    <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                        <Link href="/refer">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New Referral
                        </Link>
                    </Button>
                </div>
            </div>

            <DashboardFilters />

            <Card className="bg-white border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] rounded-2xl overflow-hidden text-slate-900 leading-normal">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 bg-slate-50/50 border-b border-slate-100 p-6">
                    <div>
                        <CardTitle className="text-lg font-bold text-slate-900 tracking-tight">Active Referrals</CardTitle>
                        <CardDescription className="text-slate-500 font-medium mt-1">
                            {totalItems === 0 ? 'No referrals found matching your criteria.' : `Showing ${((page - 1) * pageSize) + 1} to ${Math.min(page * pageSize, totalItems)} of ${totalItems} referrals.`}
                        </CardDescription>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <PageSizeSelector initialSize={pageSize} />
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
                        <div className="w-4 shrink-0 ml-0 transition-transform duration-200" />
                    </div>
                    {paginatedReferrals.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                            {paginatedReferrals.map((referral) => (
                                <ReferralListItem key={referral.id} referral={referral} />
                            ))}
                        </Accordion>
                    ) : (
                        <div className="text-center py-24 flex flex-col items-center justify-center text-slate-500 gap-4 bg-slate-50/30">
                            <div className="h-16 w-16 bg-white border border-slate-100 shadow-sm rounded-full flex items-center justify-center">
                                <FileText className="h-8 w-8 text-slate-300" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-lg font-semibold text-slate-700">No referrals found</p>
                                <p className="text-sm">Adjust your filters or check back later.</p>
                            </div>
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 p-6 border-t border-slate-100 bg-slate-50/30">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                asChild
                                disabled={page === 1}
                                className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                            >
                                <Link 
                                    href={{
                                        pathname: '/dashboard/referrals',
                                        query: { ...params, page: page - 1 }
                                    }}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Previous
                                </Link>
                            </Button>
                            
                            <div className="flex items-center gap-1 mx-4">
                                <span className="text-sm font-bold text-slate-600">Page {page} of {totalPages}</span>
                            </div>

                            <Button 
                                variant="outline" 
                                size="sm" 
                                asChild
                                disabled={page === totalPages}
                                className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
                            >
                                <Link 
                                    href={{
                                        pathname: '/dashboard/referrals',
                                        query: { ...params, page: page + 1 }
                                    }}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
