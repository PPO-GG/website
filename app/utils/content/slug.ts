/** Slugs that would shadow a built-in route. */
export const RESERVED_SLUGS: readonly string[] = ['admin', 'api', 'blog', 'services', 'home', 'site-settings', 'login', 'logo', 'ppo', 'assets', 'shots', '_nuxt']

/** Pages the site itself uses. They are edited in the admin but cannot be created as ordinary pages. */
export const SYSTEM_SLUGS = { Home: 'home', Services: 'services', Settings: 'site-settings' } as const
export type SystemSlug = (typeof SYSTEM_SLUGS)[keyof typeof SYSTEM_SLUGS]
export const isSystemSlug = (s: string): s is SystemSlug => (Object.values(SYSTEM_SLUGS) as string[]).includes(s)

export const SLUG_MAX = 80

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function slugify(title: string): string {
  const s = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
  return s.replace(/-+$/g, '')
}

export function isValidSlug(slug: string): boolean {
  return slug.length <= SLUG_MAX && SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.includes(slug)
}
