import { SITE } from '~/data/site'
import { isExternal, safeLink } from '~/utils/content/blocks'

export interface NavLink {
  label: string
  to: string
}

/** Header, footer and status strip text. Stored as JSON in the "site-settings" page row. */
export interface SiteSettings {
  banner: string
  email: string
  blurb: string
  nav: NavLink[]
}

export const NAV_MAX = 8

export const defaultSettings = (): SiteSettings => ({
  banner: SITE.banner,
  email: SITE.email,
  blurb: 'Software, web and platform engineering for organizations that need it to work.',
  nav: [
    { label: 'Services', to: '/services' },
    { label: 'Work', to: '/#work' },
    { label: 'Approach', to: '/#approach' },
    { label: 'Blog', to: '/blog' },
  ],
})

const str = (v: unknown, fallback: string): string => (typeof v === 'string' ? v : fallback)

/** Reads stored settings. Anything missing or malformed falls back to the default. */
export function parseSettings(body: string | undefined): SiteSettings {
  const d = defaultSettings()
  if (!body) return d
  try {
    const j = JSON.parse(body) as Record<string, unknown>
    const nav = Array.isArray(j.nav)
      ? j.nav.slice(0, NAV_MAX).map((n) => ({ label: str((n as NavLink)?.label, ''), to: str((n as NavLink)?.to, '') })).filter((n) => n.label && n.to)
      : d.nav
    return { banner: str(j.banner, d.banner), email: str(j.email, d.email), blurb: str(j.blurb, d.blurb), nav }
  } catch {
    return d
  }
}

export const serializeSettings = (s: SiteSettings): string =>
  JSON.stringify({
    banner: s.banner.trim(),
    email: s.email.trim(),
    blurb: s.blurb.trim(),
    nav: s.nav.map((n) => ({ label: n.label.trim(), to: n.to.trim() })).filter((n) => n.label && n.to),
  })

export function validateSettings(s: SiteSettings): string[] {
  const errors: string[] = []
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email.trim())) errors.push('Enter a valid contact email.')
  if (s.nav.length > NAV_MAX) errors.push(`Use at most ${NAV_MAX} menu links.`)
  s.nav.forEach((n, i) => {
    if (!n.label.trim() && !n.to.trim()) return
    if (!n.label.trim()) errors.push(`Menu link ${i + 1}: enter the text.`)
    else if (safeLink(n.to) === '#' && n.to.trim() !== '#') errors.push(`Menu link ${i + 1}: the link must start with https://, /, # or mailto:.`)
  })
  return errors
}

export const navAttrs = (to: string) => {
  const h = safeLink(to)
  return { to: h, external: isExternal(h) }
}
