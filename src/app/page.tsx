import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import SiteHeader from '@/components/layout/site-header';
import { headers } from 'next/headers';
import { getAgencySettings } from '@/lib/settings';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import LandingPage from '@/components/landing/landing-page';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const headersList = await headers();
  const agencyId = headersList.get('x-agency-id') || 'default';
  const settings = await getAgencySettings(agencyId);
  const profile = settings.companyProfile;
  const subscription = settings.subscription;

  if (subscription.status === 'SUSPENDED') {
    const { redirect } = await import('next/navigation');
    redirect('/suspended');
  }

  const resolvedParams = await searchParams;
  const showPortal = resolvedParams.portal === 'true';

  // Show landing page if it's the default agency or if the agency is on a FREE plan (unsubscribed)
  // UNLESS the 'portal' query param is set to true.
  if (!showPortal && (agencyId === 'default' || subscription.plan === 'FREE')) {
    return <LandingPage />;
  }

  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero');

  return (
    <div className="flex flex-col min-h-dvh">
      <SiteHeader logoUrl={profile.logoUrl} companyName={profile.name} />
      <main className="flex-1">
        <section className="relative w-full py-20 md:py-32 lg:py-40">
          <div className="container px-4 md:px-6">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="flex flex-col items-start justify-center space-y-6">
                <div className="space-y-4">
                  <h1 className="font-headline text-4xl font-bold tracking-tighter text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
                    {profile.name || "ReferralFlow Central"}
                  </h1>
                  <p className="max-w-[600px] text-foreground/80 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    {agencyId === 'default'
                      ? "Streamlining medical referrals with an intelligent, easy-to-use platform. Submit and track your patient referrals seamlessly."
                      : `Connecting ${profile.name} with providers for seamless, intelligent patient referral intake and tracking.`}
                  </p>
                </div>
                <div className="flex flex-col gap-4 min-[400px]:flex-row">
                  <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Link href="/refer" prefetch={false}>
                      Submit a Referral
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button asChild variant="secondary" size="lg">
                    <Link href="/status" prefetch={false}>
                      Check Referral Status
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-center">
                {heroImage && (
                  <Image
                    alt={profile.name || heroImage.description}
                    className="mx-auto aspect-[4/3] overflow-hidden rounded-xl object-cover"
                    src={profile.logoUrl || heroImage.imageUrl}
                    width={600}
                    height={450}
                    data-ai-hint={heroImage.imageHint}
                  />
                )}
              </div>
            </div>

            {profile.homeInsurances && profile.homeInsurances.length > 0 && (
              <div className="mt-20 w-full animate-in fade-in slide-in-from-bottom-5 duration-700">
                <Card className="relative border-primary/10 bg-gradient-to-br from-card to-background shadow-xl overflow-hidden rounded-[2rem]">
                  <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
                  <div className="relative p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                    <div className="flex-shrink-0 text-center md:text-left space-y-1">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary/60">Coverage Partners</h3>
                      <p className="text-3xl font-headline font-bold text-foreground whitespace-nowrap">We Proudly Accept</p>
                    </div>
                    <div className="hidden md:block w-px h-16 bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                      {profile.homeInsurances.map(ins => (
                        <Badge
                          key={ins}
                          variant="outline"
                          className="bg-background/80 hover:bg-primary/10 hover:border-primary/40 border-primary/20 text-foreground px-5 py-2 rounded-full text-sm font-semibold shadow-sm transition-all duration-300 hover:-translate-y-1 cursor-default"
                        >
                          {ins}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </section>
      </main>
      <footer className="flex items-center justify-center py-6 border-t">
        <p className="text-sm text-foreground/60">&copy; {new Date().getFullYear()} {profile.name || "ReferralFlow Central"}. All rights reserved.</p>
      </footer>
    </div>
  );
}
