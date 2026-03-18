import { Suspense } from 'react';
import { headers } from 'next/headers';
import { getReferralSourcesWithMetrics } from '@/lib/referral-sources-data';
import ReferralSourcesList from '@/components/referral-sources/referral-sources-list';
import { Loader2 } from 'lucide-react';
import type { Metadata } from 'next';
import { getAgencySettings } from '@/lib/settings';
import { verifySession } from '@/lib/auth-actions';

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

    const settings = await getAgencySettings(agencyId);
    const plan = settings.subscription?.plan || 'BASIC_MONTHLY';

    // Super Admin always has access; eligible plans are PRO_REFERRAL and BASIC_ANNUAL
    const session = await verifySession();
    const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const isSuperAdmin = session?.email && adminEmail && session.email.toLowerCase() === adminEmail.toLowerCase();
    const isEligible = plan === 'PRO_REFERRAL' || plan === 'BASIC_ANNUAL';

    if (!isEligible && !isSuperAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed rounded-3xl bg-white/50 space-y-4 text-center p-8">
                <div className="bg-blue-50 p-4 rounded-full">
                    <Loader2 className="h-10 w-10 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Referral Sources is a Premium Feature</h3>
                <p className="text-slate-500 max-w-md">Upgrade to the Annual Plan or Pro Monthly Plan to track metrics and manage your referral partners.</p>
                <div className="flex gap-4">
                    <button className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">View Plans</button>
                </div>
            </div>
        );
    }

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
