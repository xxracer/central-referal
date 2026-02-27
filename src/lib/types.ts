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
    role: 'ADMIN' | 'STAFF' | 'SYSTEM' | 'PUBLIC';
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
  lastActiveAt?: Date; // Timestamp tracking latest staff login session
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
  customDomains?: {
    domain: string;
    verified: boolean;
    dnsConfig?: any;
    updatedAt: Date;
  }[];
  configuration: {
    acceptedInsurances: string[];
    offeredServices: string[];
    otherInsuranceName?: string;
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

  legalConsent?: {
    agreed: boolean;
    ip: string;
    timestamp: Date;
  };

  exists?: boolean;
};

export type Referral = {
  id: string;
  agencyId: string; // Multi-tenancy isolation
  referralSourceId?: string; // Link to Referral Source (Ticket 5)

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
  staffIsTyping?: boolean;

  legalConsent?: {
    agreed: boolean;
    ip: string;
    timestamp: Date;
  };
};

// --- Referral Sources Tracker Epic ---

export type ReferralSourceType = 'physician_office' | 'hospital' | 'assisted_living' | 'senior_living' | 'clinic' | 'home_visit_provider' | 'case_manager' | 'hospice' | 'self_referral' | 'family' | 'other';
export type ReferralSourceStatus = 'prospect' | 'active' | 'cooling_off' | 'inactive' | 'lost' | 'high_priority';
export type ReferralSourceCreatedFrom = 'manual' | 'referral_submission';

export type ReferralSource = {
  id: string; // UUID/PK
  agencyId: string; // Tenant/Org ID (Mapped from org_id)
  name: string;
  nameNormalized: string; // Lowercase, trimmed, single-spaced for uniqueness
  type: ReferralSourceType;
  status: ReferralSourceStatus;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  createdFrom: ReferralSourceCreatedFrom;
  createdByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ReferralSourceContactType = 'in_person' | 'phone' | 'email' | 'event' | 'other';

export type ReferralSourceContact = {
  id: string;
  agencyId: string; // Tenant/Org ID
  referralSourceId: string; // FK
  contactDate: Date;
  contactType: ReferralSourceContactType;
  summary: string;
  contactPerson?: string | null;
  createdByUserId?: string | null;
  createdByName?: string | null;
  createdAt: Date;
  isArchived?: boolean;

  // Reminder fields
  reminderDate?: Date | null;
  reminderEmail?: string | null;
  reminderSent?: boolean;
};

export interface ReferralSummary {
  id: string;
  patientName: string;
  createdAt: Date;
  status: string;
}

// Computed Metrics for Ticket 2
export interface ReferralSourceMetrics {
  lastContactDate: Date | null;
  latestNote?: string;
  totalNotes: number; // Amount of contact notes
  referralsMtd: number; // Referrals this month
  referralsLast90Days: number;
  lastReferralDate: Date | null;
  totalAdmittedAllTime: number; // For conversion rate denominator
  totalReferralsAllTime: number; // For conversion rate numerator
  recentReferrals: ReferralSummary[];
  insuranceStats: Record<string, number>; // Map of insurance name to referral count
};
