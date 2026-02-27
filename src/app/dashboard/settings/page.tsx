import { getAgencySettings } from "@/lib/settings";
import { headers } from "next/headers";
import SettingsClient from "./settings-client";
import { getAgencySubscriptionDetails } from '@/lib/stripe-actions';

export default async function SettingsPage() {
    const headersList = await headers();
    const agencyId = headersList.get('x-agency-id') || 'default';

    const settings = await getAgencySettings(agencyId);

    // Fetch live Stripe data for the Plan tab
    let subscriptionData = null;
    if (agencyId !== 'default') {
        subscriptionData = await getAgencySubscriptionDetails();
    }

    return (
        <SettingsClient
            initialSettings={settings}
            agencyId={agencyId}
            subscriptionData={subscriptionData?.success ? subscriptionData.data : undefined}
        />
    );
}
