
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
import { adminAuth } from '@/lib/firebase-admin';

export async function provisionStaffUser(agencyId: string, email: string, tempPassword?: string, name?: string): Promise<{ success: boolean; message: string }> {
    try {
        let passwordToUse = tempPassword;
        if (!passwordToUse || passwordToUse.length < 6) {
            // If no password provided, generate a random secure one
            passwordToUse = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        }

        // 1. Create User in Firebase Auth
        let uid: string;
        try {
            const userRecord = await adminAuth.createUser({
                email,
                password: passwordToUse,
                displayName: name || 'Staff Member',
                emailVerified: true // Auto-verify since admin trusted it
            });
            uid = userRecord.uid;
        } catch (error: any) {
            if (error.code === 'auth/email-already-exists') {
                // If user exists, we just want to ensure they are added to the agency.
                // We CANNOT set their password if they already exist without reset link.
                // But user request was "assign new key". If user exists, we can't overwrite password easily without admin force.
                // adminAuth.updateUser() CAN overwrite password.
                const user = await adminAuth.getUserByEmail(email);
                uid = user.uid;

                // Only overwrite password if explicitly provided or requested? 
                // Logic: If I'm re-inviting or "provisioning", maybe I DO want to reset access.
                // Let's reset it to the new one so the email credentials work.
                await adminAuth.updateUser(uid, { password: passwordToUse });
            } else {
                throw error;
            }
        }

        // 2. Add to Agency Settings (Staff List)
        const { getAgencySettings, updateAgencySettings } = await import('./settings');
        const agency = await getAgencySettings(agencyId);

        const currentStaff = agency.notifications.staff || [];
        const existingIndex = currentStaff.findIndex(s => s.email === email);

        const newStaffEntry = {
            email,
            name: name || '',
            enabledCategories: ['new_referrals', 'status_changes'] as any[], // Defaults
            requiresPasswordReset: !!tempPassword // Only force reset if admin manually set a temp password? Or always? Let's keep existing logic.
        };

        let newStaffList = [...currentStaff];
        if (existingIndex >= 0) {
            newStaffList[existingIndex] = { ...newStaffList[existingIndex], ...newStaffEntry };
        } else {
            newStaffList.push(newStaffEntry);
        }

        // Ensure user is in authorizedEmails too
        const authEmails = new Set(agency.userAccess.authorizedEmails || []);
        authEmails.add(email);

        await updateAgencySettings(agencyId, {
            notifications: {
                ...agency.notifications,
                staff: newStaffList
            },
            userAccess: {
                ...agency.userAccess,
                authorizedEmails: Array.from(authEmails)
            }
        });

        // 3. Send Invitation Email with Credentials
        // We use 'recipientOverride' to send directly to the new user
        const emailResult = await sendReferralNotification(agencyId, 'STAFF_INVITATION', {
            referralLink: '', // Not needed for this template really, or could be dashboard link
            loginUrl: 'https://referralflow.health/login', // Or dynamic base url
            password: passwordToUse
        }, email);

        if (!emailResult.success) {
            console.error("Failed to send staff invitation email:", emailResult.error);
            return {
                success: true,
                message: `Staff member provisioned, BUT email invitation failed: ${JSON.stringify(emailResult.error)}`
            };
        }

        return { success: true, message: 'Staff member provisioned and invited successfully.' };

    } catch (error: any) {
        console.error("Error provisioning staff:", error);
        return { success: false, message: error.message || 'Failed to provision staff.' };
    }
}

export async function markPasswordResetComplete(agencyId: string, email: string): Promise<boolean> {
    try {
        const { getAgencySettings, updateAgencySettings } = await import('./settings');
        const agency = await getAgencySettings(agencyId);

        const currentStaff = agency.notifications.staff || [];
        const index = currentStaff.findIndex(s => s.email === email);

        if (index === -1) return false;

        const updatedStaff = [...currentStaff];
        updatedStaff[index] = { ...updatedStaff[index], requiresPasswordReset: false };

        await updateAgencySettings(agencyId, {
            notifications: {
                ...agency.notifications,
                staff: updatedStaff
            }
        });
        return true;
    } catch (e) {
        console.error("Error marking password reset complete:", e);
        return false;
    }
}

