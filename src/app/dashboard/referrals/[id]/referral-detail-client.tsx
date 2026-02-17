'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from '@/firebase/auth/use-user';
import {
    File as FileIcon,
    User,
    HeartPulse,
    History as HistoryIcon,
    MessageSquare,
    Sparkles,
    Lightbulb,
    Loader2,
    Tag,
    Clock,
    ArrowLeft,
    Stethoscope,
    Building,
    Download,
    Mail,
    Phone,
    Send,
    UserCircle,
    Archive,
    Printer,
    FileText,
    ShieldCheck
} from 'lucide-react';
import StatusBadge from '@/components/referrals/status-badge';
import { formatDate, cn } from '@/lib/utils';
import type { Referral, ReferralStatus, Note } from '@/lib/types';
import { addInternalNote, addExternalNote, updateReferralStatus, archiveReferralAction } from '@/lib/actions';
import { useActionState, useState, useTransition, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import CopyButton from '@/components/copy-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { doc, onSnapshot } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

interface ReferralDetailClientProps {
    referral: Referral;
}

export default function ReferralDetailClient({ referral: initialReferral }: ReferralDetailClientProps) {
    const [referral, setReferral] = useState<Referral>(initialReferral);
    const [isPending, startTransition] = useTransition();
    const router = useRouter(); // Moved up

    // Sync state when server data changes (e.g. after router.refresh())
    useEffect(() => {
        setReferral(initialReferral);
    }, [initialReferral]);

    // Real-time updates via Firestore
    // Real-time updates via Firestore
    useEffect(() => {
        const { firestore } = initializeFirebase();

        if (!firestore) return;

        const referralRef = doc(firestore, 'referrals', initialReferral.id);

        const unsubscribe = onSnapshot(referralRef, (docSnap: any) => {
            if (docSnap.exists()) {
                const data = docSnap.data();

                // Helper to convert Timestamps to Dates
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

                const convertedData = convertTimestamps(data) as Referral;

                // Merge with ID (though it should matches)
                setReferral({ ...convertedData, id: initialReferral.id });
            }
        }, (error: any) => {
            console.error("Realtime listener error:", error);
            // Fallback to polling if permission denied or other error
            // But for Dashboard, authenticated user SHOULD have access if rules are correct
        });

        return () => unsubscribe();
    }, [initialReferral.id]);

    const [selectedStatus, setSelectedStatus] = useState<ReferralStatus>(initialReferral.status);
    const [statusNote, setStatusNote] = useState('');
    const { toast } = useToast();

    // Chat Scroll Ref
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const scrollToBottom = (instant = false) => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            container.scrollTo({
                top: container.scrollHeight,
                behavior: instant ? "auto" : "smooth"
            });
        }
    };

    useEffect(() => {
        if (referral.externalNotes?.length > 0) {
            // Use a slight timeout to ensure content is rendered
            const timer = setTimeout(() => scrollToBottom(), 100);
            return () => clearTimeout(timer);
        }
    }, [referral.externalNotes, selectedStatus]); // added selectedStatus to scroll when switching tabs

    const handleArchiveToggle = async () => {
        const newState = !referral.isArchived;
        startTransition(async () => {
            const result = await archiveReferralAction(referral.id, newState);
            if (result.success) {
                toast({ title: newState ? "Archived" : "Restored", description: `Referral ${newState ? 'archived' : 'restored'} successfully.` });
                setReferral(prev => ({ ...prev, isArchived: newState }));
                router.refresh(); // Sync server
            } else {
                toast({ title: "Error", description: "Failed to update archive status.", variant: "destructive" });
            }
        });
    };

    const handleStatusUpdate = async () => {
        const formData = new FormData();
        formData.append('status', selectedStatus);
        formData.append('externalNote', statusNote);
        formData.append('authorName', user?.displayName || user?.email || 'Staff'); // Automate author

        startTransition(async () => {
            const result = await updateReferralStatus(referral.id, { message: '', success: false }, formData);
            if (result.success) {
                toast({ title: "Updated", description: "Status updated successfully." });
                setReferral(prev => ({
                    ...prev,
                    status: selectedStatus,
                    statusHistory: [...prev.statusHistory, {
                        status: selectedStatus,
                        changedAt: new Date(),
                        notes: statusNote || undefined
                    }]
                }));
                setStatusNote('');
                router.refresh(); // Sync server
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        });
    };

    const { user } = useUser(); // Get logged in user

    const handleAddNote = async (isExternal: boolean, content: string) => {
        if (!content.trim()) return;

        const authorName = user?.displayName || user?.email || 'Staff'; // Automate author
        const formData = new FormData();
        formData.append('note', content);
        formData.append('authorName', authorName);

        const action = isExternal ? addExternalNote : addInternalNote;

        startTransition(async () => {
            const result = await action(referral.id, { message: '', success: false }, formData);
            if (result.success) {
                toast({ title: "Success", description: isExternal ? "Message sent" : "Internal note added" });
                // Local update for immediate feedback (simplified)
                const newNote: Note = {
                    id: Date.now().toString(),
                    content,
                    author: { name: authorName, email: user?.email || '', role: isExternal ? 'SYSTEM' : 'STAFF' },
                    createdAt: new Date(),
                    isExternal
                };
                setReferral(prev => ({
                    ...prev,
                    [isExternal ? 'externalNotes' : 'internalNotes']: [
                        ...(prev[isExternal ? 'externalNotes' : 'internalNotes'] || []),
                        newNote
                    ]
                }));
                router.refresh(); // Sync server
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        });
    };

    const servicesMap = {
        skilledNursing: 'Skilled Nursing (SN)',
        physicalTherapy: 'Physical Therapy (PT)',
        occupationalTherapy: 'Occupational Therapy (OT)',
        speechTherapy: 'Speech Therapy (ST)',
        homeHealthAide: 'Home Health Aide (HHA)',
        medicalSocialWorker: 'Medical Social Worker (MSW)',
        providerAttendant: 'Provider Attendant Services (Medicaid)',
        other: 'Other'
    };

    const getServiceLabel = (serviceId: string): string => {
        return servicesMap[serviceId as keyof typeof servicesMap] || serviceId;
    };

    return (
        <div className="space-y-6">
            <Link href="/dashboard" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
            </Link>

            {referral.isFaxingPaperwork && (
                <Alert className="bg-orange-50 border-orange-200 text-orange-800">
                    <Printer className="h-4 w-4" />
                    <AlertTitle>Paperwork Incoming via Fax</AlertTitle>
                    <AlertDescription>
                        The provider indicated they will be faxing additional information to your office.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="overflow-hidden border-none shadow-lg">
                        <div className="bg-primary/5 p-6 border-b border-primary/10">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h1 className="font-headline text-3xl font-bold">Referral Details</h1>
                                    <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                                        ID: <span className="font-mono text-primary font-medium">{referral.id}</span>
                                        <CopyButton textToCopy={referral.id} size="sm" className="h-6 w-6" />
                                        • Received: {formatDate(referral.createdAt)}
                                    </div>
                                </div>
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                    <StatusBadge status={referral.status} />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleArchiveToggle}
                                        disabled={isPending}
                                        className={referral.isArchived ? "border-orange-200 text-orange-600 bg-orange-50" : "text-muted-foreground"}
                                    >
                                        <Archive className="mr-2 h-4 w-4" />
                                        {referral.isArchived ? 'Restore from Archive' : 'Archive Referral'}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-card border shadow-sm rounded-xl overflow-hidden">
                            {/* Header / Title of the 'Paper' */}
                            <div className="bg-slate-50 dark:bg-muted/50 px-6 py-4 border-b flex justify-between items-center">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Clinical Referral Document
                                </h2>
                                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                                    Confidential
                                </div>
                            </div>

                            <div className="p-6 md:p-10 space-y-8 divide-y divide-slate-100 dark:divide-slate-800">
                                {/* Patient Information Section */}
                                <div className="space-y-4 pt-2 first:pt-0">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                                        <User className="h-4 w-4" /> Patient Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Full Name</label>
                                            <div className="text-xl md:text-2xl font-medium text-slate-900 dark:text-slate-50">{referral.patientName}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Date of Birth</label>
                                            <div className="text-lg text-slate-900 dark:text-slate-50">{referral.patientDOB}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact Phone</label>
                                            <div className="text-lg text-slate-900 dark:text-slate-50">{referral.patientContact || "N/A"}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Review Address</label>
                                            <div className="text-lg text-slate-900 dark:text-slate-50">{referral.patientAddress || "Address not provided"}</div>
                                            {referral.patientZipCode && <div className="text-sm text-slate-500">Zip: {referral.patientZipCode}</div>}
                                        </div>
                                    </div>
                                </div>

                                {/* Insurance Section */}
                                <div className="space-y-4 pt-8">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                                        <ShieldCheck className="h-4 w-4" /> Insurance Details
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Primary Insurance</label>
                                            <div className="text-lg font-medium text-slate-900 dark:text-slate-50">{referral.patientInsurance}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Member ID / Policy #</label>
                                            <div className="text-lg text-slate-900 dark:text-slate-50">{referral.memberId || "N/A"}</div>
                                        </div>
                                        {referral.groupNumber && (
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Group Number</label>
                                                <div className="text-lg text-slate-900 dark:text-slate-50">{referral.groupNumber}</div>
                                            </div>
                                        )}
                                        {referral.authorizationNumber && (
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Auth Number</label>
                                                <div className="text-lg text-slate-900 dark:text-slate-50">{referral.authorizationNumber}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Clinical Info / Services */}
                                <div className="space-y-4 pt-8">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                                        <Stethoscope className="h-4 w-4" /> Clinical Requirements
                                    </h3>
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Services Requested</label>
                                            <div className="flex flex-wrap gap-2">
                                                {referral.servicesNeeded?.map(service => (
                                                    <span key={service} className="inline-flex items-center px-3 py-1 rounded-md bg-blue-50 text-blue-700 text-sm font-medium border border-blue-100">
                                                        {getServiceLabel(service)}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Diagnosis / Clinical Notes</label>
                                            <div className="p-4 bg-slate-50 dark:bg-muted/30 rounded-lg border-l-4 border-blue-500 text-base leading-relaxed text-slate-700 dark:text-slate-300">
                                                {referral.diagnosis}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Referrer Info */}
                                <div className="space-y-4 pt-8">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                                        <Building className="h-4 w-4" /> Referring Provider
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Organization / Practice</label>
                                            <div className="text-lg font-medium text-slate-900 dark:text-slate-50">{referral.referrerName}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact Person</label>
                                            <div className="text-lg text-slate-900 dark:text-slate-50">{referral.contactPerson}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</label>
                                            <div className="text-lg text-slate-900 dark:text-slate-50">
                                                <a href={`tel:${referral.referrerContact}`} className="hover:text-blue-600 hover:underline">{referral.referrerContact}</a>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</label>
                                            <div className="text-lg text-slate-900 dark:text-slate-50">{referral.confirmationEmail}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {referral.aiSummary && (
                            <Card className="bg-primary/5 border-primary/10 shadow-sm overflow-hidden">
                                <div className="bg-primary/10 px-4 py-2 flex items-center gap-2 border-b border-primary/10">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-bold text-primary uppercase tracking-tight">AI Insights</span>
                                </div>
                                <CardContent className="p-4 space-y-4">
                                    <div>
                                        <h4 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1"><Tag className="h-3 w-3" /> CATEGORIES</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {referral.aiSummary.suggestedCategories.map(cat => <Badge key={cat} variant="outline" className="text-[10px] bg-background">{cat}</Badge>)}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1"><Lightbulb className="h-3 w-3" /> REASONING</h4>
                                        <p className="text-sm leading-relaxed">{referral.aiSummary.reasoning}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-2"><FileIcon className="text-primary h-5 w-5" /> Patient Documents</h3>
                            {referral.documents.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {referral.documents.map(doc => {
                                        const fileUrl = doc.url.startsWith('_private/')
                                            ? `/api/files/${doc.url.replace('_private/', '')}`
                                            : doc.url;

                                        return (
                                            <div key={doc.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-muted hover:border-primary/20 hover:bg-muted/50 transition-all group">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
                                                        <FileIcon className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <span className="text-sm font-medium truncate max-w-[150px] text-foreground" title={doc.name}>{doc.name}</span>
                                                </div>
                                                <Button variant="ghost" size="sm" asChild className="rounded-full shadow-sm">
                                                    <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                                                        <Download className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-muted/20 rounded-2xl border border-dashed border-muted text-muted-foreground text-sm">
                                    No documents attached to this referral.
                                </div>
                            )}
                        </div>

                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="shadow-lg border-primary/10">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-bold flex items-center gap-2"><Tag className="text-primary h-5 w-5" /> Manage Status</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="status-select" className="text-xs font-bold uppercase text-muted-foreground">Select New Status</Label>
                                <Select onValueChange={(value) => setSelectedStatus(value as ReferralStatus)} value={selectedStatus}>
                                    <SelectTrigger id="status-select" className="rounded-xl">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="RECEIVED">Received</SelectItem>
                                        <SelectItem value="IN_REVIEW">In Review</SelectItem>
                                        <SelectItem value="ACCEPTED">Accepted</SelectItem>
                                        <SelectItem value="NEED_MORE_INFO">Need More Info</SelectItem>
                                        <SelectItem value="REJECTED">Rejected</SelectItem>
                                        <SelectItem value="COMPLETED">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status-note" className="text-xs font-bold uppercase text-muted-foreground">External Update (Visible to Referrer)</Label>
                                <div className="space-y-1">
                                    <Textarea
                                        id="status-note"
                                        placeholder="Explain the update to the source..."
                                        className="min-h-[100px] text-sm rounded-xl"
                                        value={statusNote}
                                        onChange={(e) => setStatusNote(e.target.value)}
                                    />
                                    <p className="text-[10px] text-muted-foreground italic px-1">
                                        Please do not include any PHI in external communications.
                                    </p>
                                </div>
                            </div>

                            <Button
                                onClick={handleStatusUpdate}
                                disabled={isPending || selectedStatus === referral.status && !statusNote}
                                className="w-full rounded-xl py-6 font-bold"
                            >
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Confirm Status & Send Update
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg border-primary/10 flex flex-col h-[550px] overflow-hidden">
                        <CardHeader style={{ padding: '12px 24px 4px' }}>
                            <CardTitle className="text-lg font-bold flex justify-between">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="text-primary h-5 w-5" />
                                    Communication
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <Tabs defaultValue="internal" className="flex-1 flex flex-col min-h-0">
                            <TabsList className="mx-6 grid grid-cols-2 rounded-xl h-10" style={{ marginBottom: 0 }}>
                                <TabsTrigger value="internal" className="rounded-lg text-xs font-bold flex items-center gap-2">
                                    INTERNAL NOTES
                                    {referral.internalNotes?.length > 0 && (
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] text-primary">
                                            {referral.internalNotes.length}
                                        </span>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="external" className="rounded-lg text-xs font-bold flex items-center gap-2">
                                    EXTERNAL CHAT
                                    {referral.externalNotes?.length > 0 && (
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                            {referral.externalNotes.length}
                                        </span>
                                    )}
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="internal" className="flex-1 min-h-0 px-6 data-[state=active]:flex data-[state=active]:flex-col" style={{ marginTop: 0 }}>
                                <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
                                    {referral.internalNotes?.length > 0 ? (
                                        referral.internalNotes.slice().reverse().map(note => (
                                            <div key={note.id} className="bg-muted/50 p-3 rounded-2xl border border-muted flex flex-col gap-1">
                                                <p className="text-sm">{note.content}</p>
                                                <div className="flex items-center justify-between mt-1 pt-1 border-t border-muted/50">
                                                    <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                                                        <UserCircle className="w-3 h-3" /> {note.author.name}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">{formatDate(note.createdAt, "PPp")}</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-10 text-muted-foreground text-xs italic">No internal notes yet.</div>
                                    )}
                                </div>
                                <div className="p-4 bg-muted/20 border-t mt-auto">
                                    <NoteInput
                                        onAdd={(content) => handleAddNote(false, content)}
                                        placeholder="Internal note (private)..."
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="external" className="flex-1 min-h-0 px-6 data-[state=active]:flex data-[state=active]:flex-col" style={{ marginTop: 0 }}>
                                <div
                                    ref={scrollContainerRef}
                                    className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-4 p-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border-2 border-slate-100 dark:border-slate-800 shadow-inner scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent scroll-smooth"
                                >
                                    {referral.externalNotes?.length > 0 ? (
                                        referral.externalNotes.slice().map((note, index) => {
                                            const isMe = note.author?.role !== 'PUBLIC';
                                            return (
                                                <div key={note.id || index} className={cn(
                                                    "flex w-full animate-in slide-in-from-bottom-2 duration-300",
                                                    isMe ? "justify-end" : "justify-start"
                                                )}>
                                                    <div className={cn(
                                                        "flex flex-col max-w-[85%]",
                                                        isMe ? "items-end" : "items-start"
                                                    )}>
                                                        <div className={cn(
                                                            "rounded-2xl px-4 py-2.5 text-sm shadow-sm relative break-words",
                                                            isMe
                                                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                                                : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-foreground rounded-bl-sm shadow-sm"
                                                        )}>
                                                            <p className="whitespace-pre-wrap leading-relaxed">
                                                                {note.content}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-1 px-1 opacity-60 hover:opacity-100 transition-opacity">
                                                            <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                                                {formatDate(note.createdAt, "p")}
                                                                <span className="text-[8px]">•</span>
                                                                {note.author.name}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3 opacity-40 select-none">
                                            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full">
                                                <MessageSquare className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium">No external messages yet</p>
                                                <p className="text-xs">Start a conversation with the referrer.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="py-2">
                                    <NoteInput
                                        onAdd={(content) => handleAddNote(true, content)}
                                        placeholder="Type a message to provider/patient..."
                                        isPrimary
                                    />
                                    <p className="text-[10px] text-center text-muted-foreground/60 italic mt-1">
                                        Messages are visible to the referrer via the Status Page. No PHI.
                                    </p>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </Card>

                    <Card className="shadow-lg border-primary/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                                <HistoryIcon className="h-4 w-4" /> Timeline History
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-4 relative">
                                <div className="absolute left-2 top-2 bottom-2 w-px bg-muted" />
                                {referral.statusHistory.slice().reverse().map((item, index) => (
                                    <li key={index} className="flex items-start gap-3 pl-6 relative">
                                        <div className="absolute left-[-2px] top-1.5 h-4 w-4 rounded-full bg-background border-2 border-primary ring-2 ring-background z-10" />
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <StatusBadge status={item.status} size="sm" />
                                                <span className="text-[10px] text-muted-foreground font-medium">{formatDate(item.changedAt, "PPp")}</span>
                                            </div>
                                            {item.notes && <p className="text-xs text-muted-foreground italic leading-tight">"{item.notes}"</p>}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}



function NoteInput({ onAdd, placeholder, isPrimary = false }: {
    onAdd: (content: string) => void,
    placeholder: string,
    isPrimary?: boolean
}) {
    const [content, setContent] = useState('');

    const handleAction = () => {
        if (!content.trim()) return;
        onAdd(content);
        setContent('');
    };

    return (
        <div className="space-y-2">
            <div className="relative">
                <Textarea
                    placeholder={placeholder}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    className="text-xs min-h-[60px] pr-10 rounded-xl resize-none"
                />
                <Button
                    size="icon"
                    variant={isPrimary ? "default" : "secondary"}
                    className="absolute right-2 bottom-2 h-8 w-8 rounded-lg"
                    onClick={handleAction}
                    disabled={!content.trim()}
                >
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
