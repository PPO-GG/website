<script setup lang="ts">
import type { SiteSettings } from '~/utils/content/site'
import { NAV_MAX } from '~/utils/content/site'

const form = defineModel<SiteSettings>({ required: true })

const add = () => form.value.nav.length < NAV_MAX && form.value.nav.push({ label: '', to: '' })
const remove = (i: number) => form.value.nav.splice(i, 1)
</script>

<template>
  <div class="fields">
    <div class="field wide"><label for="s-banner">Status strip text</label><input id="s-banner" v-model="form.banner" type="text" maxlength="80"><small>Shown at the top of every page, for example OPEN SOURCE // UNCLASSIFIED.</small></div>
    <div class="field"><label for="s-email">Contact email</label><input id="s-email" v-model="form.email" type="email"></div>
    <div class="field wide"><label for="s-blurb">Footer text</label><textarea id="s-blurb" v-model="form.blurb" rows="2" maxlength="200" /></div>
    <div class="field wide">
      <div class="field-head"><label>Menu links</label><button type="button" class="btn small" :disabled="form.nav.length >= NAV_MAX" @click="add">Add link</button></div>
      <div v-for="(n, i) in form.nav" :key="i" class="fields nav-row">
        <div class="field"><label :for="`n-l-${i}`">Text</label><input :id="`n-l-${i}`" v-model="n.label" type="text" maxlength="30"></div>
        <div class="field"><label :for="`n-t-${i}`">Link</label><input :id="`n-t-${i}`" v-model="n.to" type="text" placeholder="/blog or /#work"></div>
        <button type="button" class="btn small danger" @click="remove(i)">Remove</button>
      </div>
    </div>
  </div>
</template>
