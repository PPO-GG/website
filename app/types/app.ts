export const APP_STATUS = { Live: 'live', Beta: 'beta', Wip: 'wip' } as const

export type AppStatus = (typeof APP_STATUS)[keyof typeof APP_STATUS]

export interface AppEntry {
  id: string
  name: string
  kind: string
  stack: string[]
  year: number
  status: AppStatus
  href: string
  order: number
  img?: string
  description?: string
}

export interface AppRow {
  $id: string
  name: string
  kind: string
  stack: string[]
  year: number
  status: string
  href: string
  order: number
  description?: string | null
  imageId?: string | null
  imageUrl?: string | null
  published: boolean
}

export interface Post {
  id: string
  slug: string
  title: string
  description: string
  body: string
  publishedAt: string
}

export interface PostRow {
  $id: string
  slug: string
  title: string
  description?: string | null
  body: string
  publishedAt: string
  published: boolean
}

export interface SitePage {
  id: string
  slug: string
  title: string
  body: string
}

export interface PageRow {
  $id: string
  slug: string
  title: string
  body: string
  published: boolean
}
