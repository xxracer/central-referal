import { headers } from 'next/headers';
import { getAgencySettings } from '@/lib/settings';
import ReferralForm from './referral-form';

export const dynamic = 'force-dynamic';

export default async function ReferPage() {
  const headersList = await headers();
  // Middleware should interpret subdomain and set this header.
  // If accessing directly or no subdomain, it might be 'default' or undefined.
  // Middleware logic: if no subdomain, x-agency-id might not be set?
  // Let's fallback to 'default'.
  const agencyId = headersList.get('x-agency-id') || 'default';

  console.log(`[ReferPage] Accessing with AgencyID: ${agencyId}`);
  const settings = await getAgencySettings(agencyId);

  if (settings.subscription.status === 'SUSPENDED') {
    const { redirect } = await import('next/navigation');
    redirect('/suspended');
  }
  console.log(`[ReferPage] Fetched Settings for ${agencyId}:`, JSON.stringify(settings.configuration?.acceptedInsurances));

  return <ReferralForm settings={settings} />;
}
