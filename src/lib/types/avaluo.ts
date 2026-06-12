/**
 * Avalúo — Type definitions
 *
 * Covers the full lifecycle of a commercial property valuation request:
 * form data (multi-step intake), statuses, API response shapes, and
 * a STATUS_BADGE map for rendering status pills in the UI.
 */

// ---------------------------------------------------------------------------
// Status union — mirrors backend enum
// ---------------------------------------------------------------------------

export type AvaluoStatus =
  | "borrador"
  | "en_revisión"
  | "firmado"
  | "rechazado"
  | "pagado"
  | "entregado";

/** Statuses that end the lifecycle — no further actions expected. */
export const TERMINAL_STATUSES: AvaluoStatus[] = ["entregado", "rechazado"];

// ---------------------------------------------------------------------------
// STATUS_BADGE — maps every status to a Badge variant + human-readable label
// ---------------------------------------------------------------------------

export const STATUS_BADGE: Record<
  AvaluoStatus,
  { variant: string; label: string }
> = {
  borrador: { variant: "secondary", label: "Borrador" },
  en_revisión: { variant: "warning", label: "En revisión" },
  firmado: { variant: "success", label: "Listo para pago" },
  rechazado: { variant: "destructive", label: "Rechazado" },
  pagado: { variant: "default", label: "Pago recibido" },
  entregado: { variant: "success", label: "Entregado" },
};

// ---------------------------------------------------------------------------
// AvaluoFormData — multi-step intake form
// ---------------------------------------------------------------------------

export interface AvaluoFormData {
  // ── Step 1: Inmueble ────────────────────────────────────────────────────
  /** Full civic address of the property being valued */
  address: string;
  /** City where the property is located */
  city: string;
  /** Property type (e.g. "apartamento", "casa", "local", "oficina", "bodega") */
  propertyType: string;
  /** Gross built area in square metres */
  areaM2: number | "";
  /** Colombian socioeconomic stratum (1–6). Optional for non-residential. */
  estrato?: number;
  /** Number of bedrooms. Optional for non-residential. */
  bedrooms?: number;
  /** Number of bathrooms. Optional for non-residential. */
  bathrooms?: number;
  /** Free-text notable features / amenities */
  features?: string;
  /** Geographic coordinates if available (e.g. from browser geolocation) */
  geo?: { lat: number; lng: number };

  // ── Step 2: Contacto + Consentimientos ──────────────────────────────────
  /** Requester email — used as identity anchor for the submission */
  identity: string;

  /**
   * Ley 1581 (Habeas Data) — Consent 1 of 3
   * Consent to process personal data for the purpose of generating the
   * commercial valuation report ("avalúo comercial").
   * MANDATORY for the service to proceed.
   */
  purposeAvaluo: boolean;

  /**
   * Ley 1581 (Habeas Data) — Consent 2 of 3
   * Consent to include anonymised property data in aggregate market
   * datasets used for research and model training.
   * OPTIONAL — service can proceed if false.
   */
  purposeDataset: boolean;

  /**
   * Ley 1581 (Habeas Data) — Consent 3 of 3
   * Consent to receive commercial communications (newsletter, promotions,
   * new product offers) via email or WhatsApp.
   * OPTIONAL — service can proceed if false.
   */
  purposeContacto: boolean;

  // ── Step 3: Fotos ───────────────────────────────────────────────────────
  /** S3 object keys for photos uploaded in Step 3. */
  photoKeys: string[];

  // ── Policy ──────────────────────────────────────────────────────────────
  /**
   * Version of the privacy / data policy accepted at submission time.
   * Stored server-side for auditing Ley 1581 compliance.
   */
  policyVersion: string;
}

// ---------------------------------------------------------------------------
// Factory — creates a blank form with safe defaults
// ---------------------------------------------------------------------------

/**
 * Returns a fresh AvaluoFormData with all fields at their zero-value.
 * All three Ley 1581 consent booleans default to `false` — never pre-tick.
 *
 * @param initialEmail  Pre-fills `identity` when the requester is already
 *                      authenticated (e.g. logged-in user's email).
 */
export function createEmptyAvaluoFormData(
  initialEmail?: string
): AvaluoFormData {
  return {
    // Step 1
    address: "",
    city: "",
    propertyType: "",
    areaM2: "",
    estrato: undefined,
    bedrooms: undefined,
    bathrooms: undefined,
    features: undefined,
    geo: undefined,

    // Step 2
    identity: initialEmail ?? "",
    purposeAvaluo: false,
    purposeDataset: false,
    purposeContacto: false,

    // Step 3
    photoKeys: [],

    // Policy
    policyVersion: "1.0",
  };
}

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

/** Response returned by POST /api/avaluo/photo-presign */
export interface PhotoPresignResponse {
  /** S3 object key — use as reference after upload */
  key: string;
  /** Presigned S3 URL to PUT the photo directly to S3 */
  uploadUrl: string;
}

/** Response returned by POST /api/avaluo/intake */
export interface IntakeResponse {
  /** Unique identifier for the submitted avalúo request */
  id: string;
}

/** Response returned by GET /api/avaluo/:id/status */
export interface AvaluoStatusResponse {
  status: AvaluoStatus;
  /** URL-friendly slug for sharing/lookup (set after valuation is complete) */
  slug?: string;
  /** Presigned or permanent download URL for the final PDF report */
  downloadUrl?: string;
  /** ISO-8601 timestamp of the last status change */
  updatedAt?: string;
}
