import 'server-only'

import { createHash } from 'node:crypto'

/**
 * SERVER-ONLY Wompi integrity hash.
 *
 * `import 'server-only'` guarantees this module (and the WOMPI_INTEGRITY_SECRET
 * it consumes) can never be pulled into a client bundle. It is imported ONLY by
 * the rent Wompi session route — the single server-side source of the hash.
 *
 * Hash order is copied verbatim from the avalúo route (Wompi spec):
 *   sha256(reference + amountInCents + currency + secret), no separators, hex.
 */
export function computeWompiIntegrity(
  reference: string,
  amountInCents: number,
  currency: string,
  secret: string
): string {
  return createHash('sha256')
    .update(`${reference}${amountInCents}${currency}${secret}`)
    .digest('hex')
}
