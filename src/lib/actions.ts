
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { referralSchema } from './schemas';
import { saveReferral, findReferral, getReferralById, toggleArchiveReferral, markReferralAsSeen, getUnseenReferralCount } from './data';
import { adminStorage } from '@/lib/firebase-admin';

import type { Referral, ReferralStatus, Document, Note, StatusHistory } from './types';
import { categorizeReferral } from '@/ai/flows/smart-categorization';
import { generateReferralPdf } from '@/ai/flows/generate-referral-pdf';
import { sendReferralNotification } from './email';

export type FormState = {
    message: string;
    errors?: Record<string, string[] | undefined>;
    success: boolean;
    data?: any;
    isSubmitting?: boolean;
};

async function uploadFiles(files: File[], referralId: string, agencyId: string): Promise<Document[]> {
    const bucket = adminStorage.bucket();

    const uploadPromises = files.map(async (file) => {
        if (!file || file.size === 0) return null;

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `companies/${agencyId}/referrals/${referralId}/${file.name}`;
        const fileRef = bucket.file(filename);

        await fileRef.save(buffer, {
            metadata: {
                contentType: file.type,
            },
        });

        await fileRef.makePublic();
        const url = `https://storage.googleapis.com/${bucket.name}/${filename}`;

        return {
            id: filename,
            name: file.name,
            url: url,
            size: file.size,
        };
    });

    const results = await Promise.all(uploadPromises);
    return results.filter((doc): doc is Document => doc !== null);
}

