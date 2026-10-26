<script setup lang="ts">
import type { AppRow, PageRow, PostRow } from '~/types/app'
import {
  appToForm, blankApp, blankPage, blankPost, pageToForm, postToForm, toAppData, toPageData, toPostData,
  validateApp, validatePage, validatePost,
} from '~/utils/content/admin'
import type { AppForm, PageForm, PostForm } from '~/utils/content/admin'
import { defaultHome, defaultServices } from '~/data/defaults'
import { defaultSettings, parseSettings, serializeSettings, validateSettings } from '~/utils/content/site'
import type { SiteSettings } from '~/utils/content/site'
import { SYSTEM_SLUGS, isSystemSlug } from '~/utils/content/slug'
import type { SystemSlug } from '~/utils/content/slug'

useHead({ title: 'Admin | PPO', meta: [{ name: 'robots', content: 'noindex' }] })

const TAB = { Apps: 'apps', Posts: 'posts', Pages: 'pages' } as const
type Tab = (typeof TAB)[keyof typeof TAB]
const TAB_LABEL: Record<Tab, string> = { apps: 'Projects', posts: 'Posts', pages: 'Pages' }
const NOUN: Record<Tab, string> = { apps: 'project', posts: 'post', pages: 'page' }

const admin = useAdmin()
const ready = ref(false)
const tab = ref<Tab>(TAB.Apps)
const loadError = ref('')
const notice = ref('')
const errors = ref<string[]>([])
const busy = ref(false)
const confirmDelete = ref(false)

const apps = ref<AppRow[]>([])
const posts = ref<PostRow[]>([])
const pages = ref<PageRow[]>([])

const today = () => new Date().toISOString().slice(0, 10)
const appForm = ref<AppForm>(blankApp())
const postForm = ref<PostForm>(blankPost(today()))
const pageForm = ref<PageForm>(blankPage())
const settingsForm = ref<SiteSettings>(defaultSettings())
const editing = ref<{ id?: string; system?: SystemSlug } | null>(null)

const SYSTEM_ENTRIES: { slug: SystemSlug; title: string; sub: string }[] = [
  { slug: SYSTEM_SLUGS.Home, title: 'Home page', sub: 'The page at /' },
  { slug: SYSTEM_SLUGS.Services, title: 'Services page', sub: 'The page at /services' },
  { slug: SYSTEM_SLUGS.Settings, title: 'Header and footer', sub: 'Menu, status strip, footer text and contact email' },
]
const systemRow = (slug: SystemSlug) => pages.value.find((r) => r.slug === slug)

// Load the lists whenever a user appears, from a saved session or a fresh login. The login form
// unmounts as soon as the user is set, so its "done" event cannot be relied on to start the load.
watch(() => admin.user.value, (u) => {
  if (u) void loadAll()
  else apps.value = posts.value = pages.value = []
})

onMounted(async () => {
  await admin.restore()
  ready.value = true
})

async function loadAll() {
  loadError.value = ''
  try {
    ;[apps.value, posts.value, pages.value] = await Promise.all([
      admin.list<AppRow>(ADMIN_TABLE.Apps, { key: 'order' }),
      admin.list<PostRow>(ADMIN_TABLE.Posts, { key: 'publishedAt', desc: true }),
      admin.list<PageRow>(ADMIN_TABLE.Pages, { key: 'title' }),
    ])
  } catch (e) {
    console.error('[admin] could not load content', e)
    loadError.value = explain(e)
  }
}

async function logout() {
  await admin.logout()
  editing.value = null
}

function switchTab(t: Tab) {
  tab.value = t
  cancel()
  notice.value = ''
}

function startNew() {
  appForm.value = blankApp()
  postForm.value = blankPost(today())
  pageForm.value = blankPage()
  errors.value = []
  confirmDelete.value = false
  editing.value = {}
}

function startEdit(id: string) {
  errors.value = []
  confirmDelete.value = false
  notice.value = ''
  if (tab.value === TAB.Apps) appForm.value = appToForm(apps.value.find((r) => r.$id === id)!)
  else if (tab.value === TAB.Posts) postForm.value = postToForm(posts.value.find((r) => r.$id === id)!)
  else pageForm.value = pageToForm(pages.value.find((r) => r.$id === id)!)
  editing.value = { id }
}

