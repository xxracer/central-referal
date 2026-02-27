'use client';

import { useActionState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Search, Info, CheckCircle, History, Clock, Send, ArrowLeft } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import SiteHeader from '@/components/layout/site-header';
import { checkStatus, type FormState } from '@/lib/actions';
import { getAgencyPresence } from '@/lib/data';
import { cn, formatDate } from '@/lib/utils';
import StatusBadge from '@/components/referrals/status-badge';
import { useFormStatus } from 'react-dom';
import { type AgencySettings } from '@/lib/types';

import { useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

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
    const messagesEndRef = useRef<HTMLDivElement>(null);

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

    // Real-time listener for Status Page
    const [realtimeData, setRealtimeData] = useState<any>(null);

    useEffect(() => {
        if (formState.success && formState.data?.id) {
            const { firestore } = initializeFirebase();

            if (!firestore) return;

            const docRef = doc(firestore, 'referrals', formState.data.id);
            const unsubscribe = onSnapshot(docRef, (docSnap: any) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    // Convert timestamps
                    const convertTimestamps = (obj: any): any => {
                        if (obj && typeof obj === 'object' && 'seconds' in obj && 'nanoseconds' in obj) {
                            return new Date(obj.seconds * 1000 + obj.nanoseconds / 1000000);
                        }
                        if (Array.isArray(obj)) return obj.map(convertTimestamps);
                        if (obj !== null && typeof obj === 'object') {
                            return Object.fromEntries(
                                Object.entries(obj).map(([key, val]) => [key, convertTimestamps(val)])
                            );
                        }
                        return obj;
                    };
                    setRealtimeData(convertTimestamps(data));
                }
            }, (err: any) => {
                console.error("Rt error", err);
            });
            return () => unsubscribe();
        }
    }, [formState.success, formState.data?.id]);

    // Use realtime data if available, otherwise fallback to server data
    const displayData = realtimeData || formState.data;
    const showResults = formState.success && !!displayData;

    // Fetch Last Seen Presence
    const [lastSeen, setLastSeen] = useState<Date | null>(null);
    const [, setTick] = useState(0); // Force UI re-renders for relative time

    useEffect(() => {
        if (!showResults || !displayData?.agencyId) return;

        const fetchPresence = () => {
            getAgencyPresence(displayData.agencyId)
                .then(presence => {
                    if (presence) setLastSeen(presence);
                })
                .catch(err => console.error("Failed to fetch presence", err));
        };

        fetchPresence();
        const pollInterval = setInterval(fetchPresence, 30000);
        const tickInterval = setInterval(() => setTick(t => t + 1), 60000);

        return () => {
            clearInterval(pollInterval);
            clearInterval(tickInterval);
        };
    }, [showResults, displayData?.agencyId]);

    // Format presence status
    const getPresenceStatus = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        // Consider "online" if active within the last 3 minutes
        if (diffMins <= 3) {
            return { isOnline: true, text: 'Online' };
        }

        if (diffMins < 60) return { isOnline: false, text: `last online ${diffMins} min${diffMins === 1 ? '' : 's'} ago` };

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return { isOnline: false, text: `last online ${diffHours} hour${diffHours === 1 ? '' : 's'} ago` };

        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return { isOnline: false, text: `last online yesterday` };
        if (diffDays < 7) return { isOnline: false, text: `last online ${diffDays} days ago` };

        return { isOnline: false, text: `last online on ${formatDate(date, 'MMM d, yyyy')}` };
    };

    // Auto-scroll to bottom whenever notes change or typing status changes
    useEffect(() => {
        if (showResults && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [displayData?.externalNotes, displayData?.staffIsTyping, showResults]);

    return (
        <div className="flex flex-col min-h-dvh bg-muted/30">
            <SiteHeader logoUrl={profile.logoUrl} companyName={profile.name} />
            <main className="flex-1 w-full max-w-5xl mx-auto py-6 md:py-12 px-4 md:px-6">
                <div className={cn(
                    "transition-all duration-500 ease-in-out",
                    showResults ? "max-w-4xl mx-auto" : "max-w-md mx-auto"
                )}>
                    {showResults && (
                        <div className="mb-6 animate-in fade-in duration-300">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleReset}
                                className="text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50 transition-colors shadow-sm rounded-full px-4"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Check Another Referral
                            </Button>
                        </div>
                    )}

                    {/* Search Form (Hidden when results are showing) */}
                    <div className={cn(
                        "space-y-6 transition-all duration-300",
                        showResults ? "hidden" : "block"
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


                                    <div className="space-y-4 pt-4">
                                        <SubmitButton>
                                            <div className="flex items-center gap-2">
                                                <Search className="h-4 w-4" /> Check Status
                                            </div>
                                        </SubmitButton>
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

                    {/* Right Side: Results (Centered when active) */}
                    {showResults && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
                            <Card className="shadow-2xl border-primary/20 bg-card/95 flex flex-col overflow-hidden">
                                <CardHeader className="border-b bg-muted/30 pb-4">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex flex-col">
                                            <CardTitle className="flex flex-col gap-2 md:flex-row md:items-center font-headline text-xl">
                                                <div className="flex items-center gap-2">
                                                    <Info className="w-5 h-5 text-primary" />
                                                    Referral Status: <StatusBadge status={displayData?.status} />
                                                </div>
                                                <div className="text-sm font-mono text-muted-foreground md:ml-2 bg-slate-200/50 px-2 py-0.5 rounded-md border border-slate-200 w-fit shrink-0">
                                                    ID: {referralId}
                                                </div>
                                            </CardTitle>
                                            {lastSeen && (() => {
                                                const presence = getPresenceStatus(lastSeen);
                                                return (
                                                    <div className="text-xs mt-1 ml-7 flex items-center gap-1.5">
                                                        {presence.isOnline ? (
                                                            <>
                                                                <span className="relative flex h-2.5 w-2.5">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                                                </span>
                                                                <span className="text-green-600 font-medium tracking-wide">{presence.text}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Clock className="w-3 h-3 text-muted-foreground/80" />
                                                                <span className="text-muted-foreground/80">{presence.text}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                                            <History className="w-4 h-4" />
                                            Last Update: {formatDate(displayData?.updatedAt, "PPp")}
                                        </div>
                                    </div>

                                    {displayData?.noteAdded && (
                                        <Alert variant="default" className="mt-4 bg-green-500/10 border-green-500/20 text-green-700">
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                            <AlertTitle className="text-green-800 font-semibold">Note Sent</AlertTitle>
                                            <AlertDescription>
                                                Your message has been delivered to the agency staff.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </CardHeader>

                                {/* Messages Area (Scrollable) */}
                                <CardContent className="p-0 flex-1 overflow-y-auto h-[55vh] min-h-[400px] bg-slate-50/50 relative">

                                    {/* Watermark Logo */}
                                    {profile.logoUrl && (
                                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.08] z-0 mix-blend-multiply">
                                            <img
                                                src={profile.logoUrl}
                                                alt="Watermark"
                                                className="w-2/3 max-w-sm object-contain grayscale"
                                            />
                                        </div>
                                    )}

                                    <div className="p-4 md:p-6 space-y-6 relative z-10">
                                        <div className="text-center">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 bg-muted/50 px-3 py-1 rounded-full">
                                                End-to-End Encrypted Chat
                                            </span>
                                        </div>

                                        <div className="flex flex-col gap-6">
                                            {(!displayData?.externalNotes || displayData.externalNotes.length === 0) ? (
                                                <div className="text-center py-8 text-muted-foreground italic bg-muted/20 rounded-xl border border-dashed">
                                                    No messages yet. Start the conversation above!
                                                </div>
                                            ) : (
                                                displayData.externalNotes.map((note: any, index: number) => {
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
                                                                        ? "bg-blue-600 text-white rounded-br-sm"
                                                                        : "bg-slate-200 text-slate-900 rounded-bl-sm"
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
                                            {displayData?.staffIsTyping && (
                                                <div className="flex w-full justify-start animate-in slide-in-from-bottom-2 duration-300">
                                                    <div className="flex flex-col max-w-[85%] md:max-w-[75%] items-start">
                                                        <div className="flex items-center gap-2 mb-1 px-1">
                                                            <span className="text-xs font-semibold text-muted-foreground">
                                                                {profile.name}
                                                            </span>
                                                        </div>
                                                        <div className="bg-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex gap-1 items-center w-fit h-[44px]">
                                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {/* Invisible div for auto-scrolling */}
                                        <div ref={messagesEndRef} className="h-4" />
                                    </div>
                                </CardContent>

                                {/* Message Input Footer */}
                                <CardFooter className="p-0 border-t bg-background">
                                    <form action={dispatch} className="w-full">
                                        {/* Hidden fields to satisfy the existing server action */}
                                        <input type="hidden" name="referralId" value={referralId} />
                                        <div className="flex flex-col p-4 w-full">
                                            <div className="flex gap-2 items-end w-full">
                                                <Textarea
                                                    id="optionalNote"
                                                    name="optionalNote"
                                                    placeholder="Type a message..."
                                                    className="min-h-[60px] max-h-[120px] resize-none border-primary/20 focus-visible:ring-primary/30"
                                                    key={`note-${formState.data?.updatedAt}`} // Reset field when update happens
                                                />
                                                <Button
                                                    type="submit"
                                                    size="icon"
                                                    className="h-[60px] w-[60px] rounded-xl shrink-0 bg-blue-600 hover:bg-blue-700 shadow-md"
                                                >
                                                    <Send className="h-5 w-5 ml-1" />
                                                </Button>
                                            </div>
                                            <div className="mt-3 flex items-start gap-2 bg-orange-100 text-orange-900 border border-orange-300 rounded-lg p-3 w-full shadow-inner">
                                                <AlertCircle className="h-5 w-5 shrink-0 text-orange-600 mt-0.5" />
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm tracking-wide text-red-700">CRITICAL WARNING</span>
                                                    <span className="text-xs sm:text-sm font-medium">Do not include any PHI (Personal Health Information) in this chat.</span>
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                </CardFooter>
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
