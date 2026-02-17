'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, Store } from 'lucide-react';

function AgencySetupForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [email, setEmail] = useState('');
    const [agencyName, setAgencyName] = useState('');
    const [slug, setSlug] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // Auto-generate slug from name
    useEffect(() => {
        if (agencyName) {
            const generated = agencyName
                .toLowerCase()
                .trim()
                .replace(/\s+/g, '-')
                .replace(/[^\w\-]+/g, '')
                .replace(/\-\-+/g, '-');
            setSlug(generated);
        }
    }, [agencyName]);

    useEffect(() => {
        const paramEmail = searchParams.get('email');
        if (paramEmail) setEmail(paramEmail);
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');

        if (!email || !agencyName || !slug) return;

        const isGmail = email.toLowerCase().includes('@gmail.com');

        if (!isGmail && !password) {
            setPasswordError('Password is required for non-Gmail accounts');
            return;
        }

        if (password && password !== confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }

        if (password && password.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);

        try {
            const bypass = searchParams.get('bypass') === 'true';
            const response = await fetch('/api/agency/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, agencyName, slug, password, bypass }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create workspace');
            }

            // Success: Show activation UI
            setIsSuccess(true);
            toast({
                title: "Success",
                description: "Your workspace has been created!",
            });

        } catch (error: any) {
            console.error("Setup Error:", error);
            toast({
                variant: 'destructive',
                title: "Setup Failed",
                description: error.message,
            });
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-6 flex items-center justify-center">
                        <img
                            src="https://static.wixstatic.com/media/c5947c_14731b6192f740d8958b7a069f361b4e~mv2.png"
                            alt="ReferralFlow"
                            className="h-32 w-auto object-contain"
                        />
                    </div>
                    <CardTitle className="text-xl">Welcome to ReferralFlow</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-muted-foreground">
                        Your account has been created.
                    </p>
                    <p className="text-muted-foreground">
                        To activate your account and continue with setup, please click the button below.
                    </p>
                    <p className="text-muted-foreground">
                        Once activated, you’ll be guided through the remaining setup steps.
                    </p>

                    <Button
                        className="w-full mt-4"
                        size="lg"
                        onClick={() => {
                            const protocol = window.location.protocol;
                            const redirectParam = encodeURIComponent('/dashboard/settings');

                            // Point to login because they are likely NOT logged in yet
                            // Password was just set, so they can login now.
                            const targetUrl = `${protocol}//${slug}.referralflow.health/login?email=${encodeURIComponent(email)}&redirect=${redirectParam}`;

                            if (window.location.hostname.includes('localhost')) {
                                window.location.href = `/login?email=${encodeURIComponent(email)}&redirect=${redirectParam}`;
                            } else {
                                window.location.href = targetUrl;
                            }
                        }}
                    >
                        Activate Account
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
                    <Store className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Setup Your Workspace</CardTitle>
                <CardDescription>
                    Thank you for subscribing! Let's get your agency portal ready.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Administrative Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="The email you used to pay"
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            Must match the email used for payment.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">Agency Name</Label>
                        <Input
                            id="name"
                            value={agencyName}
                            onChange={(e) => setAgencyName(e.target.value)}
                            placeholder="e.g. Best Home Care"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="slug">Workspace URL</Label>
                        <div className="flex items-center gap-1 rounded-md border px-3 py-1 bg-muted/50">
                            <span className="text-sm text-muted-foreground">https://</span>
                            <Input
                                id="slug"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                className="border-0 bg-transparent p-0 h-8 focus-visible:ring-0"
                                placeholder="your-agency"
                                required
                            />
                            <span className="text-sm text-muted-foreground">.referralflow.health</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Create Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="******"
                                required
                                minLength={6}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="******"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>
                    {passwordError && (
                        <p className="text-sm text-destructive font-medium">{passwordError}</p>
                    )}

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Converting Workspace...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Complete Setup
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="justify-center border-t p-4 bg-muted/50">
                <p className="text-xs text-muted-foreground text-center">
                    Need help? Contact support@referralflow.health
                </p>
            </CardFooter>
        </Card>
    );
}

export default function AgencySetupPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Suspense fallback={<div className="flex items-center gap-2"><Loader2 className="h-6 w-6 animate-spin text-primary" /> Loading setup...</div>}>
                <AgencySetupForm />
            </Suspense>
        </div>
    );
}
