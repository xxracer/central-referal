'use server';

/**
 * @fileOverview An AI-powered flow to generate a PDF summary from referral form data.
 *
 * - generateReferralPdf - Takes form data, creates a text summary via Gemini, and converts it to a PDF.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// We need a schema that matches the form data, excluding files.
const PdfInputSchema = z.object({
  patientFullName: z.string(),
  patientDOB: z.string(),
  patientAddress: z.string(),
  patientZipCode: z.string(),
  memberId: z.string(),
  primaryInsurance: z.string(),
  insuranceType: z.string().optional(),
  planName: z.string().optional(),
  planNumber: z.string().optional(),
  groupNumber: z.string().optional(),
  pcpName: z.string().optional(),
  pcpPhone: z.string().optional(),
  surgeryDate: z.string().optional(),
  covidStatus: z.string().optional(),
  servicesNeeded: z.array(z.string()),
  diagnosis: z.string(),
  // Referrer info also needed for context
  organizationName: z.string(),
  contactName: z.string(),
  phone: z.string(),
  email: z.string().optional(),
});

export type PdfInput = z.infer<typeof PdfInputSchema>;

const SummaryPromptOutputSchema = z.object({
  summaryText: z.string().describe('A clean, well-formatted summary of the referral data, suitable for a PDF document. Use markdown for sections and formatting.'),
});

const summaryPrompt = ai.definePrompt({
    name: 'referralSummaryPrompt',
    input: { schema: PdfInputSchema },
    output: { schema: SummaryPromptOutputSchema },
    prompt: `You are an expert administrative assistant creating a patient referral summary.
    Format the output as a Markdown table. Create two main sections: "GENERAL PATIENT INFO" and "INSURANCE INFO".
    Within each section, create a two-column layout using a markdown table.
    The first column will contain the fixed labels (e.g., "PATIENT NAME", "MEM ID#").
    The second column will contain the corresponding data from the input.
    If a data field is not provided, leave the value in the table cell blank but keep the label.
    After the tables, add sections for "SERVICES REQUESTED" and "PATIENT DIAGNOSIS & ORDER NOTES".

    Example of a Markdown table row:
    | PATIENT NAME: | {{{patientFullName}}} |

    Here is the data:
    - patientFullName: {{{patientFullName}}}
    - patientDOB: {{{patientDOB}}}
    - patientAddress: {{{patientAddress}}}, {{{patientZipCode}}}
    - pcpName: {{{pcpName}}}
    - pcpPhone: {{{pcpPhone}}}
    - surgeryDate: {{{surgeryDate}}}
    - covidStatus: {{{covidStatus}}}
    - memberId: {{{memberId}}}
    - insuranceType: {{{insuranceType}}}
    - primaryInsurance: {{{primaryInsurance}}}
    - planNumber: {{{planNumber}}}
    - planName: {{{planName}}}
    - groupNumber: {{{groupNumber}}}
    - servicesNeeded: {{{servicesNeeded}}}
    - diagnosis: {{{diagnosis}}}

    Now, generate the full summary based on this structure.
    `,
});

const generateReferralPdfFlow = ai.defineFlow(
  {
    name: 'generateReferralPdfFlow',
    inputSchema: PdfInputSchema,
    outputSchema: z.instanceof(Uint8Array),
  },
  async (data) => {
    // 1. Get the text summary from Gemini
    const { output } = await summaryPrompt(data);
    
    if (!output?.summaryText) {
        throw new Error("Failed to generate summary text from AI.");
    }
    const summaryText = output.summaryText;

    // 2. Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const margin = 50;
    let y = height - margin;

    const lines = summaryText.split('\n');

    for (const line of lines) {
        if (y < margin) {
            page.addPage();
            y = height - margin;
        }

        let trimmedLine = line.trim();
        if (trimmedLine.startsWith('## ')) {
            page.drawText(trimmedLine.replace('## ', ''), {
                x: margin,
                y,
                font: boldFont,
                size: 14,
                color: rgb(0, 0, 0),
            });
            y -= 25;
        } else if (trimmedLine.startsWith('|')) { // Handle table rows
            const columns = trimmedLine.split('|').map(s => s.trim()).slice(1, -1);
            if (columns.length === 2) {
                const [label, value] = columns;
                page.drawText(label, {
                    x: margin,
                    y,
                    font: boldFont,
                    size: 10,
                });
                page.drawText(value, {
                    x: margin + 150,
                    y,
                    font: font,
                    size: 10,
                });
                y -= 15;
            }
        } else if (trimmedLine.length > 0) {
             page.drawText(trimmedLine, {
                x: margin,
                y,
                font: font,
                size: 10,
                lineHeight: 15,
                color: rgb(0.1, 0.1, 0.1),
             });
             y -= 15;
        }
    }
    
    // 3. Save the PDF to a byte array
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  }
);

// Wrapper function to be called from server actions
export async function generateReferralPdf(data: PdfInput): Promise<Uint8Array> {
  return await generateReferralPdfFlow(data);
}
