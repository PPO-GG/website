<script setup lang="ts">
import type { PageForm } from '~/utils/content/admin'
import { markdownToBlocks } from '~/utils/content/admin'
import { slugify } from '~/utils/content/slug'

const form = defineModel<PageForm>({ required: true })

const slugTouched = ref(form.value.slug !== '')
watch(() => form.value.title, (t) => {
  if (!slugTouched.value) form.value.slug = slugify(t)
})

// Markdown moves into the builder as one text block. The other way is not offered: it would lose layout.
function useBuilder() {
  form.value.blocks = form.value.body.trim() ? markdownToBlocks(form.value.body) : []
  form.value.mode = 'blocks'
}
</script>

<template>
  <div class="fields">
    <div class="field wide"><label for="g-title">Title</label><input id="g-title" v-model="form.title" type="text" maxlength="200"></div>
    <div class="field wide">
      <label for="g-slug">Slug</label>
      <input id="g-slug" v-model="form.slug" type="text" maxlength="80" @input="slugTouched = true">
      <small>The link is /{{ form.slug || 'slug' }}</small>
    </div>
    <div v-if="form.mode === 'blocks'" class="field wide"><AdminPageBuilder v-model="form.blocks" /></div>
    <template v-else>
      <div class="field wide">
        <p class="notice">This page is plain Markdown. <button type="button" class="btn small" @click="useBuilder">Switch to the page builder</button></p>
      </div>
      <div class="field wide"><AdminMarkdownField v-model="form.body" label="Body" /></div>
    </template>
  </div>
</template>
