import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import SiteHeader from '@/components/layout/site-header';
import { headers } from 'next/headers';
import { getAgencySettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function ReferralSuccessPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const headersList = await headers();
    const agencyId = headersList.get('x-agency-id') || 'default';
    const settings = await getAgencySettings(agencyId);
    const profile = settings.companyProfile;

    return (
        <div className="flex flex-col min-h-dvh">
            <SiteHeader logoUrl={profile.logoUrl} companyName={profile.name} />
            <main className="flex-1 flex items-center justify-center py-12 px-4">
                <Card className="w-full max-w-lg text-center shadow-lg">
                    <CardHeader className="items-center">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                        <CardTitle className="font-headline text-3xl">Referral Submitted Successfully</CardTitle>
                        <CardDescription>
                            Your referral for {profile.name} has been received and is now being processed.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-muted p-4 rounded-md">
                            <p className="text-sm text-muted-foreground">Your Referral ID is:</p>
                            <p className="text-2xl font-bold font-mono tracking-wider text-primary-foreground bg-primary rounded-md py-2">{params.id}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                                Please save this ID. You can use it to check the status of your referral.
                            </p>
                        </div>
                        <div className="flex gap-4 justify-center">
                            <Button asChild>
                                <Link href={`/status?id=${params.id}`}>Check Status Now</Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href="/refer">Submit Another Referral</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </main>
            <footer className="footer-class mt-auto py-6 border-t">
                <p className="text-center text-sm text-muted-foreground">
                    &copy; {new Date().getFullYear()} {profile.name}. All rights reserved.
                </p>
            </footer>
        </div>
    );
}
