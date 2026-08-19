import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

// `faq` powers both the page's own visible "## Questions" section and the
// `FAQPage` JSON-LD Head.astro stacks alongside `TechArticle` — Map — SEO &
// GEO Groundwork's Ticket 3 requires the two to match 1:1, so one frontmatter
// array is the single source for both rather than duplicating the content.
export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
			}),
		}),
	}),
};
