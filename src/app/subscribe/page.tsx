import { headers } from 'next/headers';
import { getAgencySettings } from '@/lib/settings';
import SubscribePageClient from './subscribe-client';

export const dynamic = 'force-dynamic';

export default async function SubscribePage() {
    const headersList = await headers();
    const agencyId = headersList.get('x-agency-id') || 'default';
    const settings = await getAgencySettings(agencyId);
    const profile = settings.companyProfile;

    return (
        <SubscribePageClient
            logoUrl={profile.logoUrl}
            companyName={profile.name}
        />
    );
}
