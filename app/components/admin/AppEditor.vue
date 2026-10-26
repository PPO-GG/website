<script setup lang="ts">
import { APP_STATUS } from '~/types/app'
import type { AppForm } from '~/utils/content/admin'

const form = defineModel<AppForm>({ required: true })

const admin = useAdmin()
const { fileUrl } = useContent()
const busy = ref(false)
const error = ref('')

const preview = computed(() => (form.value.imageId ? fileUrl(form.value.imageId) : form.value.imageUrl))

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  busy.value = true
  error.value = ''
  try {
    form.value.imageId = (await admin.upload(file)).id
  } catch (err) {
    error.value = explain(err)
  } finally {
    busy.value = false
    input.value = ''
  }
}
</script>

<template>
  <div class="fields">
    <div class="field"><label for="a-name">Name</label><input id="a-name" v-model="form.name" type="text" maxlength="120"></div>
    <div class="field"><label for="a-kind">Kind</label><input id="a-kind" v-model="form.kind" type="text" maxlength="120" placeholder="Web app"></div>
    <div class="field wide">
      <label for="a-stack">Stack</label>
      <input id="a-stack" v-model="form.stackText" type="text" placeholder="Nuxt, Yjs, Appwrite">
      <small>Separate items with commas.</small>
    </div>
    <div class="field"><label for="a-year">Year</label><input id="a-year" v-model.number="form.year" type="number" min="1990" max="2100"></div>
    <div class="field">
      <label for="a-status">Status</label>
      <select id="a-status" v-model="form.status">
        <option v-for="s in APP_STATUS" :key="s" :value="s">{{ s }}</option>
      </select>
    </div>
    <div class="field wide"><label for="a-href">Link</label><input id="a-href" v-model="form.href" type="text" placeholder="https://example.com"></div>
    <div class="field"><label for="a-order">Order</label><input id="a-order" v-model.number="form.order" type="number" step="1"><small>Lower numbers come first.</small></div>
    <div class="field wide"><label for="a-desc">Description</label><textarea id="a-desc" v-model="form.description" rows="3" maxlength="1000" /></div>
    <div class="field wide">
      <label>Screenshot</label>
      <div class="shot-row">
        <img v-if="preview" :src="preview" alt="" class="thumb">
        <div class="shot-tools">
          <label class="btn small">
            {{ busy ? 'Uploading' : 'Upload image' }}
            <input type="file" accept="image/*" hidden :disabled="busy" @change="onFile">
          </label>
          <button v-if="form.imageId" type="button" class="btn small" @click="form.imageId = ''">Remove upload</button>
        </div>
      </div>
      <input v-model="form.imageUrl" type="text" placeholder="Or paste an image link" aria-label="Image link">
      <p v-if="error" class="notice err">{{ error }}</p>
    </div>
  </div>
</template>
