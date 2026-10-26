export const BLOCK_TYPE = {
  Hero: 'hero',
  Text: 'text',
  Features: 'features',
  Stats: 'stats',
  Image: 'image',
  Cta: 'cta',
} as const

export type BlockType = (typeof BLOCK_TYPE)[keyof typeof BLOCK_TYPE]

/** One block of a built page. All values are strings so the editor can be driven by a schema. */
export interface Block {
  id: string
  type: BlockType
  data: Record<string, string>
  items: Record<string, string>[]
}

export type FieldKind = 'text' | 'textarea' | 'markdown' | 'link' | 'image'

export interface FieldDef {
  key: string
  label: string
  kind: FieldKind
  required?: boolean
}

export interface BlockDef {
  type: BlockType
  label: string
  hint: string
  fields: FieldDef[]
  /** Repeating rows (feature cards, stats). */
  itemLabel?: string
  itemFields?: FieldDef[]
}
