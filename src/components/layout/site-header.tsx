import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Logo from '@/components/logo';

interface SiteHeaderProps {
  logoUrl?: string;
  companyName?: string;
}

export default function SiteHeader({ logoUrl, companyName }: SiteHeaderProps) {
  return (
    <header className="px-4 lg:px-6 h-16 flex items-center bg-background/80 backdrop-blur-sm sticky top-0 z-50 border-b">
      <Link href="/" className="flex items-center justify-center gap-2" prefetch={false}>
        {logoUrl ? (
          <img src={logoUrl} alt={companyName || "Agency Logo"} className="h-10 md:h-12 w-auto object-contain" />
        ) : (
          <Logo className="h-6 w-6" />
        )}
        <span className="text-lg font-bold font-headline truncate max-w-[120px] sm:max-w-none">{companyName || "ReferralFlow Central"}</span>
      </Link>
      <nav className="ml-auto flex items-center gap-2 sm:gap-6">
        <Button variant="ghost" asChild className="hidden md:flex">
          <Link href="/refer" prefetch={false}>
            Submit Referral
          </Link>
        </Button>
        <Button variant="ghost" asChild className="hidden md:flex">
          <Link href="/status" prefetch={false}>
            Check Status
          </Link>
        </Button>
        <div className="hidden md:block w-px h-6 bg-border" />
        <Button asChild variant="secondary" size="sm" className="h-9 px-4">
          <Link href="/dashboard" prefetch={false}>
            Staff Portal
          </Link>
        </Button>
      </nav>
    </header>
  );
}
