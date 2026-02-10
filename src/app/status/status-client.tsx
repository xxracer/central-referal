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

import { useRef } from 'react';

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
                                            <div className="mt-2 flex items-start gap-2 rounded-lg bg-orange-50 border border-orange-200 p-3 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800/30">
                                                <AlertCircle className="h-5 w-5 shrink-0" />
                                                <p className="text-sm font-bold">
                                                    WARNING: Please do not include any PHI (Personal Health Information) in external communications.
                                                </p>
                                            </div>
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
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                                            Message History
                                        </h4>

                                        <div className="flex flex-col gap-6">
                                            {(!formState.data?.externalNotes || formState.data.externalNotes.length === 0) ? (
                                                <div className="text-center py-8 text-muted-foreground italic bg-muted/20 rounded-xl border border-dashed">
                                                    No messages yet. Start the conversation above!
                                                </div>
                                            ) : (
                                                formState.data.externalNotes.map((note: any, index: number) => {
                                                    const isMe = note.author?.role === 'PUBLIC' || note.author?.name === 'Referrer/Patient';
                                                    const senderName = isMe ? 'You' : profile.name;

                                                    return (
                                                        <div key={note.id || index} className={cn(
                                                            "flex w-full animate-in slide-in-from-bottom-2 duration-500",
                                                            isMe ? "justify-end" : "justify-start"
                                                        )}>
                                                            <div className={cn(
                                                                "flex flex-col max-w-[85%] md:max-w-[75%]",
                                                                isMe ? "items-end" : "items-start"
                                                            )}>
                                                                <div className="flex items-center gap-2 mb-1 px-1">
                                                                    <span className="text-xs font-semibold text-muted-foreground">
                                                                        {senderName}
                                                                    </span>
                                                                    <span className="text-[10px] text-muted-foreground/60">
                                                                        {formatDate(note.createdAt, "p")}
                                                                    </span>
                                                                </div>

                                                                <div className={cn(
                                                                    "rounded-2xl px-5 py-3 text-sm shadow-sm relative",
                                                                    isMe
                                                                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                                                                        : "bg-muted text-foreground rounded-tl-sm border border-border/50"
                                                                )}>
                                                                    <p className="whitespace-pre-wrap leading-relaxed">
                                                                        {note.content}
                                                                    </p>
                                                                </div>
                                                                <div className="text-[10px] text-muted-foreground mt-1 px-1 opacity-50">
                                                                    {formatDate(note.createdAt, "PP")}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </main >
        </div >
    );
}

export default function StatusClient({ settings }: { settings: AgencySettings }) {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}>
            <StatusPageComponent settings={settings} />
        </Suspense>
    );
}
