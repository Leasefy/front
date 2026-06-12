import { describe, it, expect } from 'vitest'
import { hashCedulaPrefix, CedulaPrefixTooShortError } from './hash-cedula-prefix'

describe('hashCedulaPrefix', () => {
  it('returns 8-char lowercase hex for a 4-digit input', async () => {
    const result = await hashCedulaPrefix('1234')
    expect(result).toMatch(/^[a-f0-9]{8}$/)
  })

  it('returns deterministic output for repeated calls', async () => {
    const a = await hashCedulaPrefix('1234')
    const b = await hashCedulaPrefix('1234')
    expect(a).toBe(b)
  })

  it('strips dots / dashes / spaces before hashing', async () => {
    const dotted = await hashCedulaPrefix('1.234')
    const plain = await hashCedulaPrefix('1234')
    expect(dotted).toBe(plain)
  })

  it('returns the documented fixture for 12345678', async () => {
    // pre-computed: echo -n '12345678' | shasum -a 256 | cut -c1-8
    const result = await hashCedulaPrefix('12345678')
    expect(result).toBe('ef797c81')
  })

  it('throws CedulaPrefixTooShortError for a 3-digit input', async () => {
    await expect(hashCedulaPrefix('123')).rejects.toBeInstanceOf(CedulaPrefixTooShortError)
  })

  it('throws CedulaPrefixTooShortError for non-numeric input', async () => {
    await expect(hashCedulaPrefix('abcd')).rejects.toBeInstanceOf(CedulaPrefixTooShortError)
  })

  it('throws for empty input', async () => {
    await expect(hashCedulaPrefix('')).rejects.toBeInstanceOf(CedulaPrefixTooShortError)
  })
})