export async function adminUpdateUserPassword(agencyId: string, targetEmail: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
        // 1. Verify Caller
        const { verifySession } = await import('./auth-actions');
        const session = await verifySession();
        if (!session || !session.email) {
            return { success: false, message: 'Unauthorized' };
        }

        const callerEmail = session.email.toLowerCase();

        // 2. Check Authorization (Must be Owner or Global Admin)
        const { getAgencySettings } = await import('./settings');
        const agency = await getAgencySettings(agencyId);

        const ownerEmail = (agency.companyProfile.email || '').toLowerCase();
        const adminEmail = (agency.notifications?.primaryAdminEmail || '').toLowerCase();
        const globalAdmin = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').toLowerCase();

        const isAuthorized = callerEmail === ownerEmail || callerEmail === adminEmail || callerEmail === globalAdmin;

        if (!isAuthorized) {
            // Allow users to change THEIR OWN password
            if (callerEmail !== targetEmail.toLowerCase()) {
                return { success: false, message: 'Permission denied: Only the Agency Owner can reset other users passwords.' };
            }
        }

        if (!newPassword || newPassword.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters.' };
        }

        // 3. Update Password via Firebase Admin
        try {
            const userRecord = await adminAuth.getUserByEmail(targetEmail);
            await adminAuth.updateUser(userRecord.uid, {
                password: newPassword
            });
        } catch (authError: any) {
            console.error("Firebase Auth Error:", authError);
            if (authError.code === 'auth/user-not-found') {
                return { success: false, message: 'User account not found. Ensure the user is registered.' };
            }
            return { success: false, message: 'Failed to update password in Auth system.' };
        }

        // 4. Clear Reset Flag if exists
        await markPasswordResetComplete(agencyId, targetEmail);

        return { success: true, message: 'Password updated successfully.' };

    } catch (error: any) {
        console.error("Error in adminUpdateUserPassword:", error);
        return { success: false, message: error.message || 'Server error updating password.' };
    }
}

export type FormState = {
    message: string;
    errors?: Record<string, string[] | undefined>;
    success: boolean;
    data?: any;
    fields?: Record<string, any>;
    isSubmitting?: boolean;
};

// ... (existing helper functions)

