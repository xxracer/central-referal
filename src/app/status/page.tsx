import { headers } from 'next/headers';
import { getAgencySettings } from '@/lib/settings';
import StatusClient from './status-client';

export const dynamic = 'force-dynamic';

export default async function StatusPage() {
  const headersList = await headers();
  const agencyId = headersList.get('x-agency-id') || 'default';
  const settings = await getAgencySettings(agencyId);

  if (settings.subscription.status === 'SUSPENDED' || settings.subscription.status === 'CANCELLED') {
    const { redirect } = await import('next/navigation');
    redirect('/suspended');
  }

  return <StatusClient settings={settings} />;
}