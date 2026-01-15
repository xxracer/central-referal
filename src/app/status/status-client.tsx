'use client';

import { useActionState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Search, Info, CheckCircle, History } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import SiteHeader from '@/components/layout/site-header';
import { checkStatus, type FormState } from '@/lib/actions';
import { cn, formatDate } from '@/lib/utils';
import StatusBadge from '@/components/referrals/status-badge';
import { useFormStatus } from 'react-dom';
import { type AgencySettings } from '@/lib/types';

function SubmitButton({ children }: { children: React.ReactNode }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : children}
        </Button>
    );
}

function StatusPageComponent({ settings }: { settings: AgencySettings }) {
    const searchParams = useSearchParams();
    const initialReferralId = useMemo(() => searchParams.get('id') || '', [searchParams]);
    const [referralId, setReferralId] = useState(initialReferralId);

    const initialState: FormState = { message: '', success: false };
    const [formState, dispatch] = useActionState(checkStatus, initialState);

    const profile = settings.companyProfile;

    const handleReset = () => {
        setReferralId('');
        // We can't easily reset useActionState without a page refresh or a hack 
        // but we can at least clear the local ID and let the parent re-render or push state.
        window.location.href = '/status';
    };

    useEffect(() => {
        setReferralId(initialReferralId);
    }, [initialReferralId]);

    useEffect(() => {
        if (formState.success && !initialReferralId) {
            // No longer clearing referralId to keep it fixed
        }
    }, [formState, initialReferralId]);

    const showResults = formState.success && formState.data;

    return (
        <div className="flex flex-col min-h-dvh bg-muted/30">
            <SiteHeader logoUrl={profile.logoUrl} companyName={profile.name} />
            <main className="flex-1 w-full max-w-7xl mx-auto py-12 px-4 md:px-6">
                <div className={cn(
                    "grid gap-8 transition-all duration-500 ease-in-out items-start",
                    showResults ? "grid-cols-1 lg:grid-cols-12" : "grid-cols-1 max-w-md mx-auto"
                )}>
                    {/* Left Side: Search Form */}
                    <div className={cn(
                        "space-y-6",
                        showResults ? "lg:col-span-4" : ""
                    )}>
                        <Card className="shadow-lg border-primary/10">
                            <CardHeader>
                                <CardTitle className="font-headline text-2xl lg:text-3xl text-center">Check Status</CardTitle>
                                <CardDescription className="text-center text-muted-foreground italic">
                                    {profile.name} tracking.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form action={dispatch} className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="referralId">Referral ID</Label>
                                        <Input
                                            id="referralId"
                                            name="referralId"
                                            value={referralId}
                                            onChange={(e) => setReferralId(e.target.value)}
                                            placeholder="e.g., TX-REF-2024-001234"
                                            className={cn("bg-background", showResults && "bg-muted cursor-not-allowed")}
                                            readOnly={showResults}
                                            required
                                        />
                                    </div>
                                    {showResults && (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <Label htmlFor="optionalNote">Add Note for Staff</Label>
                                            <Textarea
                                                id="optionalNote"
                                                name="optionalNote"
                                                placeholder="Ask a question or provide an update..."
                                                className="min-h-[100px] resize-none"
                                                key={`note-${formState.data?.updatedAt}`} // Reset field when update happens
                                            />
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        <SubmitButton>
                                            {showResults ? (
                                                <div className="flex items-center gap-2">
                                                    <Info className="h-4 w-4" /> Send Message to Staff
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <Search className="h-4 w-4" /> Check Status
                                                </div>
                                            )}
                                        </SubmitButton>

                                        {showResults && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={handleReset}
                                                className="w-full text-muted-foreground hover:text-primary"
                                            >
                                                Check Another ID
                                            </Button>
                                        )}
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        {formState.message && !formState.success && (
                            <Alert variant="destructive" className="animate-in fade-in zoom-in duration-300">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{formState.message}</AlertDescription>
                            </Alert>
                        )}
                    </div>

                    {/* Right Side: Results */}
                    {showResults && (
                        <div className="lg:col-span-8 space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 ease-out">
                            <Card className="shadow-xl border-primary/10 bg-card/50 backdrop-blur-sm">
                                <CardHeader className="border-b bg-muted/20">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <CardTitle className="flex items-center gap-2 font-headline text-xl">
                                            <Info className="w-5 h-5 text-primary" />
                                            Referral Status: <StatusBadge status={formState.data?.status} />
                                        </CardTitle>
                                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                                            <History className="w-4 h-4" />
                                            Last Update: {formatDate(formState.data?.updatedAt, "PPp")}
                                        </div>
                                    </div>

                                    {formState.data?.noteAdded && (
                                        <Alert variant="default" className="mt-4 bg-green-500/10 border-green-500/20 text-green-700">
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                            <AlertTitle className="text-green-800 font-semibold">Note Sent</AlertTitle>
                                            <AlertDescription>
                                                Your message has been delivered to the agency staff.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="p-6 space-y-6">
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                            Timeline & Communication
                                        </h4>
                                        <ul className="space-y-8 relative">
                                            <div className="absolute left-3 top-2 bottom-2 w-px bg-gradient-to-b from-primary/50 via-muted to-muted" />
                                            {formState.data?.statusHistory?.slice().reverse().map((item: any, index: number) => (
                                                <li key={index} className="flex items-start gap-6 pl-10 relative">
                                                    <div className="absolute left-0 top-1.5 h-6 w-6 rounded-full bg-background border-2 border-primary ring-4 ring-background z-10 flex items-center justify-center shadow-sm">
                                                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                                    </div>
                                                    <div className="flex-1 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <StatusBadge status={item.status} size="sm" />
                                                            <span className="text-[10px] sm:text-xs text-muted-foreground font-medium bg-muted/50 px-2 py-1 rounded-full">
                                                                {formatDate(item.changedAt, "PPp")}
                                                            </span>
                                                        </div>
                                                        {item.notes && (
                                                            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-sm italic text-foreground leading-relaxed shadow-inner">
                                                                "{item.notes}"
                                                            </div>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function StatusClient({ settings }: { settings: AgencySettings }) {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}>
            <StatusPageComponent settings={settings} />
        </Suspense>
    );
}
