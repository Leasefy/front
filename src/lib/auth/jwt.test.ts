import { describe, it, expect } from 'vitest'
import { decodeAccessToken } from './jwt'

/** Build a JWT-shaped string with the given payload (signature is irrelevant —
 *  we never verify it, we only read our own token's claims). */
function makeToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.signature-not-verified`
}

describe('decodeAccessToken', () => {
  it('extracts session_id and sub from a valid Supabase access token', () => {
    const token = makeToken({
      sub: '11111111-2222-3333-4444-555555555555',
      session_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      exp: 9999999999,
    })
    const decoded = decodeAccessToken(token)
    expect(decoded?.session_id).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
    expect(decoded?.sub).toBe('11111111-2222-3333-4444-555555555555')
  })

  it('returns null for null/undefined/empty', () => {
    expect(decodeAccessToken(null)).toBeNull()
    expect(decodeAccessToken(undefined)).toBeNull()
    expect(decodeAccessToken('')).toBeNull()
  })

  it('returns null for a string that is not a JWT (no segments)', () => {
    expect(decodeAccessToken('not-a-jwt')).toBeNull()
  })

  it('returns null when the payload segment is not valid base64/JSON', () => {
    expect(decodeAccessToken('aaa.!!!not-base64!!!.sig')).toBeNull()
  })

  it('handles base64url payloads without padding', () => {
    // base64url drops '=' padding; the decoder must re-pad before decoding.
    const token = makeToken({ session_id: 'sid', sub: 'uid' })
    expect(token).not.toContain('=')
    expect(decodeAccessToken(token)?.session_id).toBe('sid')
  })
})
