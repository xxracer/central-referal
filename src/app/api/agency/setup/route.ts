import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAgencySettings, getAgencySettings } from '@/lib/settings';
import { sendReferralNotification } from '@/lib/email';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia' as any,
});

export async function POST(request: Request) {
    try {
        const { email, agencyName, slug, password } = await request.json();

        if (!email || !agencyName || !slug) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const agencyId = slug.toLowerCase().trim();

        // 0. Ensure User Exists in Firebase Auth
        try {
            await adminAuth.getUserByEmail(normalizedEmail);
            // User exists, proceed
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                const isGmail = normalizedEmail.includes('@gmail.com');

                if (!password && !isGmail) {
                    return NextResponse.json({ error: 'Password required for non-Gmail accounts.' }, { status: 400 });
                }

                // Create the user
                try {
                    const userProps: any = {
                        email: normalizedEmail,
                        emailVerified: true, // Auto-verify since they just paid/subscribed
                        displayName: agencyName
                    };
                    if (password) {
                        userProps.password = password;
                    }

                    await adminAuth.createUser(userProps);
                    console.log(`[Setup] Created new user for ${normalizedEmail} (Password: ${!!password})`);
                } catch (createError: any) {
                    console.error("Failed to create auth user:", createError);
                    return NextResponse.json({ error: 'Failed to create user account: ' + createError.message }, { status: 500 });
                }
            } else {
                throw error; // Rethrow other errors
            }
        }

        // 1. Verify Payment / Subscription via Stripe
        // Search for customer by email
        const customers = await stripe.customers.list({
            email: normalizedEmail,
            limit: 1,
            expand: ['data.subscriptions'] // Expand to check active sub
        });

        if (customers.data.length === 0) {
            return NextResponse.json({ error: 'No subscription found for this email. Please subscribe first.' }, { status: 403 });
        }

        const customer = customers.data[0];
        // Check for active subscription or recent payment logic?
        // For simplicity, we accept if customer exists with valid subscription-like intent.
        // Or strictly check `customer.subscriptions.data`.
        // If it was a "Free" one-off or trial, it might be in subscriptions too.

        const hasEffectiveSubscription = customer.subscriptions?.data.some(sub =>
            sub.status === 'active' || sub.status === 'trialing' || sub.status === 'incomplete' // 'incomplete' usually means payment pending client action, but for setup we might be lenient or strict
        );

        if (!hasEffectiveSubscription) {
            // Fallback: Check checking metadata or invoices? 
            // If we just created them in the "Free" flow, they might not have a subscription object if we didn't create one in the checkout route failure??
            // Actually checkout route ALWAYS creates a subscription.
            // So if no subscription, they likely didn't pay.
            // Exception: If they are a legacy user? No, new setup.
            return NextResponse.json({ error: 'No active subscription found. Please complete payment.' }, { status: 403 });
        }

        // 2. Check if Agency Slug is taken
        const existing = await getAgencySettings(agencyId);
        if (existing.exists) {
            return NextResponse.json({ error: 'This workspace URL is already taken. Please choose another.' }, { status: 409 });
        }

        // 3. Create Agency
        await createAgencySettings(agencyId, {
            companyProfile: {
                name: agencyName,
                email: normalizedEmail,
                phone: customer.phone || '',
                fax: '',
                homeInsurances: []
            },
            subscription: {
                plan: 'PRO',
                status: 'ACTIVE'
            },
            notifications: {
                emailRecipients: [normalizedEmail],
                enabledTypes: ['NEW_REFERRAL', 'STATUS_UPDATE'],
                staff: [],
                primaryAdminEmail: normalizedEmail
            },
            userAccess: {
                authorizedEmails: [normalizedEmail],
                authorizedDomains: [] // Explicitly empty, user access only via email list
            }
        });

        // 4. Update Stripe Metadata (optional link back)
        await stripe.customers.update(customer.id, {
            metadata: {
                agencyId: agencyId,
                agencyName: agencyName
            }
        });

        // 5. Send Welcome Emails
        // To Agency Owner
        await sendReferralNotification(agencyId, 'WELCOME_AGENCY', {
            firstName: (customer.name || 'Partner').split(' ')[0],
            loginUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard/settings`,
            referralLink: `${agencyId}.referralflow.health`
        }, normalizedEmail);

        // To Super Admin
        await sendReferralNotification(agencyId, 'WELCOME_ADMIN_ALERT', {
            recipientOverride: 'maijelcancines2@gmail.com',
            referralLink: agencyId,
            patientName: customer.phone || 'N/A'
        }, 'maijelcancines2@gmail.com');

        return NextResponse.json({ success: true, agencyId });

    } catch (error: any) {
        console.error("Agency Setup API Error:", error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
