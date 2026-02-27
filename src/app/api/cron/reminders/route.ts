import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendReferralNotification } from '@/lib/email';
import { Timestamp } from 'firebase-admin/firestore';

export const maxDuration = 60; // Max execution time 1 min

export async function GET(req: Request) {
    try {
        // Enforce basic security if this was triggered externally (e.g. from Vercel Cron)
        const authHeader = req.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new Response('Unauthorized', { status: 401 });
        }

        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

        // Fetch all contacts where reminder is set to true but hasn't been sent
        const snapshot = await adminDb.collection('referral_source_contacts')
            .where('reminderSent', '==', false)
            .where('reminderDate', '<=', Timestamp.fromDate(oneHourFromNow))
            .get();

        if (snapshot.empty) {
            return NextResponse.json({ message: 'No reminders due.', processed: 0 });
        }

        let processed = 0;
        const batch = adminDb.batch();

        for (const doc of snapshot.docs) {
            const data = doc.data();

            // Validate required fields
            if (!data.reminderEmail || !data.agencyId || !data.referralSourceId) {
                // Mark invalid ones as sent to prevent infinite retry loops
                batch.update(doc.ref, { reminderSent: true });
                continue;
            }

            // Fetch source details to get the name for the email
            let referrerName = 'Unknown Partner';
            try {
                // Manual explicit document fetch to avoid user auth context from data helper
                const sourceDoc = await adminDb.collection('referral_sources').doc(data.referralSourceId).get();
                if (sourceDoc.exists) {
                    referrerName = sourceDoc.data()?.name || referrerName;
                }
            } catch (e) {
                console.error("Failed to fetch referral source name for cron", e);
            }

            const reminderDateStr = data.reminderDate instanceof Timestamp
                ? data.reminderDate.toDate().toLocaleString()
                : 'Unknown Time';

            // Dispatch Email
            await sendReferralNotification(
                data.agencyId,
                'REFERRAL_SOURCE_REMINDER',
                {
                    referrerName: referrerName,
                    dateTime: reminderDateStr,
                    messageSnippet: data.summary || 'No summary provided.'
                },
                data.reminderEmail
            );

            // Mark as sent
            batch.update(doc.ref, { reminderSent: true });
            processed++;
        }

        await batch.commit();

        return NextResponse.json({ success: true, processed });
    } catch (error: any) {
        console.error('Cron Exception:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
