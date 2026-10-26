<script setup lang="ts">
import type { PostForm } from '~/utils/content/admin'
import { slugify } from '~/utils/content/slug'

const form = defineModel<PostForm>({ required: true })

// Follow the title until the slug is edited by hand. An existing post keeps its slug.
const slugTouched = ref(form.value.slug !== '')
watch(() => form.value.title, (t) => {
  if (!slugTouched.value) form.value.slug = slugify(t)
})
</script>

<template>
  <div class="fields">
    <div class="field wide"><label for="p-title">Title</label><input id="p-title" v-model="form.title" type="text" maxlength="200"></div>
    <div class="field">
      <label for="p-slug">Slug</label>
      <input id="p-slug" v-model="form.slug" type="text" maxlength="80" @input="slugTouched = true">
      <small>The link is /blog/{{ form.slug || 'slug' }}</small>
    </div>
    <div class="field"><label for="p-date">Date</label><input id="p-date" v-model="form.date" type="date"></div>
    <div class="field wide"><label for="p-desc">Summary</label><input id="p-desc" v-model="form.description" type="text" maxlength="500"></div>
    <div class="field wide"><AdminMarkdownField v-model="form.body" label="Body" /></div>
  </div>
</template>
