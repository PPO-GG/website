import { createError, getRequestHeader } from 'h3'
import type { H3Event } from 'h3'

const BODY_METHODS = ['POST', 'PUT', 'PATCH']

/**
 * Blocks cross-site writes that ride on the owner's Access cookie. Call it after `requireOwner`.
 * Clients that send neither Sec-Fetch-Site nor Origin (curl with an Access token) pass.
 * With `json: true`, a request with a body must be application/json, which a cross-site form cannot send.
 */
export function requireSameOriginWrite(event: H3Event, opts: { json: boolean }): void {
  const site = getRequestHeader(event, 'sec-fetch-site')
  if (site !== undefined && site !== 'same-origin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const origin = getRequestHeader(event, 'origin')
  if (origin !== undefined) {
    const host = getRequestHeader(event, 'host')
    let originHost: string | undefined
    try {
      originHost = new URL(origin).host
    } catch {
      originHost = undefined
    }
    if (!host || originHost !== host) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  if (opts.json && BODY_METHODS.includes(String(event.method).toUpperCase())) {
    const type = getRequestHeader(event, 'content-type') ?? ''
    if (!type.toLowerCase().startsWith('application/json')) {
      throw createError({ statusCode: 415, statusMessage: 'Unsupported media type' })
    }
  }
}