export async function submitReferral(prevState: FormState, formData: FormData): Promise<FormState> {
    const submissionState: FormState = { ...prevState, isSubmitting: true, message: 'Processing...', success: false };

    const formValues: Record<string, any> = Object.fromEntries(formData.entries());
    formValues.servicesNeeded = formData.getAll('servicesNeeded');
    // Checkbox handling: 'on' or present means true
    formValues.isFaxingPaperwork = formData.get('isFaxingPaperwork') === 'on';

    // Explicitly handle file inputs
    formValues.referralDocuments = formData.getAll('referralDocuments').filter((f): f is File => f instanceof File && f.size > 0);
    formValues.progressNotes = formData.getAll('progressNotes').filter((f): f is File => f instanceof File && f.size > 0);


    const validatedFields = referralSchema.safeParse(formValues);

    if (!validatedFields.success) {
        console.log(validatedFields.error.flatten());
        return {
            message: 'Please correct the errors below.',
            errors: validatedFields.error.flatten().fieldErrors,
            success: false,
            isSubmitting: false,
        };
    }

    const { referralDocuments, progressNotes, servicesNeeded, ...rest } = validatedFields.data;
    const formDataForPdf = {
        ...rest,
        organizationName: rest.organizationName || '',
        contactName: rest.contactName || '',
        phone: rest.phone || '',
        email: rest.email || '',
        patientFullName: rest.patientFullName || '',
        patientDOB: rest.patientDOB || '',
        patientZipCode: rest.patientZipCode || '',
        primaryInsurance: rest.primaryInsurance === 'Other' && rest.otherInsurance ? rest.otherInsurance : rest.primaryInsurance,
        memberId: rest.memberId || '',
        insuranceType: rest.insuranceType || '',
        planName: rest.planName || '',
        planNumber: rest.planNumber || '',
        groupNumber: rest.groupNumber || '',
        servicesNeeded: servicesNeeded || [],
        diagnosis: rest.diagnosis || '',
        isFaxingPaperwork: !!rest.isFaxingPaperwork,
    };

    // Get Agency ID from headers (set by middleware)
    const headersList = await headers();
    const agencyId = headersList.get('x-agency-id') || 'default';

    // Simplified referral code: REF-XXXX (4 character random hex)
    const referralId = `REF-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
    let allUploadedDocuments: Document[] = [];

    try {
        // 1. Upload user-provided documents from both fields
        if (referralDocuments) {
            const validDocs = referralDocuments.filter((d): d is File => d !== undefined);
            if (validDocs.length > 0) allUploadedDocuments.push(...await uploadFiles(validDocs, referralId, agencyId));
        }
        if (progressNotes) {
            const validNotes = progressNotes.filter((d): d is File => d !== undefined);
            if (validNotes.length > 0) allUploadedDocuments.push(...await uploadFiles(validNotes, referralId, agencyId));
        }

        // 2. Generate PDF from form data using AI flow (only passing serializable data)
        const pdfBytes = await generateReferralPdf(formDataForPdf);
        const pdfName = `Referral-Summary-${referralId}.pdf`;

        const bucket = adminStorage.bucket();
        const pdfPath = `companies/${agencyId}/referrals/${referralId}/${pdfName}`;
        const pdfFile = bucket.file(pdfPath);

        // pdfBytes is a Uint8Array, convert to Buffer
        await pdfFile.save(Buffer.from(pdfBytes), {
            metadata: {
                contentType: 'application/pdf',
            },
        });

        await pdfFile.makePublic();
        const pdfUrl = `https://storage.googleapis.com/${bucket.name}/${pdfPath}`;

        allUploadedDocuments.push({
            id: pdfPath,
            name: pdfName,
            url: pdfUrl,
            size: pdfBytes.length,
        });

    } catch (e) {
        console.error("Error during file upload or PDF generation:", e);
        return { message: 'An error occurred while handling files. Please try again.', success: false, isSubmitting: false };
    }

    const now = new Date();
    const {
        organizationName, contactName, phone, email,
        patientFullName, patientDOB, patientZipCode, isFaxingPaperwork,
        primaryInsurance, otherInsurance, memberId, insuranceType, planName, planNumber, groupNumber,
        diagnosis
    } = validatedFields.data;

    const newReferral: Referral = {
        id: referralId,
        agencyId, // Multi-tenancy
        referrerName: organizationName || '',
        contactPerson: contactName || '',
        referrerContact: phone || '',
        confirmationEmail: email || '',
        patientName: patientFullName || '',
        patientDOB: patientDOB || '',
        patientAddress: '', // Removed from form
        patientZipCode: patientZipCode || '',
        isFaxingPaperwork: !!isFaxingPaperwork,
        patientContact: '', // Not in form
        patientInsurance: primaryInsurance === 'Other' && otherInsurance ? otherInsurance : (primaryInsurance || ''),
        memberId: memberId || '',
        insuranceType: insuranceType || '',
        planName: planName || '',
        planNumber: planNumber || '',
        groupNumber: groupNumber || '',
        servicesNeeded: servicesNeeded || [],
        diagnosis: diagnosis || '',
        examRequested: 'See Services Needed',
        providerNpi: '', // Not in form
        referrerFax: '', // Not in form
        status: 'RECEIVED',
        createdAt: now,
        updatedAt: now,
        documents: allUploadedDocuments,
        statusHistory: [{ status: 'RECEIVED', changedAt: now }],
        internalNotes: [],
        externalNotes: [],
        isArchived: false,
    };

    try {
        await saveReferral(newReferral);

        // 4. Send Email Notifications (New Logic)
        if (agencyId) {
            // 4a. Internal Notification (To Agency)
            sendReferralNotification(agencyId, 'NEW_REFERRAL_INTERNAL', {
                referralId,
                referrerName: organizationName || contactName || 'Unknown',
                dateTime: now.toLocaleString(),
                referralLink: `https://referralflow.health/dashboard/referrals/${referralId}` // fallback if env missing
            }).catch(err => console.error("Failed to send internal notification:", err));

            // 4b. Confirmation to Referrer (To Submitter)
            if (newReferral.confirmationEmail) {
                sendReferralNotification(agencyId, 'REFERRAL_SUBMISSION_CONFIRMATION', {
                    referralId,
                    referrerName: contactName || organizationName || 'Partner',
                    dateTime: now.toLocaleString(),
                    statusLink: `https://referralflow.health/status?id=${referralId}`
                }, newReferral.confirmationEmail).catch(err => console.error("Failed to send confirmation email:", err));
            }
        }
    } catch (e) {
        return { message: 'Database error: Failed to save referral.', success: false, isSubmitting: false };
    }

    revalidatePath('/dashboard');
    redirect(`/refer/success/${referralId}`);
}

