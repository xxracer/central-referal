export type ReferralStatus = 'RECEIVED' | 'IN_REVIEW' | 'ACCEPTED' | 'REJECTED';

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

export type InternalNote = {
  id: string;
  content: string;
  author: string; 
  createdAt: Date;
};

export type AISummary = {
  suggestedCategories: string[];
  reasoning: string;
}

export type Referral = {
  id: string;
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
  pcpName?: string;
  pcpPhone?: string;
  surgeryDate?: string;
  covidStatus?: string;
  
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
  
  // Old fields that need to be handled
  patientId?: string;
  referrerRelation?: string;

  documents: Document[];
  status: ReferralStatus;
  statusHistory: StatusHistory[];
  internalNotes: InternalNote[];
  aiSummary?: AISummary;
  createdAt: Date;
  updatedAt: Date;
};
