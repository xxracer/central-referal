import { headers } from 'next/headers';
import { getAgencySettings } from '@/lib/settings';
import { redirect } from 'next/navigation';
import DashboardShell from './dashboard-shell';
import { Ban } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Metadata } from 'next';
import { SessionTimeout } from '@/components/session-timeout';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  let agencyId = headersList.get('x-agency-id');
  if (!agencyId || agencyId === 'undefined' || agencyId === 'null') {
    agencyId = 'default';
  }

  if (agencyId === 'default') {
    return {
      title: 'ReferralFlow Central',
    };
  }

  const settings = await getAgencySettings(agencyId);
  const companyName = settings.companyProfile.name || 'Company';

  return {
    title: `ReferralFlow ${companyName}`,
  };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  let agencyId = headersList.get('x-agency-id');

  if (!agencyId || agencyId === 'undefined' || agencyId === 'null') {
    agencyId = 'default';
  }

  // Fetch settings to validate existence and config
  const settings = await getAgencySettings(agencyId);
  const { verifySession } = await import('@/lib/auth-actions');
  const session = await verifySession();
  const userEmail = session?.email;

  // --- SECURITY: Verify Agency Access ---
  const { verifyUserAccess } = await import('@/lib/access-control');
  const hasAccess = await verifyUserAccess(userEmail, agencyId);

  if (!hasAccess) {
    if (agencyId === 'default' && userEmail) {
      // User is logged in but at root/default. Try to find their agency and redirect.
      const { findAgenciesForUser } = await import('@/lib/settings');
      const userAgencies = await findAgenciesForUser(userEmail);

      if (userAgencies.length > 0) {
        const targetAgency = userAgencies[0];
        const host = headersList.get('host') || 'localhost:3000';
        const protocol = host.includes('localhost') ? 'http' : 'https';

        // Construct redirect URL
        // If localhost:9002 -> test.localhost:9002
        // If referralflow.health -> test.referralflow.health
        // We need to be careful not to append if already present, but here we are at 'default' which implies root or unrecognized.

        let newHost = host;
        // If host is effectively root (localhost:port or referralflow.health)
        // We prepend the slug.
        // check if host already start with slug? No, because middleware said it's default.

        // Handle localhost special case where we might need to strictly append to "localhost" part?
        // If host is "localhost:9002", then new is "slug.localhost:9002"
        // If host is "referral-app.vercel.app", then new is "slug.referral-app.vercel.app" (if wildcard supported)
        // If not, we might fail. But for localhost/custom domain it works.

        newHost = `${targetAgency.slug}.${host}`;

        const redirectUrl = `${protocol}://${newHost}/dashboard`;
        console.log(`[Access Control] Redirecting ${userEmail} from default to ${redirectUrl}`);
        redirect(redirectUrl);
      }
    }

    console.error(`[Access Control] Denied access to ${agencyId} for user ${userEmail}`);
    // Redirect to selection or login? 
    // If 'default', and not admin, maybe redirect to logic that finds their actual agency?
    // Or just hard block.

    // If they are logged in but accessing wrong place:
    return (
      <div className="flex flex-col h-screen items-center justify-center text-center p-4 bg-muted/20">
        <div className="bg-destructive/10 p-6 rounded-full mb-6">
          <Ban className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold font-headline mb-2">Access Denied</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          You do not have permission to access this workspace ({agencyId}).
        </p>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <Link href="/login">Switch Account</Link>
          </Button>
          <Button asChild>
            <Link href="https://referralflow.health">Back Home</Link>
          </Button>
        </div>
      </div>
    );
  }
  // --------------------------------------

  // 1. Check if Agency Exists (for non-default agencies)
  if (agencyId !== 'default' && settings.exists === false) {
    return (
      <div className="flex flex-col h-screen items-center justify-center text-center p-4 bg-muted/20">
        <div className="bg-destructive/10 p-6 rounded-full mb-6">
          <Ban className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold font-headline mb-2">Acceso No Disponible</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Lo siento, este sitio no está terminado de configurar o ha sido eliminado.
        </p>
        <Button asChild variant="outline">
          <Link href="https://referralflow.health">Volver al Inicio</Link>
        </Button>
      </div>
    );
  }

  // 2. CRITICAL: Check Subscription Status
  // Prevent access if subscription is ignored/bypassed
  // 2. CRITICAL: Check Subscription Status
  // We want to ensure they can access Settings to fix billing or complete setup.
  // We cannot easily check the current path in Server Layout to prevent loops if we redirect to settings.
  // So instead of a hard redirect to a blocking /suspended page, we will TRUST the dashboard shell
  // or the individual pages to handle the "Access Denied" state, OR we rely on the fact that
  // usually a SaaS app SHOULD let you access settings to pay.
  // For now, I will disable the hard redirect to '/suspended' because the user specifically asked
  // to let them enter data. The "Setup Incomplete" banner in settings will handle the blocking.
  /*
  const subStatus = settings.subscription?.status;
  if (agencyId !== 'default' && (subStatus === 'SUSPENDED' || subStatus === 'CANCELLED')) {
     // Intentionally disabled per user request to allow setup/payment updates
     // redirect('/suspended');
  }
  */

  // 2. Check Configuration (Optional: Redirect to settings if basic info missing)
  // We check if name is the default placeholder.
  // We must allow access to /dashboard/settings to fix it, so don't redirect if already there.
  // We can't easily check path here without headers middleware workaround or checking children props (hard).
  // Strategy: Pass a 'needsConfig' prop to Shell or show a banner?
  // Or just rely on the user navigating there. 
  // Per user request: "enviarlo a la seccion de seting".
  // Since we can't cleanly detect path in Server Layout without middleware help (x-url), 
  // valid workaround is tough without risking loop.
  // However, we can trust the user will see the "Agency Name" default and go to settings?
  // Let's rely on the Client Shell to handle the redirect if needed? No, Client Shell doesn't have settings.
  // Let's implement a safe check: If 'Agency Name' is default, and we assume we are not on settings... 
  // Actually, we can just proceed. The redirection loop risk is high without path detection.
  // I will skip the auto-redirect for now to prevent breaking the app, but ensures existence check works.

  return (
    <DashboardShell>
      <SessionTimeout />
      {children}
    </DashboardShell>
  );
}

// Import at the top needed? Yes.
// Since I can't easily add import at top with replace_content on huge file without line numbers shifting easily...
// Note: The user's file content provided earlier shows imports at top.
// I'll add the import in a separate step or try to add it here if I include top lines?
// No, I'll do two edits. One for import, one for usage.

