'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import {
    createReferralSource,
    updateReferralSource,
    addReferralSourceContact
} from './referral-sources-data';
import type {
    ReferralSourceStatus,
    ReferralSourceType,
    ReferralSourceContactType
} from '@/lib/types';
import { verifySession } from './auth-actions';

export type ActionState = {
    message: string;
    success: boolean;
    errors?: Record<string, string[]>;
    data?: any;
};

export async function createReferralSourceAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
    const user = await verifySession();
    if (!user) return { success: false, message: 'Unauthorized' };

    const headersList = await headers();
    const agencyId = headersList.get('x-agency-id') || 'default';

    const name = formData.get('name') as string;
    const type = formData.get('type') as ReferralSourceType;
    const status = formData.get('status') as ReferralSourceStatus;
    const phone = formData.get('phone') as string;
    const address = formData.get('address') as string;
    const notes = formData.get('notes') as string;

    if (!name || name.trim() === '') {
        return { success: false, message: 'Name is required.', errors: { name: ['Required'] } };
    }
    if (!type) {
        return { success: false, message: 'Type is required.', errors: { type: ['Required'] } };
    }
    if (!status) {
        return { success: false, message: 'Status is required.', errors: { status: ['Required'] } };
    }

    const result = await createReferralSource({
        agencyId,
        name,
        type,
        status,
        phone: phone || null,
        address: address || null,
        notes: notes || null,
        createdFrom: 'manual',
        createdByUserId: user.uid
    });

    if (!result.success) {
        return { success: false, message: result.error || 'Failed to create.' };
    }

    revalidatePath('/dashboard/referral-sources');
    return { success: true, message: 'Referral source created successfully.' };
}

export async function updateReferralSourceAction(id: string, prevState: ActionState, formData: FormData): Promise<ActionState> {
    const user = await verifySession();
    if (!user) return { success: false, message: 'Unauthorized' };

    const headersList = await headers();
    const agencyId = headersList.get('x-agency-id') || 'default';

    const name = formData.get('name') as string;
    const type = formData.get('type') as ReferralSourceType;
    const status = formData.get('status') as ReferralSourceStatus;
    const phone = formData.get('phone') as string;
    const address = formData.get('address') as string;
    const notes = formData.get('notes') as string;

    if (!name || name.trim() === '') return { success: false, message: 'Name is required.' };

    const result = await updateReferralSource(id, agencyId, {
        name,
        type,
        status,
        phone: phone || null,
        address: address || null,
        notes: notes || null
    });

    if (!result.success) {
        return { success: false, message: result.error || 'Failed to update.' };
    }

    revalidatePath('/dashboard/referral-sources');
    revalidatePath(`/dashboard/referral-sources/${id}`);
    return { success: true, message: 'Updated successfully.' };
}

export async function logContactAction(sourceId: string, prevState: ActionState, formData: FormData): Promise<ActionState> {
    const user = await verifySession();
    if (!user) return { success: false, message: 'Unauthorized' };

    const headersList = await headers();
    const agencyId = headersList.get('x-agency-id') || 'default';

    const contactDateStr = formData.get('contactDate') as string;
    const contactType = formData.get('contactType') as ReferralSourceContactType;
    const summary = formData.get('summary') as string;
    const contactPerson = formData.get('contactPerson') as string;

    if (!contactType || !summary || summary.trim() === '') {
        return { success: false, message: 'Type and summary are required.' };
    }

    const contactDate = contactDateStr ? new Date(contactDateStr) : new Date();

    // Parse reminder logic
    const hasReminder = formData.get('hasReminder') === 'on';
    const reminderDateStr = formData.get('reminderDate') as string;
    const reminderEmail = formData.get('reminderEmail') as string;

    let reminderDate: Date | null = null;
    if (hasReminder && reminderDateStr) {
        reminderDate = new Date(reminderDateStr);
    }

    const result = await addReferralSourceContact({
        agencyId,
        referralSourceId: sourceId,
        contactDate,
        contactType,
        summary,
        contactPerson: contactPerson || null,
        createdByUserId: user.uid,
        createdByName: user.name || user.email || 'Staff',
        reminderDate,
        reminderEmail: hasReminder ? reminderEmail : null
    });

    if (!result.success) {
        return { success: false, message: result.error || 'Failed to add contact log.' };
    }

    revalidatePath('/dashboard/referral-sources');
    return { success: true, message: 'Contact logged successfully.' };
}

export async function archiveContactLogAction(contactId: string, isArchived: boolean) {
    const user = await verifySession();
    if (!user) return { success: false, message: 'Unauthorized' };

    const headersList = await headers();
    const agencyId = headersList.get('x-agency-id') || 'default';
    if (!agencyId) return { success: false, message: 'Agency not found' };

    const { archiveReferralSourceContact } = await import('@/lib/referral-sources-data');
    const result = await archiveReferralSourceContact(agencyId, contactId, isArchived);

    if (!result.success) {
        return { success: false, message: result.error || 'Failed to update archive status.' };
    }

    revalidatePath('/dashboard/referral-sources');
    return { success: true, message: isArchived ? 'Contact archived.' : 'Contact unarchived.' };
}

export async function updateContactLogAction(formData: FormData) {
    const user = await verifySession();
    if (!user) return { success: false, message: 'Unauthorized' };

    const headersList = await headers();
    const agencyId = headersList.get('x-agency-id') || 'default';
    if (!agencyId) return { success: false, message: 'Agency not found' };

    const contactId = formData.get('contactId') as string;
    const contactDateStr = formData.get('contactDate') as string;
    const contactType = formData.get('contactType') as ReferralSourceContactType;
    const summary = formData.get('summary') as string;
    const contactPerson = formData.get('contactPerson') as string;

    if (!contactId || !contactType || !summary || summary.trim() === '') {
        return { success: false, message: 'Contact ID, Type, and summary are required.' };
    }

    const contactDate = contactDateStr ? new Date(contactDateStr) : new Date();

    const hasReminder = formData.get('hasReminder') === 'on';
    const reminderDateStr = formData.get('reminderDate') as string;
    const reminderEmail = formData.get('reminderEmail') as string;

    let reminderDate: Date | null = null;
    let reminderEmailToSet: string | null = null;

    if (hasReminder && reminderDateStr) {
        reminderDate = new Date(reminderDateStr);
        reminderEmailToSet = reminderEmail;
    }

    const { updateReferralSourceContact } = await import('@/lib/referral-sources-data');

    const result = await updateReferralSourceContact(agencyId, contactId, {
        contactDate,
        contactType,
        summary,
        contactPerson: contactPerson || null,
        reminderDate,
        reminderEmail: reminderEmailToSet
    });

    if (!result.success) {
        return { success: false, message: result.error || 'Failed to update contact log.' };
    }

    revalidatePath('/dashboard/referral-sources');
    return { success: true, message: 'Contact updated successfully.' };
}
