'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/logo';
import { signInWithGoogle } from '@/firebase/auth/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.986,36.69,44,30.836,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
);


// ... (imports remain matching existing file mostly, adding checkUserAgencies)
import { checkUserAgencies } from './actions';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ... GoogleIcon component ... (omit for brevity if I can reuse, but replace tool needs full context if not precise. I will provide full file content mostly or targeted replace)

export default function LoginPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [userAgencies, setUserAgencies] = useState<any[]>([]);
    const [showSelection, setShowSelection] = useState(false);

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        try {
            const { user } = await signInWithGoogle();

            if (user && user.email) {
                // Check if user belongs to any agencies
                const { agencies } = await checkUserAgencies(user.email);

                if (agencies.length > 0) {
                    if (agencies.length === 1) {
                        // Auto-redirect if only one
                        const agency = agencies[0];
                        handleAgencySelect(agency);
                        return;
                    }
                    // Multiple agencies found -> Show selection
                    setUserAgencies(agencies);
                    setShowSelection(true);
                    setIsLoading(false);
                    return;
                }

                // No agencies found
                // If special admin
                if (user.email === 'maijelcancines2@gmail.com') {
                    router.push('/super-admin');
                    return;
                }

                // If truly new/no agency -> Subscribe
                router.push('/subscribe');
                toast({
                    title: "Welcome",
                    description: "Please create your agency workspace.",
                });
            }
        } catch (error: any) {
            console.error("Google Sign-In Error:", error);
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: error.message || "Failed to sign in.",
            });
            setIsLoading(false);
        }
    };

    const handleAgencySelect = (agency: any) => {
        toast({
            title: "Logging in...",
            description: `Accessing ${agency.name}`,
        });

        // Construct URL based on environment
        // In dev: localhost:3000/dashboard (cookies handled? or header params?)
        // In prod: subdomain.referralflow.health/dashboard

        // Actually, for now, our app relies on the domain being visited.
        // If I am at 'app.referralflow.health' and I select 'care.referralflow.health', I need to validly redirect there.
        // Redirecting to the full URL is best.

        const protocol = window.location.protocol;
        const host = window.location.host; // e.g. localhost:3000 or app.referralflow.health

        let targetUrl = '/dashboard';

        if (host.includes('localhost')) {
            // Localheost testing: We simulate agency via header? No, we can't easily set headers on simple navigation.
            // But usually for localhost we might just rely on 'default' or maybe query param?
            // Middleware logic: "If localhost, agencyId = default".
            // If we want to test multi-tenancy locally, we use test.localhost?
            // Let's assume for PROD correctness first:
            // Construct subdomain URL
            // targetUrl = `${protocol}//${agency.slug}.referralflow.health/dashboard`;
        } else {
            // Production
            // targetUrl = `${protocol}//${agency.slug}.referralflow.health/dashboard`;
            // Wait, user says "don't create new subdomain".
            // If they are logging in from 'referralflow.health', they should go to 'agency.referralflow.health'.
        }

        // FOR NOW: Let's assume we redirect to the correct subdomain.
        // Is 'slug' the subdomain? Yes.

        if (host.includes('localhost')) {
            // Just go to dashboard, we can't easily cross-domain locally without specific setup
            // Maybe we can utilize a cookie or query param if needed, but standard /dashboard is safer for now.
            router.push('/dashboard');
        } else {
            window.location.href = `${protocol}//${agency.slug}.referralflow.health/dashboard`;
        }
    };

    if (showSelection) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle>Select Workspace</CardTitle>
                        <CardDescription>Your email is associated with multiple agencies.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {userAgencies.map((agency) => (
                            <div
                                key={agency.id}
                                onClick={() => handleAgencySelect(agency)}
                                className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted cursor-pointer transition-colors"
                            >
                                <Avatar className="h-10 w-10 rounded-lg border">
                                    <AvatarImage src={agency.logoUrl} alt={agency.name} />
                                    <AvatarFallback className="rounded-lg">{agency.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-sm">{agency.name}</h4>
                                    <p className="text-xs text-muted-foreground">{agency.slug}.referralflow.health</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <span className="sr-only">Select</span>
                                    →
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                    <div className="p-4 border-t bg-muted/20 text-center">
                        <Button variant="link" size="sm" onClick={() => setShowSelection(false)} className="text-muted-foreground">
                            Back to Login
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex items-center justify-center gap-2">
                        <Logo className="h-8 w-8" />
                        <span className="text-2xl font-bold font-headline">ReferralFlow Central</span>
                    </div>
                    <CardTitle className="text-2xl">Staff Portal Login</CardTitle>
                    <CardDescription>Sign in to manage referrals.</CardDescription>
                    {isLoading && (
                        <div className="mt-2 text-xs text-secondary animate-pulse px-2 py-1 bg-secondary/10 rounded-md">
                            Verifying access...
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    <Button onClick={handleGoogleSignIn} disabled={isLoading} className="w-full" variant="outline">
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Please wait...
                            </>
                        ) : (
                            <>
                                <GoogleIcon className="mr-2" />
                                Sign in with Google
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
