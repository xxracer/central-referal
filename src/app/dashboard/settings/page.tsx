import { getAgencySettings } from "@/lib/settings";
import { headers } from "next/headers";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
    const headersList = await headers();
    const agencyId = headersList.get('x-agency-id') || 'default';

    const settings = await getAgencySettings(agencyId);

    return (
        <SettingsClient initialSettings={settings} agencyId={agencyId} />
    );
}
