import { BLOCK_TYPE } from '~/types/blocks'
import type { Block, BlockType } from '~/types/blocks'
import { blankBlock } from '~/utils/content/blocks'
import { PROCESS, SERVICES, SITE, TAGLINES } from '~/data/site'

function make(type: BlockType, data: Record<string, string>, items: Record<string, string>[] = []): Block {
  const b = blankBlock(type)
  Object.assign(b.data, data)
  b.items = items
  return b
}

const serviceItems = () => SERVICES.map((s) => ({ title: s.title, summary: s.summary, points: s.points.join('\n') }))

/** What the home page shows until an edited version is published in the admin. */
export const defaultHome = (): Block[] => [
  make(BLOCK_TYPE.PixelHero, { taglines: TAGLINES.join('\n') }),
  make(BLOCK_TYPE.Services, {
    anchor: 'services', eyebrow: 'What we do', heading: 'Services', layout: 'cards', moreHref: '/services',
    intro: 'Engineering, design and intelligence tooling for organizations that need software to be reliable, fast and decisive.',
  }, serviceItems()),
  make(BLOCK_TYPE.Work, { anchor: 'work', eyebrow: 'Portfolio', heading: 'Selected work' }),
  make(BLOCK_TYPE.Steps, { anchor: 'approach', eyebrow: 'How we work', heading: 'Our approach' }, PROCESS.map((p) => ({ ...p }))),
  make(BLOCK_TYPE.Cta, {
    anchor: 'contact', heading: 'Start a project', text: 'Tell us what you are building. We reply within two business days.',
    ctaLabel: SITE.email, ctaHref: `mailto:${SITE.email}`,
  }),
]

export const defaultServices = (): Block[] => [
  make(BLOCK_TYPE.Hero, {
    eyebrow: 'Services', heading: 'Engineering and design, end to end',
    text: 'From the first sketch to a system running in production, one team owns the result.',
  }),
  make(BLOCK_TYPE.Services, { layout: 'detailed' }, serviceItems()),
  make(BLOCK_TYPE.Cta, {
    heading: 'Not sure where to start?', text: 'Describe the problem. We will tell you honestly whether and how we can help.',
    ctaLabel: 'Get in touch', ctaHref: `mailto:${SITE.email}`,
  }),
]
