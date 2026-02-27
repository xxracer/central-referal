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

function ReferralDetail({ referral }: { referral: Referral }) {
    return (
        <div className="space-y-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="border border-slate-200/80 rounded-2xl p-5 space-y-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="font-bold flex items-center gap-2 text-slate-800 uppercase text-[10px] tracking-[0.15em]"><User className="h-4 w-4 text-blue-500" /> Patient</h4>
                    <div className="text-slate-600 space-y-1.5 text-sm">
                        <p><strong className="text-slate-900 font-semibold">Name:</strong> <span className="capitalize">{referral.patientName}</span></p>
                        <p><strong className="text-slate-900 font-semibold">DOB:</strong> {referral.patientDOB}</p>
                        <p><strong className="text-slate-900 font-semibold">Insurance:</strong> {referral.patientInsurance || 'N/A'}</p>
                    </div>
                </div>
                <div className="border border-slate-200/80 rounded-2xl p-5 space-y-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="font-bold flex items-center gap-2 text-slate-800 uppercase text-[10px] tracking-[0.15em]"><Building className="h-4 w-4 text-indigo-500" /> Referrer</h4>
                    <div className="text-slate-600 space-y-1.5 text-sm">
                        <p><strong className="text-slate-900 font-semibold">Organization:</strong> <span className="capitalize">{referral.referrerName}</span></p>
                        <p><strong className="text-slate-900 font-semibold">Contact:</strong> {referral.contactPerson}</p>
                        <p><strong className="text-slate-900 font-semibold">Phone:</strong> {referral.referrerContact}</p>
                    </div>
                </div>
                <div className="border border-slate-200/80 rounded-2xl p-5 space-y-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="font-bold flex items-center gap-2 text-slate-800 uppercase text-[10px] tracking-[0.15em]"><Stethoscope className="h-4 w-4 text-emerald-500" /> Services</h4>
                    <ul className="space-y-1.5 text-sm text-slate-600">
                        {referral.servicesNeeded?.map(service => (
                            <li key={service} className="flex items-center gap-2 before:content-[''] before:block before:h-1.5 before:w-1.5 before:rounded-full before:bg-emerald-400">
                                {getServiceLabel(service)}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <div className="space-y-4 pt-2">
                <h4 className="font-bold flex items-center gap-2 text-slate-800 uppercase text-[10px] tracking-[0.15em]"><FileText className="h-4 w-4 text-blue-500" /> Documents</h4>
                {(referral.documents && referral.documents.length > 0) ? (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        {referral.documents.map(doc => (
                            <li key={doc.id}>
                                <Button variant="outline" asChild className="w-full justify-start border-slate-200 shadow-sm hover:bg-slate-50 hover:text-blue-600 text-slate-700 h-12 rounded-xl transition-all">
                                    <Link href={`/dashboard/referrals/${referral.id}`} className="truncate font-semibold">
                                        <FileText className="mr-3 h-4 w-4 text-slate-400" />
                                        {doc.name}
                                    </Link>
                                </Button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center">
                        <p className="text-sm text-slate-500 italic">No documents were uploaded.</p>
                    </div>
                )}
            </div>
            <div className="pt-6 mt-4 flex justify-between items-center border-t border-slate-100">
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                    <span className="hidden sm:inline">Created {formatDate(referral.createdAt)} • </span>Updated {formatDate(referral.updatedAt)}
                </p>
                <Button asChild className="rounded-full shadow-md bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-6 transition-transform hover:scale-[1.02]">
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
        <AccordionItem value={referral.id} className="border-b border-slate-100 first:border-t hover:bg-white hover:relative hover:z-10 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 group bg-transparent">
            <AccordionTrigger className="hover:no-underline px-6 py-5 data-[state=open]:bg-blue-50/30 data-[state=open]:border-b-blue-100 transition-colors" onClick={handleExpand}>
                <div className="flex flex-col md:grid md:grid-cols-12 gap-y-4 md:gap-x-5 text-sm w-full items-start md:items-center">

                    {/* ID */}
                    <div className="font-bold text-blue-600 text-left font-mono flex items-center gap-2 md:col-span-2 min-w-0">
                        <span className="truncate bg-blue-50/50 px-2.5 py-1 rounded-md border border-blue-200/50 group-hover:bg-blue-100 group-hover:border-blue-300 transition-colors">{referral.id.substring(0, 8)}...</span>
                        <div onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} className="shrink-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <CopyButton textToCopy={referral.id} className="h-6 w-6 cursor-pointer text-slate-400 hover:text-blue-600 hover:bg-blue-50" asDiv />
                        </div>
                    </div>

                    {/* Name */}
                    <div className="flex-1 text-left flex items-center gap-1 md:col-span-2 min-w-0">
                        <span className="truncate font-bold text-slate-900 capitalize tracking-tight text-[15px]">{referral.patientName}</span>
                        <div className="shrink-0 flex gap-1.5">
                            {referral.isSeen === false && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[9px] uppercase tracking-wider font-extrabold bg-green-500 text-white animate-pulse shadow-sm leading-none h-fit">
                                    New
                                </span>
                            )}
                            {referral.hasUnreadMessages && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[9px] uppercase tracking-wider font-extrabold bg-indigo-500 text-white animate-pulse shadow-sm leading-none h-fit">
                                    Msg
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Source */}
                    <div className="w-full md:w-auto text-left truncate md:col-span-3 text-slate-600 font-medium min-w-0 text-[13.5px]" title={referral.referrerName}>
                        <span className="capitalize">{referral.referrerName}</span>
                    </div>

                    {/* Insurance */}
                    <div className="hidden md:block text-left truncate col-span-2 text-slate-600 font-medium text-[13.5px]" title={referral.patientInsurance}>
                        {referral.patientInsurance || '-'}
                    </div>

                    {/* Date */}
                    <div className="hidden md:block text-slate-500 font-medium text-left col-span-2 text-[13px]">
                        {formatDate(referral.createdAt)}
                    </div>

                    {/* Status */}
                    <div className="w-full md:w-auto text-right md:col-span-1 flex justify-start md:justify-end mt-2 md:mt-0">
                        <StatusBadge status={referral.status} />
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 py-8 bg-slate-50/50 border-x border-b border-slate-200/50 rounded-b-xl mx-0 mb-4 mt-0 shadow-inner">
                <ReferralDetail referral={referral} />
            </AccordionContent>
        </AccordionItem>
    );
}
