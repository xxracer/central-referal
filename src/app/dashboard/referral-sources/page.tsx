import { Suspense } from 'react';
import { headers } from 'next/headers';
import { getReferralSourcesWithMetrics } from '@/lib/referral-sources-data';
import ReferralSourcesList from '@/components/referral-sources/referral-sources-list';
import { Loader2 } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Referral Sources | ReferralFlow',
};

type PageProps = {
    searchParams: Promise<{ search?: string; status?: string; type?: string }>;
};

async function ReferralSourcesDataLoader({ searchParams }: PageProps) {
    const headersList = await headers();
    const agencyId = headersList.get('x-agency-id') || 'default';
    const params = await searchParams;

    const sources = await getReferralSourcesWithMetrics(agencyId, {
        search: params.search,
        status: params.status as any,
        type: params.type as any,
    });

    return (
        <ReferralSourcesList initialSources={sources} agencyId={agencyId} />
    );
}

export default async function ReferralSourcesPage({ searchParams }: PageProps) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight font-headline">Referral Sources</h2>
                    <p className="text-muted-foreground">Manage your referral sources and track activity metrics.</p>
                </div>
            </div>

            <Suspense fallback={
                <div className="flex h-[400px] w-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            }>
                <ReferralSourcesDataLoader searchParams={searchParams} />
            </Suspense>
        </div>
    );
}
