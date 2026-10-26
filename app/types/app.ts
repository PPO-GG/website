export const APP_STATUS = { Live: 'live', Wip: 'wip' } as const

export type AppStatus = (typeof APP_STATUS)[keyof typeof APP_STATUS]

export interface AppEntry {
  name: string
  kind: string
  stack: string
  year: number
  status: AppStatus
  href: string
  order: number
  img?: string
  description?: string
}
