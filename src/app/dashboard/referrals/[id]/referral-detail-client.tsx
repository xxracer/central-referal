'use client';

import Image from 'next/image';

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
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
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

                        <div className="bg-white border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-2xl overflow-hidden relative transition-all">
                            {/* Header / Title of the 'Paper' */}
                            <div className="bg-gradient-to-r from-slate-50 to-white px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                        <FileText className="h-5 w-5 text-blue-600" />
                                    </div>
                                    Clinical Referral Document
                                </h2>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200">
                                    Confidential
                                </div>
                            </div>

                            <div className="p-8 md:p-12 space-y-10 divide-y divide-slate-100">
                                {/* Patient Information Section */}
                                <div className="space-y-5 pt-2 first:pt-0">
                                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600 mb-5 flex items-center gap-2">
                                        <User className="h-4 w-4" /> Patient Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                                            <div className="text-2xl font-bold text-slate-900 tracking-tight capitalize">{referral.patientName}</div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date of Birth</label>
                                            <div className="text-lg font-medium text-slate-800">{referral.patientDOB}</div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Contact Phone</label>
                                            <div className="text-lg font-medium text-slate-800">{referral.patientContact || "N/A"}</div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Review Address</label>
                                            <div className="text-lg font-medium text-slate-800">{referral.patientAddress || "Address not provided"}</div>
                                            {referral.patientZipCode && <div className="text-sm font-medium text-slate-500 mt-1">Zip: <span className="text-slate-700">{referral.patientZipCode}</span></div>}
                                        </div>
                                    </div>
                                </div>

                                {/* Insurance Section */}
                                <div className="space-y-5 pt-10">
                                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600 mb-5 flex items-center gap-2">
                                        <ShieldCheck className="h-4 w-4" /> Insurance Details
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Primary Insurance</label>
                                            <div className="text-lg font-semibold text-slate-900">{referral.patientInsurance}</div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Member ID / Policy #</label>
                                            <div className="text-lg font-medium text-slate-800 font-mono tracking-tight bg-slate-50 px-2 py-0.5 rounded border border-slate-100 w-fit">{referral.memberId || "N/A"}</div>
                                        </div>
                                        {referral.groupNumber && (
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Group Number</label>
                                                <div className="text-lg font-medium text-slate-800 font-mono tracking-tight bg-slate-50 px-2 py-0.5 rounded border border-slate-100 w-fit">{referral.groupNumber}</div>
                                            </div>
                                        )}
                                        {referral.authorizationNumber && (
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Auth Number</label>
                                                <div className="text-lg font-medium text-slate-800 font-mono tracking-tight bg-slate-50 px-2 py-0.5 rounded border border-slate-100 w-fit">{referral.authorizationNumber}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Clinical Info / Services */}
                                <div className="space-y-5 pt-10">
                                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600 mb-5 flex items-center gap-2">
                                        <Stethoscope className="h-4 w-4" /> Clinical Requirements
                                    </h3>
                                    <div className="space-y-8">
                                        <div className="space-y-3">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Services Requested</label>
                                            <div className="flex flex-wrap gap-2.5">
                                                {referral.servicesNeeded?.map(service => (
                                                    <span key={service} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50/80 text-blue-700 text-sm font-semibold border border-blue-100 shadow-sm">
                                                        {getServiceLabel(service)}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Diagnosis / Clinical Notes</label>
                                            <div className="p-5 bg-slate-50/80 rounded-xl border border-slate-100 text-base leading-relaxed text-slate-800 shadow-inner">
                                                {referral.diagnosis || <span className="text-slate-400 italic">No notes provided.</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Referrer Info */}
                                <div className="space-y-5 pt-10">
                                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600 mb-5 flex items-center gap-2">
                                        <Building className="h-4 w-4" /> Referring Provider
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Organization / Practice</label>
                                            <div className="text-lg font-bold text-slate-900">{referral.referrerName}</div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Contact Person</label>
                                            <div className="text-lg font-medium text-slate-800 capitalize">{referral.contactPerson}</div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phone</label>
                                            <div className="text-lg font-medium text-blue-600">
                                                <a href={`tel:${referral.referrerContact}`} className="hover:underline flex items-center gap-1.5"><Phone className="h-4 w-4" />{referral.referrerContact}</a>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email</label>
                                            <div className="text-lg font-medium text-blue-600">
                                                <a href={`mailto:${referral.confirmationEmail}`} className="hover:underline flex items-center gap-1.5"><Mail className="h-4 w-4" />{referral.confirmationEmail}</a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Patient Documents Section integrated perfectly inside the card */}
                                <div className="space-y-5 pt-10">
                                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600 mb-5 flex items-center gap-2">
                                        <FileIcon className="h-4 w-4" /> Patient Documents
                                    </h3>
                                    {referral.documents.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {referral.documents.map(doc => {
                                                const fileUrl = doc.url.startsWith('_private/')
                                                    ? `/api/files/${doc.url.replace('_private/', '')}`
                                                    : doc.url;

                                                return (
                                                    <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100/60 hover:border-blue-200/60 hover:bg-white hover:shadow-md transition-all group overflow-hidden relative">
                                                        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-400 to-blue-200 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        <div className="flex items-center gap-3 w-full pr-12">
                                                            <div className="bg-blue-50/80 p-2.5 rounded-lg group-hover:bg-blue-100 transition-colors shrink-0">
                                                                <FileIcon className="h-4 w-4 text-blue-600" />
                                                            </div>
                                                            <span className="text-sm font-semibold text-slate-700 truncate" title={doc.name}>{doc.name}</span>
                                                        </div>
                                                        <Button variant="ghost" size="icon" asChild className="rounded-full shadow-sm bg-white border border-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 h-8 w-8 absolute right-4 shrink-0 transition-all">
                                                            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                                                                <Download className="h-3.5 w-3.5" />
                                                            </a>
                                                        </Button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-slate-500 italic p-6 bg-slate-50/50 rounded-xl border border-slate-100 text-center">
                                            No documents uploaded for this referral.
                                        </div>
                                    )}
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

                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="shadow-[0_4px_20px_rgb(0,0,0,0.04)] border-slate-200/60 rounded-2xl overflow-hidden">
                        <CardHeader className="pb-4 bg-slate-50/50 border-b border-slate-100">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-slate-700">
                                <Tag className="text-blue-500 h-4 w-4" /> Manage Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-5">
                            <div className="space-y-2.5">
                                <Label htmlFor="status-select" className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Select New Status</Label>
                                <Select onValueChange={(value) => setSelectedStatus(value as ReferralStatus)} value={selectedStatus}>
                                    <SelectTrigger id="status-select" className="rounded-xl h-11 border-slate-200 shadow-sm focus:ring-blue-500/20">
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

                            <div className="space-y-2.5">
                                <Label htmlFor="status-note" className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">External Update (Visible to Referrer)</Label>
                                <div className="space-y-2">
                                    <Textarea
                                        id="status-note"
                                        placeholder="Explain the update to the source..."
                                        className="min-h-[100px] text-sm rounded-xl border-slate-200 shadow-sm focus-visible:ring-blue-500/20"
                                        value={statusNote}
                                        onChange={(e) => setStatusNote(e.target.value)}
                                    />
                                    <p className="text-[10px] text-slate-400 italic px-1">
                                        Please do not include any PHI in external communications.
                                    </p>
                                </div>
                            </div>

                            <Button
                                onClick={handleStatusUpdate}
                                disabled={isPending || selectedStatus === referral.status && !statusNote}
                                className="w-full rounded-xl h-12 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all"
                            >
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Confirm Status & Send Update
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="shadow-[0_4px_20px_rgb(0,0,0,0.04)] border-slate-200/60 rounded-2xl flex flex-col h-[550px] overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3.5 px-5">
                            <CardTitle className="text-sm font-bold flex justify-between uppercase tracking-widest text-slate-700">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="text-blue-500 h-4 w-4" />
                                    Communication
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <Tabs defaultValue="internal" className="flex-1 flex flex-col min-h-0 bg-white">
                            <TabsList className="mx-5 mt-4 grid grid-cols-2 rounded-xl h-11 bg-slate-100/80 p-1" style={{ marginBottom: 0 }}>
                                <TabsTrigger value="internal" className="rounded-lg text-[11px] font-bold flex items-center gap-2 uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    Internal
                                    {referral.internalNotes?.length > 0 && (
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-[10px]">
                                            {referral.internalNotes.length}
                                        </span>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="external" className="rounded-lg text-[11px] font-bold flex items-center gap-2 uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700">
                                    External
                                    {referral.externalNotes?.length > 0 && (
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px]">
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

                            <TabsContent value="external" className="flex-1 min-h-0 relative data-[state=active]:flex data-[state=active]:flex-col overflow-hidden" style={{ marginTop: 0 }}>
                                <div className="absolute inset-x-0 bottom-24 top-0 z-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                                    <Image src="/logo.png" alt="Watermark" width={300} height={300} className="object-contain" priority />
                                </div>
                                <div
                                    ref={scrollContainerRef}
                                    className="relative z-10 flex-1 overflow-y-auto min-h-0 flex flex-col gap-4 p-5 bg-[#f2f2f7]/60 rounded-t-2xl border-x border-t border-slate-100 shadow-inner scrollbar-thin scrollbar-thumb-slate-300 scroll-smooth pb-8"
                                >
                                    {referral.externalNotes?.length > 0 ? (
                                        referral.externalNotes.slice().map((note, index) => {
                                            const isMe = note.author?.role !== 'PUBLIC';
                                            return (
                                                <div key={note.id || index} className={cn(
                                                    "flex w-full animate-in slide-in-from-bottom-2 duration-300",
                                                    isMe ? "justify-end pl-12" : "justify-start pr-12"
                                                )}>
                                                    <div className={cn(
                                                        "flex flex-col relative group pb-4",
                                                        isMe ? "items-end" : "items-start"
                                                    )}>
                                                        <div className={cn(
                                                            "px-3.5 py-2 text-[15px] shadow-sm relative break-words max-w-full leading-snug",
                                                            isMe
                                                                ? "bg-[#0b84ff] text-white rounded-[20px] rounded-br-[4px]"
                                                                : "bg-[#e9e9eb] text-black rounded-[20px] rounded-bl-[4px]"
                                                        )}>
                                                            {note.content}
                                                        </div>
                                                        <span className={cn(
                                                            "text-[10px] font-medium text-slate-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-0 whitespace-nowrap",
                                                            isMe ? "right-1" : "left-1"
                                                        )}>
                                                            {formatDate(note.createdAt, "p")} • {note.author.name}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3 opacity-40 select-none">
                                            <div className="bg-slate-200 p-4 rounded-full">
                                                <MessageSquare className="h-6 w-6 text-slate-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-600">No external messages yet</p>
                                                <p className="text-xs text-slate-500">Start an iMessage conversation below.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="py-2">
                                    <NoteInput
                                        onAdd={(content) => handleAddNote(true, content)}
                                        onTyping={(isTyping) => {
                                            const { firestore } = initializeFirebase();
                                            if (firestore) {
                                                const docRef = doc(firestore, 'referrals', referral.id);
                                                updateDoc(docRef, { staffIsTyping: isTyping }).catch(console.error);
                                            }
                                        }}
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

                    <Card className="shadow-[0_4px_20px_rgb(0,0,0,0.04)] border-slate-200/60 rounded-2xl overflow-hidden">
                        <CardHeader className="pb-4 bg-slate-50/50 border-b border-slate-100">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-slate-700">
                                <HistoryIcon className="text-blue-500 h-4 w-4" /> Timeline History
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <ul className="space-y-5 relative">
                                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-200" />
                                {referral.statusHistory.slice().reverse().map((item, index) => (
                                    <li key={index} className="flex items-start gap-4 pl-8 relative">
                                        <div className="absolute left-[-1px] top-1 h-6 w-6 rounded-full bg-white border-[3px] border-slate-200 flex items-center justify-center z-10 shadow-sm" />
                                        <div className="space-y-1.5 pt-0.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <StatusBadge status={item.status} size="sm" />
                                                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">{formatDate(item.changedAt, "PPp")}</span>
                                            </div>
                                            {item.notes && <p className="text-[13px] text-slate-600 italic leading-snug bg-slate-50 border border-slate-100 rounded-lg p-2.5 shadow-sm mt-1">"{item.notes}"</p>}
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



function NoteInput({ onAdd, onTyping, placeholder, isPrimary = false }: {
    onAdd: (content: string) => void,
    onTyping?: (isTyping: boolean) => void,
    placeholder: string,
    isPrimary?: boolean
}) {
    const [content, setContent] = useState('');
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleAction = () => {
        if (!content.trim()) return;
        onAdd(content);
        setContent('');
        if (onTyping) onTyping(false); // Stop typing immediately on send
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);

        if (onTyping) {
            onTyping(true);

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            // If no more input after 1.5 seconds, consider them stopped typing
            typingTimeoutRef.current = setTimeout(() => {
                onTyping(false);
            }, 1500);
        }
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            // We don't dispatch false here to avoid unmounted state updates, but it's safe if we did.
        };
    }, []);

    return (
        <div className="space-y-2">
            <div className="relative">
                <Textarea
                    placeholder={placeholder}
                    value={content}
                    onChange={handleChange}
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
