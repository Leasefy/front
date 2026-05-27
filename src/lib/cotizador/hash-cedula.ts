// Phase 30 plan 30-05 (COTI-UI-02, D-08)
// Client-side SHA-256 cédula hashing. Raw cédula NEVER leaves this module into
// network requests, localStorage (except for draft repopulation), URLs, or query params.
// This function is called in the wizard handleSubmit — not at draft.save() time.

export class CedulaValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CedulaValidationError'
  }
}

/**
 * Hash a Colombian cédula using SHA-256 via crypto.subtle.
 *
 * Strips dots, dashes, and spaces before validation and hashing.
 * Returns a 64-character lowercase hex string.
 *
 * @throws {CedulaValidationError} if the stripped input is not 7-10 digits.
 */
export async function hashCedula(input: string): Promise<string> {
  const digits = input.replace(/[\s.\-]/g, '')
  if (!/^\d{7,10}$/.test(digits)) {
    throw new CedulaValidationError('Cédula must be 7-10 digits after stripping separators')
  }
  const encoded = new TextEncoder().encode(digits)
  const buffer = await crypto.subtle.digest('SHA-256', encoded)
  const hex = Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return hex
}
