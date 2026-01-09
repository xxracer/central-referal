'use server';

/**
 * @fileOverview An AI-powered tool that analyzes referral documents and suggests relevant categories for faster processing and assignment.
 *
 * - categorizeReferral - A function that handles the referral categorization process.
 * - CategorizeReferralInput - The input type for the categorizeReferral function.
 * - CategorizeReferralOutput - The return type for the categorizeReferral function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizeReferralInputSchema = z.object({
  documents: z
    .array(z.string())
    .describe(
      'An array of referral documents, each as a data URI that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
    ),
  patientName: z.string().describe('The name of the patient.'),
  referrerName: z.string().describe('The name of the referrer.'),
});
export type CategorizeReferralInput = z.infer<typeof CategorizeReferralInputSchema>;

const CategorizeReferralOutputSchema = z.object({
  suggestedCategories: z
    .array(z.string())
    .describe('An array of suggested categories for the referral.'),
  reasoning: z.string().describe('The AI reasoning behind the category suggestions.'),
});
export type CategorizeReferralOutput = z.infer<typeof CategorizeReferralOutputSchema>;

export async function categorizeReferral(input: CategorizeReferralInput): Promise<CategorizeReferralOutput> {
  return categorizeReferralFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeReferralPrompt',
  input: {schema: CategorizeReferralInputSchema},
  output: {schema: CategorizeReferralOutputSchema},
  prompt: `You are an AI assistant specializing in categorizing medical referrals.

  Based on the provided referral documents, patient name, and referrer name, suggest relevant categories for the referral.
  Explain your reasoning for suggesting these categories.

  Patient Name: {{{patientName}}}
  Referrer Name: {{{referrerName}}}
  Documents:
  {{#each documents}}
  {{media url=this}}
  {{/each}}
  \n
  Please provide the suggested categories and reasoning in the following format:
  {
    "suggestedCategories": ["category1", "category2"],
    "reasoning": "Explanation of why these categories are suggested."
  }`,
});

const categorizeReferralFlow = ai.defineFlow(
  {
    name: 'categorizeReferralFlow',
    inputSchema: CategorizeReferralInputSchema,
    outputSchema: CategorizeReferralOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