export async function checkStatus(prevState: FormState, formData: FormData): Promise<FormState> {
    const rawId = formData.get('referralId') as string;
    const referralId = rawId ? rawId.trim() : '';
    const referral = await findReferral(referralId);

    if (!referral) {
        return { message: 'No matching referral found. Please check the ID.', success: false };
    }

    const optionalNote = formData.get('optionalNote') as string;
    let noteAdded = false;
    if (optionalNote) {
        const now = new Date();
        referral.externalNotes = referral.externalNotes || []; // Ensure array exists
        referral.externalNotes.push({
            id: `note-${Date.now()}`,
            content: optionalNote,
            author: { name: 'Referrer/Patient', email: '', role: 'STAFF' }, // Placeholder role/email
            createdAt: now,
            isExternal: true
        });
        referral.updatedAt = now;
        await saveReferral(referral);

        // Notify staff of new external message (Template 5)
        sendReferralNotification(referral.agencyId, 'NEW_EXTERNAL_MESSAGE_INTERNAL', {
            referralId: referral.id,
            referrerName: 'Referrer/Patient', // Could improve if we knew who checked status
            messageSnippet: optionalNote,
            referralLink: `https://referralflow.health/dashboard/referrals/${referral.id}`
        }).catch(err => console.error("Failed to send notification email:", err));

        noteAdded = true;
        revalidatePath(`/dashboard/referrals/${referral.id}`);
    }

    return {
        message: 'Referral found.',
        success: true,
        data: {
            status: referral.status,
            updatedAt: referral.updatedAt,
            statusHistory: referral.statusHistory,
            noteAdded,
        }
    };
}

export async function addInternalNote(referralId: string, prevState: FormState, formData: FormData): Promise<FormState> {
    const referral = await getReferralById(referralId);
    if (!referral) {
        return { message: 'Referral not found.', success: false };
    }

    const noteContent = formData.get('note') as string;
    const authorName = formData.get('authorName') as string || 'Staff';
    if (!noteContent) {
        return { message: 'Note cannot be empty.', success: false };
    }

    const now = new Date();
    const newNote: Note = {
        id: `note-${Date.now()}`,
        content: noteContent,
        author: { name: authorName, email: '', role: 'STAFF' },
        createdAt: now,
        isExternal: false
    };

    referral.internalNotes = referral.internalNotes || [];
    referral.internalNotes.push(newNote);
    referral.updatedAt = now;

    await saveReferral(referral);

    // Notify staff of new internal note (Legacy type, updated structure)
    sendReferralNotification(referral.agencyId, 'INTERNAL_NOTE', {
        referralId: referral.id,
        messageSnippet: noteContent,
        referralLink: `https://referralflow.health/dashboard/referrals/${referral.id}`
    }).catch(err => console.error("Failed to send notification email:", err));

    revalidatePath(`/dashboard/referrals/${referralId}`);
    return { message: 'Internal note added.', success: true };
}

export async function addExternalNote(referralId: string, prevState: FormState, formData: FormData): Promise<FormState> {
    const referral = await getReferralById(referralId);
    if (!referral) {
        return { message: 'Referral not found.', success: false };
    }

    const noteContent = formData.get('note') as string;
    const authorName = formData.get('authorName') as string || 'Office';
    if (!noteContent) {
        return { message: 'Message cannot be empty.', success: false };
    }

    const now = new Date();
    const newNote: Note = {
        id: `note-ext-${Date.now()}`,
        content: noteContent,
        author: { name: authorName, email: '', role: 'SYSTEM' },
        createdAt: now,
        isExternal: true
    };

    referral.externalNotes = referral.externalNotes || [];
    referral.externalNotes.push(newNote);
    referral.updatedAt = now;

    // Also add to status history for the timeline
    referral.statusHistory.push({
        status: referral.status,
        changedAt: now,
        notes: noteContent
    });

    await saveReferral(referral);

    // Notify Referrer of new message from Agency
    if (referral.confirmationEmail) {
        sendReferralNotification(referral.agencyId, 'NEW_MESSAGE_FROM_AGENCY', {
            referralId: referral.id,
            referrerName: referral.referrerName || 'Partner',
            messageSnippet: noteContent,
            statusLink: `https://referralflow.health/status?id=${referral.id}`
        }, referral.confirmationEmail).catch(err => console.error("Failed to send notification email:", err));
    }

    revalidatePath(`/dashboard/referrals/${referralId}`);
    revalidatePath('/status');
    return { message: 'External message sent to referrer.', success: true };
}

