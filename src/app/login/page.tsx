'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
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
import ReCAPTCHA from "react-google-recaptcha";

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
    const [captchaValue, setCaptchaValue] = useState<string | null>(null);

    const [showForgotPassword, setShowForgotPassword] = useState(false);

    const handleAgencySelect = (agency: any) => {
        toast({
            title: "Logging in...",
            description: `Accessing ${agency.name}`,
        });

        const protocol = window.location.protocol;
        const host = window.location.host;

        // Check for forced password reset
        const defaultPath = agency.requiresPasswordReset ? '/dashboard/settings?tab=access' : '/dashboard';
        const targetPath = redirectPath || defaultPath;

        if (host.includes('localhost')) {
            router.push(targetPath);
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
                    handleAgencySelect(agency);
                    return;
                }
                // Multiple agencies found -> Show selection
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

        if (!captchaValue) {
            toast({
                variant: 'destructive',
                title: 'Verification Required',
                description: 'Please complete the captcha verification.'
            });
            return;
        }

        // Server-side verification
        const { verifyCaptcha } = await import('./actions');
        const verification = await verifyCaptcha(captchaValue);

        if (!verification.success) {
            toast({
                variant: 'destructive',
                title: 'Security Check Failed',
                description: 'Please try the captcha again.'
            });
            return;
        }

        setIsLoading(true);
        try {
            const { user, isNewUser } = await signInWithEmail(email, password);
            await handlePostLogin(user, isNewUser);
        } catch (error: any) {
            console.error("Email Sign-In Error:", error);
            let message = "Failed to sign in.";
            if (error.code === 'auth/invalid-credential') {
                message = "Invalid email or password.";
            } else if (error.code === 'auth/user-not-found') {
                message = "User not found.";
            } else if (error.code === 'auth/wrong-password') {
                message = "Incorrect password.";
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
                            <div className="flex justify-center">
                                <ReCAPTCHA
                                    sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                                    onChange={(val) => setCaptchaValue(val)}
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

                    <Button onClick={handleGoogleSignIn} disabled={isLoading} variant="outline" className="w-full">
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <GoogleIcon className="mr-2" />
                        )}
                        Google
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <LoginForm />
        </Suspense>
    );
}
