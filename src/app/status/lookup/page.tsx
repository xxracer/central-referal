import { headers } from 'next/headers';
import { getAgencySettings } from '@/lib/settings';
import LookupClient from '@/app/status/lookup/lookup-client';

export const dynamic = 'force-dynamic';

export default async function LookupPage() {
    const headersList = await headers();
    const agencyId = headersList.get('x-agency-id') || 'default';
    const settings = await getAgencySettings(agencyId);

    if (settings.subscription.status === 'SUSPENDED' || settings.subscription.status === 'CANCELLED') {
        const { redirect } = await import('next/navigation');
        redirect('/suspended');
    }

    return <LookupClient settings={settings} />;
}