export async function submitReferral(prevState: FormState, formData: FormData): Promise<FormState> {
    const submissionState: FormState = { ...prevState, isSubmitting: true, message: 'Processing...', success: false };

    const formValues: Record<string, any> = Object.fromEntries(formData.entries());
    formValues.servicesNeeded = formData.getAll('servicesNeeded');
    // Checkbox handling: 'on' or present means true
    formValues.isFaxingPaperwork = formData.get('isFaxingPaperwork') === 'on';

    // Referral Source handling
    let rawReferralSourceId = formData.get('referralSourceId') as string | undefined;

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
            fields: formValues, // Return submitted values to repopulate form
        };
    }

    const { referralDocuments, progressNotes, servicesNeeded, ...rest } = validatedFields.data;
    const {
        organizationName, contactName, phone, email,
        patientFullName, patientDOB, patientZipCode, isFaxingPaperwork,
        primaryInsurance, otherInsurance, memberId, insuranceType, planName, planNumber, groupNumber,
        diagnosis
    } = validatedFields.data;

    // ... (rest of the specific logic remains same, but wrapping error returns)

    // ... inside try/catch for file upload ...
    // ... (lines 235-238)
    const headersList = await headers();
    const agencyId = headersList.get('x-agency-id') || 'default';
    const referralId = generateId(); // Helper function needed
    const allUploadedDocuments: Document[] = [];

    try {
        // 1. Upload user-provided documents ...
        if (referralDocuments) {
            const validDocs = referralDocuments.filter((d): d is File => d !== undefined);
            if (validDocs.length > 0) allUploadedDocuments.push(...await uploadFiles(validDocs, referralId, agencyId));
        }
        if (progressNotes) {
            const validNotes = progressNotes.filter((d): d is File => d !== undefined);
            if (validNotes.length > 0) allUploadedDocuments.push(...await uploadFiles(validNotes, referralId, agencyId));
        }

        // 2. Generate PDF ...
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

        // REMOVED: await pdfFile.makePublic();
        const pdfUrl = `_private/${pdfPath}`;

        allUploadedDocuments.push({
            id: pdfPath,
            name: pdfName,
            url: pdfUrl,
            size: pdfBytes.length,
        });

    } catch (e) {
        console.error("Error during file upload or PDF generation:", e);
        return { message: 'An error occurred while handling files. Please try again.', success: false, isSubmitting: false, fields: formValues };
    }

    // ... (lines 339-376: creating newReferral object)

    // ... inside try/catch for database saving ...
    try {
        // ... (lines 379-400: saving logic)
        const now = new Date();
        // Extract IP for Audit
        const headersList = await headers();
        const forwardedFor = headersList.get('x-forwarded-for');
        const ip = forwardedFor ? forwardedFor.split(',')[0] : 'UNKNOWN_IP';

        // Verify Legal Consent (Checkbox is 'on' if checked)
        const legalConsentAgreed = formData.get('legalConsent') === 'on';

        if (!legalConsentAgreed) {
            return { message: 'You must agree to the Terms of Use to submit a referral.', success: false, isSubmitting: false, fields: formValues };
        }

        // --- TICKET 4: Auto-Create Referral Source ---
        let finalReferralSourceId = rawReferralSourceId;

        if (organizationName && (!finalReferralSourceId || finalReferralSourceId === 'new')) {
            const { createReferralSource } = await import('./referral-sources-data');
            // We use the agencyId currently loaded in submitReferral `agencyId` (val: string)
            const result = await createReferralSource({
                agencyId: agencyId,
                name: organizationName,
                type: 'other', // Default type for auto-created
                status: 'prospect', // Default status for auto-created
                createdFrom: 'referral_submission',
                notes: 'Auto-created during referral submission.',
            }, true); // skipAuthCheck = true because this is a public form submission

            if (result.success && result.data) {
                finalReferralSourceId = result.data.id;
            } else if (result.existingId) {
                // If it already exists (concurrent insert or typeahead missed), use the existing ID
                finalReferralSourceId = result.existingId;
            }
        }


        const newReferral: Referral = {
            id: referralId,
            agencyId,
            referralSourceId: finalReferralSourceId, // Ticket 5: Link Referral Source
            referrerName: organizationName || '',
            contactPerson: contactName || '',
            referrerContact: phone || '',
            confirmationEmail: email || '',
            patientName: patientFullName || '',
            patientDOB: patientDOB || '',
            patientAddress: '',
            patientZipCode: patientZipCode || '',
            isFaxingPaperwork: !!isFaxingPaperwork,
            patientContact: '',
            patientInsurance: primaryInsurance === 'Other' && otherInsurance ? otherInsurance : (primaryInsurance || ''),
            memberId: memberId || '',
            insuranceType: insuranceType || '',
            planName: planName || '',
            planNumber: planNumber || '',
            groupNumber: groupNumber || '',
            servicesNeeded: servicesNeeded || [],
            diagnosis: diagnosis || '',
            examRequested: 'See Services Needed',
            providerNpi: '',
            referrerFax: '',
            status: 'RECEIVED',
            createdAt: now,
            updatedAt: now,
            documents: allUploadedDocuments,
            statusHistory: [{ status: 'RECEIVED', changedAt: now }],
            internalNotes: [],
            externalNotes: [],
            isArchived: false,
            isSeen: false,
            hasUnreadMessages: false,
            legalConsent: {
                agreed: true,
                ip: ip,
                timestamp: new Date()
            }
        };
        await saveReferral(newReferral, true);

        // 4. Send Email Notifications
        if (agencyId) {
            sendReferralNotification(agencyId, 'NEW_REFERRAL_INTERNAL', {
                referralId,
                referrerName: organizationName || contactName || 'Unknown',
                dateTime: now.toLocaleString(),
            }).catch(err => console.error("Failed to send internal notification:", err));

            if (newReferral.confirmationEmail) {
                sendReferralNotification(agencyId, 'REFERRAL_SUBMISSION_CONFIRMATION', {
                    referralId,
                    referrerName: contactName || organizationName || 'Partner',
                    dateTime: now.toLocaleString(),
                }, newReferral.confirmationEmail).catch(err => console.error("Failed to send confirmation email:", err));
            }
        }

    } catch (e) {
        console.error("Error saving referral:", e);
        return { message: 'Database error: Failed to save referral.', success: false, isSubmitting: false, fields: formValues };
    }

    revalidatePath('/dashboard');
    redirect(`/refer/success/${referralId}`);
}

