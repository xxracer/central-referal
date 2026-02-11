'use client';

import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/referrals/status-badge';
import { formatDate } from '@/lib/utils';
import { Download, ExternalLink, AlertCircle, User, Building, Stethoscope, FileText } from 'lucide-react';
import type { Referral } from '@/lib/types';
import { markReferralAsSeenAction } from '@/lib/actions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import CopyButton from '@/components/copy-button';

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

// Extracted Detail Component (same as before but now inside client file)
function ReferralDetail({ referral }: { referral: Referral }) {
    return (
        <div className="space-y-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="border-2 border-black dark:border-slate-700 rounded-xl p-4 space-y-3 bg-background">
                    <h4 className="font-semibold flex items-center gap-2 text-primary font-body uppercase text-[10px] tracking-widest"><User className="h-4 w-4" /> Patient</h4>
                    <div className="text-foreground space-y-1 text-sm">
                        <p><strong>Name:</strong> {referral.patientName}</p>
                        <p><strong>DOB:</strong> {referral.patientDOB}</p>
                        <p><strong>Insurance:</strong> {referral.patientInsurance}</p>
                    </div>
                </div>
                <div className="border-2 border-black dark:border-slate-700 rounded-xl p-4 space-y-3 bg-background">
                    <h4 className="font-semibold flex items-center gap-2 text-primary font-body uppercase text-[10px] tracking-widest"><Building className="h-4 w-4" /> Referrer</h4>
                    <div className="text-foreground space-y-1 text-sm">
                        <p><strong>Organization:</strong> {referral.referrerName}</p>
                        <p><strong>Contact:</strong> {referral.contactPerson}</p>
                        <p><strong>Phone:</strong> {referral.referrerContact}</p>
                    </div>
                </div>
                <div className="border-2 border-black dark:border-slate-700 rounded-xl p-4 space-y-3 bg-background">
                    <h4 className="font-semibold flex items-center gap-2 text-primary font-body uppercase text-[10px] tracking-widest"><Stethoscope className="h-4 w-4" /> Services</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-foreground">
                        {referral.servicesNeeded?.map(service => <li key={service}>{getServiceLabel(service)}</li>)}
                    </ul>
                </div>
            </div>
            <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2 text-primary font-body uppercase text-[10px] tracking-widest"><FileText className="h-4 w-4" /> Documents</h4>
                {(referral.documents && referral.documents.length > 0) ? (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        {referral.documents.map(doc => (
                            <li key={doc.id}>
                                <Button variant="outline" asChild className="w-full justify-start border-primary/20 hover:bg-primary/5 hover:text-foreground text-foreground">
                                    <Link href={`/dashboard/referrals/${referral.id}`} className="truncate">
                                        <FileText className="mr-2 h-4 w-4" />
                                        {doc.name}
                                    </Link>
                                </Button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground italic">No documents were uploaded.</p>
                )}
            </div>
            <div className="pt-4 flex justify-between items-center border-t border-primary/10">
                <p className="text-xs text-muted-foreground italic">Created {formatDate(referral.createdAt)} | Last updated {formatDate(referral.updatedAt)}</p>
                <Button asChild>
                    <Link href={`/dashboard/referrals/${referral.id}`}>
                        Manage Referral
                        <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>
        </div>
    )
}

function ReferralAlert({ referral }: { referral: Referral }) {
    if (referral.isSeen !== false) return null;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center justify-center bg-red-100 text-red-600 rounded-full p-1.5 animate-pulse shadow-sm">
                        <AlertCircle className="h-4 w-4" />
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="text-xs">New / Unseen</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export default function ReferralListItem({ referral }: { referral: Referral }) {
    const handleExpand = () => {
        if (referral.isSeen === false || referral.hasUnreadMessages) {
            markReferralAsSeenAction(referral.id);
        }
    };

    return (
        <AccordionItem value={referral.id} className="border-b-primary/5">
            <AccordionTrigger className="hover:bg-muted/50 px-4 rounded-md py-4" onClick={handleExpand}>
                <div className="flex md:grid md:grid-cols-12 gap-4 text-sm w-full items-center">
                    {/* ID */}
                    <div className="font-bold text-primary text-left font-mono flex items-center gap-1 col-span-1">
                        {referral.id}
                        <div onClick={(e) => e.stopPropagation()}>
                            <CopyButton textToCopy={referral.id} className="h-6 w-6 ml-1 cursor-pointer" asDiv />
                        </div>
                    </div>

                    {/* Name */}
                    <div className="flex-1 text-left font-medium flex items-center gap-2 md:col-span-2">
                        {referral.patientName}
                        {referral.isSeen === false && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-500 text-white animate-pulse shadow-sm">
                                NEW
                            </span>
                        )}
                        {referral.hasUnreadMessages && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-500 text-white animate-pulse shadow-sm">
                                MSG
                            </span>
                        )}
                    </div>

                    {/* Source - Hidden on mobile */}
                    <div className="hidden md:block text-left truncate col-span-3 text-muted-foreground" title={referral.referrerName}>
                        {referral.referrerName}
                    </div>

                    {/* Insurance - Hidden on mobile */}
                    <div className="hidden md:block text-left truncate col-span-2 text-muted-foreground" title={referral.patientInsurance}>
                        {referral.patientInsurance || '-'}
                    </div>

                    {/* Date - Hidden on mobile */}
                    <div className="hidden md:block text-muted-foreground text-left col-span-2">
                        {formatDate(referral.createdAt)}
                    </div>

                    {/* Status */}
                    <div className="text-right md:col-span-2">
                        <StatusBadge status={referral.status} />
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="p-6 bg-muted/20 border-l-4 border-primary">
                <ReferralDetail referral={referral} />
            </AccordionContent>
        </AccordionItem>
    );
}
