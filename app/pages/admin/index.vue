<script setup lang="ts">
import type { AppRow, PageRow, PostRow } from '~/types/app'
import {
  appToForm, blankApp, blankPage, blankPost, pageToForm, postToForm, toAppData, toPageData, toPostData,
  validateApp, validatePage, validatePost,
} from '~/utils/content/admin'
import type { AppForm, PageForm, PostForm } from '~/utils/content/admin'

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
const editing = ref<{ id?: string } | null>(null)

onMounted(async () => {
  await admin.restore()
  ready.value = true
  if (admin.user.value) await loadAll()
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

async function onLoggedIn() {
  await loadAll()
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

function cancel() {
  editing.value = null
  errors.value = []
  confirmDelete.value = false
}

const currentPublished = computed(() => (tab.value === TAB.Apps ? appForm.value.published : tab.value === TAB.Posts ? postForm.value.published : pageForm.value.published))

function setPublished(v: boolean) {
  if (tab.value === TAB.Apps) appForm.value.published = v
  else if (tab.value === TAB.Posts) postForm.value.published = v
  else pageForm.value.published = v
}

async function submit() {
  if (!editing.value) return
  const t = tab.value
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
    notice.value = `The ${NOUN[tab.value]} is deleted.`
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
  return pages.value.map((r) => ({ id: r.$id, title: r.title, sub: `/${r.slug}`, published: r.published }))
})
</script>

<template>
  <div class="wrap admin">
    <p v-if="!ready" class="notice">Loading</p>
    <AdminLogin v-else-if="!admin.user.value" @done="onLoggedIn" />
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
          <h2>{{ editing.id ? 'Edit' : 'New' }} {{ NOUN[tab] }}</h2>
        </div>
        <AdminAppEditor v-if="tab === TAB.Apps" v-model="appForm" />
        <AdminPostEditor v-else-if="tab === TAB.Posts" v-model="postForm" />
        <AdminPageEditor v-else v-model="pageForm" />

        <ul v-if="errors.length" class="errors" role="alert">
          <li v-for="e in errors" :key="e">{{ e }}</li>
        </ul>

        <div class="actions">
          <label class="check">
            <input type="checkbox" :checked="currentPublished" @change="setPublished(($event.target as HTMLInputElement).checked)">
            Published
          </label>
          <span class="spacer" />
          <button v-if="editing.id" type="button" class="btn danger" :disabled="busy" @click="remove">
            {{ confirmDelete ? 'Confirm delete' : 'Delete' }}
          </button>
          <button type="button" class="btn" :disabled="busy" @click="cancel">Cancel</button>
          <button type="submit" class="btn primary" :disabled="busy">{{ busy ? 'Saving' : 'Save' }}</button>
        </div>
      </form>
    </template>
  </div>
</template>
