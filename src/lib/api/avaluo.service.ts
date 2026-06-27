/**
 * Avalúo API service
 *
 * Typed client for the avalúo microservice.
 * Base URL: NEXT_PUBLIC_AVALUO_API_URL — empty string → requests are relative
 * (same origin, useful when the micro is behind a Next.js rewrite).
 *
 * Auth model:
 *   - Citizen flows use a capability token issued once by POST /intake.
 *   - presign/photos → token in request body.
 *   - certificate/memoria → token in query string.
 *   - Status endpoint is public (no auth).
 *
 * Hard rule: if the micro is unavailable, calls throw AvaluoApiError.
 * There are NO mock fallbacks anywhere in this file.
 */

import {
  AvaluoApiError,
  type AvaluoFormData,
  type AvaluoStatusResponse,
  type IntakeResponse,
  type PaymentResponse,
  type PhotoPresignResponse,
} from '@/lib/types/avaluo'

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------

const AVALUO_API_URL = process.env.NEXT_PUBLIC_AVALUO_API_URL ?? ''

// ---------------------------------------------------------------------------
// localStorage key helpers
// ---------------------------------------------------------------------------

export function capTokenKey(submissionId: string): string {
  return `avaluo:cap:${submissionId}`
}

export function persistCapToken(submissionId: string, token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(capTokenKey(submissionId), token)
  }
}

export function readCapToken(submissionId: string): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(capTokenKey(submissionId))
  }
  return null
}

// ---------------------------------------------------------------------------
// Internal fetch helper — maps HTTP errors to AvaluoApiError
// ---------------------------------------------------------------------------

async function apiFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  let res: Response

  try {
    res = await fetch(input, init)
  } catch {
    throw new AvaluoApiError(
      'No fue posible conectar con el servicio de avalúos. Verificá tu conexión e intentá de nuevo.',
      0
    )
  }

  if (res.ok) return res

  // Try to extract structured error detail from the body
  let body: Record<string, unknown> | null = null
  try {
    body = (await res.json()) as Record<string, unknown>
  } catch {
    // body not JSON — use status only
  }

  const message = statusMessage(res.status, body)
  const fieldErrors = extractFieldErrors(body)

  throw new AvaluoApiError(message, res.status, fieldErrors)
}

function statusMessage(status: number, body: Record<string, unknown> | null): string {
  switch (status) {
    case 403:
      return 'Token inválido o expirado. No tienes autorización para esta operación.'
    case 404:
      return 'No encontramos la solicitud de avalúo indicada.'
    case 409:
      return 'El certificado no está en el estado esperado para esta operación.'
    case 422: {
      const detail = typeof body?.detail === 'string' ? body.detail : null
      return detail ?? 'Los datos enviados no son válidos. Revisá el formulario.'
    }
    case 429:
      return 'Demasiadas solicitudes. Por favor, intentá de nuevo en unos minutos.'
    case 503:
      return 'El servicio de avalúos no está disponible en este momento. Intentá más tarde.'
    default:
      return `Error inesperado del servidor (${status}). Intentá de nuevo.`
  }
}

function extractFieldErrors(
  body: Record<string, unknown> | null
): Record<string, string> | undefined {
  if (!body) return undefined
  // Support both { errors: {field: msg} } and { fieldErrors: {field: msg} }
  const raw = body.errors ?? body.fieldErrors
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, string>
  }
  return undefined
}

// ---------------------------------------------------------------------------
// submitIntake — POST the completed multi-step form
// ---------------------------------------------------------------------------

/**
 * Submits the avalúo intake. Must be called BEFORE uploading photos.
 *
 * Returns {id, token}. Persist the token immediately via persistCapToken —
 * it cannot be recovered later.
 */
export async function submitIntake(
  formData: AvaluoFormData
): Promise<IntakeResponse> {
  // Build the API payload — exclude front-only fields
  const { pendingPhotoFiles: _ignored, finalidad, ...rest } = formData

  const payload = {
    ...rest,
    // Micro requires literal boolean true, not a truthy value
    purposeAvaluo: formData.purposeAvaluo === true,
    // Send empty photoKeys on intake; attach photos in a separate call
    photoKeys: [],
    // Only send `finalidad` when set. Sending '' fails the backend's regulated
    // enum (422); omitting it lets the micro apply its FINALIDAD_DEFAULT.
    // TODO: add a finalidad selector once the micro exposes the FINALIDADES enum.
    ...(finalidad ? { finalidad } : {}),
  }

  const res = await apiFetch(`${AVALUO_API_URL}/api/avaluo/intake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return res.json() as Promise<IntakeResponse>
}

// ---------------------------------------------------------------------------
// requestPhotoPresign — obtain a presigned S3 PUT URL
// ---------------------------------------------------------------------------

/**
 * Requests a presigned upload URL for a single photo.
 * token goes in the request body (not a header).
 */
export async function requestPhotoPresign({
  submissionId,
  filename,
  contentType,
  sizeBytes,
  token,
}: {
  submissionId: string
  filename: string
  contentType: string
  sizeBytes: number
  token: string
}): Promise<PhotoPresignResponse> {
  const res = await apiFetch(`${AVALUO_API_URL}/api/avaluo/photo-presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ submissionId, filename, contentType, sizeBytes, token }),
  })

  return res.json() as Promise<PhotoPresignResponse>
}

// ---------------------------------------------------------------------------
// attachPhotos — associate uploaded keys with the submission
// ---------------------------------------------------------------------------

/**
 * Notifies the micro that these S3 keys belong to the submission.
 * Call AFTER the S3 PUTs succeed.
 */
