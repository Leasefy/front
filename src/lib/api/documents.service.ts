/**
 * Documents API service
 * Read endpoints for application documents.
 *
 * NOTE: upload/delete/getById were removed as dead code (their only callers,
 * `useDocumentUpload`/`useDocumentDelete`, had no consumers). Real document
 * mutations go through `applicationsApi` (application-scoped routes).
 */

import { apiClient, ApiError } from './client';
import type {
  BackendDocumentFull,
  DocumentSignedUrl,
  DocumentConsent,
} from './documents.types';
import type { BackendDocument, DocumentReviewStatus } from './applications.types';
import { normalizeReviewStatus } from '@/lib/documents/review-status';

// ============================================================================
// Mapper
// ============================================================================

export interface DocumentItem {
  id: string;
  type: string;
  fileName: string;
  url: string;
  mimeType: string;
  size: number;
  verified: boolean;
  createdAt: string;
  applicationId?: string;
  /** Review lifecycle status (normalized; defaults to PENDING when absent). */
  reviewStatus: DocumentReviewStatus;
  /** ISO timestamp of the last review transition, when available. */
  reviewedAt?: string | null;
  /** Reason to surface to the tenant when reviewStatus is REJECTED. */
  rejectionReason?: string | null;
}

function mapDocument(bd: BackendDocumentFull | BackendDocument): DocumentItem {
  // BackendDocument uses `originalName` as canonical; BackendDocumentFull uses `fileName`
  const name = ('originalName' in bd ? bd.originalName : undefined) ?? bd.fileName ?? 'documento';
  const verified = 'verified' in bd ? !!bd.verified : false;
  const rawReviewStatus = 'reviewStatus' in bd ? bd.reviewStatus : undefined;
  // Prefer the explicit reviewStatus. Fall back to the legacy `verified` flag so
  // pre-migration payloads still render an approved badge instead of PENDING.
  const reviewStatus = normalizeReviewStatus(
    rawReviewStatus ?? (verified ? 'APPROVED' : undefined),
  );
  return {
    id: bd.id,
    type: bd.type ?? 'other',
    fileName: name,
    url: bd.url ?? '',
    mimeType: bd.mimeType ?? 'application/octet-stream',
    size: bd.size ?? 0,
    verified,
    createdAt: bd.createdAt,
    applicationId: bd.applicationId,
    reviewStatus,
    reviewedAt: 'reviewedAt' in bd ? bd.reviewedAt : undefined,
    rejectionReason: 'rejectionReason' in bd ? bd.rejectionReason : undefined,
  };
}

// ============================================================================
// Service
// ============================================================================

export const documentsApi = {
  /** Get documents for an application */
  async getByApplication(applicationId: string): Promise<DocumentItem[]> {
    const docs = await apiClient.get<BackendDocument[]>(
      `/documents/application/${applicationId}`
    );
    return docs.map(mapDocument);
  },

  /** Get documents for a candidate (applicationId) via the application documents endpoint */
  async getByCandidateApplication(candidateId: string): Promise<DocumentItem[]> {
    // Backend: GET /applications/:applicationId/documents
    const docs = await apiClient.get<BackendDocument[]>(
      `/applications/${candidateId}/documents`
    );
    return docs.map(mapDocument);
  },

  /**
   * GET /documents/:id/signed-url — short-lived, ownership-checked URL to the
   * document's bytes. Returns `{ url, expiresAt }` ({@link DocumentSignedUrl}),
   * modeled 1:1 on `contractsApi.getSignedPdfUrl` ({@link file://src/lib/api/contracts.service.ts}).
   *
   * This is the anti-IDOR download path: the **backend** mints the URL, verifies
   * the caller owns the document, and stamps `expiresAt`. The frontend can neither
   * sign nor ownership-check — so if this endpoint is missing/blocked this throws
   * (an `ApiError`); it never fabricates a fake signed URL. Tenant-reachable
   * paths must consume this instead of the raw persistent `DocumentItem.url`.
   */
  async getSignedUrl(docId: string): Promise<DocumentSignedUrl> {
    return apiClient.get<DocumentSignedUrl>(`/documents/${docId}/signed-url`);
  },

  /**
   * POST /documents/:id/consent — records the tenant's per-purpose Ley 1581
   * consent ({@link DocumentConsent}) for SIC audit.
   *
   * Best-effort: the authoritative, SIC-audit consent store is **backend-owned**.
   * If the endpoint is absent (404) or forbidden (403) this degrades to a resolved
   * no-op rather than blocking the flow — the real, enforcing gate is the
   * unchecked-default consent UI (v7-02-03), which won't let the user proceed
   * without ticking `purposeDocAccess`. Any other error is re-thrown so genuine
   * failures are not swallowed.
   */
  async recordConsent(docId: string, consent: DocumentConsent): Promise<void> {
    try {
      await apiClient.post<void>(`/documents/${docId}/consent`, consent);
    } catch (err) {
      // Missing/blocked endpoint → silent no-op (persistence is a disclosed
      // backend dependency). Surface everything else.
      if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
        return;
      }
      throw err;
    }
  },
};
