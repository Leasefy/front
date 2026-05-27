// Phase 31 plan 31-08 (D-31-13, D-08).
// Client-side SHA-256 first-8-hex helper for cédula-prefix search.
// Raw digits NEVER leave the browser — we hash locally and send HEX:<8hex>
// to the server, which compares against the cedula_hash_prefix8 index.

export class CedulaPrefixTooShortError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CedulaPrefixTooShortError'
  }
}

/**
 * Hash a numeric cédula prefix and return the first 8 lowercase hex chars
 * of the resulting SHA-256 digest. Mirrors the agent-side D-08 contract.
 *
 * @throws {CedulaPrefixTooShortError} when the input has fewer than 4 digits.
 */
export async function hashCedulaPrefix(prefix: string): Promise<string> {
  const digits = prefix.replace(/[\s.\-]/g, '')
  if (!/^\d{4,}$/.test(digits)) {
    throw new CedulaPrefixTooShortError(
      'Cédula prefix must be at least 4 digits after stripping separators'
    )
  }
  const encoded = new TextEncoder().encode(digits)
  const buffer = await globalThis.crypto.subtle.digest('SHA-256', encoded)
  const hex = Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return hex.slice(0, 8)
}
