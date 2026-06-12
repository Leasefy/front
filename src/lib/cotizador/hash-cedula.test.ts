import { describe, it, expect } from 'vitest'
import { hashCedula, CedulaValidationError } from './hash-cedula'

describe('hashCedula', () => {
  it('returns 64-char lowercase hex for a 7-digit number', async () => {
    const result = await hashCedula('1234567')
    expect(result).toMatch(/^[a-f0-9]{64}$/)
  })

  it('returns 64-char lowercase hex for a 10-digit number', async () => {
    const result = await hashCedula('1234567890')
    expect(result).toMatch(/^[a-f0-9]{64}$/)
  })

  it('strips dots and hashes the same as unformatted', async () => {
    const withDots = await hashCedula('12.345.678')
    const plain = await hashCedula('12345678')
    expect(withDots).toBe(plain)
  })

  it('strips dashes and hashes the same as unformatted', async () => {
    const withDashes = await hashCedula('12-345-678')
    const plain = await hashCedula('12345678')
    expect(withDashes).toBe(plain)
  })

  it('strips spaces and hashes the same as unformatted', async () => {
    const withSpaces = await hashCedula(' 1234567 ')
    const plain = await hashCedula('1234567')
    expect(withSpaces).toBe(plain)
  })

  it('throws CedulaValidationError for a 6-digit input', async () => {
    await expect(hashCedula('123456')).rejects.toBeInstanceOf(CedulaValidationError)
  })

  it('throws CedulaValidationError for an 11-digit input', async () => {
    await expect(hashCedula('12345678901')).rejects.toBeInstanceOf(CedulaValidationError)
  })

  it('throws CedulaValidationError for non-numeric input after stripping', async () => {
    await expect(hashCedula('abc1234')).rejects.toBeInstanceOf(CedulaValidationError)
  })

  it('is deterministic — same input produces same output on repeated calls', async () => {
    const first = await hashCedula('1234567')
    const second = await hashCedula('1234567')
    expect(first).toBe(second)
  })

  // Known-vector regression test — Pre-computed: echo -n '1234567' | shasum -a 256
  it('returns known SHA-256 for 1234567', async () => {
    const result = await hashCedula('1234567')
    expect(result).toBe('8bb0cf6eb9b17d0f7d22b456f121257dc1254e1f01665370476383ea776df414')
  })
})
