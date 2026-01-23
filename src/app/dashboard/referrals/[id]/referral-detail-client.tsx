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
    Printer
} from 'lucide-react';
import StatusBadge from '@/components/referrals/status-badge';
import { formatDate } from '@/lib/utils';
import type { Referral, ReferralStatus, Note } from '@/lib/types';
import { addInternalNote, addExternalNote, updateReferralStatus, archiveReferralAction } from '@/lib/actions';
import { useActionState, useState, useTransition, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import CopyButton from '@/components/copy-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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

    // Poll for live updates every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            router.refresh();
        }, 5000);
        return () => clearInterval(interval);
    }, [router]);

    const [selectedStatus, setSelectedStatus] = useState<ReferralStatus>(initialReferral.status);
    const [statusNote, setStatusNote] = useState('');
    const { toast } = useToast();

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
                                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                                        ID: <span className="font-mono text-primary font-medium">{referral.id}</span>
                                        <CopyButton textToCopy={referral.id} size="sm" className="h-6 w-6" />
                                        • Received: {formatDate(referral.createdAt)}
                                    </p>
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

                        <CardContent className="p-4 md:p-8 space-y-8 bg-card">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-2"><Building className="text-primary h-5 w-5" /> Provider Information</h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between border-b border-muted py-1">
                                            <span className="text-muted-foreground">Organization</span>
                                            <span className="font-medium text-right">{referral.referrerName}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-muted py-1">
                                            <span className="text-muted-foreground">Contact Person</span>
                                            <span className="font-medium text-right">{referral.contactPerson}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-muted py-1">
                                            <span className="text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</span>
                                            <span className="font-medium text-right">{referral.referrerContact}</span>
                                        </div>
                                        {referral.confirmationEmail && (
                                            <div className="flex justify-between border-b border-muted py-1">
                                                <span className="text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> Email</span>
                                                <span className="font-medium text-right">{referral.confirmationEmail}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-2"><User className="text-primary h-5 w-5" /> Patient Information</h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between border-b border-muted py-1">
                                            <span className="text-muted-foreground">Name</span>
                                            <span className="font-medium text-right">{referral.patientName}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-muted py-1">
                                            <span className="text-muted-foreground">Date of Birth</span>
                                            <span className="font-medium text-right">{referral.patientDOB}</span>
                                        </div>
                                        <div className="flex flex-col gap-1 border-b border-muted py-1">
                                            <span className="text-muted-foreground">Address</span>
                                            <span className="font-medium">{referral.patientAddress}, {referral.patientZipCode}</span>
                                        </div>
                                        {referral.surgeryDate && (
                                            <div className="flex justify-between border-b border-muted py-1">
                                                <span className="text-muted-foreground">Surgery Date</span>
                                                <span className="font-medium text-right">{formatDate(referral.surgeryDate)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-2"><HeartPulse className="text-primary h-5 w-5" /> Insurance & Diagnosis</h3>
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between border-b border-muted py-1">
                                            <span className="text-muted-foreground">Payer</span>
                                            <span className="font-bold text-primary">{referral.patientInsurance}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-muted py-1">
                                            <span className="text-muted-foreground">Member ID</span>
                                            <span className="font-medium">{referral.memberId}</span>
                                        </div>
                                        {referral.planName && (
                                            <div className="flex justify-between border-b border-muted py-1">
                                                <span className="text-muted-foreground">Plan</span>
                                                <span className="font-medium">{referral.planName}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Diagnosis / Order Notes:</h4>
                                        <div className="p-4 bg-muted/50 rounded-xl border border-muted italic leading-relaxed">
                                            "{referral.diagnosis}"
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-2"><Stethoscope className="text-primary h-5 w-5" /> Services Requested</h3>
                                <div className="flex flex-wrap gap-2">
                                    {referral.servicesNeeded?.map(service => (
                                        <Badge key={service} variant="secondary" className="px-3 py-1 bg-primary/10 text-primary border-primary/20">
                                            {getServiceLabel(service)}
                                        </Badge>
                                    ))}
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
                                        {referral.documents.map(doc => (
                                            <div key={doc.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-muted hover:border-primary/20 transition-all group">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
                                                        <FileIcon className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <span className="text-sm font-medium truncate max-w-[150px]" title={doc.name}>{doc.name}</span>
                                                </div>
                                                <Button variant="ghost" size="sm" asChild className="rounded-full shadow-sm">
                                                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                                        <Download className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-muted/20 rounded-2xl border border-dashed border-muted text-muted-foreground text-sm">
                                        No documents attached to this referral.
                                    </div>
                                )}
                            </div>
                        </CardContent>
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

                    <Card className="shadow-lg border-primary/10 flex flex-col h-[600px]">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-bold flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="text-primary h-5 w-5" />
                                    Communication
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <Tabs defaultValue="internal" className="flex-1 flex flex-col">
                            <div className="px-6">
                                <TabsList className="w-full grid grid-cols-2 rounded-xl h-10">
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
                            </div>

                            <TabsContent value="internal" className="flex-1 flex flex-col mt-4">
                                <div className="flex-1 overflow-y-auto px-6 space-y-4">
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

                            <TabsContent value="external" className="flex-1 flex flex-col mt-4">
                                <div className="flex-1 overflow-y-auto px-6 space-y-4">
                                    {referral.externalNotes?.length > 0 ? (
                                        referral.externalNotes.slice().reverse().map(note => (
                                            <div key={note.id} className="bg-primary/5 p-3 rounded-2xl border border-primary/10 flex flex-col gap-1">
                                                <p className="text-sm font-medium">{note.content}</p>
                                                <div className="flex items-center justify-between mt-1 pt-1 border-t border-primary/5">
                                                    <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                                                        <Building className="w-3 h-3" /> {note.author.name}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">{formatDate(note.createdAt, "PPp")}</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-10 text-muted-foreground text-xs italic">No external messages sent yet.</div>
                                    )}
                                </div>
                                <div className="p-4 bg-primary/5 border-t mt-auto space-y-2">
                                    <NoteInput
                                        onAdd={(content) => handleAddNote(true, content)}
                                        placeholder="Msg to provider (viewable by source)..."
                                        isPrimary
                                    />
                                    <p className="text-[10px] text-center text-muted-foreground italic">
                                        Please do not include any PHI in external communications.
                                    </p>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </Card>

                    <Card className="shadow-lg border-primary/10">
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground"><HistoryIcon className="h-4 w-4" /> Timeline History</CardTitle></CardHeader>
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
