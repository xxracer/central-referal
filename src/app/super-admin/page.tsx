import { getAllAgencies } from './actions';
import SuperAdminClient from './super-admin-client';

export const dynamic = 'force-dynamic';
export const metadata = {
    title: 'Super Admin | ReferralFlow Central',
    description: 'Global control center for ReferralFlow agencies.'
};

export default async function SuperAdminDashboard() {
    const agencies = await getAllAgencies();

    return <SuperAdminClient initialAgencies={agencies} />;
}
