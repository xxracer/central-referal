import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import SiteHeader from '@/components/layout/site-header';

export default function Home() {
  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero');

  return (
    <div className="flex flex-col min-h-dvh">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative w-full py-20 md:py-32 lg:py-40">
          <div className="container px-4 md:px-6">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="flex flex-col items-start justify-center space-y-6">
                <div className="space-y-4">
                  <h1 className="font-headline text-4xl font-bold tracking-tighter text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
                    ReferralFlow Central
                  </h1>
                  <p className="max-w-[600px] text-foreground/80 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    Streamlining medical referrals with an intelligent, easy-to-use platform. Submit and track your patient referrals seamlessly.
                  </p>
                </div>
                <div className="flex flex-col gap-4 min-[400px]:flex-row">
                  <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Link href="/refer">
                      Submit a Referral
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button asChild variant="secondary" size="lg">
                    <Link href="/status">
                      Check Referral Status
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-center">
                {heroImage && (
                  <Image
                    alt={heroImage.description}
                    className="mx-auto aspect-[4/3] overflow-hidden rounded-xl object-cover"
                    src={heroImage.imageUrl}
                    width={600}
                    height={450}
                    data-ai-hint={heroImage.imageHint}
                  />
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex items-center justify-center py-6 border-t">
        <p className="text-sm text-foreground/60">&copy; {new Date().getFullYear()} ReferralFlow Central. All rights reserved.</p>
      </footer>
    </div>
  );
}
