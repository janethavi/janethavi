import { defineCollection, z } from 'astro:content';

// Blog posts live in src/content/blog/*.md — add a new .md file with this
// frontmatter and it appears on the Writings page and gets its own route
// at /<filename> automatically.
const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    category: z.string(), // shown uppercase on cards, e.g. GENERAL / ADVENTURE
    date: z.string(), // display format, e.g. 3/7/2026
    isoDate: z.string(), // for SEO structured data, e.g. 2026-03-07
    readTime: z.string(), // e.g. 6 min read
    cover: z.string(), // path under /public, e.g. /images/blog/kolkata/cover.jpg
    coverAlt: z.string().optional(),
    // 'cover' (default) fills the frame and may crop; use 'contain' for
    // square/portrait covers that shouldn't be cropped (shows the whole image).
    coverFit: z.enum(['cover', 'contain']).optional(),
    order: z.number(), // position on the Writings page (1 = first)
  }),
});

export const collections = { blog };
