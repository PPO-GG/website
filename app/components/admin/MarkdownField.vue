<script setup lang="ts">
const props = defineProps<{ modelValue: string; label: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const admin = useAdmin()
const area = ref<HTMLTextAreaElement>()
const preview = ref(false)
const error = ref('')
const busy = ref(false)

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  busy.value = true
  error.value = ''
  try {
    const { url } = await admin.upload(file)
    const at = area.value?.selectionStart ?? props.modelValue.length
    const md = `![${file.name}](${url})`
    emit('update:modelValue', props.modelValue.slice(0, at) + md + props.modelValue.slice(at))
  } catch (err) {
    error.value = explain(err)
  } finally {
    busy.value = false
    input.value = ''
  }
}
</script>

<template>
  <div class="field">
    <div class="field-head">
      <label :for="`md-${label}`">{{ label }}</label>
      <span class="field-tools">
        <label class="btn small">
          {{ busy ? 'Uploading' : 'Add image' }}
          <input type="file" accept="image/*" hidden :disabled="busy" @change="onFile">
        </label>
        <button type="button" class="btn small" :class="{ on: preview }" @click="preview = !preview">Preview</button>
      </span>
    </div>
    <div v-if="preview" class="md-preview post"><MDC :value="modelValue" tag="div" /></div>
    <textarea
      v-else
      :id="`md-${label}`"
      ref="area"
      rows="18"
      spellcheck="true"
      :value="modelValue"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <p v-if="error" class="notice err">{{ error }}</p>
  </div>
</template>
