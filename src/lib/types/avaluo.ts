/**
 * Avalúo — Type definitions
 *
 * Covers the full lifecycle of a commercial property valuation request:
 * form data (multi-step intake), statuses, API response shapes, and
 * a STATUS_BADGE map for rendering status pills in the UI.
 */

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

/**
 * Typed error thrown by every avaluoService call.
 *
 * - status 0   → network / unreachable
 * - status 422 → validation error (fieldErrors populated when available)
 * - status 403 → invalid capability token
 * - status 404 → submission/certificate not found
 * - status 409 → certificate not in the expected state (e.g. not 'firmado')
 * - status 429 → rate limited
 * - status 503 → service unavailable
 */
export class AvaluoApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors?: Record<string, string>
  ) {
    super(message)
    this.name = 'AvaluoApiError'
  }
}

// ---------------------------------------------------------------------------
// Finalidad
// ---------------------------------------------------------------------------

// TODO: replace with the exact enum values once the micro publishes them
export type Finalidad = string

// ---------------------------------------------------------------------------
// Status union — mirrors backend enum
// ---------------------------------------------------------------------------

export type AvaluoStatus =
  | 'borrador'
  | 'en_revisión'
  | 'firmado'
  | 'rechazado'
  | 'pagado'
  | 'entregado'

/** Statuses that end the lifecycle — no further actions expected. */
export const TERMINAL_STATUSES: AvaluoStatus[] = ['entregado', 'rechazado']

// ---------------------------------------------------------------------------
// STATUS_BADGE — maps every status to a Badge variant + human-readable label
// ---------------------------------------------------------------------------

export const STATUS_BADGE: Record<
  AvaluoStatus,
  { variant: string; label: string }
> = {
  borrador: { variant: 'secondary', label: 'Borrador' },
  en_revisión: { variant: 'warning', label: 'En revisión' },
  firmado: { variant: 'success', label: 'Listo para pago' },
  rechazado: { variant: 'destructive', label: 'Rechazado' },
  pagado: { variant: 'default', label: 'Pago recibido' },
  entregado: { variant: 'success', label: 'Entregado' },
}

// ---------------------------------------------------------------------------
// AvaluoFormData — multi-step intake form
// ---------------------------------------------------------------------------

export interface AvaluoFormData {
  // ── Step 1: Inmueble ────────────────────────────────────────────────────
  /** Full civic address of the property being valued */
  address: string
  /** City where the property is located */
  city: string
  /** Property type (e.g. "apartamento", "casa", "local", "oficina", "bodega") */
  propertyType: string
  /** Gross built area in square metres */
  areaM2: number | ''
  /** Colombian socioeconomic stratum (1–6). Optional for non-residential. */
  estrato?: number
  /** Number of bedrooms. Optional for non-residential. */
  bedrooms?: number
  /** Number of bathrooms. Optional for non-residential. */
  bathrooms?: number
  /** Free-text notable features / amenities */
  features?: string
  /** Geographic coordinates if available (e.g. from browser geolocation) */
  geo?: { lat: number; lng: number }
  /** Cadastral number, if known */
  cadastral?: string

  // ── Step 2: Contacto + Consentimientos ──────────────────────────────────
  /** Requester email — used as identity anchor for the submission */
  identity: string

  /**
   * Ley 1581 (Habeas Data) — Consent 1 of 3
   * Must be literal `true` (not truthy) — backend 422s on anything else.
   * MANDATORY for the service to proceed.
   */
  purposeAvaluo: true | false

  /**
   * Ley 1581 (Habeas Data) — Consent 2 of 3
   * Consent to include anonymised property data in aggregate market datasets.
   * OPTIONAL.
   */
  purposeDataset: boolean

  /**
   * Ley 1581 (Habeas Data) — Consent 3 of 3
   * Consent to receive commercial communications.
   * OPTIONAL.
   */
  purposeContacto: boolean

  // ── Finalidad ────────────────────────────────────────────────────────────
  /**
   * Regulated finalidad enum required by the micro.
   * Backend 422s if the value is not a valid finalidad.
   * TODO: narrow type once micro publishes the allowed enum values.
   */
  finalidad: Finalidad

  // ── Policy ──────────────────────────────────────────────────────────────
  /**
   * Version of the privacy / data policy accepted at submission time.
   * Stored server-side for auditing Ley 1581 compliance.
   */
  policyVersion: string

  // ── Step 3: Photos (sent after intake, keys from upload) ────────────────
  /**
   * S3 object keys collected AFTER submitIntake.
   * Sent empty on intake, then attached via POST /:id/photos.
   */
  photoKeys: string[]

  /**
   * File objects staged in the wizard (Step 3) but NOT yet uploaded.
   * Uploaded after submitIntake returns {id, token}.
   * Not serialized to the API — front-only field.
   */
  pendingPhotoFiles?: File[]
}

// ---------------------------------------------------------------------------
// Factory — creates a blank form with safe defaults
// ---------------------------------------------------------------------------

/**
 * Returns a fresh AvaluoFormData with all fields at their zero-value.
 * All three Ley 1581 consent booleans default to `false` — never pre-tick.
 */
export function createEmptyAvaluoFormData(
  initialEmail?: string
): AvaluoFormData {
  return {
    // Step 1
    address: '',
    city: '',
    propertyType: '',
    areaM2: '',
    estrato: undefined,
    bedrooms: undefined,
    bathrooms: undefined,
    features: undefined,
    geo: undefined,
    cadastral: undefined,

    // Step 2
    identity: initialEmail ?? '',
    purposeAvaluo: false,
    purposeDataset: false,
    purposeContacto: false,

    // Finalidad — required by micro; default empty, user must pick
    finalidad: '',

    // Policy
    policyVersion: '1.0',

    // Photos
    photoKeys: [],
    pendingPhotoFiles: [],
  }
}

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

/** Response returned by POST /api/avaluo/intake */
export interface IntakeResponse {
  /** Unique identifier for the submitted avalúo request */
  id: string
  /**
   * Capability token — stateless, one-time issued.
   * MUST be persisted to localStorage immediately: `avaluo:cap:${id}`.
   * Cannot be recovered if lost.
   */
  token: string
  /**
   * Wompi (or stub in dev) hosted checkout URL, or `null` when no payment
   * is required yet. Payment now happens AT INTAKE, before the valuation
   * runs — when present with `paymentProvider: 'wompi'`, the citizen must
   * be redirected here immediately after intake.
   */
  paymentUrl: string | null
  /** Payment provider for `paymentUrl`, or `null` when there is no payment. */
  paymentProvider: 'wompi' | 'stub' | null
}

/** Response returned by POST /api/avaluo/photo-presign */
export interface PhotoPresignResponse {
  /** Presigned S3 PUT URL (Content-Type MUST match what was sent to presign) */
  url: string
  /** S3 object key — prefix: `avaluo/<submissionId>/<uuid>-<filename>` */
  key: string
}

/** Response returned by GET /api/avaluo/:id/status */
export interface AvaluoStatusResponse {
  status: AvaluoStatus
  /** Certificate id — present once valuation is signed (status >= 'firmado') */
  certId?: string
  /** URL-friendly slug for public verification (comes with certId) */
  slug?: string
  /** ISO-8601 timestamp of the last status change */
  updatedAt?: string
  /**
   * Whether the citizen has paid. Present in EVERY 200 response.
   * Payment happens at intake (WU2) — this field is observation-only,
   * it does NOT gate the valuation pipeline.
   */
  paid: boolean
}
