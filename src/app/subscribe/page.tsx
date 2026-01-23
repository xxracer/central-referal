import { headers } from 'next/headers';
import { getAgencySettings } from '@/lib/settings';
import SubscribePageClient from './subscribe-client';

export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
    const headersList = await headers();
    const agencyId = headersList.get('x-agency-id') || 'default';

    if (agencyId === 'default') {
        return {
            title: 'ReferralFlow Subscription',
        };
    }

    const settings = await getAgencySettings(agencyId);
    let companyName = settings.companyProfile.name || 'Agency';

    // EMERGENCY FIX: Explicitly block "Noble Health" from appearing
    if (companyName.toLowerCase().includes('noble')) {
        companyName = 'Subscription';
    }

    return {
        title: `ReferralFlow ${companyName}`,
    };
}

export default async function SubscribePage() {
    const headersList = await headers();
    const agencyId = headersList.get('x-agency-id') || 'default';
    const settings = await getAgencySettings(agencyId);
    const profile = settings.companyProfile;

    return (
        <SubscribePageClient
            logoUrl={profile.logoUrl || "https://static.wixstatic.com/media/c5947c_14731b6192f740d8958b7a069f361b4e~mv2.png"}
            companyName={agencyId === 'default' ? undefined : profile.name}
        />
    );
}
