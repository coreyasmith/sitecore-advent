import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const advent2025 = defineCollection({
  loader: glob({ base: './src/content/2025', pattern: '**/*.{md,mdx}' }),
  // Type-check frontmatter using a schema
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().optional(),
      // Transform string to Date object
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      author: z.string(),
      authorImage: image().optional(),
      authorUrl: z.url().optional(),
      socialImage: image().optional(),
    }),
});

export const collections = { advent2025 };
