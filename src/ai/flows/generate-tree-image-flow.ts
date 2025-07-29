'use server';
/**
 * @fileOverview An AI flow for generating images of fictional trees.
 *
 * - generateTreeImage - A function that generates a single tree image.
 * - GenerateTreeImageInput - The input type for the generateTreeImage function.
 * - GenerateTreeImageOutput - The return type for the generateTreeImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateTreeImageInputSchema = z.object({
  treeType: z.string().describe('The type of the tree to generate.'),
  color: z.string().describe('The primary color of the tree.'),
});
export type GenerateTreeImageInput = z.infer<typeof GenerateTreeImageInputSchema>;

const GenerateTreeImageOutputSchema = z.object({
  imageUrl: z.string().describe('The data URI of the generated image.'),
});
export type GenerateTreeImageOutput = z.infer<typeof GenerateTreeImageOutputSchema>;

export async function generateTreeImage(input: GenerateTreeImageInput): Promise<GenerateTreeImageOutput> {
  return generateTreeImageFlow(input);
}

const generateTreeImageFlow = ai.defineFlow(
  {
    name: 'generateTreeImageFlow',
    inputSchema: GenerateTreeImageInputSchema,
    outputSchema: GenerateTreeImageOutputSchema,
  },
  async ({ treeType, color }) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: `Generate an image of a fictional, mythical ${treeType} tree. The tree should appear as if it is made of shiny, glowing stars or a celestial nebula, with ${color} as its dominant color. The background should be a dark night sky. It should look ethereal and majestic.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media.url) {
      throw new Error('Image generation failed.');
    }

    return { imageUrl: media.url };
  }
);
