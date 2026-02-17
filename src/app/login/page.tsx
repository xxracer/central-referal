'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from '@/components/logo';
import { signInWithGoogle, signInWithEmail, sendPasswordReset } from '@/firebase/auth/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, ArrowLeft } from 'lucide-react';
import { checkUserAgencies } from './actions';
import { createSession } from '@/lib/auth-actions';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.986,36.69,44,30.836,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
);

function LoginForm() {
    const router = useRouter();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const redirectPath = searchParams.get('redirect');

    const [isLoading, setIsLoading] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [userAgencies, setUserAgencies] = useState<any[]>([]);
    const [showSelection, setShowSelection] = useState(false);

    // Auth State
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [resetEmail, setResetEmail] = useState("");

    const [showForgotPassword, setShowForgotPassword] = useState(false);

    // AUTO-REDIRECT REMOVED: User requested manual login only.


    // Handle Auto-Token Login (for Localhost subdomain hopping)
    useEffect(() => {
        const autoToken = searchParams.get('auto_token');
        if (autoToken) {
            const loginWithToken = async () => {
                setIsLoading(true);
                toast({ title: "Auto-logging in...", description: "Verifying session token..." });
                try {
                    // createSession is already imported as a server action
                    const res = await createSession(autoToken);
                    if (res.success) {
                        // Remove token from URL for clean look
                        const url = new URL(window.location.href);
                        url.searchParams.delete('auto_token');
                        window.history.replaceState({}, '', url.toString());

                        // Refresh to ensure middleware sees the cookie
                        window.location.reload();
                    } else {
                        toast({ variant: "destructive", title: "Login Failed", description: "Invalid auto-login token." });
                        setIsLoading(false);
                    }
                } catch (e) {
                    console.error("Auto-login error", e);
                    setIsLoading(false);
                }
            };
            loginWithToken();
        }
    }, [searchParams, toast]);


    const handleAgencySelect = (agency: any, token?: string) => {
        toast({
            title: "Logging in...",
            description: `Accessing ${agency.name}`,
        });

        const protocol = window.location.protocol;
        const host = window.location.host;

        // Check for forced password reset
        const defaultPath = agency.requiresPasswordReset ? '/dashboard/settings?tab=access' : '/dashboard';
        const targetPath = redirectPath || defaultPath;

        if (host.includes('localhost') || host.includes('127.0.0.1')) {
            // Support local wildcard testing
            const port = window.location.port ? `:${window.location.port}` : '';
            // If we are already on the correct subdomain, use router.push to avoid reload
            if (host.startsWith(`${agency.slug}.`)) {
                router.push(targetPath);
            } else {
                // Force redirect to the agency subdomain on localhost
                // Pass token to avoid double-login on localhost where cookies don't share well across subdomains
                const tokenParam = token ? `?auto_token=${token}` : '';
                const separator = targetPath.includes('?') ? '&' : (tokenParam ? '?' : '');
                // Logic: Append to targetPath if it's a relative path? No, targetPath is passed to the new URL.
                // We want: http://slug.localhost:3000/dashboard?auto_token=...

                // If redirectPath (targetPath) already has params, we need to be careful.
                // Simpler: Just append token to the MAIN url, and let the login page on that domain handle it 
                // BUT the user wants to go to /dashboard. 
                // If we go to /login?auto_token=...&redirect=/dashboard, the login page handles the token, sets cookie, then redirects to 'redirect'.

                // Let's change strategy: Redirect to Login page of the subdomain with the token.
                // The Login page there will set cookie and then redirect to targetPath.

                window.location.href = `${protocol}//${agency.slug}.localhost${port}/login?auto_token=${token}&redirect=${encodeURIComponent(targetPath)}`;
            }
        } else {
            window.location.href = `${protocol}//${agency.slug}.referralflow.health${targetPath}`;
        }
    };

    const handlePostLogin = async (user: any, isNewUser: boolean) => {
        if (user && user.email) {

            // 1. SECURITY: Check Agencies FIRST before creating session
            const { agencies } = await checkUserAgencies(user.email);
            const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
            const isAdmin = adminEmail && user.email === adminEmail;

            // If no agencies and not admin, BLOCK access.
            if (agencies.length === 0 && !isAdmin) {
                toast({
                    variant: 'destructive',
                    title: "Access Denied",
                    description: "This email is not authorized for any agency.",
                });
                setIsLoading(false);
                return;
            }

            // 2. Create Server Session (COOKIE)
            // Get the ID token from the user object (Firebase Client SDK)
            const idToken = await user.getIdToken();
            const sessionResult = await createSession(idToken);

            if (!sessionResult.success) {
                toast({
                    variant: 'destructive',
                    title: "Login Failed",
                    description: sessionResult.error || "Could not create session.",
                });
                setIsLoading(false);
                return;
            }

            // 3. Routing
            if (agencies.length > 0) {
                if (agencies.length === 1) {
                    // Auto-redirect if only one
                    const agency = agencies[0];
                    handleAgencySelect(agency, idToken); // Pass ID Token for localhost hopping
                    return;
                }
                // Multiple agencies found -> Show selection
                // Store token in state if they need to select? 
                // We might need to refresh token if they take too long, but usually fine.
                // For now, let's just use the current one.
                setUserAgencies(agencies);
                setShowSelection(true);
                setIsLoading(false);
                return;
            }


            // No agencies found but IS admin (passed the check above)
            if (isAdmin) {
                router.push('/super-admin');
                return;
            }

            // Should be unreachable due to check above, but safe fallback
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        try {
            const { user, isNewUser } = await signInWithGoogle();
            await handlePostLogin(user, isNewUser);
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

    const handleEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;

        setIsLoading(true);
        try {
            const normalizedEmail = email.toLowerCase().trim();
            const { user, isNewUser } = await signInWithEmail(normalizedEmail, password);
            await handlePostLogin(user, isNewUser);
        } catch (error: any) {
            console.error("Email Sign-In Error:", error);
            let message = "Failed to sign in.";
            if (error.code === 'auth/invalid-credential') {
                message = "Invalid email or password. If you used Google to sign up, please use 'Sign in with Google'.";
            } else if (error.code === 'auth/user-not-found') {
                message = "User not found. Please ensure you are using the email you signed up with.";
            } else if (error.code === 'auth/wrong-password') {
                message = "Incorrect password. If you used Google to sign up, please use 'Sign in with Google'.";
            } else if (error.code === 'auth/too-many-requests') {
                message = "Too many failed attempts. Please reset your password or try again later.";
            }
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: message,
            });
            setIsLoading(false);
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetEmail) return;

        setIsResetting(true);
        try {
            await sendPasswordReset(resetEmail);
            toast({
                title: "Email Sent",
                description: "Check your email for password reset instructions.",
            });
            setShowForgotPassword(false);
        } catch (error: any) {
            console.error("Reset Password Error:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to send reset email.",
            });
        } finally {
            setIsResetting(false);
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

    if (showForgotPassword) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
                <Card className="w-full max-w-sm">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
                            <Lock className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-xl">Forgot Password?</CardTitle>
                        <CardDescription>Enter your email to reset your password.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePasswordReset} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="reset-email">Email</Label>
                                <Input
                                    id="reset-email"
                                    type="email"
                                    placeholder="m@example.com"
                                    required
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isResetting}>
                                {isResetting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    "Send Reset Link"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex justify-center border-t p-4 bg-muted/50">
                        <Button variant="link" size="sm" onClick={() => setShowForgotPassword(false)} className="text-muted-foreground gap-2">
                            <ArrowLeft className="h-4 w-4" /> Back to Login
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 flex items-center justify-center gap-2">
                        <Logo className="h-8 w-8" />
                        <span className="text-2xl font-bold font-headline">ReferralFlow Central</span>
                    </div>
                    {isLoading && (
                        <div className="mt-2 text-xs text-secondary animate-pulse px-2 py-1 bg-secondary/10 rounded-md">
                            Processing...
                        </div>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-4">
                        <form onSubmit={handleEmailSignIn} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="px-0 h-auto text-xs text-muted-foreground"
                                        type="button"
                                        onClick={() => setShowForgotPassword(true)}
                                    >
                                        Forgot password?
                                    </Button>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                                Sign In with Email
                            </Button>
                        </form>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    <Button onClick={handleGoogleSignIn} disabled={isLoading} className="w-full bg-[#0f3460] hover:bg-[#0f3460]/90 text-white transition-colors">
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <div className="mr-2 bg-white rounded-full p-0.5">
                                <GoogleIcon className="w-5 h-5" />
                            </div>
                        )}
                        Sign in with Google
                    </Button>

                    <div className="mt-6 pt-4 border-t text-center space-y-2">
                        <div className="flex items-center justify-center gap-2 text-primary/80">
                            <Lock className="h-4 w-4" />
                            <span className="font-semibold text-sm">HIPAA-Compliant & Secure</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground max-w-[280px] mx-auto leading-tight">
                            This portal uses encrypted, access-controlled systems designed for healthcare referrals.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div >
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <LoginForm />
        </Suspense>
    );
}
