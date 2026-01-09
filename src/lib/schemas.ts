import { z } from 'zod';

const MAX_TOTAL_SIZE = 5 * 1024 * 1024; // 5MB total
const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'image/jpg'];

const fileSchema = z
  .instanceof(File)
  .refine(file => ACCEPTED_FILE_TYPES.includes(file.type), ".jpg, .jpeg, .png and .pdf files are accepted.")
  .optional();
  
const fileArraySchema = z.array(fileSchema).optional();

export const referralSchema = z.object({
  // Referrer Info
  organizationName: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),

  // Patient Info
  patientFullName: z.string().optional(),
  patientDOB: z.string().optional(),
  patientAddress: z.string().optional(),
  patientZipCode: z.string().optional(),
  pcpName: z.string().optional(),
  pcpPhone: z.string().optional(),
  surgeryDate: z.string().optional(),
  covidStatus: z.string().optional(),

  // Insurance Info
  primaryInsurance: z.string().optional(),
  memberId: z.string().optional(),
  insuranceType: z.string().optional(),
  planName: z.string().optional(),
  planNumber: z.string().optional(),
  groupNumber: z.string().optional(),
  
  // Services & Diagnosis
  servicesNeeded: z.preprocess(
    (val) => (Array.isArray(val) ? val : [val].filter(Boolean)),
    z.array(z.string()).optional()
  ),
  diagnosis: z.string().optional(),
  
  // Documents
  referralDocuments: fileArraySchema,
  progressNotes: fileArraySchema,
}).refine(data => {
    const referralDocsSize = data.referralDocuments?.reduce((acc, file) => acc + (file?.size || 0), 0) || 0;
    const progressNotesSize = data.progressNotes?.reduce((acc, file) => acc + (file?.size || 0), 0) || 0;
    return (referralDocsSize + progressNotesSize) <= MAX_TOTAL_SIZE;
}, {
    message: `Total file size must not exceed 5MB.`,
    path: ["referralDocuments"], // Assign error to one of the fields
});


export const statusCheckSchema = z.object({
    referralId: z.string().min(1, { message: "Referral ID is required." }),
    patientDOB: z.string().min(1, { message: "Patient's Date of Birth is required." }),
    optionalNote: z.string().optional(),
});

export const noteSchema = z.object({
    note: z.string().min(1, { message: "Note cannot be empty." }),
});
