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
  | 'REFUND_REQUEST' // Agency requesting a refund
  // Keep legacy for compatibility during migration if needed, or replace usage
  | 'INTERNAL_NOTE' // Internal staff note
  | 'REFERRAL_SOURCE_REMINDER'; // Reminds staff about an upcoming interaction

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
  agencyId?: string; // For Refund Requests
  notes?: string; // Generic notes content
  scheduledAt?: string; // ISO 8601 format for Resend API scheduling
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
      'STAFF_INVITATION',
      'REFERRAL_SOURCE_REMINDER'
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
    const isDev = process.env.NODE_ENV === 'development';
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    if (!isDev) {
      if (settings.slug && settings.slug !== 'default') {
        baseUrl = `https://${settings.slug}.referralflow.health`;
      } else {
        baseUrl = 'https://referralflow.health';
      }
    }

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
        subject = 'Welcome to ReferralFlow.Health';
        htmlContent = `
          <h2 style="color: #0f172a;">Welcome to ReferralFlow.Health</h2>
          <p>Hello ${data.firstName || 'Partner'},</p>
          <p>Welcome to ReferralFlow.Health.</p>
          <p>Your account for <strong>${agencyName}</strong> has been successfully created. It’s time to own your referral Flow! You can now begin receiving and managing referrals with greater clarity and control.</p>
          <p><strong>What happens next:</strong></p>
          <ul>
            <li>Log in to access your referral dashboard</li>
            <li>Share your referral link with partners/referral sources</li>
            <li>Start receiving real-time referral updates</li>
          </ul>
          <p>If you have any questions or need help getting started, our team is here to support you.</p>
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
          <p style="background-color: #f1f5f9; padding: 12px; border-radius: 6px; font-style: italic;">
             Log in to the secure dashboard to view the message content.
          </p>
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
          <p style="background-color: #f1f5f9; padding: 12px; border-radius: 6px; font-style: italic;">
             Please click the link below to view the secure message.
          </p>
          <p>You can view the full history and status at the link below.</p>
          ${button('View Status & Reply', data.statusLink || `${baseUrl}/status?id=${data.referralId}`)} 
          <p>If you need to submit additional documents, you may reply directly to this email with attachments.</p>
          <p>Best regards,<br/>${agencyName}</p>
        `;
        break;

      // ... existing cases ...

      case 'INTERNAL_NOTE':
        subject = `New Internal Note: ${data.referralId}`;
        htmlContent = `
          <h2>New Internal Note</h2>
          <p>A new note was added to referral <strong>${data.referralId}</strong>.</p>
          <p style="background-color: #f1f5f9; padding: 12px; border-radius: 6px; font-style: italic;">
             Log in to view the note content.
          </p>
          ${button('View Referral', data.referralLink || `${baseUrl}/dashboard/referrals/${data.referralId}`)}
        `;
        break;

      case 'REFERRAL_SOURCE_REMINDER':
        subject = `Reminder: Follow up with ${data.referrerName}`;
        htmlContent = `
          <h2 style="color: #0f172a;">Upcoming Interaction Reminder</h2>
          <p>Hello,</p>
          <p>This is an automated reminder that you have a scheduled interaction with a referral source.</p>
          <p>
            <strong>Referral Source:</strong> ${data.referrerName || 'N/A'}<br/>
            <strong>Scheduled for:</strong> ${data.dateTime || 'Unknown time'}<br/>
            <strong>Topic summary:</strong> ${data.messageSnippet || 'No summary provided.'}
          </p>
          <p>Please prepare accordingly for your contact.</p>
          ${button('View Dashboard', `${baseUrl}/dashboard/referral-sources`)}
        `;
        break;

      case 'WELCOME_ADMIN_ALERT':
        subject = `New Agency Subscription: ${agencyName}`;
        htmlContent = `
            <h2 style="color: #0f172a;">New Agency Signed Up</h2>
            <p><strong>Agency Name:</strong> ${agencyName}</p>
            <p><strong>Selected Domain (Slug):</strong> ${data.referralLink || 'Not set'}</p>
            <p><strong>Admin Email:</strong> ${data.recipientOverride || 'Unknown'}</p>
            <p>Please review and activate this agency in the Super Admin portal.</p>
          `;
        break;

      case 'REFUND_REQUEST':
        subject = `⚠️ Refund Request: ${agencyName}`;
        htmlContent = `
            <h2 style="color: #0f172a; border-bottom: 2px solid #ef4444; padding-bottom: 10px;">Refund Request</h2>
            <p>An agency has requested a refund for their subscription.</p>
            <p><strong>Agency ID:</strong> ${data.agencyId}</p>
            <p><strong>Name:</strong> ${agencyName}</p>
            <p><strong>Details:</strong></p>
            <pre style="background-color: #f8fafc; padding: 16px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; white-space: pre-wrap;">${data.notes}</pre>
            <p>Please log in to your Stripe dashboard to review the customer and process the refund if applicable.</p>
          `;
        break;

      case 'AGENCY_ACTIVATED':
        subject = 'Your Account is Active! - ReferralFlow.Health';
        htmlContent = `
            <h2 style="color: #0f172a;">Your Account is Active</h2>
            <p>Hello ${data.firstName || 'Partner'},</p>
            <p>Great news! Your <strong>${agencyName}</strong> account has been activated by our team.</p>
            <p>Your portal is now live at:</p>
            <p><a href="${data.referralLink}" style="font-size: 16px; font-weight: bold; color: #2563eb;">${data.referralLink}</a></p>
            <p>You can now log in and start accepting referrals.</p>
            ${button('Login to Dashboard', data.loginUrl || `${baseUrl}/login`)}
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



    // Force using the verified domain or env var to ensure delivery to Yahoo/Outlook
    // 'onboarding@resend.dev' often gets blocked or only works for the account owner email.
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'ReferralFlow <notifications@referralflow.health>';

    const { data: resData, error } = await resend.emails.send({
      from: fromAddress,
      to: uniqueRecipients,
      subject: subject,
      html: `<div style="${commonStyle}">${htmlContent}${footer}</div>`,
      replyTo: settings.companyProfile.email || undefined,
      scheduledAt: data.scheduledAt || undefined,
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