function startSystem(slug: SystemSlug) {
  errors.value = []
  confirmDelete.value = false
  notice.value = ''
  const row = systemRow(slug)
  if (slug === SYSTEM_SLUGS.Settings) {
    settingsForm.value = parseSettings(row?.body)
    settingsPublished.value = row?.published ?? true
  } else if (row) {
    pageForm.value = pageToForm(row)
  } else {
    pageForm.value = {
      ...blankPage(), title: slug === SYSTEM_SLUGS.Home ? 'Home' : 'Services', slug,
      blocks: slug === SYSTEM_SLUGS.Home ? defaultHome() : defaultServices(), published: true,
    }
  }
  editing.value = { id: row?.$id, system: slug }
}

function cancel() {
  editing.value = null
  errors.value = []
  confirmDelete.value = false
}

const isSettings = computed(() => editing.value?.system === SYSTEM_SLUGS.Settings)
const settingsPublished = ref(true)

const currentPublished = computed(() => (isSettings.value ? settingsPublished.value : tab.value === TAB.Apps ? appForm.value.published : tab.value === TAB.Posts ? postForm.value.published : pageForm.value.published))

function setPublished(v: boolean) {
  if (isSettings.value) settingsPublished.value = v
  else if (tab.value === TAB.Apps) appForm.value.published = v
  else if (tab.value === TAB.Posts) postForm.value.published = v
  else pageForm.value.published = v
}

async function submit() {
  if (!editing.value) return
  const t = tab.value
  if (isSettings.value) return submitSettings()
  errors.value = t === TAB.Apps ? validateApp(appForm.value) : t === TAB.Posts ? validatePost(postForm.value) : validatePage(pageForm.value)
  if (errors.value.length) return
  busy.value = true
  try {
    if (t === TAB.Apps) await admin.save(ADMIN_TABLE.Apps, editing.value.id, toAppData(appForm.value), appForm.value.published)
    else if (t === TAB.Posts) await admin.save(ADMIN_TABLE.Posts, editing.value.id, toPostData(postForm.value), postForm.value.published)
    else await admin.save(ADMIN_TABLE.Pages, editing.value.id, toPageData(pageForm.value), pageForm.value.published)
    await loadAll()
    notice.value = 'Saved. Published items show on the site within one minute.'
    cancel()
  } catch (e) {
    console.error(`[admin] could not save ${NOUN[t]}`, e)
    errors.value = [explain(e)]
  } finally {
    busy.value = false
  }
}

async function submitSettings() {
  errors.value = validateSettings(settingsForm.value)
  if (errors.value.length) return
  busy.value = true
  try {
    const data = { title: 'Site settings', slug: SYSTEM_SLUGS.Settings, body: serializeSettings(settingsForm.value), published: settingsPublished.value }
    await admin.save(ADMIN_TABLE.Pages, editing.value?.id, data, settingsPublished.value)
    await loadAll()
    notice.value = 'Saved. Header and footer update within one minute.'
    cancel()
  } catch (e) {
    console.error('[admin] could not save site settings', e)
    errors.value = [explain(e)]
  } finally {
    busy.value = false
  }
}

async function remove() {
  if (!editing.value?.id) return
  if (!confirmDelete.value) {
    confirmDelete.value = true
    return
  }
  busy.value = true
  try {
    await admin.remove(tab.value, editing.value.id)
    await loadAll()
    notice.value = editing.value?.system ? 'Reset. The built-in version is used again.' : `The ${NOUN[tab.value]} is deleted.`
    cancel()
  } catch (e) {
    console.error(`[admin] could not delete ${NOUN[tab.value]}`, e)
    errors.value = [explain(e)]
  } finally {
    busy.value = false
  }
}

const list = computed<{ id: string; title: string; sub: string; published: boolean }[]>(() => {
  if (tab.value === TAB.Apps) return apps.value.map((r) => ({ id: r.$id, title: r.name, sub: `${r.kind} / ${r.year}`, published: r.published }))
  if (tab.value === TAB.Posts) return posts.value.map((r) => ({ id: r.$id, title: r.title, sub: `/blog/${r.slug}`, published: r.published }))
  return pages.value.filter((r) => !isSystemSlug(r.slug)).map((r) => ({ id: r.$id, title: r.title, sub: `/${r.slug}`, published: r.published }))
})
</script>