export async function checkStatus(prevState: FormState, formData: FormData): Promise<FormState> {
    const rawId = formData.get('referralId') as string;
    const referralId = rawId ? rawId.trim().toUpperCase() : '';
    const token = formData.get('g-recaptcha-response') as string;

    const optionalNote = formData.get('optionalNote') as string;

    if (!referralId) {
        return { message: 'Referral ID is required.', success: false };
    }



    // Use secure public lookup
    const { getPublicReferralStatus } = await import('./data');
    const referral = await getPublicReferralStatus(referralId);

    if (!referral) {
        return { message: 'No matching record found. Please check the Referral ID.', success: false };
    }

    // optionalNote is already retrieved above
    let noteAdded = false;
    if (optionalNote) {
        const now = new Date();
        const newNote = {
            id: `note-${Date.now()}`,
            content: optionalNote,
            author: { name: 'Referrer/Patient', email: '', role: 'PUBLIC' as const }, // Placeholder role/email
            createdAt: now,
            isExternal: true
        };

        referral.externalNotes = referral.externalNotes || []; // Ensure array exists
        referral.externalNotes.push(newNote);
        referral.updatedAt = now;
        referral.hasUnreadMessages = true; // Mark as having unread messages

        // Use safe update helper to avoid overwriting internalNotes (which are missing in public object)
        const { addPublicMessageToReferral } = await import('./data');
        await addPublicMessageToReferral(referral.id, newNote);

        // Notify staff of new external message (Template 5)
        sendReferralNotification(referral.agencyId, 'NEW_EXTERNAL_MESSAGE_INTERNAL', {
            referralId: referral.id,
            referrerName: 'Referrer/Patient', // Could improve if we knew who checked status
            messageSnippet: optionalNote,
            // referralLink generated in email.ts
        }).catch(err => console.error("Failed to send notification email:", err));

        noteAdded = true;
        revalidatePath(`/dashboard/referrals/${referral.id}`);
    }

    return {
        message: 'Referral found.',
        success: true,
        data: {
            status: referral.status,
            id: referral.id,
            updatedAt: referral.updatedAt,
            statusHistory: referral.statusHistory,
            externalNotes: referral.externalNotes,
            noteAdded,
        }
    };
}

