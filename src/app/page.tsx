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
import ContactSection from '@/components/landing/contact-section';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const headersList = await headers();
  const agencyId = headersList.get('x-agency-id') || 'default';
  const settings = await getAgencySettings(agencyId);
  const profile = settings.companyProfile;
  const subscription = settings.subscription;

  const resolvedParams = await searchParams;
  const showPortal = resolvedParams.portal === 'true' && process.env.NODE_ENV === 'development';

  // 1. Landing Page Logic (Highest Priority)
  // Show main product landing page only if it's the root domain (default agency)
  // UNLESS the 'portal' query param is set to true (only in dev).
  if (!showPortal && agencyId === 'default') {
    return <LandingPage />;
  }

  // 2. Subscription Check
  if (subscription.status === 'SUSPENDED') {
    const { redirect } = await import('next/navigation');
    redirect('/suspended');
  }

  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero');

  return (
    <div className="flex flex-col min-h-dvh bg-gradient-to-b from-background to-muted/20">
      <SiteHeader logoUrl={profile.logoUrl} companyName={profile.name} />
      <main className="flex-1 relative overflow-hidden">
        {/* Decorative background elements for "WOW" factor */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] -z-10" />

        <section className="relative w-full py-12 md:py-24 lg:py-32 overflow-hidden">
          <div className="container px-4 md:px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
              <div className="relative flex flex-col items-start justify-center space-y-8">
                {/* Local Watermark */}
                {profile.logoUrl && (
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] opacity-[0.04] pointer-events-none -z-10 grayscale flex items-center justify-center">
                    <Image src={profile.logoUrl} alt="" fill className="object-contain" />
                  </div>
                )}
                <div className="space-y-6 relative z-10">
                  {profile.logoUrl && (
                    <div className="mb-4 inline-block p-2 bg-white rounded-xl shadow-sm border border-primary/10">
                      <Image
                        src={profile.logoUrl}
                        alt={`${profile.name} Logo`}
                        width={240}
                        height={100}
                        className="h-16 md:h-20 w-auto object-contain"
                      />
                    </div>
                  )}
                  <div className="space-y-3">
                    <h2 className="text-gray-600 font-black uppercase tracking-[0.2em] text-sm">Official Referral Portal</h2>
                    <h1 className="font-headline text-4xl font-bold tracking-tighter text-foreground sm:text-5xl md:text-6xl break-words hyphens-auto">
                      {profile.name || "ReferralFlow Central"}
                    </h1>
                  </div>
                  <p className="max-w-[550px] text-foreground/80 text-lg md:text-xl leading-relaxed">
                    {agencyId === 'default'
                      ? "Streamlining medical referrals with an intelligent, easy-to-use platform. Submit and track your patient referrals seamlessly."
                      : `Connecting ${profile.name} with healthcare partners for secure, efficient patient referral intake and real-time status tracking.`}
                  </p>
                </div>
                <div className="flex flex-col gap-4 w-full sm:flex-row">
                  <Button asChild size="lg" className="h-14 px-8 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-full transition-all hover:scale-105 active:scale-95">
                    <Link href="/subscribe" prefetch={false}>
                      Get Started
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-14 px-8 border-primary/20 hover:bg-primary/5 rounded-full transition-all hover:scale-105 active:scale-95">
                    <Link href="/status" prefetch={false}>
                      Track Status
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative">
                  {heroImage && (
                    <Image
                      alt={profile.name || heroImage.description}
                      className="mx-auto w-full h-auto rounded-2xl shadow-2xl"
                      src={heroImage.imageUrl}
                      width={600}
                      height={450}
                      priority
                    />
                  )}
                </div>
              </div>
            </div>

            {profile.homeInsurances && profile.homeInsurances.length > 0 && (
              <div className="mt-20 w-full animate-in fade-in slide-in-from-bottom-5 duration-1000">
                <Card className="relative border-primary/10 bg-white/60 backdrop-blur-md shadow-2xl overflow-hidden rounded-[2.5rem]">
                  <div className="absolute inset-0 bg-grid-primary/[0.02] bg-[size:30px_30px]" />
                  <div className="relative p-10 md:p-12 flex flex-col md:flex-row items-center gap-10">
                    <div className="flex-shrink-0 text-center md:text-left space-y-2">
                      <h3 className="text-xs font-black uppercase tracking-[0.25em] text-primary/60">Coverage Network</h3>
                      <p className="text-3xl font-headline font-bold text-foreground">Insurances Accepted</p>
                    </div>
                    <div className="hidden md:block w-px h-20 bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                      {profile.homeInsurances.map(ins => (
                        <Badge
                          key={ins}
                          variant="secondary"
                          className="bg-primary/5 hover:bg-primary/15 border-transparent text-primary px-6 py-2.5 rounded-full text-sm font-bold shadow-sm transition-all duration-300 hover:-translate-y-1 cursor-default"
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
        <ContactSection />
      </main>
      <footer className="flex flex-col items-center justify-center py-8 border-t bg-background/50 backdrop-blur-sm gap-4">
        <div className="flex gap-6 text-sm font-medium text-foreground/70">
          <Link href="https://referralflow.health/contact" className="hover:text-primary transition-colors">Contact Us</Link>
        </div>
        <p className="text-sm text-foreground/50 tracking-wide">&copy; {new Date().getFullYear()} {profile.name || "ReferralFlow Central"}. Excellence in care coordination.</p>
      </footer>
    </div>
  );
}
