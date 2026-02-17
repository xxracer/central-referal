import { notFound } from 'next/navigation';
import { getReferralById } from '@/lib/data';
import ReferralDetailClient from './referral-detail-client';

export const dynamic = 'force-dynamic';

export default async function ReferralDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) notFound();

  const referral = await getReferralById(id);

  if (!referral) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <ReferralDetailClient referral={referral} />
    </div>
  );
}
