
import dotenv from 'dotenv';
dotenv.config();

import { sendReferralNotification } from '../src/lib/email';

async function main() {
    console.log("Starting email debug script...");

    if (!process.env.RESEND_API_KEY) {
        console.error("ERROR: RESEND_API_KEY is missing in environment variables.");
        return;
    }

    // Mock data for the invitation
    const agencyId = 'default';
    const testEmail = 'proguerraa@gmail.com'; // Using one from .env/contact form to be safe
    const tempPassword = 'TestPassword123!';

    console.log(`Attempting to send STAFF_INVITATION to ${testEmail} for agency ${agencyId}`);

    try {
        const result = await sendReferralNotification(agencyId, 'STAFF_INVITATION', {
            referralLink: '',
            loginUrl: 'https://referralflow.health/login',
            password: tempPassword
        }, testEmail);

        console.log("Result:", result);

        if (result.success) {
            console.log("Email sent successfully!");
        } else {
            console.error("Email failed to send:", result.error);
        }

    } catch (e) {
        console.error("Script error:", e);
    }
}

main();
