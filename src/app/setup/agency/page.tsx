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
    const [email, setEmail] = useState('');
    const [agencyName, setAgencyName] = useState('');
    const [slug, setSlug] = useState('');

    const [success, setSuccess] = useState(false);

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
        if (!email || !agencyName || !slug) return;

        setIsLoading(true);

        try {
            const response = await fetch('/api/agency/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, agencyName, slug }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create workspace');
            }

            // Instead of toast and redirect, show success state
            setSuccess(true);

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

    if (success) {
        return (
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-6 flex justify-center">
                        {/* Display Main Logo */}
                        <div className="bg-primary/10 p-4 rounded-full">
                            <Store className="h-10 w-10 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl mb-2">Welcome to ReferralFlow</CardTitle>
                    <CardDescription className="text-base text-foreground font-medium">
                        Your account has been created.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-center text-muted-foreground">
                    <p>
                        To continue, please check your email and click the activation link to verify your account.
                        This step is required before completing setup.
                    </p>
                    <p>
                        Once verified, you can finish setting up your portal and begin receiving referrals.
                    </p>
                </CardContent>
                <CardFooter className="justify-center border-t p-4 bg-muted/50">
                    <p className="text-xs text-muted-foreground text-center">
                        Need help? Contact support@referralflow.health
                    </p>
                </CardFooter>
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

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating Workspace...
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