export async function updateReferralStatus(referralId: string, prevState: FormState, formData: FormData): Promise<FormState> {
    const status = formData.get('status') as ReferralStatus;
    const externalNote = formData.get('externalNote') as string;
    const authorName = formData.get('authorName') as string || 'Office';

    if (!status) {
        return { message: 'Status is required.', success: false };
    }

    const referral = await getReferralById(referralId);
    if (!referral) {
        return { message: 'Referral not found.', success: false };
    }

    const now = new Date();
    referral.status = status;

    // Create status history entry
    referral.statusHistory.push({
        status,
        changedAt: now,
        ...(externalNote ? { notes: externalNote } : {})
    });

    // If there's an external note, also add it to externalNotes array
    if (externalNote) {
        referral.externalNotes = referral.externalNotes || [];
        referral.externalNotes.push({
            id: `note-ext-${Date.now()}`,
            content: externalNote,
            author: { name: authorName, email: '', role: 'SYSTEM' },
            createdAt: now,
            isExternal: true
        });
    }

    referral.updatedAt = now;

    await saveReferral(referral);

    // Notify of status update (Template 4)
    if (referral.confirmationEmail) {
        sendReferralNotification(referral.agencyId, 'STATUS_UPDATE', {
            referralId: referral.id,
            patientName: referral.patientName,
            status: status,
            referrerName: referral.referrerName || 'Partner',
            statusLink: `https://referralflow.health/status?id=${referral.id}`
        }, referral.confirmationEmail).catch(err => console.error("Failed to send notification email:", err));
    }

    revalidatePath(`/dashboard/referrals/${referralId}`);
    revalidatePath('/dashboard');
    revalidatePath('/status');
    return { message: `Status updated to ${status}.`, success: true };
}

import { updateAgencySettings, getAgencySettings } from './settings';
import type { AgencySettings } from './types';

export async function updateAgencySettingsAction(agencyId: string, settings: Partial<AgencySettings>): Promise<{ message: string; success: boolean }> {
    try {
        console.log(`[Action] Updating settings for ${agencyId}:`, settings);

        // 1. Update Database
        await updateAgencySettings(agencyId, settings);

        // 2. Admin Alert Logic (If Slug/Domain is configured)
        if (settings.slug) {
            // Fetch latest profile to get name/phone if available
            const fullSettings = await getAgencySettings(agencyId);
            const agencyName = fullSettings.companyProfile?.name || 'New Agency';
            const phone = fullSettings.companyProfile?.phone || 'N/A';
            const adminEmail = fullSettings.notifications?.primaryAdminEmail || fullSettings.companyProfile?.email || 'Unknown';

            sendReferralNotification(agencyId, 'WELCOME_ADMIN_ALERT', {
                referralLink: settings.slug, // Using referralLink prop for the slug
                recipientOverride: 'maijelcancines2@gmail.com', // Direct to Super Admin
                patientName: phone, // Reuse patientName for phone to avoid new props if possible, or use snippet. reusing patientName for phone as per template.
            }).catch(err => console.error("Failed to send admin alert:", err));
        }

        revalidatePath('/dashboard/settings');
        revalidatePath('/refer');
        revalidatePath('/status');
        revalidatePath('/');
        return { message: 'Settings updated successfully.', success: true };
    } catch (e) {
        console.error("Error updating settings:", e);
        return { message: 'Failed to update settings.', success: false };
    }
}

export async function uploadAgencyLogoAction(agencyId: string, formData: FormData): Promise<{ url?: string; success: boolean, message?: string }> {
    const file = formData.get('logo') as File;
    if (!file || file.size === 0) {
        return { success: false, message: 'No file uploaded.' };
    }

    try {
        const bucket = adminStorage.bucket();
        // Path as requested: companies/{companyName}/{fileName}
        // We use agencyId as the folder name strictly for uniqueness and safety.
        // User requested 'companies/[companyname]', but agencyId IS the unique identifier for the company in this system.
        const path = `companies/${agencyId}/${Date.now()}-${file.name}`;
        const fileRef = bucket.file(path);
        const buffer = Buffer.from(await file.arrayBuffer());

        await fileRef.save(buffer, {
            metadata: { contentType: file.type }
        });
        await fileRef.makePublic();
        const url = `https://storage.googleapis.com/${bucket.name}/${path}`;

        return { success: true, url };
    } catch (e) {
        console.error("Logo upload failed", e);
        return { success: false, message: 'Upload failed.' };
    }
}

export async function archiveReferralAction(id: string, isArchived: boolean) {
    const success = await toggleArchiveReferral(id, isArchived);
    if (success) {
        revalidatePath('/dashboard');
        revalidatePath(`/dashboard/referrals/${id}`);
    }
    return { success };
}

export async function markReferralAsSeenAction(id: string) {
    try {
        await markReferralAsSeen(id);
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        return { success: false };
    }
}

export async function getUnseenReferralCountAction() {
    try {
        const headersList = await headers();
        const agencyId = headersList.get('x-agency-id') || 'default';
        const count = await getUnseenReferralCount(agencyId);
        return { count, success: true };
    } catch (e) {
        return { count: 0, success: false };
    }
}
