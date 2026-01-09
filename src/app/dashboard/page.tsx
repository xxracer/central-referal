
export const dynamic = 'force-dynamic';

import { getReferrals } from '@/lib/data';
import Link from 'next/link';
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
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/referrals/status-badge';
import { formatDate } from '@/lib/utils';
import { FileText, PlusCircle, User, Stethoscope, Building, Download, ExternalLink } from 'lucide-react';
import type { Referral } from '@/lib/types';

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Patient Info */}
                <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-primary"><User /> Patient</h4>
                    <p><strong>Name:</strong> {referral.patientName}</p>
                    <p><strong>DOB:</strong> {referral.patientDOB}</p>
                    <p><strong>Insurance:</strong> {referral.patientInsurance}</p>
                </div>
                {/* Referrer Info */}
                <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-primary"><Building /> Referrer</h4>
                    <p><strong>Organization:</strong> {referral.referrerName}</p>
                    <p><strong>Contact:</strong> {referral.contactPerson}</p>
                    <p><strong>Phone:</strong> {referral.referrerContact}</p>
                </div>
                 {/* Services Info */}
                <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-primary"><Stethoscope /> Services</h4>
                     <ul className="list-disc list-inside space-y-1">
                        {referral.servicesNeeded?.map(service => <li key={service}>{getServiceLabel(service)}</li>)}
                    </ul>
                </div>
            </div>
            
             {/* Documents */}
            <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2 text-primary"><FileText /> Documents</h4>
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
                    <p className="text-sm text-muted-foreground">No documents were uploaded.</p>
                )}
            </div>

            <div className="pt-4 flex justify-end">
                <Button asChild>
                    <Link href={`/dashboard/referrals/${referral.id}`}>
                        Manage Referral (Accept/Reject)
                        <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>
        </div>
    )
}


export default async function DashboardPage() {
  const referrals = await getReferrals();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-headline">Dashboard</h1>
            <p className="text-muted-foreground">
                An overview of all patient referrals.
            </p>
        </div>
        <Button asChild>
            <Link href="/refer">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Referral
            </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Referrals</CardTitle>
          <CardDescription>
            Showing the {referrals.length} most recent referrals. Click on a referral to see details.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {referrals.length > 0 ? (
                 <Accordion type="single" collapsible className="w-full">
                    {referrals.map((referral) => (
                        <AccordionItem value={referral.id} key={referral.id}>
                            <AccordionTrigger className="hover:bg-muted/50 px-4 rounded-md">
                                <div className="flex items-center gap-4 text-sm w-full">
                                    <div className="font-medium text-primary text-left">{referral.id}</div>
                                    <div className="flex-1 text-left">{referral.patientName}</div>
                                    <div className="text-muted-foreground text-left">{formatDate(referral.createdAt)}</div>
                                    <div className="text-right pr-4"><StatusBadge status={referral.status} /></div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-4 bg-muted/20 border-l-2 border-primary">
                                <ReferralDetail referral={referral} />
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                 </Accordion>
            ) : (
                 <div className="text-center h-24 flex items-center justify-center">
                    No referrals found.
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