export async function attachPhotos(
  submissionId: string,
  keys: string[],
  token: string
): Promise<{ count: number }> {
  const res = await apiFetch(
    `${AVALUO_API_URL}/api/avaluo/${submissionId}/photos`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, photoKeys: keys }),
    }
  )

  const body = (await res.json()) as { ok: boolean; count: number }
  return { count: body.count }
}

// ---------------------------------------------------------------------------
// uploadPhoto — full photo upload (presign → PUT to S3 → attach)
// ---------------------------------------------------------------------------

/**
 * Uploads a single File to S3 via presigned URL, then registers the key
 * with the micro.
 *
 * Flow:
 *   1. requestPhotoPresign → {url, key}
 *   2. PUT binary to url (Content-Type MUST match file.type)
 *   3. attachPhotos([key], token)
 *   4. Return key
 *
 * The S3 PUT carries NO auth headers — the signed URL is self-contained.
 */
export async function uploadPhoto(
  file: File,
  submissionId: string,
  token: string
): Promise<string> {
  const { url, key } = await requestPhotoPresign({
    submissionId,
    filename: file.name,
    contentType: file.type,
    sizeBytes: file.size,
    token,
  })

  // Direct browser PUT to S3 — no Authorization header
  let s3Res: Response
  try {
    s3Res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })
  } catch {
    throw new AvaluoApiError(
      `No fue posible subir "${file.name}". Verificá tu conexión.`,
      0
    )
  }

  if (!s3Res.ok) {
    throw new AvaluoApiError(
      `Error al subir "${file.name}" a S3 (${s3Res.status}).`,
      s3Res.status
    )
  }

  await attachPhotos(submissionId, [key], token)

  return key
}

// ---------------------------------------------------------------------------
// getAvaluoStatus — poll submission status (public endpoint, no auth)
// ---------------------------------------------------------------------------

/**
 * Returns the current status for a submitted avalúo request.
 *
 * This endpoint is public (no PII). Polling every 15s is safe.
 * If the micro is unreachable or returns an error status, throws AvaluoApiError.
 * There is NO fallback mock. If it fails, the caller handles the error.
 */
export async function getAvaluoStatus(
  submissionId: string
): Promise<AvaluoStatusResponse> {
  const res = await apiFetch(
    `${AVALUO_API_URL}/api/avaluo/${submissionId}/status`,
    { cache: 'no-store' }
  )

  return res.json() as Promise<AvaluoStatusResponse>
}

// ---------------------------------------------------------------------------
// startPayment — initiate a Wompi checkout for a certificate
// ---------------------------------------------------------------------------

/**
 * @param certId  The certificate id (from AvaluoStatusResponse.certId).
 *                NOTE: this is NOT the submission id.
 * Certificate must be in 'firmado' state — micro returns 409 otherwise.
 */
export async function startPayment(certId: string): Promise<PaymentResponse> {
  const res = await apiFetch(
    `${AVALUO_API_URL}/api/avaluo/${certId}/pay`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }
  )

  return res.json() as Promise<PaymentResponse>
}

// ---------------------------------------------------------------------------
// downloadCertificate — fetch the PDF blob
// ---------------------------------------------------------------------------

/**
 * Downloads the certificate PDF.
 * Reads the X-Avaluo-Variant header to know if it's preview or clean.
 * Without payment → preview (watermark). With payment → clean.
 *
 * @param certId  Certificate id
 * @param token   Capability token (sent as query param per contract)
 */
export async function downloadCertificate(
  certId: string,
  token: string
): Promise<{ blob: Blob; variant: 'clean' | 'preview' }> {
  const url = certificateUrl(certId, token)

  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new AvaluoApiError(
      'No fue posible descargar el certificado. Verificá tu conexión.',
      0
    )
  }

  if (!res.ok) {
    throw new AvaluoApiError(
      res.status === 404
        ? 'Certificado no encontrado o token inválido.'
        : `Error al descargar el certificado (${res.status}).`,
      res.status
    )
  }

  const variant =
    res.headers.get('X-Avaluo-Variant') === 'clean' ? 'clean' : 'preview'
  const blob = await res.blob()

  return { blob, variant }
}

// ---------------------------------------------------------------------------
// downloadMemoria — fetch the memoria JSON
// ---------------------------------------------------------------------------

/**
 * Downloads the technical memoria (JSON) for a paid certificate.
 * Requires payment approved — micro returns 404 otherwise.
 *
 * @param certId  Certificate id
 * @param token   Capability token (sent as query param per contract)
 */
export async function downloadMemoria(
  certId: string,
  token: string
): Promise<Record<string, unknown>> {
  const url = memoriaUrl(certId, token)

  const res = await apiFetch(url)
  return res.json() as Promise<Record<string, unknown>>
}

// ---------------------------------------------------------------------------
// URL builders — pure functions, no network call
// ---------------------------------------------------------------------------

/** Builds the certificate download URL with token as query param. */
export function certificateUrl(certId: string, token: string): string {
  return `${AVALUO_API_URL}/api/avaluo/${certId}/certificate?token=${encodeURIComponent(token)}`
}

/** Builds the memoria download URL with token as query param. */
export function memoriaUrl(certId: string, token: string): string {
  return `${AVALUO_API_URL}/api/avaluo/${certId}/memoria?token=${encodeURIComponent(token)}`
}

// ---------------------------------------------------------------------------
// Named object export for convenience (compat with callers using avaluoService.*)
// ---------------------------------------------------------------------------

export const avaluoService = {
  submitIntake,
  requestPhotoPresign,
  attachPhotos,
  uploadPhoto,
  getAvaluoStatus,
  startPayment,
  downloadCertificate,
  downloadMemoria,
  certificateUrl,
  memoriaUrl,
  persistCapToken,
  readCapToken,
  capTokenKey,
}
