export type ReferralStatus = 'RECEIVED' | 'IN_REVIEW' | 'ACCEPTED' | 'NEED_MORE_INFO' | 'REJECTED' | 'COMPLETED';

export type Document = {
  id: string;
  name: string;
  url: string;
  size: number;
};

export type StatusHistory = {
  status: ReferralStatus;
  changedAt: Date;
  notes?: string;
};

export type Note = {
  id: string;
  content: string;
  author: {
    name: string;
    email: string;
    role: 'ADMIN' | 'STAFF' | 'SYSTEM';
  };
  createdAt: Date;
  isExternal?: boolean; // If true, visible to referrer
};

export type AISummary = {
  suggestedCategories: string[];
  reasoning: string;
}

export type NotificationCategory = 'new_referrals' | 'status_changes' | 'external_comms' | 'internal_comms' | 'billing_comms' | 'all_comms';

export type StaffNotificationPreference = {
  email: string;
  name?: string;
  enabledCategories: NotificationCategory[]; // Only stores enabled keys for efficiency
  requiresPasswordReset?: boolean;
};

export type AgencySettings = {
  id: string; // usually the subdomain
  slug?: string; // custom subdomain slug
  companyProfile: {
    name: string;
    phone: string;
    fax: string;
    email: string;
    logoUrl?: string;
    homeInsurances?: string[]; // Insurances shown on the landing/home page
  };
  branding: {
    logoUrl?: string;
  };
  notifications: {
    // Legacy support (optional, can be deprecated)
    emailRecipients?: string[];
    enabledTypes?: string[];

    // New Structure
    primaryAdminEmail?: string; // If different from companyProfile.email, usually same checking logic
    primaryAdminPreferences?: NotificationCategory[]; // Admin's granular preferences
    staff: StaffNotificationPreference[];
  };
  configuration: {
    acceptedInsurances: string[];
    offeredServices: string[];
  };
  userAccess: {
    authorizedDomains: string[];
    authorizedEmails: string[];
  };
  subscription: {
    plan: 'FREE' | 'BASIC' | 'PRO';
    status: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'SUSPENDED';
    startDate?: Date;
    endDate?: Date;
    customerId?: string; // Stripe Customer ID placeholder
  };
  exists?: boolean;
};

export type Referral = {
  id: string;
  agencyId: string; // Multi-tenancy isolation

  // Referrer Info
  referrerName: string;
  providerNpi: string;
  referrerContact: string;
  referrerFax: string;
  contactPerson: string;
  confirmationEmail: string;

  // Patient Info
  patientName: string;
  patientDOB: string;
  patientContact: string;
  patientAddress: string;
  patientZipCode: string;
  isFaxingPaperwork?: boolean;


  // Insurance Info
  patientInsurance: string;
  memberId: string;
  insuranceType?: string;
  planName?: string;
  planNumber?: string;
  groupNumber?: string;
  authorizationNumber?: string;

  // Exam & Service Info
  servicesNeeded: string[];
  examRequested: string;
  examOther?: string;
  diagnosis: string;
  priority?: string;
  contrast?: string;
  reasonForExam?: string;
  surgeryDate?: Date;
  pcpName?: string;
  pcpPhone?: string;
  covidStatus?: string;

  // Old fields that need to be handled
  patientId?: string;
  referrerRelation?: string;

  documents: Document[];
  status: ReferralStatus;
  statusHistory: StatusHistory[];

  internalNotes: Note[]; // Renamed but keeping key backward compat if possible with careful casting, or data migration. 
  // Actually, let's keep 'internalNotes' as key but use the new Note type which is a superset if we map old data.
  // Old InternalNote: { id, content, author: string, createdAt }
  // New Note: { id, content, author: { name, email, role }, createdAt, isExternal }
  // We will need a getter that migrates on the fly or data migration script. 
  // For simplicity now, let's keep the key 'internalNotes' but strictly it contains both types if we filter by isExternal? 
  // No, separate them for clarity.

  externalNotes: Note[]; // Visible to referrer

  aiSummary?: AISummary;
  createdAt: Date;
  updatedAt: Date;
  isArchived?: boolean;
  isSeen?: boolean;
  hasUnreadMessages?: boolean;
};
