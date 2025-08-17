'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating betting insights based on user's betting data.
 *
 * - generateBettingInsights - A function that triggers the betting insights generation flow.
 * - GenerateBettingInsightsInput - The input type for the generateBettingInsights function.
 * - GenerateBettingInsightsOutput - The return type for the generateBettingInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBettingInsightsInputSchema = z.object({
  bettingData: z.string().describe('The user betting data as a JSON string.'),
});
export type GenerateBettingInsightsInput = z.infer<
  typeof GenerateBettingInsightsInputSchema
>;

const GenerateBettingInsightsOutputSchema = z.object({
  insights: z.string().describe('The generated betting insights.'),
});
export type GenerateBettingInsightsOutput = z.infer<
  typeof GenerateBettingInsightsOutputSchema
>;

export async function generateBettingInsights(
  input: GenerateBettingInsightsInput
): Promise<GenerateBettingInsightsOutput> {
  return generateBettingInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateBettingInsightsPrompt',
  input: {schema: GenerateBettingInsightsInputSchema},
  output: {schema: GenerateBettingInsightsOutputSchema},
  prompt: `You are an expert betting analyst. Analyze the following betting data and provide insights on the user's betting performance, such as identifying successful betting patterns, areas for improvement, and potential biases in their betting strategy. The betting data is provided as a JSON string:\n\n{{bettingData}}`,
});

const generateBettingInsightsFlow = ai.defineFlow(
  {
    name: 'generateBettingInsightsFlow',
    inputSchema: GenerateBettingInsightsInputSchema,
    outputSchema: GenerateBettingInsightsOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      return output!;
    } catch (error: any) {
      console.error('Error in generateBettingInsightsFlow:', error);
      throw new Error(
        `Failed to generate betting insights: ${error.message || error}`
      );
    }
  }
);
