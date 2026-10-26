<script setup lang="ts">
import type { PageForm } from '~/utils/content/admin'
import { slugify } from '~/utils/content/slug'

const form = defineModel<PageForm>({ required: true })

const slugTouched = ref(form.value.slug !== '')
watch(() => form.value.title, (t) => {
  if (!slugTouched.value) form.value.slug = slugify(t)
})
</script>

<template>
  <div class="fields">
    <div class="field wide"><label for="g-title">Title</label><input id="g-title" v-model="form.title" type="text" maxlength="200"></div>
    <div class="field wide">
      <label for="g-slug">Slug</label>
      <input id="g-slug" v-model="form.slug" type="text" maxlength="80" @input="slugTouched = true">
      <small>The link is /{{ form.slug || 'slug' }}</small>
    </div>
    <div class="field wide"><AdminMarkdownField v-model="form.body" label="Body" /></div>
  </div>
</template>
