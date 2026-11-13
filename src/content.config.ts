import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    type: z.string(),
    date: z.coerce.date(),
    readingTime: z.string(),
    excerpt: z.string(),
    summary: z.string().optional(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    diagram: z.enum(['d2']).optional(),
    isDialogue: z.boolean().default(false),
    legacyUrl: z.string().optional(),
  }),
});

export const collections = { articles };
