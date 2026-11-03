import { createError, getRequestHeader } from 'h3'
import type { H3Event } from 'h3'
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

export async function verifyAccessToken(
  _token: string | undefined,
  _cfg: AccessConfig,
  _keys: JWTVerifyGetKey,
): Promise<{ email: string }> {
  throw new Error('not implemented')
}

export async function ownerFromRequest(
  _headers: HeaderSource,
  _env: AccessEnv,
  _dev: boolean,
  _keys?: JWTVerifyGetKey,
): Promise<{ email: string }> {
  void createError
  throw new Error('not implemented')
}

export async function requireOwner(_event: H3Event): Promise<{ email: string }> {
  void getRequestHeader
  throw new Error('not implemented')
}