export async function addInternalNote(referralId: string, prevState: FormState, formData: FormData): Promise<FormState> {
    const { verifySession } = await import('./auth-actions');
    const session = await verifySession();
    if (!session || !session.email) {
        return { message: 'Unauthorized.', success: false };
    }

    const referral = await getReferralById(referralId);
    if (!referral) {
        return { message: 'Referral not found.', success: false };
    }

    const noteContent = formData.get('note') as string;
    const authorName = formData.get('authorName') as string || 'Staff'; // Or use session.email/name
    if (!noteContent) {
        return { message: 'Note cannot be empty.', success: false };
    }

    const now = new Date();
    const newNote: Note = {
        id: `note-${Date.now()}`,
        content: noteContent,
        author: { name: authorName, email: session.email, role: 'STAFF' },
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
            // patientName removed for HIPAA
            status: status,
            referrerName: referral.referrerName || 'Partner',

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
                recipientOverride: process.env.ADMIN_EMAIL || 'maijelcancines2@gmail.com', // Fallback to existing if env missing for now
                // Removed patientName usage for phone to avoid confusion
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

export async function fetchRecentUnseenReferralsAction(): Promise<{ success: boolean; data: any[] }> {
    try {
        const { getRecentUnseenReferrals } = await import('./data');
        const headersList = await headers();
        const agencyId = headersList.get('x-agency-id') || 'default';
        const data = await getRecentUnseenReferrals(agencyId, 5);
        return { success: true, data };
    } catch (e) {
        return { success: false, data: [] };
    }
}

export async function submitContactForm(data: any) {
    try {
        console.log("Contact form submitted (Secure Log: Data hidden)");

        // Explicitly send to requested recipients
        const recipientsEnv = process.env.CONTACT_FORM_RECIPIENTS || 'proguerraa@gmail.com,maijelcancines2@gmail.com';
        const recipients = recipientsEnv.split(',').map(e => e.trim());

        const { resend } = await import('./resend');

        await resend.emails.send({
            from: 'ReferralFlow Contact <notifications@referralflow.health>',
            to: recipients,
            replyTo: data.email,
            subject: `New Contact Inquiry from ${data.name}`,
            html: `
                <h2>New Contact Inquiry</h2>
                <p><strong>Name/Agency:</strong> ${data.name}</p>
                <p><strong>Email:</strong> ${data.email}</p>
                <p><strong>Phone:</strong> ${data.phone}</p>
                <p><strong>Client Type:</strong> ${data.clientType}</p>
                <br/>
                <p><strong>Message:</strong></p>
                <p style="white-space: pre-wrap; background: #f4f4f5; padding: 12px; border-radius: 8px;">${data.comment}</p>
            `
        });

        return { success: true, message: 'Message received' };
    } catch (error) {
        console.error("Error submitting contact form:", error);
        return { success: false, message: 'Failed to submit form' };
    }
}

function generateId(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function uploadFiles(files: File[], referralId: string, agencyId: string): Promise<Document[]> {
    const uploaded: Document[] = [];
    const bucket = adminStorage.bucket();

    for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const path = `companies/${agencyId}/referrals/${referralId}/${Date.now()}-${safeName}`;
        const fileRef = bucket.file(path);

        await fileRef.save(buffer, {
            metadata: { contentType: file.type },
        });

        uploaded.push({
            id: path,
            name: file.name,
            url: `_private/${path}`,
            size: file.size
        });
    }
    return uploaded;
}

// --- TICKET 4 & 9: Public Referral Source Search for Typeahead ---
export async function searchSourcesPublicAction(query: string): Promise<Array<{ id: string; name: string }>> {
    const headersList = await headers();
    let agencyId = headersList.get('x-agency-id');
    if (!agencyId || agencyId === 'undefined') agencyId = 'default';

    if (!query || query.trim().length < 2) return [];

    try {
        const { adminDb } = await import('@/lib/firebase-admin');
        const { normalizeName } = await import('@/lib/utils');

        const normalizedQuery = normalizeName(query);
        const snapshot = await adminDb.collection('referral_sources')
            .where('agencyId', '==', agencyId)
            .get();

        const allSources = snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name as string,
            nameNormalized: doc.data().nameNormalized as string
        }));

        // Filter and sort in memory to bypass composite index requirements
        const matched = allSources
            .filter(src => src.nameNormalized.includes(normalizedQuery))
            .sort((a, b) => a.nameNormalized.localeCompare(b.nameNormalized));

        return matched.slice(0, 8).map(src => ({
            id: src.id,
            name: src.name
        }));
    } catch (e) {
        console.error("Error in public source search:", e);
        return [];
    }
}