<template>
  <div class="wrap admin">
    <p v-if="!ready" class="notice">Loading</p>
    <AdminLogin v-else-if="!admin.user.value" />
    <template v-else>
      <header class="admin-head">
        <h1>Admin</h1>
        <span class="admin-who">
          {{ admin.user.value.email }}
          <NuxtLink to="/" target="_blank">View site</NuxtLink>
          <button type="button" class="btn small" @click="logout">Log out</button>
        </span>
      </header>

      <nav class="tabs" aria-label="Content type">
        <button v-for="t in TAB" :key="t" type="button" :class="{ on: tab === t }" @click="switchTab(t)">{{ TAB_LABEL[t] }}</button>
      </nav>

      <p v-if="loadError" class="notice err">{{ loadError }}</p>
      <p v-if="notice" class="notice ok" role="status">{{ notice }}</p>

      <section v-if="!editing" class="panel">
        <div class="panel-head">
          <h2>{{ TAB_LABEL[tab] }}</h2>
          <button type="button" class="btn" @click="startNew">New {{ NOUN[tab] }}</button>
        </div>
        <template v-if="tab === TAB.Pages">
          <h3 class="sub-head">Site pages</h3>
          <ul class="admin-list">
            <li v-for="e in SYSTEM_ENTRIES" :key="e.slug">
              <button type="button" @click="startSystem(e.slug)">
                <b>{{ e.title }}</b>
                <span class="meta">{{ e.sub }}</span>
                <span class="state" :class="{ live: systemRow(e.slug)?.published }">{{ systemRow(e.slug)?.published ? 'Customised' : 'Built-in' }}</span>
              </button>
            </li>
          </ul>
          <h3 class="sub-head">Your pages</h3>
        </template>
        <p v-if="!list.length" class="empty">Nothing here yet.</p>
        <ul class="admin-list">
          <li v-for="r in list" :key="r.id">
            <button type="button" @click="startEdit(r.id)">
              <b>{{ r.title }}</b>
              <span class="meta">{{ r.sub }}</span>
              <span class="state" :class="{ live: r.published }">{{ r.published ? 'Published' : 'Draft' }}</span>
            </button>
          </li>
        </ul>
      </section>

      <form v-else class="panel" @submit.prevent="submit">
        <div class="panel-head">
          <h2 v-if="editing.system">Edit {{ SYSTEM_ENTRIES.find((e) => e.slug === editing?.system)?.title.toLowerCase() }}</h2>
          <h2 v-else>{{ editing.id ? 'Edit' : 'New' }} {{ NOUN[tab] }}</h2>
        </div>
        <AdminAppEditor v-if="tab === TAB.Apps" v-model="appForm" />
        <AdminPostEditor v-else-if="tab === TAB.Posts" v-model="postForm" />
        <AdminSettingsEditor v-else-if="isSettings" v-model="settingsForm" />
        <AdminPageEditor v-else v-model="pageForm" :lock-slug="!!editing.system" />

        <ul v-if="errors.length" class="errors" role="alert">
          <li v-for="e in errors" :key="e">{{ e }}</li>
        </ul>

        <div class="actions">
          <label class="check">
            <input type="checkbox" :checked="currentPublished" @change="setPublished(($event.target as HTMLInputElement).checked)">
            {{ editing.system ? 'Use this version on the site' : 'Published' }}
          </label>
          <span class="spacer" />
          <button v-if="editing.id" type="button" class="btn danger" :disabled="busy" @click="remove">
            {{ editing.system ? (confirmDelete ? 'Confirm reset' : 'Reset to built-in') : confirmDelete ? 'Confirm delete' : 'Delete' }}
          </button>
          <button type="button" class="btn" :disabled="busy" @click="cancel">Cancel</button>
          <button type="submit" class="btn primary" :disabled="busy">{{ busy ? 'Saving' : 'Save' }}</button>
        </div>
      </form>
    </template>
  </div>
</template>
