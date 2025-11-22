'use server';

/**
 * @fileOverview Provides AI-powered suggestions for improving betting strategies based on user data.
 *
 * - suggestImprovements - A function that generates betting improvement suggestions.
 * - SuggestImprovementsInput - The input type for the suggestImprovements function.
 * - SuggestImprovementsOutput - The return type for the suggestImprovements function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestImprovementsInputSchema = z.object({
  bettingDataSummary: z
    .string()
    .describe(
      'A summary of the user\'s betting data, including bet types, stake amounts, markets, and outcomes.'
    ),
});
export type SuggestImprovementsInput = z.infer<typeof SuggestImprovementsInputSchema>;

const SuggestImprovementsOutputSchema = z.object({
  suggestions: z
    .string()
    .describe(
      'AI-powered suggestions for improving the user\'s betting strategy, such as recommending specific types of bets, optimal stake amounts, or alternative betting markets.'
    ),
});
export type SuggestImprovementsOutput = z.infer<typeof SuggestImprovementsOutputSchema>;

export async function suggestImprovements(input: SuggestImprovementsInput): Promise<SuggestImprovementsOutput> {
  return suggestImprovementsFlow(input);
}

export const suggestImprovementsFlow = ai.defineFlow(
  {
    name: 'suggestImprovementsFlow',
    inputSchema: SuggestImprovementsInputSchema,
    outputSchema: SuggestImprovementsOutputSchema,
  },
  async (input) => {
    const prompt = `You are an AI assistant specializing in providing betting strategy improvements.\n\nBased on the following summary of the user's betting data, provide suggestions for improving their betting strategy. Consider recommending specific types of bets, optimal stake amounts, or alternative betting markets to increase their chances of winning and maximize their profits.\n\nBetting Data Summary: ${input.bettingDataSummary}\n\nSuggestions:`;
    const { output } = await ai.generate({
      prompt,
      output: { schema: SuggestImprovementsOutputSchema },
    });
    if (!output) throw new Error('No output from model');
    return output;
  }
);
