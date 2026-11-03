import { describe, expect, it } from 'vitest'
import { explain } from '~/composables/useAdmin'

const fetchError = (statusCode: number, data?: unknown) => Object.assign(new Error(`HTTP ${statusCode}`), { statusCode, data })

describe('explain', () => {
  const LOGIN = 'Your login ended or has no access. Log in again.'

  it('explains 401 and 403 as a login problem', () => {
    expect(explain(fetchError(401))).toBe(LOGIN)
    expect(explain(fetchError(403))).toBe(LOGIN)
  })

  it('reads the status from `status` too', () => {
    expect(explain(Object.assign(new Error('x'), { status: 401 }))).toBe(LOGIN)
  })

  it('explains 409 as a slug clash', () => {
    expect(explain(fetchError(409))).toBe('This slug is already in use. Choose a different slug.')
  })

  it('joins the 422 errors', () => {
    expect(explain(fetchError(422, { errors: ['Title is empty.', 'Slug is not valid.'] }))).toBe('Title is empty. Slug is not valid.')
  })

  it('falls back to the message for a 422 without errors', () => {
    expect(explain(fetchError(422, {}))).toBe('HTTP 422')
  })

  it('explains 413 as the size limit', () => {
    expect(explain(fetchError(413))).toBe('The file is too big. The limit is 10 MB.')
  })

  it('explains 415 as the file type limit', () => {
    expect(explain(fetchError(415))).toBe('This file type is not allowed. Use png, jpg, webp, gif or svg.')
  })

  it('uses the message of a plain Error', () => {
    expect(explain(new Error('Boom'))).toBe('Boom')
  })

  it('gives a generic sentence for a non-Error value', () => {
    expect(explain('nope')).toBe('Something went wrong. Try again.')
    expect(explain(undefined)).toBe('Something went wrong. Try again.')
  })
})
