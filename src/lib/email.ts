import { resend } from './resend';
import { getAgencySettings } from './settings';

export type NotificationType =
  | 'WELCOME_AGENCY'
  | 'NEW_REFERRAL_INTERNAL'
  | 'REFERRAL_SUBMISSION_CONFIRMATION'
  | 'STATUS_UPDATE'
  | 'NEW_EXTERNAL_MESSAGE_INTERNAL' // Message from Referral Source -> Agency
  | 'REFERRAL_VIEWED'
  | 'REFERRAL_STALE'
  | 'PAYMENT_DECLINED'
  | 'CARD_EXPIRING'
  | 'WELCOME_ADMIN_ALERT'
  | 'AGENCY_ACTIVATED'
  | 'NEW_MESSAGE_FROM_AGENCY' // Message from Agency -> Referral Source
  | 'STAFF_INVITATION' // New staff member invited
  // Keep legacy for compatibility during migration if needed, or replace usage
  | 'INTERNAL_NOTE'; // Internal staff note

// Email Template Data Interface
interface EmailData {
  patientName?: string;
  referrerName?: string; // Organization or Person Name
  referralId?: string;
  loginUrl?: string; // For Welcome
  firstName?: string; // For Welcome / Billing
  status?: string; // For Status Update
  statusLink?: string;
  referralLink?: string; // For Internal/Staff
  messageSnippet?: string; // For External Message
  declineReason?: string; // For Billing
  billingLink?: string; // For Billing
  elapsedTime?: string; // For Stale
  dateTime?: string; // For timestamps
  recipientOverride?: string; // For Admin Alert context
  password?: string; // For Staff Invitation
}

