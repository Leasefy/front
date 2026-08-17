/**
 * Documents API service
 * Read endpoints for application documents.
 *
 * NOTE: upload/delete/getById were removed as dead code (their only callers,
 * `useDocumentUpload`/`useDocumentDelete`, had no consumers). Real document
 * mutations go through `applicationsApi` (application-scoped routes).
 */

import { apiClient } from './client';
import type { BackendDocumentFull } from './documents.types';
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
};
