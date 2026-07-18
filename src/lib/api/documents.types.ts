/**
 * Backend document API types
 * Reflects the exact shape of NestJS responses for /documents
 */

export interface BackendDocumentFull {
  id: string;
  applicationId?: string;
  type: string;
  fileName: string;
  url: string;
  mimeType: string;
  size: number;
  entityType?: string;
  entityId?: string;
  verified: boolean;
  verifiedAt?: string;
  verifiedNotes?: string;
  createdAt: string;
}

export interface UploadDocumentDto {
  file: File;
  type: string;
  entityType?: string;
  entityId?: string;
}

// ============================================================================
// Signed / expiring URL contract (anti-IDOR)
// ============================================================================

/**
 * Short-lived, ownership-checked URL to a document's bytes.
 *
 * Modeled 1:1 on `ContractSignedPdf` ({@link file://src/lib/api/contracts.types.ts}:176):
 * the backend mints this URL, verifies the caller owns the document, and stamps an
 * expiry into `expiresAt`. `expiresAt` is the expiry guarantee the UI surfaces so a
 * leaked link stops working — it is what makes this the anti-IDOR path, unlike the
 * raw persistent `DocumentItem.url` returned by `getDownloadUrl`.
 */
export interface DocumentSignedUrl {
  /** The short-lived signed download URL. */
  url: string;
  /** ISO-8601 timestamp at which `url` stops working (short-lived expiry). */
  expiresAt: string;
}

// ============================================================================
// Consent-by-purpose contract — Ley 1581 (Habeas Data)
// ============================================================================

/**
 * Per-purpose consent for accessing/serving a tenant's lease documents.
 *
 * Mirrors the avalúo consent model ({@link file://src/lib/types/avaluo.ts}:65-116):
 * each purpose is a **separate** boolean (never a single "acepto todo" checkbox),
 * defaulting to `false`. Persistence is backend-owned (SIC audit store) — see
 * `documentsApi.recordConsent`.
 */
export interface DocumentConsent {
  /**
   * Ley 1581 (Habeas Data) — Consent 1 of 2
   * MANDATORY: process/serve the tenant's lease documents so they can consult and
   * download them. The document flow cannot proceed without this.
   */
  purposeDocAccess: boolean;

  /**
   * Ley 1581 (Habeas Data) — Consent 2 of 2
   * OPTIONAL: share generated certificates (paz y salvo / retención) with third
   * parties the tenant designates (e.g. a new arrendador). The flow can proceed if
   * this is `false`.
   */
  purposeThirdPartyShare: boolean;

  /**
   * Version of the privacy / data policy accepted at consent time.
   * Stored server-side for auditing Ley 1581 (SIC) compliance.
   */
  policyVersion: string;
}

/**
 * Returns a fresh {@link DocumentConsent} with **both** purpose booleans at `false`
 * — never pre-tick (the exact DOCU-04 requirement). The caller passes the current
 * privacy-policy version so it is recorded alongside the consent for SIC audit.
 *
 * @param policyVersion  The accepted privacy-policy version to stamp on the consent.
 */
export function createEmptyDocumentConsent(policyVersion: string): DocumentConsent {
  return {
    purposeDocAccess: false,
    purposeThirdPartyShare: false,
    policyVersion,
  };
}