export async function sendReferralNotification(
  agencyId: string,
  type: NotificationType,
  data: EmailData,
  recipientOverride?: string // Optional direct recipient (e.g. for confirmation email)
) {
  try {
    const settings = await getAgencySettings(agencyId);
    const agencyName = settings.companyProfile.name || 'Agency';

    // --- RECIPIENT LOGIC ---
    let recipients: string[] = [];
    const isInternal = [
      'NEW_REFERRAL_INTERNAL',
      'NEW_EXTERNAL_MESSAGE_INTERNAL',
      'REFERRAL_STALE',
      'INTERNAL_NOTE',
      'STAFF_INVITATION'
    ].includes(type);

    if (recipientOverride) {
      recipients.push(recipientOverride);
    } else if (isInternal) {
      // Internal Logic (Admin + Staff)
      const adminEmail = settings.notifications.primaryAdminEmail || settings.companyProfile.email;
      if (adminEmail) recipients.push(adminEmail);

      if (settings.notifications.staff?.length > 0) {
        settings.notifications.staff.forEach(s => {
          // Simple "all" check for now, can be granular later
          recipients.push(s.email);
        });
      } else {
        // Legacy fallback
        recipients = [...recipients, ...(settings.notifications.emailRecipients || [])];
      }
    } else {
      // Billing or specific external actions usually have a direct recipient passed in 'recipientOverride'
      // If not, we log warning.
      if (!recipientOverride) {
        console.warn(`No recipient specific for external/billing notification: ${type}`);
        return { success: false, message: 'No recipient specified' };
      }
    }

    // Deduplicate
    const uniqueRecipients = Array.from(new Set(recipients)).filter(email => email && email.trim() !== '');
    if (uniqueRecipients.length === 0) return { success: true, message: 'No recipients' };

    // --- TEMPLATE GENERATION ---
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    let subject = '';
    let htmlContent = '';

    // Standard footer
    const footer = `
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; text-align: center; color: #94a3b8;">
        Powered by ReferralFlow.Health
      </p>
    `;

    // Helper for buttons
    const button = (label: string, url: string) => `
      <div style="margin: 24px 0;">
        <a href="${url}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          ${label}
        </a>
      </div>
    `;

    const commonStyle = `font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; color: #334155; line-height: 1.6;`;

    switch (type) {
      case 'WELCOME_AGENCY':
        subject = 'Action Required: Verify your email - ReferralFlow';
        htmlContent = `
          <h2 style="color: #0f172a;">Verify Your Account</h2>
          <p>Hello ${data.firstName || 'Partner'},</p>
          <p>Your workspace <strong>${agencyName}</strong> has been created.</p>
          <p>To finalize your setup and begin accepting referrals, please verify your email address by clicking the button below.</p>
          ${button('Verify Account', data.loginUrl || `${baseUrl}/login`)}
          <p>If you did not create this account, please ignore this email.</p>
          <p>Best regards,<br/>ReferralFlow.Health</p>
        `;
        break;

      case 'NEW_REFERRAL_INTERNAL':
        subject = 'New Referral Received – Action Needed';
        htmlContent = `
          <h2 style="color: #0f172a;">New Referral Received</h2>
          <p>Hello,</p>
          <p>A new referral has been submitted for <strong>${agencyName}</strong>.</p>
          <p>
            <strong>Referral ID:</strong> ${data.referralId}<br/>
            <strong>Submitted by:</strong> ${data.referrerName || 'N/A'}<br/>
            <strong>Submitted on:</strong> ${data.dateTime || new Date().toLocaleString()}
          </p>
          <p>Please review and update the referral status as soon as possible to ensure timely follow-up.</p>
          ${button('View referral', data.referralLink || `${baseUrl}/dashboard/referrals/${data.referralId}`)}
          <p>This notification was sent to keep your intake process moving smoothly.</p>
          <p>ReferralFlow.Health</p>
        `;
        break;

      case 'REFERRAL_SUBMISSION_CONFIRMATION':
        subject = 'Referral Received – Confirmation';
        htmlContent = `
          <h2 style="color: #0f172a;">Referral Received</h2>
          <p>Hello ${data.referrerName || 'Partner'},</p>
          <p>Thank you for submitting a referral to <strong>${agencyName}</strong>.</p>
          <p>Your referral has been successfully received.</p>
          <p>
            <strong>Referral ID:</strong> ${data.referralId}<br/>
            <strong>Date Submitted:</strong> ${data.dateTime || new Date().toLocaleString()}
          </p>
          <p>You may check the status of this referral at any time using the link below. No login is required.</p>
          ${button('Track referral status', data.statusLink || `${baseUrl}/status?id=${data.referralId}`)}
          <p>We appreciate your partnership and will keep you informed as the referral progresses.</p>
          <p>Sincerely,<br/>${agencyName}</p>
        `;
        break;

      case 'STATUS_UPDATE':
        subject = 'Referral Status Update';
        htmlContent = `
          <h2 style="color: #0f172a;">Referral Status Update</h2>
          <p>Hello ${data.referrerName || 'Partner'},</p>
          <p>The status of the referral you submitted to <strong>${agencyName}</strong> has been updated.</p>
          <p>
            <strong>Referral ID:</strong> ${data.referralId}<br/>
            <strong>Patient Name:</strong> ${data.patientName}<br/>
            <strong>Current Status:</strong> ${data.status}
          </p>
          <p>You can view the most up-to-date information using the link below.</p>
          ${button('View referral status', data.statusLink || `${baseUrl}/status?id=${data.referralId}`)}
          <p>Thank you for your continued partnership.</p>
          <p>Best regards,<br/>${agencyName}</p>
        `;
        break;

      case 'NEW_EXTERNAL_MESSAGE_INTERNAL':
        subject = 'New Message from Referral Source';
        htmlContent = `
          <h2 style="color: #0f172a;">New Message</h2>
          <p>Hello,</p>
          <p>A new message has been received regarding an active referral.</p>
          <p>
            <strong>Referral ID:</strong> ${data.referralId}<br/>
            <strong>From:</strong> ${data.referrerName || 'Referral Source'}
          </p>
          <p><strong>Message preview:</strong></p>
          <blockquote style="border-left: 4px solid #cbd5e1; padding-left: 16px; margin: 16px 0; font-style: italic; color: #64748b;">
            "${data.messageSnippet}"
          </blockquote>
          <p>Please review and respond promptly to maintain clear communication with your referral partner.</p>
          ${button('View message', data.referralLink || `${baseUrl}/dashboard/referrals/${data.referralId}`)}
          <p>ReferralFlow.Health</p>
        `;
        break;

      case 'NEW_MESSAGE_FROM_AGENCY':
        subject = `New Message from ${agencyName}`;
        htmlContent = `
          <h2 style="color: #0f172a;">New Message from ${agencyName}</h2>
          <p>Hello ${data.referrerName || 'Partner'},</p>
          <p><strong>${agencyName}</strong> has sent you a message regarding referral <strong>${data.referralId}</strong>.</p>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left: 4px solid #cbd5e1; padding-left: 16px; margin: 16px 0; font-style: italic; color: #64748b;">
            "${data.messageSnippet}"
          </blockquote>
          <p>You can view the full history and status at the link below.</p>
          ${button('View Status & Reply', data.statusLink || `${baseUrl}/status?id=${data.referralId}`)} 
          <p>If you need to submit additional documents, you may reply directly to this email with attachments.</p>
          <p>Best regards,<br/>${agencyName}</p>
        `;
        break;

      case 'REFERRAL_VIEWED': // Optional
        subject = 'Referral Update';
        htmlContent = `
           <h2 style="color: #0f172a;">Referral Update</h2>
           <p>Hello ${data.referrerName || 'Partner'},</p>
           <p>We wanted to let you know that <strong>${agencyName}</strong> has reviewed the referral you submitted.</p>
           <p><strong>Referral ID:</strong> ${data.referralId}</p>
           <p>You can continue to monitor the referral status using the link below.</p>
           ${button('Track referral status', data.statusLink || `${baseUrl}/status?id=${data.referralId}`)}
           <p>Thank you for working with us.</p>
           <p>${agencyName}</p>
        `;
        break;

      case 'REFERRAL_STALE':
        subject = 'Referral Pending - Action required';
        htmlContent = `
          <h2 style="color: #ef4444;">Action Required</h2>
          <p>Hello,</p>
          <p>The following referral has not been updated within the expected timeframe:</p>
          <p>
            <strong>Referral ID:</strong> ${data.referralId}<br/>
            <strong>Time Since Submission:</strong> ${data.elapsedTime || '24 hours'}
          </p>
          <p>To maintain strong referral partner relationships, please review and update this referral as soon as possible.</p>
          ${button('Review referral', data.referralLink || `${baseUrl}/dashboard/referrals/${data.referralId}`)}
          <p>ReferralFlow.Health</p>
        `;
        break;

      case 'PAYMENT_DECLINED':
        subject = 'Payment Issue - Action Required';
        htmlContent = `
          <h2 style="color: #ef4444;">Payment Issue</h2>
          <p>Hello ${data.firstName || 'User'},</p>
          <p>We were unable to process your most recent payment for <strong>${agencyName}</strong>.</p>
          <p><strong>Reason:</strong> ${data.declineReason || 'Transaction declined'}</p>
          <p>To avoid any interruption to your ReferralFlow.Health service, please update your payment method as soon as possible.</p>
          ${button('Update billing information', data.billingLink || `${baseUrl}/dashboard/settings`)}
          <p>If you have questions or believe this is an error, please contact our support team.</p>
          <p>Thank you,<br/>ReferralFlow.Health Billing</p>
        `;
        break;

      case 'CARD_EXPIRING':
        subject = 'Payment method expiring soon';
        htmlContent = `
           <h2 style="color: #0f172a;">Payment method expiring soon</h2>
           <p>Hello ${data.firstName || 'User'},</p>
           <p>The credit card on file for <strong>${agencyName}</strong> will expire in approximately 30 days.</p>
           <p>To prevent any disruption to your service, please update your billing information at your convenience.</p>
           ${button('Update billing details', data.billingLink || `${baseUrl}/dashboard/settings`)}
           <p>Thank you,<br/>ReferralFlow.Health Billing</p>
         `;
        break;

      case 'INTERNAL_NOTE':
        subject = `New Internal Note: ${data.referralId}`;
        htmlContent = `
          <h2>New Internal Note</h2>
          <p>A new note was added to referral <strong>${data.referralId}</strong>.</p>
          ${data.messageSnippet ? `<p>"${data.messageSnippet}"</p>` : ''}
          ${button('View Referral', data.referralLink || `${baseUrl}/dashboard/referrals/${data.referralId}`)}
        `;
        break;

      case 'WELCOME_ADMIN_ALERT':
        subject = `New Agency Subscription: ${agencyName}`;
        htmlContent = `
            <h2 style="color: #0f172a;">New Agency Signed Up</h2>
            <p><strong>Agency Name:</strong> ${agencyName}</p>
            <p><strong>Selected Domain (Slug):</strong> ${data.referralLink || 'Not set'}</p>
            <p><strong>Admin Email:</strong> ${data.recipientOverride || 'Unknown'}</p>
            <p><strong>Phone:</strong> ${data.patientName || 'N/A'}</p>
            <p>Please review and activate this agency in the Super Admin portal.</p>
          `;
        break;

      case 'AGENCY_ACTIVATED':
        subject = 'Activate Your Account - ReferralFlow';
        htmlContent = `
            <h2 style="color: #0f172a;">Activate Your Account</h2>
            <p>Hello ${data.firstName || 'Partner'},</p>
            <p>Please use the link below to access your workspace for <strong>${agencyName}</strong>.</p>
            <p><strong>Workspace URL:</strong> <a href="${data.referralLink}">${data.referralLink}</a></p>
            ${button('Access Workspace', data.loginUrl || `${baseUrl}/login`)}
            <p>Welcome aboard!</p>
            <p>The ReferralFlow.Health Team</p>
          `;
        break;

      case 'STAFF_INVITATION':
        subject = `You have been invited to join ${agencyName}`;
        htmlContent = `
            <h2 style="color: #0f172a;">Welcome to ${agencyName}</h2>
            <p>Hello,</p>
            <p>You have been invited to join <strong>${agencyName}</strong> on ReferralFlow.Health.</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
                <p style="margin-top: 0; font-weight: bold;">Your Login Credentials:</p>
                <p><strong>Email:</strong> ${recipients[0]}</p>
                ${data.password ? `<p><strong>Password:</strong> ${data.password}</p>` : ''}
            </div>

            <p style="font-size: 14px; background-color: #fff7ed; padding: 10px; border-radius: 4px; border: 1px solid #fed7aa; color: #9a3412;">
               <strong>Wait! Do you use Google Workspace (Business Gmail)?</strong><br/>
               If your email is a Google Business email, you do <strong>not</strong> need the password above. Simply click "Sign in with Google" on the login page.
            </p>

            <p>If you are using a standard email (Outlook, Yahoo, etc.), please use the email and password provided above.</p>

            ${button('Log in to Dashboard', data.loginUrl || `${baseUrl}/login`)}
            <p>Welcome to the team!</p>
          `;
        break;
    }

    const { data: resData, error } = await resend.emails.send({
      from: 'ReferralFlow <notifications@referralflow.health>',
      to: uniqueRecipients,
      subject: subject,
      html: `<div style="${commonStyle}">${htmlContent}${footer}</div>`,
      replyTo: settings.companyProfile.email || undefined,
    });

    if (error) {
      console.error('Error sending email via Resend:', error);
      return { success: false, error };
    }

    return { success: true, data: resData };
  } catch (err) {
    console.error('Failed to send referral notification:', err);
    return { success: false, error: err };
  }
}
