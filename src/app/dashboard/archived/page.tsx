
export const dynamic = 'force-dynamic';

import { getReferrals } from '@/lib/data';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import StatusBadge from '@/components/referrals/status-badge';
import { formatDate } from '@/lib/utils';
import { FileText, User, Stethoscope, Building, Download } from 'lucide-react';
import type { Referral } from '@/lib/types';
import { Button } from '@/components/ui/button';
import UnarchiveButton from '@/components/referrals/unarchive-button';

// Reuse components where possible
function ReferralDetail({ referral }: { referral: Referral }) {
    return (
        <div className="space-y-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-primary font-body uppercase text-[10px] tracking-widest"><User className="h-4 w-4" /> Patient</h4>
                    <p><strong>Name:</strong> {referral.patientName}</p>
                    <p><strong>DOB:</strong> {referral.patientDOB}</p>
                    <p><strong>Insurance:</strong> {referral.patientInsurance}</p>
                </div>
                <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-primary font-body uppercase text-[10px] tracking-widest"><Building className="h-4 w-4" /> Referrer</h4>
                    <p><strong>Organization:</strong> {referral.referrerName}</p>
                    <p><strong>Contact:</strong> {referral.contactPerson}</p>
                </div>
                <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-primary font-body uppercase text-[10px] tracking-widest"><Stethoscope className="h-4 w-4" /> Services</h4>
                    <ul className="list-disc list-inside space-y-1">
                        {referral.servicesNeeded?.map(service => <li key={service}>{service}</li>)}
                    </ul>
                </div>
            </div>
            <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2 text-primary font-body uppercase text-[10px] tracking-widest"><FileText className="h-4 w-4" /> Documents</h4>
                {referral.documents.length > 0 ? (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        {referral.documents.map(doc => (
                            <li key={doc.id}>
                                <Button variant="outline" asChild className="w-full justify-start">
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="truncate">
                                        <Download className="mr-2 h-4 w-4" />
                                        {doc.name}
                                    </a>
                                </Button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground italic">No documents.</p>
                )}
            </div>
        </div>
    )
}

export default async function ArchivedReferralsPage() {
    const { headers } = await import('next/headers');
    const headersList = await headers();
    const agencyId = headersList.get('x-agency-id') || 'default';

    const referrals = await getReferrals(agencyId, { isArchived: true });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-headline">Archived Referrals</h1>
                <p className="text-muted-foreground">
                    A history of completed or closed referrals.
                </p>
            </div>

            <Card className="border-primary/10 shadow-sm">
                <CardHeader>
                    <CardTitle>History</CardTitle>
                    <CardDescription>
                        {referrals.length === 0 ? 'No archived referrals found.' : `Showing ${referrals.length} archived referrals.`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {referrals.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                            {referrals.map((referral) => (
                                <AccordionItem value={referral.id} key={referral.id} className="border-b-primary/5">
                                    <AccordionTrigger className="hover:bg-muted/50 px-4 rounded-md py-4">
                                        <div className="flex items-center gap-4 text-sm w-full">
                                            <div className="font-bold text-primary text-left min-w-[100px] font-mono">{referral.id}</div>
                                            <div className="flex-1 text-left font-medium">{referral.patientName}</div>
                                            <div className="hidden md:block text-muted-foreground text-left min-w-[120px]">{formatDate(referral.createdAt)}</div>
                                            <div className="text-right pr-4"><StatusBadge status={referral.status} /></div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-6 bg-muted/20 border-l-4 border-muted-foreground">
                                        <div className="flex justify-end mb-4 pb-2 border-b border-muted-foreground/10">
                                            <UnarchiveButton referralId={referral.id} />
                                        </div>
                                        <ReferralDetail referral={referral} />
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <div className="text-center h-32 flex flex-col items-center justify-center text-muted-foreground gap-2">
                            <FileText className="h-8 w-8 opacity-20" />
                            <p>No archived referrals.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
