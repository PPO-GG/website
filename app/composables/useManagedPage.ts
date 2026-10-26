import type { Block } from '~/types/blocks'
import { parseBody } from '~/utils/content/blocks'
import { parseSettings } from '~/utils/content/site'
import type { SiteSettings } from '~/utils/content/site'
import { SYSTEM_SLUGS } from '~/utils/content/slug'

/** Blocks for a page the site owns (home, services). A published edit wins; otherwise the built-in default is used. */
export async function useManagedPage(slug: typeof SYSTEM_SLUGS.Home | typeof SYSTEM_SLUGS.Services, fallback: () => Block[]) {
  const content = useContent()
  const { data } = await useAsyncData(`managed-${slug}`, () => content.page(slug))
  return computed<Block[]>(() => {
    const page = data.value?.data
    if (page) {
      const parsed = parseBody(page.body)
      if (parsed.kind === 'blocks' && parsed.blocks.length) return parsed.blocks
    }
    return fallback()
  })
}

/** Header and footer settings, with defaults when nothing is saved. */
export async function useSiteSettings() {
  const content = useContent()
  const { data } = await useAsyncData('site-settings', () => content.page(SYSTEM_SLUGS.Settings))
  return computed<SiteSettings>(() => parseSettings(data.value?.data?.body))
}
