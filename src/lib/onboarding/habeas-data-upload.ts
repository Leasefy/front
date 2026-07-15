/**
 * habeas-data-upload.ts — S3-direct upload helpers for the wizard's
 * `habeas_data` step.
 *
 * INTENTIONALLY separate from `src/lib/api/onboarding-session.service.ts`:
 * that module only talks to the AGENT (Bearer JWT via `agentAuthHeaders()`).
 * The PUT here goes DIRECTLY to the presigned S3 URL the agent returns from
 * `/habeas-data/presign-url` — a different host, no auth header, and a
 * completely different error surface (S3 XML errors, not
 * `OnboardingSessionError`). Mixing the two would make `onboarding-session
 * .service.ts` lie about what it talks to.
 */

export class HabeasDataUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HabeasDataUploadError'
  }
}

/**
 * SHA-256 of the given binary content, as a 64-char lowercase hex string.
 * Accepts a `Blob`/`File` (read via `arrayBuffer()`) or a raw `ArrayBuffer`.
 *
 * ⚠️ The agent does NOT re-verify this hash against the uploaded bytes — it
 * only checks the format (64 hex chars) and persists it. Get this right.
 */
export async function sha256Hex(input: Blob | ArrayBuffer): Promise<string> {
  const buffer = input instanceof ArrayBuffer ? input : await input.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * PUTs the signed PDF directly to the presigned S3 URL.
 *
 * Both headers below are REQUIRED and must match exactly what the agent
 * signed the URL for, or S3 rejects the request with a signature mismatch —
 * `x-amz-server-side-encryption` is easy to forget since only the
 * `Content-Type` mismatch is obvious from the PUT body.
 */
export async function uploadPdfToPresignedUrl(presignedUrl: string, file: File): Promise<void> {
  let res: Response
  try {
    res = await globalThis.fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/pdf',
        'x-amz-server-side-encryption': 'AES256',
      },
      body: file,
    })
  } catch {
    throw new HabeasDataUploadError(
      'No pudimos subir el documento. Verifica tu conexión e inténtalo de nuevo.',
    )
  }
  if (!res.ok) {
    throw new HabeasDataUploadError(`La subida del documento falló (${res.status}).`)
  }
}
