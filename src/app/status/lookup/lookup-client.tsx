'use client';

import { useActionState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Search, Calendar, User, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import SiteHeader from '@/components/layout/site-header';
import { lookupReferralAction, type LookupState } from '@/lib/lookup-actions';
import { useFormStatus } from 'react-dom';
import type { AgencySettings } from '@/lib/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

function SubmitButton({ children }: { children: React.ReactNode }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : children}
        </Button>
    );
}

export default function LookupClient({ settings }: { settings: AgencySettings }) {
    const initialState: LookupState = { message: '', success: false };
    const [formState, dispatch] = useActionState(lookupReferralAction, initialState);
    const router = useRouter();

    const [dob, setDob] = useState('');
    const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 8) value = value.slice(0, 8);

        // Format: MM/DD/YYYY
        let formatted = value;
        if (value.length > 2 && value.length <= 4) {
            formatted = `${value.slice(0, 2)}/${value.slice(2)}`;
        } else if (value.length > 4) {
            formatted = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
        }
        setDob(formatted);
    };

    useEffect(() => {
        if (formState.success && formState.data?.id) {
            router.push(`/status?id=${formState.data.id}`);
        }
    }, [formState.success, formState.data?.id, router]);

    const profile = settings.companyProfile;

    const StatusBadge = ({ status }: { status: string }) => {
        const variants: Record<string, string> = {
            prospect: 'bg-blue-100 text-blue-800 border-blue-200',
            active: 'bg-green-100 text-green-800 border-green-200',
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            accepted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
            rejected: 'bg-red-100 text-red-800 border-red-200',
            completed: 'bg-purple-100 text-purple-800 border-purple-200',
            admitted: 'bg-indigo-100 text-indigo-800 border-indigo-200',
            discharged: 'bg-gray-100 text-gray-800 border-gray-200',
        };
        const label = status === 'completed' ? 'Intake Completed' : status;
        const c = variants[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
        return <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border capitalize ${c}`}>{label.replace('_', ' ')}</span>;
    };

    return (
        <div className="min-h-screen bg-slate-50/50 flex flex-col">
            <SiteHeader logoUrl={profile.logoUrl} companyName={profile.name} />

            <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
                <div className="w-full max-w-md">
                    <div className="mb-8">
                        <Link href="/status" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-4">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to PIN Login
                        </Link>
                    </div>

                    <Card className="border-slate-200/60 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-xl">
                        <CardHeader className="text-center space-y-3 pb-6 border-b border-slate-100/50 bg-white/50">
                            <div className="mx-auto w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-2 ring-1 ring-blue-100/50">
                                <Search className="w-6 h-6" />
                            </div>
                            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
                                Lookup Referral
                            </CardTitle>
                            <CardDescription className="text-slate-500 text-[15px]">
                                Check the status of a referral securely.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="pt-8 px-6 sm:px-8">
                            {!formState.success ? (
                                <form action={dispatch} className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="lastName" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                                <User className="w-4 h-4 text-slate-400" /> Patient Name (First or Last)
                                            </Label>
                                            <Input
                                                id="lastName"
                                                name="lastName"
                                                placeholder="e.g. John or Smith"
                                                required
                                                className="h-12 bg-slate-50/50 border-slate-200 focus:bg-white transition-colors text-base"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="dob" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-slate-400" /> Patient Date of Birth
                                            </Label>
                                            <Input
                                                id="dob"
                                                name="dob"
                                                type="text"
                                                value={dob}
                                                onChange={handleDobChange}
                                                placeholder="MM/DD/YYYY"
                                                required
                                                maxLength={10}
                                                className="h-12 bg-slate-50/50 border-slate-200 focus:bg-white transition-colors text-base"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-slate-400" /> Your Email (Optional)
                                            </Label>
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                placeholder="you@hospital.com (Optional)"
                                                className="h-12 bg-slate-50/50 border-slate-200 focus:bg-white transition-colors text-base"
                                            />
                                        </div>
                                    </div>

                                    {formState.message && !formState.success && (
                                        <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>{formState.message}</AlertDescription>
                                        </Alert>
                                    )}

                                    <SubmitButton>
                                        <Search className="mr-2 h-4 w-4" /> Find Referral
                                    </SubmitButton>
                                </form>
                            ) : (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="text-center space-y-2">
                                        <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50/50">
                                            <CheckCircle className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900">Referral Found</h3>
                                        <p className="text-slate-500 text-sm">We've located the status of this referral.</p>
                                    </div>

                                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
                                        <div className="flex justify-between items-center py-2 border-b border-slate-100 pb-4">
                                            <span className="text-sm font-medium text-slate-500">Patient</span>
                                            <span className="font-semibold text-slate-900">{formState.data?.maskedName}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-slate-100 pb-4">
                                            <span className="text-sm font-medium text-slate-500">Date Received</span>
                                            <span className="font-medium text-slate-700">{formState.data?.createdAt}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 pt-2">
                                            <span className="text-sm font-medium text-slate-500">Current Status</span>
                                            <StatusBadge status={formState.data?.status || 'UNKNOWN'} />
                                        </div>
                                    </div>

                                    <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
                                        Look up another
                                    </Button>
                                    <div className="text-xs text-center text-slate-400 max-w-xs mx-auto">
                                        For privacy and HIPAA compliance, detailed notes and attachments are not available here. Please log in for full access.
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-slate-400">
                            Powered by <strong className="text-slate-500">ReferralFlow</strong>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
