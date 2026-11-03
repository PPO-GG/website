import { createError, getRouterParam, readMultipartFormData } from 'h3'
import type { H3Event } from 'h3'

/** The subset of Cloudflare R2 that server code uses. */
export interface R2ObjectBodyLike {
  body: ReadableStream | Uint8Array
  httpMetadata?: { contentType?: string }
  size: number
}

export interface R2BucketLike {
  put(key: string, body: Uint8Array, options: { httpMetadata: { contentType: string } }): Promise<unknown>
  get(key: string): Promise<R2ObjectBodyLike | null>
}

export interface MediaEvent {
  context: { cloudflare?: { env?: { MEDIA?: R2BucketLike } } }
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

/** Allowed extensions and the one content type each may carry. The type sent to the client always comes from here. */
const TYPE_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
}

const ID_PATTERN = /^[0-9a-f-]{36}\.(png|jpg|jpeg|webp|gif|svg)$/

/** The R2 binding for this request. A missing binding is a server error. */
export function useMedia(event: MediaEvent): R2BucketLike {
  const media = event.context.cloudflare?.env?.MEDIA
  if (!media) throw createError({ statusCode: 500, statusMessage: 'Storage unavailable' })
  return media
}

/** The lower-case text after the last dot, or '' when there is none. */
function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase()
}

/** Throws 415 for a type that is not allowed or does not match its extension, and 413 for a file over 10 MB. */
export function checkUpload(name: string, size: number, type: string): void {
  const expected = TYPE_BY_EXT[extensionOf(name)]
  const declared = type.split(';')[0]!.trim().toLowerCase()
  if (!expected || declared !== expected) {
    throw createError({ statusCode: 415, statusMessage: 'Unsupported media type' })
  }
  if (size > MAX_UPLOAD_BYTES) throw createError({ statusCode: 413, statusMessage: 'File too large' })
}

/** True when `id` is a stored media id: a 36-character uuid-like name plus an allowed extension. */
export function isMediaId(id: unknown): id is string {
  return typeof id === 'string' && ID_PATTERN.test(id)
}

/** Handles POST /api/admin/upload. Call after the owner and same-origin checks. */
export async function uploadMedia(event: H3Event): Promise<{ id: string; url: string }> {
  const media = useMedia(event)
  const parts = (await readMultipartFormData(event)) ?? []
  const files = parts.filter((p) => p.name === 'file' && p.filename)
  if (files.length !== 1) throw createError({ statusCode: 400, statusMessage: 'Send exactly one file field named file' })
  const file = files[0]!

  checkUpload(file.filename!, file.data.length, file.type ?? '')
  const ext = extensionOf(file.filename!)
  const id = `${crypto.randomUUID()}.${ext}`
  try {
    await media.put(id, file.data, { httpMetadata: { contentType: TYPE_BY_EXT[ext]! } })
  } catch (error) {
    console.error('media upload failed', error)
    throw createError({ statusCode: 500, statusMessage: 'Storage unavailable' })
  }
  return { id, url: `/media/${id}` }
}

/** Handles GET /media/[id]. The id is checked before R2 is read. */
export async function serveMedia(event: H3Event): Promise<Response> {
  const id = getRouterParam(event, 'id')
  if (!isMediaId(id)) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  const media = useMedia(event)

  let object: R2ObjectBodyLike | null
  try {
    object = await media.get(id)
  } catch (error) {
    console.error('media read failed', error)
    throw createError({ statusCode: 500, statusMessage: 'Storage unavailable' })
  }
  if (!object) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const contentType = TYPE_BY_EXT[extensionOf(id)]!
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  }
  if (contentType === 'image/svg+xml') headers['Content-Security-Policy'] = 'sandbox'
  return new Response(object.body as BodyInit, { headers })
}
