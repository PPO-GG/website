import { describe, expect, it } from 'vitest'
import type { H3Event } from 'h3'
import { requireSameOriginWrite } from '../server/utils/csrf'

function ev(method: string, headers: Record<string, string> = {}) {
  return { method, node: { req: { method, headers } }, context: {} } as unknown as H3Event
}
const JSON_TYPE = { 'content-type': 'application/json' }
const status = (fn: () => void) => {
  try {
    fn()
    return 200
  } catch (e) {
    return (e as { statusCode: number }).statusCode
  }
}
const check = (e: H3Event, json = true) => status(() => requireSameOriginWrite(e, { json }))

describe('requireSameOriginWrite', () => {
  it('rejects cross-site and same-site fetches with 403', () => {
    expect(check(ev('POST', { ...JSON_TYPE, 'sec-fetch-site': 'cross-site' }))).toBe(403)
    expect(check(ev('POST', { ...JSON_TYPE, 'sec-fetch-site': 'same-site' }))).toBe(403)
    expect(check(ev('DELETE', { 'sec-fetch-site': 'cross-site' }), false)).toBe(403)
  })
  it('rejects a mismatched Origin with 403', () => {
    expect(check(ev('POST', { ...JSON_TYPE, host: 'ppo.gg', origin: 'https://evil.test' }))).toBe(403)
    expect(check(ev('POST', { ...JSON_TYPE, host: 'ppo.gg', origin: 'null' }))).toBe(403)
    expect(check(ev('POST', { ...JSON_TYPE, origin: 'https://ppo.gg' }))).toBe(403)
  })
  it('gives 415 for urlencoded or missing content type', () => {
    expect(check(ev('POST', { 'content-type': 'application/x-www-form-urlencoded' }))).toBe(415)
    expect(check(ev('PUT', { 'content-type': 'text/plain' }))).toBe(415)
    expect(check(ev('POST'))).toBe(415)
  })
  it('passes same-origin JSON', () => {
    expect(check(ev('POST', { ...JSON_TYPE, 'sec-fetch-site': 'same-origin', host: 'ppo.gg', origin: 'https://ppo.gg' }))).toBe(200)
    expect(check(ev('PUT', { 'content-type': 'application/json; charset=utf-8', host: 'localhost:3000', origin: 'http://localhost:3000' }))).toBe(200)
  })
  it('passes header-less JSON from non-browser clients', () => {
    expect(check(ev('POST', JSON_TYPE))).toBe(200)
  })
  it('needs no content type for DELETE, or when json is false', () => {
    expect(check(ev('DELETE'))).toBe(200)
    expect(check(ev('POST'), false)).toBe(200)
  })
})
