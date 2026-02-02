'use client';

import React, { useState, useActionState, useRef, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, AlertCircle, Phone, Mail, Printer, UploadCloud, File as FileIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SiteHeader from '@/components/layout/site-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { submitReferral } from '@/lib/actions';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import LoadingModal from '@/components/loading-modal';
import type { AgencySettings } from '@/lib/types';

// Hardcoded fallback removed, now using settings.configuration.offeredServices

const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

interface FileListProps {
    files: File[];
    onRemove: (index: number) => void;
}

function FileList({ files, onRemove }: FileListProps) {
    if (files.length === 0) return null;

    return (
        <ul className="space-y-2 mt-2">
            {files.map((file, index) => (
                <li key={index} className="flex items-center justify-between p-2 rounded-md bg-muted text-sm">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <FileIcon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{file.name}</span>
                        <span className="text-muted-foreground flex-shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemove(index)}>
                        <X className="h-4 w-4" />
                    </Button>
                </li>
            ))}
        </ul>
    );
}

export default function ReferralForm({ settings }: { settings: AgencySettings }) {
    const [formState, formAction, isPending] = useActionState(submitReferral, { message: '', success: false, isSubmitting: false });
    const formRef = useRef<HTMLFormElement>(null);

    const [referralDocs, setReferralDocs] = useState<File[]>([]);
    const [progressNotes, setProgressNotes] = useState<File[]>([]);
    const referralDocsRef = useRef<HTMLInputElement>(null);
    const progressNotesRef = useRef<HTMLInputElement>(null);

    const [selectedInsurance, setSelectedInsurance] = useState<string>('');

    const [phone, setPhone] = useState('');
    const [dob, setDob] = useState('');

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 10) value = value.slice(0, 10);

        // Format: XXX-XXX-XXXX
        let formatted = value;
        if (value.length > 3 && value.length <= 6) {
            formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
        } else if (value.length > 6) {
            formatted = `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6)}`;
        }
        setPhone(formatted);
    };

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

    const totalSize = [...referralDocs, ...progressNotes].reduce((acc, file) => acc + file.size, 0);
    const isOverLimit = totalSize > MAX_SIZE_BYTES;

    // Use insurances from settings, or fallback if empty (though settings should have defaults)
    // Use insurances from configuration, or fallback to home page insurances, or final minimal fallback
    let insuranceOptions = (settings.configuration.acceptedInsurances || []).filter(i => i.toLowerCase() !== 'other');
    if (insuranceOptions.length === 0) {
        insuranceOptions = (settings.companyProfile.homeInsurances || []).filter(i => i.toLowerCase() !== 'other');
    }
    if (insuranceOptions.length === 0) {
        insuranceOptions = ["Medicare"];
    }

    // Insert custom 'Other' name if defined
    if (settings.configuration.otherInsuranceName) {
        // Prepend or append? Usually specialized ones go along with others.
        // Let's prepend it to ensure visibility or append. Alphabetical is handled by user order? No order is arbitrary.
        insuranceOptions = [...insuranceOptions, settings.configuration.otherInsuranceName];
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, setFiles: React.Dispatch<React.SetStateAction<File[]>>) => {
        const newFiles = Array.from(event.target.files || []);
        if (newFiles.length > 0) {
            setFiles(prev => [...prev, ...newFiles]);
        }
        event.target.value = '';
    };

    const removeReferralDoc = (index: number) => {
        setReferralDocs(prev => prev.filter((_, i) => i !== index));
    };

    const removeProgressNote = (index: number) => {
        setProgressNotes(prev => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        if (formState.success) {
            formRef.current?.reset();
            setReferralDocs([]);
            setProgressNotes([]);
            setPhone('');
            setDob('');
        }
    }, [formState.success]);

    const formActionWithFiles: (payload: FormData) => void = (payload) => {
        referralDocs.forEach(file => payload.append('referralDocuments', file));
        progressNotes.forEach(file => payload.append('progressNotes', file));
        formAction(payload);
    };

    const profile = settings.companyProfile;

    return (
        <div className="flex flex-col min-h-dvh">
            <SiteHeader logoUrl={profile.logoUrl} companyName={profile.name} />
            <LoadingModal isOpen={isPending || !!formState.isSubmitting} />
            <main className="flex-1 py-12 md:py-20 bg-muted/20">
                <div className="container mx-auto max-w-4xl px-4">
                    <Card className="mb-8 bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="font-headline text-2xl text-center">Submit a Referral</CardTitle>
                            <CardDescription className="text-center italic">Fast and trackable referral intake.</CardDescription>
                            {profile.homeInsurances && profile.homeInsurances.length > 0 && (
                                <div className="mt-4 flex flex-wrap justify-center gap-2">
                                    <span className="text-xs font-bold uppercase tracking-widest text-primary/70 w-full text-center mb-1">We Proudly Accept</span>
                                    {profile.homeInsurances.map(ins => (
                                        <Badge key={ins} variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                            {ins}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-sm pt-0">
                            {profile.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /><strong>Phone:</strong> {profile.phone}</div>}
                            {profile.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /><strong>Email:</strong> {profile.email}</div>}
                            {profile.fax && <div className="flex items-center gap-2"><Printer className="w-4 h-4 text-primary" /><strong>Fax:</strong> {profile.fax}</div>}
                        </CardContent>
                    </Card>

                    <form action={formActionWithFiles} ref={formRef} className="space-y-8">
                        <Card>
                            <CardHeader><CardTitle className="font-headline text-2xl">How can we contact you about this referral?</CardTitle></CardHeader>
                            <CardContent className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="organizationName">Organization / Facility Name <span className="text-destructive">*</span></Label>
                                    <Input id="organizationName" name="organizationName" placeholder="e.g., Memorial Hermann" required className="bg-blue-50 text-blue-900 border-blue-200" />
                                    {formState.errors?.organizationName && <p className="text-sm text-destructive">{formState.errors.organizationName[0]}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contactName">Contact Name</Label>
                                    <Input id="contactName" name="contactName" placeholder="e.g., Maria Lopez" className="bg-blue-50 text-blue-900 border-blue-200" />
                                    {formState.errors?.contactName && <p className="text-sm text-destructive">{formState.errors.contactName[0]}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        placeholder="XXX-XXX-XXXX"
                                        value={phone}
                                        onChange={handlePhoneChange}
                                        required
                                        className="bg-blue-50 text-blue-900 border-blue-200"
                                    />
                                    {formState.errors?.phone && <p className="text-sm text-destructive">{formState.errors.phone[0]}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address (for confirmation)</Label>
                                    <Input id="email" type="email" name="email" placeholder="e.g., case.manager@facility.com" className="bg-blue-50 text-blue-900 border-blue-200" />
                                    {formState.errors?.email && <p className="text-sm text-destructive">{formState.errors.email[0]}</p>}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle className="font-headline text-2xl">Patient Information</CardTitle></CardHeader>
                            <CardContent className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="patientFullName">Patient Full Name <span className="text-destructive">*</span></Label>
                                    <Input id="patientFullName" name="patientFullName" placeholder="e.g., John Doe" required className="bg-blue-50 text-blue-900 border-blue-200" />
                                    {formState.errors?.patientFullName && <p className="text-sm text-destructive">{formState.errors.patientFullName[0]}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="patientDOB">Date of Birth</Label>
                                    <Input
                                        id="patientDOB"
                                        name="patientDOB"
                                        placeholder="MM/DD/YYYY"
                                        value={dob}
                                        onChange={handleDobChange}
                                        className="bg-blue-50 text-blue-900 border-blue-200"
                                    />
                                    {formState.errors?.patientDOB && <p className="text-sm text-destructive">{formState.errors.patientDOB[0]}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="patientZipCode">Patient ZIP Code <span className="text-destructive">*</span></Label>
                                    <Input id="patientZipCode" name="patientZipCode" placeholder="e.g., 77005" required className="bg-blue-50 text-blue-900 border-blue-200" />
                                    {formState.errors?.patientZipCode && <p className="text-sm text-destructive">{formState.errors.patientZipCode[0]}</p>}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle className="font-headline text-2xl">Insurance Information</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="primaryInsurance">Primary Insurance Payer <span className="text-destructive">*</span></Label>
                                    <Select name="primaryInsurance" onValueChange={setSelectedInsurance}>
                                        <SelectTrigger id="primaryInsurance" className="bg-blue-50 text-blue-900 border-blue-200 shadow-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                                        <SelectContent className="bg-white text-blue-900 border-blue-100">
                                            {insuranceOptions.map(option => <SelectItem key={option} value={option} className="text-blue-900 focus:bg-blue-50 hover:bg-blue-50 cursor-pointer">{option}</SelectItem>)}
                                            <SelectItem value="Other" className="text-blue-900 font-semibold focus:bg-blue-50 hover:bg-blue-50 cursor-pointer">Not Listed / Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {formState.errors?.primaryInsurance && <p className="text-sm text-destructive">{formState.errors.primaryInsurance[0]}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="otherInsurance">Other Insurance (if not listed above)</Label>
                                    <Input id="otherInsurance" name="otherInsurance" placeholder="Enter insurance name" className="bg-blue-50 text-blue-900 border-blue-200 placeholder:text-blue-400 shadow-sm" />
                                    {formState.errors?.otherInsurance && <p className="text-sm text-destructive">{formState.errors.otherInsurance[0]}</p>}
                                </div>

                                {selectedInsurance && (
                                    <div className="space-y-4 border-t pt-4">
                                        <Label className="text-base">Other insurance details (optional)</Label>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="memberId">Member ID#</Label>
                                                <Input id="memberId" name="memberId" />
                                                {formState.errors?.memberId && <p className="text-sm text-destructive">{formState.errors.memberId[0]}</p>}
                                            </div>
                                            <div className="space-y-2"><Label htmlFor="insuranceType">Type</Label><Input id="insuranceType" name="insuranceType" placeholder="e.g., MA PPO" />{formState.errors?.insuranceType && <p className="text-sm text-destructive">{formState.errors.insuranceType[0]}</p>}</div>
                                            <div className="space-y-2"><Label htmlFor="planNumber">Plan Number#</Label><Input id="planNumber" name="planNumber" />{formState.errors?.planNumber && <p className="text-sm text-destructive">{formState.errors.planNumber[0]}</p>}</div>
                                            <div className="space-y-2"><Label htmlFor="planName">Plan Name</Label><Input id="planName" name="planName" placeholder="e.g., LPPO-AARP MEDICARE ADVANTAGE" />{formState.errors?.planName && <p className="text-sm text-destructive">{formState.errors.planName[0]}</p>}</div>
                                            <div className="space-y-2"><Label htmlFor="groupNumber">Group Number#</Label><Input id="groupNumber" name="groupNumber" />{formState.errors?.groupNumber && <p className="text-sm text-destructive">{formState.errors.groupNumber[0]}</p>}</div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle className="font-headline text-2xl">Services & Diagnosis</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label>Services Needed <span className="text-destructive">*</span></Label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {(settings.configuration.offeredServices || []).map((serviceName) => (
                                            <div key={serviceName} className="flex items-center space-x-2 p-3 bg-muted/50 rounded-md hover:bg-muted/70 transition-colors">
                                                <Checkbox id={serviceName} name="servicesNeeded" value={serviceName} />
                                                <Label htmlFor={serviceName} className="font-normal cursor-pointer flex-1">{serviceName}</Label>
                                            </div>
                                        ))}
                                        {(!settings.configuration.offeredServices || settings.configuration.offeredServices.length === 0) && (
                                            <p className="text-sm text-muted-foreground italic col-span-2">No specific services configured. Contact agency for details.</p>
                                        )}
                                    </div>
                                    {formState.errors?.servicesNeeded && <p className="text-sm text-destructive">{formState.errors.servicesNeeded[0]}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="diagnosis">Additional Patient / Order Notes</Label>
                                    <Textarea id="diagnosis" name="diagnosis" placeholder="e.g., Dx: Pain of right hip joint | Arthritis, lumbar spine" />
                                    {formState.errors?.diagnosis && <p className="text-sm text-destructive">{formState.errors.diagnosis[0]}</p>}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle className="font-headline text-2xl">Supporting Documentation</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="referralDocuments">Referral Documents</Label>
                                    <Input id="referralDocuments" type="file" multiple ref={referralDocsRef} onChange={(e) => handleFileChange(e, setReferralDocs)} className="hidden" />
                                    <Button type="button" variant="outline" className="w-full" onClick={() => referralDocsRef.current?.click()}>
                                        <UploadCloud className="mr-2" /> Choose Files
                                    </Button>
                                    <FileList files={referralDocs} onRemove={removeReferralDoc} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="progressNotes">Progress Notes</Label>
                                    <Input id="progressNotes" type="file" multiple ref={progressNotesRef} onChange={(e) => handleFileChange(e, setProgressNotes)} className="hidden" />
                                    <Button type="button" variant="outline" className="w-full" onClick={() => progressNotesRef.current?.click()}>
                                        <UploadCloud className="mr-2" /> Choose Files
                                    </Button>
                                    <FileList files={progressNotes} onRemove={removeProgressNote} />
                                </div>

                                <div className="flex items-center space-x-2 py-2">
                                    <Checkbox id="isFaxingPaperwork" name="isFaxingPaperwork" />
                                    <Label htmlFor="isFaxingPaperwork" className="font-normal cursor-pointer">
                                        I will be faxing information to {profile.fax || '713-378-5289'} (Office is notified to expect fax)
                                    </Label>
                                </div>

                                <p className="text-sm text-muted-foreground">Uploading documents allows us to confirm insurance and respond faster. You can additionally fax it to {profile.fax || '713-378-5289'}. Max total size: 5MB.</p>

                                {(referralDocs.length > 0 || progressNotes.length > 0) && (
                                    <div className="space-y-2 pt-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <p className="font-medium">Total selected size</p>
                                            <p className={cn("font-medium", isOverLimit ? "text-destructive" : "text-muted-foreground")}>
                                                {(totalSize / (1024 * 1024)).toFixed(2)} MB / {MAX_SIZE_MB} MB
                                            </p>
                                        </div>
                                        <Progress value={(totalSize / MAX_SIZE_BYTES) * 100} className={cn("h-2", isOverLimit && "[&>div]:bg-destructive")} />
                                        {isOverLimit && (
                                            <p className="text-sm text-destructive">Total file size exceeds the {MAX_SIZE_MB}MB limit. Please remove some files.</p>
                                        )}
                                    </div>
                                )}
                                {formState.errors?.referralDocuments && <p className="text-sm text-destructive">{formState.errors.referralDocuments[0]}</p>}
                            </CardContent>
                        </Card>

                        <div className="text-center space-y-4">
                            <p className="text-xs text-muted-foreground italic">
                                This system is intended for referral coordination and does not replace clinical documentation.
                            </p>
                            {formState.message && !formState.success && (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{formState.message}</AlertDescription></Alert>)}
                        </div>

                        <Button type="submit" disabled={isPending || formState.isSubmitting || isOverLimit} size="lg" className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
                            {isPending || formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isPending || formState.isSubmitting ? 'Submitting & Processing Files...' : 'SUBMIT REFERRAL'}
                        </Button>
                    </form>
                </div>
            </main>
        </div>
    );
}
