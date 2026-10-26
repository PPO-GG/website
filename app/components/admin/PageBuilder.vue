<script setup lang="ts">
import type { Block, BlockType, FieldDef } from '~/types/blocks'
import { BLOCK_DEFS, BLOCKS_MAX, ITEMS_MAX, blankBlock, blankItem, blockDef } from '~/utils/content/blocks'

const blocks = defineModel<Block[]>({ required: true })

const admin = useAdmin()
const preview = ref(false)
const adding = ref(false)
const uploading = ref('')
const error = ref('')

function add(type: BlockType) {
  blocks.value = [...blocks.value, blankBlock(type)]
  adding.value = false
}
function move(i: number, d: -1 | 1) {
  const j = i + d
  if (j < 0 || j >= blocks.value.length) return
  const next = [...blocks.value]
  ;[next[i], next[j]] = [next[j]!, next[i]!]
  blocks.value = next
}
const duplicate = (i: number) => {
  const b = blocks.value[i]!
  const copy: Block = { ...blankBlock(b.type), data: { ...b.data }, items: b.items.map((x) => ({ ...x })) }
  blocks.value = [...blocks.value.slice(0, i + 1), copy, ...blocks.value.slice(i + 1)]
}
const remove = (i: number) => (blocks.value = blocks.value.filter((_, k) => k !== i))
const addItem = (b: Block) => b.items.length < ITEMS_MAX && b.items.push(blankItem(b.type))
const removeItem = (b: Block, k: number) => b.items.splice(k, 1)

async function upload(e: Event, row: Record<string, string>, f: FieldDef) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploading.value = f.key
  error.value = ''
  try {
    row[f.key] = (await admin.upload(file)).url
  } catch (err) {
    error.value = explain(err)
  } finally {
    uploading.value = ''
    input.value = ''
  }
}
</script>

<template>
  <div class="builder">
    <div class="field-head">
      <label>Page content</label>
      <button type="button" class="btn small" :class="{ on: preview }" @click="preview = !preview">Preview</button>
    </div>
    <p v-if="error" class="notice err">{{ error }}</p>

    <div v-if="preview" class="builder-preview"><BlocksBlockRenderer :blocks="blocks" /></div>

    <template v-else>
      <p v-if="!blocks.length" class="empty">No blocks yet. Add the first one below.</p>
      <ol class="block-list">
        <li v-for="(b, i) in blocks" :key="b.id" class="block-card">
          <div class="block-head">
            <b>{{ i + 1 }}. {{ blockDef(b.type).label }}</b>
            <span class="field-tools">
              <button type="button" class="btn small" :disabled="i === 0" aria-label="Move up" @click="move(i, -1)">Up</button>
              <button type="button" class="btn small" :disabled="i === blocks.length - 1" aria-label="Move down" @click="move(i, 1)">Down</button>
              <button type="button" class="btn small" :disabled="blocks.length >= BLOCKS_MAX" @click="duplicate(i)">Duplicate</button>
              <button type="button" class="btn small danger" @click="remove(i)">Remove</button>
            </span>
          </div>

          <div class="fields">
            <div v-for="f in blockDef(b.type).fields" :key="f.key" class="field" :class="{ wide: f.kind !== 'text' && f.kind !== 'link' }">
              <label :for="`${b.id}-${f.key}`">{{ f.label }}</label>
              <textarea v-if="f.kind === 'textarea' || f.kind === 'markdown'" :id="`${b.id}-${f.key}`" v-model="b.data[f.key]" :rows="f.kind === 'markdown' ? 10 : 3" />
              <template v-else-if="f.kind === 'image'">
                <input :id="`${b.id}-${f.key}`" v-model="b.data[f.key]" type="text" placeholder="https://...">
                <label class="btn small">
                  {{ uploading === f.key ? 'Uploading' : 'Upload image' }}
                  <input type="file" accept="image/*" hidden :disabled="!!uploading" @change="upload($event, b.data, f)">
                </label>
              </template>
              <input v-else :id="`${b.id}-${f.key}`" v-model="b.data[f.key]" type="text" :placeholder="f.kind === 'link' ? 'https://, /page or #section' : ''">
            </div>
          </div>

          <template v-if="blockDef(b.type).itemFields">
            <div v-for="(it, k) in b.items" :key="k" class="item-row">
              <div class="block-head">
                <b>{{ blockDef(b.type).itemLabel }} {{ k + 1 }}</b>
                <button type="button" class="btn small danger" @click="removeItem(b, k)">Remove</button>
              </div>
              <div class="fields">
                <div v-for="f in blockDef(b.type).itemFields" :key="f.key" class="field" :class="{ wide: f.kind === 'textarea' }">
                  <label :for="`${b.id}-${k}-${f.key}`">{{ f.label }}</label>
                  <textarea v-if="f.kind === 'textarea'" :id="`${b.id}-${k}-${f.key}`" v-model="it[f.key]" rows="2" />
                  <input v-else :id="`${b.id}-${k}-${f.key}`" v-model="it[f.key]" type="text">
                </div>
              </div>
            </div>
            <button type="button" class="btn small" :disabled="b.items.length >= ITEMS_MAX" @click="addItem(b)">Add {{ blockDef(b.type).itemLabel?.toLowerCase() }}</button>
          </template>
        </li>
      </ol>

      <div class="add-block">
        <button v-if="!adding" type="button" class="btn" :disabled="blocks.length >= BLOCKS_MAX" @click="adding = true">Add block</button>
        <div v-else class="picker">
          <button v-for="d in BLOCK_DEFS" :key="d.type" type="button" @click="add(d.type)">
            <b>{{ d.label }}</b><span>{{ d.hint }}</span>
          </button>
          <button type="button" class="btn small" @click="adding = false">Cancel</button>
        </div>
      </div>
    </template>
  </div>
</template>
