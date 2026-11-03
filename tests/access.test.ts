import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose'
import type { JWTVerifyGetKey } from 'jose'
import { ownerFromRequest, requireOwner, verifyAccessToken } from '../server/utils/access'
import type { H3Event } from 'h3'

const TEAM = 'team.cloudflareaccess.com'
const AUD = 'aud-123'
const ENV = { ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD }
const CFG = { teamDomain: TEAM, aud: AUD }

let keys: JWTVerifyGetKey
let privateKey: CryptoKey
let otherKey: CryptoKey

async function sign(opts: { key?: CryptoKey; iss?: string; aud?: string; exp?: string | number; claims?: Record<string, unknown> } = {}) {
  return new SignJWT(opts.claims ?? { email: 'owner@example.com' })
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuer(opts.iss ?? `https://${TEAM}`)
    .setAudience(opts.aud ?? AUD)
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? '5m')
    .sign(opts.key ?? privateKey)
}

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
const headers = (token: string) => ({ 'cf-access-jwt-assertion': token })

beforeAll(async () => {
  const pair = await generateKeyPair('RS256')
  privateKey = pair.privateKey
  otherKey = (await generateKeyPair('RS256')).privateKey
  keys = createLocalJWKSet({ keys: [{ ...(await exportJWK(pair.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' }] })
})

describe('verifyAccessToken', () => {
  it('returns the email claim for a valid token', async () => {
    expect(await verifyAccessToken(await sign(), CFG, keys)).toEqual({ email: 'owner@example.com' })
  })
  it('rejects undefined and empty tokens', async () => {
    await expect(verifyAccessToken(undefined, CFG, keys)).rejects.toThrow()
    await expect(verifyAccessToken('', CFG, keys)).rejects.toThrow()
  })
  it('rejects an expired token', async () => {
    await expect(verifyAccessToken(await sign({ exp: Math.floor(Date.now() / 1000) - 60 }), CFG, keys)).rejects.toThrow()
  })
  it('rejects a wrong audience', async () => {
    await expect(verifyAccessToken(await sign({ aud: 'other' }), CFG, keys)).rejects.toThrow()
  })
  it('rejects a wrong issuer', async () => {
    await expect(verifyAccessToken(await sign({ iss: 'https://evil.example.com' }), CFG, keys)).rejects.toThrow()
  })
  it('rejects alg none', async () => {
    const exp = Math.floor(Date.now() / 1000) + 300
    const token = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ email: 'owner@example.com', iss: `https://${TEAM}`, aud: AUD, exp })}.`
    await expect(verifyAccessToken(token, CFG, keys)).rejects.toThrow()
  })
  it('rejects a token signed by a different key', async () => {
    await expect(verifyAccessToken(await sign({ key: otherKey }), CFG, keys)).rejects.toThrow()
  })
})

const BAD_EMAILS: Array<[string, Record<string, unknown>]> = [['no email', {}], ['empty email', { email: '' }], ['non-string email', { email: 42 }]]

describe('email claim', () => {
  it.each(BAD_EMAILS)('rejects a signed token with %s', async (_n, claims) => {
    const token = await sign({ claims })
    await expect(verifyAccessToken(token, CFG, keys)).rejects.toThrow()
    await expect(ownerFromRequest(headers(token), ENV, false, keys)).rejects.toMatchObject({ statusCode: 401 })
  })
})

describe('ownerFromRequest', () => {
  it('accepts a valid token from a plain header record', async () => {
    expect(await ownerFromRequest(headers(await sign()), ENV, false, keys)).toEqual({ email: 'owner@example.com' })
  })
  it('accepts a valid token from a Headers object', async () => {
    const h = new Headers({ 'Cf-Access-Jwt-Assertion': await sign() })
    expect(await ownerFromRequest(h, ENV, false, keys)).toEqual({ email: 'owner@example.com' })
  })
  it('gives 401 when the token is missing or invalid', async () => {
    await expect(ownerFromRequest({}, ENV, false, keys)).rejects.toMatchObject({ statusCode: 401 })
    await expect(ownerFromRequest(headers(''), ENV, false, keys)).rejects.toMatchObject({ statusCode: 401 })
    await expect(ownerFromRequest(headers(await sign({ key: otherKey })), ENV, false, keys)).rejects.toMatchObject({ statusCode: 401 })
  })
  it('gives 500 when config is missing, even with a valid token', async () => {
    const h = headers(await sign())
    await expect(ownerFromRequest(h, {}, false, keys)).rejects.toMatchObject({ statusCode: 500 })
    await expect(ownerFromRequest(h, { ACCESS_TEAM_DOMAIN: TEAM }, false, keys)).rejects.toMatchObject({ statusCode: 500 })
    await expect(ownerFromRequest(h, { ACCESS_AUD: AUD }, false, keys)).rejects.toMatchObject({ statusCode: 500 })
  })
  it('does not bypass when ADMIN_DEV_BYPASS=1 but dev is false', async () => {
    await expect(ownerFromRequest({}, { ...ENV, ADMIN_DEV_BYPASS: '1' }, false, keys)).rejects.toMatchObject({ statusCode: 401 })
    await expect(ownerFromRequest({}, { ADMIN_DEV_BYPASS: '1' }, false, keys)).rejects.toMatchObject({ statusCode: 500 })
  })
  it('bypasses only when dev is true and ADMIN_DEV_BYPASS=1', async () => {
    expect(await ownerFromRequest({}, { ADMIN_DEV_BYPASS: '1' }, true, keys)).toEqual({ email: 'dev@localhost' })
    await expect(ownerFromRequest({}, { ...ENV, ADMIN_DEV_BYPASS: '0' }, true, keys)).rejects.toMatchObject({ statusCode: 401 })
  })
})

describe('several audiences', () => {
  const env = (aud: string) => ({ ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: aud })
  it('accepts a token whose aud matches the second configured value', async () => {
    const token = await sign({ aud: 'aud-b' })
    expect(await ownerFromRequest(headers(token), env('aud-a,aud-b'), false, keys)).toEqual({ email: 'owner@example.com' })
  })
  it('rejects a token whose aud is not listed', async () => {
    const token = await sign({ aud: 'aud-c' })
    await expect(ownerFromRequest(headers(token), env('aud-a,aud-b'), false, keys)).rejects.toMatchObject({ statusCode: 401 })
  })
  it('trims spaces around the values', async () => {
    const token = await sign({ aud: 'aud-b' })
    expect(await ownerFromRequest(headers(token), env('aud-a , aud-b'), false, keys)).toEqual({ email: 'owner@example.com' })
  })
  it('treats a value of only separators and spaces as not configured', async () => {
    const token = await sign()
    await expect(ownerFromRequest(headers(token), env(' , '), false, keys)).rejects.toMatchObject({ statusCode: 500 })
  })
})

describe('token failure log', () => {
  afterEach(() => vi.restoreAllMocks())
  it('logs the failure code and never the token', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const token = await sign({ aud: 'other' })
    await expect(ownerFromRequest(headers(token), ENV, false, keys)).rejects.toMatchObject({ statusCode: 401 })
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0]![0]).toBe('[access] token rejected')
    expect(spy.mock.calls[0]![1]).toBe('ERR_JWT_CLAIM_VALIDATION_FAILED')
    expect(JSON.stringify(spy.mock.calls)).not.toContain(token)
  })
})

describe('requireOwner', () => {
  it('gives 500 with no config', async () => {
    const event = { node: { req: { headers: {} } }, context: {} } as unknown as H3Event
    await expect(requireOwner(event)).rejects.toMatchObject({ statusCode: 500 })
  })
  it('does not bypass on ADMIN_DEV_BYPASS=1 alone (production path)', async () => {
    const event = { node: { req: { headers: {} } }, context: { cloudflare: { env: { ADMIN_DEV_BYPASS: '1' } } } } as unknown as H3Event
    await expect(requireOwner(event)).rejects.toMatchObject({ statusCode: 500 })
  })
})
