import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

// Each year's posts live in src/content/<year> and share the same schema
const advent = (year: number) =>
  defineCollection({
    loader: glob({ base: `./src/content/${year}`, pattern: '**/*.{md,mdx}' }),
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

export const collections = {
  advent2025: advent(2025),
  advent2026: advent(2026),
};
