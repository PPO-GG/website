import type { AppRow, AppStatus, PageRow, PostRow } from '~/types/app'

export interface AppForm {
  name: string
  kind: string
  stackText: string
  year: number
  status: AppStatus
  href: string
  order: number
  description: string
  imageId: string
  imageUrl: string
  published: boolean
}

export interface PostForm {
  title: string
  slug: string
  description: string
  body: string
  /** Date part only, YYYY-MM-DD. */
  date: string
  published: boolean
}

export interface PageForm {
  title: string
  slug: string
  body: string
  published: boolean
}

export const YEAR_MIN = 1990
export const YEAR_MAX = 2100
export const STACK_MAX = 12

export function rowPermissions(_published: boolean): string[] {
  return ['stub']
}

export function parseStack(_text: string): string[] {
  return ['stub']
}

export function formatStack(_stack: string[]): string {
  return 'stub'
}

export function validateApp(_f: AppForm): string[] {
  return []
}

export function validatePost(_f: PostForm): string[] {
  return []
}

export function validatePage(_f: PageForm): string[] {
  return []
}

export function toAppData(_f: AppForm): Record<string, unknown> {
  return {}
}

export function toPostData(_f: PostForm): Record<string, unknown> {
  return {}
}

export function toPageData(_f: PageForm): Record<string, unknown> {
  return {}
}

export function blankApp(): AppForm {
  return { name: '', kind: '', stackText: '', year: 0, status: 'live', href: '', order: 0, description: '', imageId: '', imageUrl: '', published: true }
}

export function blankPost(_today: string): PostForm {
  return { title: '', slug: '', description: '', body: '', date: '', published: true }
}

export function blankPage(): PageForm {
  return { title: '', slug: '', body: '', published: true }
}

export function appToForm(_row: AppRow): AppForm {
  throw new Error('not implemented')
}

export function postToForm(_row: PostRow): PostForm {
  throw new Error('not implemented')
}

export function pageToForm(_row: PageRow): PageForm {
  throw new Error('not implemented')
}
