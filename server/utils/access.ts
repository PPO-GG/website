import { createError, getRequestHeader } from 'h3'
import type { H3Event } from 'h3'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { JWTVerifyGetKey } from 'jose'

export interface AccessConfig {
  teamDomain: string
  aud: string
}

export interface AccessEnv {
  ACCESS_TEAM_DOMAIN?: string
  ACCESS_AUD?: string
  ADMIN_DEV_BYPASS?: string
}

export type HeaderSource = Headers | Record<string, string | undefined>

const HEADER = 'cf-access-jwt-assertion'

/** One remote JWKS per team domain; jose caches the fetched keys inside it. */
const jwksByDomain = new Map<string, JWTVerifyGetKey>()

function remoteKeys(teamDomain: string): JWTVerifyGetKey {
  let jwks = jwksByDomain.get(teamDomain)
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`))
    jwksByDomain.set(teamDomain, jwks)
  }
  return jwks
}

/** Verifies an Access JWT. Throws on every failure. */
export async function verifyAccessToken(
  token: string | undefined,
  cfg: AccessConfig,
  keys: JWTVerifyGetKey,
): Promise<{ email: string }> {
  if (!token) throw new Error('missing token')
  const { payload } = await jwtVerify(token, keys, {
    issuer: `https://${cfg.teamDomain}`,
    audience: cfg.aud,
    algorithms: ['RS256'],
  })
  if (typeof payload.email !== 'string' || !payload.email) throw new Error('missing email claim')
  return { email: payload.email }
}

function readHeader(headers: HeaderSource): string | undefined {
  if (headers instanceof Headers) return headers.get(HEADER) ?? undefined
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === HEADER) return value
  }
  return undefined
}

/** All owner-check logic. Any failure rejects; a missing setting is a 500, never a pass. */
export async function ownerFromRequest(
  headers: HeaderSource,
  env: AccessEnv,
  dev: boolean,
  keys?: JWTVerifyGetKey,
): Promise<{ email: string }> {
  if (dev === true && env.ADMIN_DEV_BYPASS === '1') return { email: 'dev@localhost' }

  const teamDomain = env.ACCESS_TEAM_DOMAIN
  const aud = env.ACCESS_AUD
  if (!teamDomain || !aud) {
    throw createError({ statusCode: 500, statusMessage: 'Access is not configured' })
  }

  try {
    return await verifyAccessToken(readHeader(headers), { teamDomain, aud }, keys ?? remoteKeys(teamDomain))
  }
  catch {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
}

export async function requireOwner(event: H3Event): Promise<{ email: string }> {
  const cfEnv = (event.context.cloudflare?.env ?? {}) as AccessEnv
  const env: AccessEnv = import.meta.dev ? { ...(process.env as AccessEnv), ...cfEnv } : cfEnv
  const token = getRequestHeader(event, HEADER)
  return ownerFromRequest({ [HEADER]: token }, env, Boolean(import.meta.dev))
}
