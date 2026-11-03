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

/** The R2 binding for this request. Stub. */
export function useMedia(_event: MediaEvent): R2BucketLike {
  throw new Error('not implemented')
}

/** Throws 415 or 413 when an upload is not allowed. Stub. */
export function checkUpload(_name: string, _size: number, _type: string): void {}

/** True when `id` is a stored media id. Stub. */
export function isMediaId(_id: unknown): boolean {
  return true
}

/** Handles POST /api/admin/upload. Stub. */
export async function uploadMedia(_event: H3Event): Promise<{ id: string; url: string }> {
  throw new Error('not implemented')
}

/** Handles GET /media/[id]. Stub. */
export async function serveMedia(_event: H3Event): Promise<Response> {
  throw new Error('not implemented')
}
