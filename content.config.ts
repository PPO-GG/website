import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    blog: defineCollection({
      type: 'page',
      source: 'blog/*.md',
      schema: z.object({
        date: z.string(),
      }),
    }),
    apps: defineCollection({
      type: 'data',
      source: 'apps/*.yml',
      schema: z.object({
        name: z.string(),
        kind: z.string(),
        stack: z.string(),
        year: z.number(),
        status: z.enum(['live', 'wip']),
        href: z.string(),
        order: z.number(),
        img: z.string().optional(),
        description: z.string().optional(),
      }),
    }),
  },
})
