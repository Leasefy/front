/**
 * Document review API service.
 *
 * Consumes the backend (NEXT_PUBLIC_BACKEND_URL) via the shared apiClient
 * (Bearer JWT). This is NOT the agent microservice — do not use api:gen here.
 *
 *   GET   /documents/review-queue?status=<optional>   → review queue for the agency panel
 *   PATCH /applications/:applicationId/documents/:documentId/review
 */

import { apiClient, ApiError } from './client';
import type {
  DocumentReviewStatus,
  ReviewDocumentDto,
  ReviewQueueResponse,
} from './document-review.types';

export const documentReviewApi = {
  /**
   * Fetch the agency-wide review queue, optionally filtered by status.
   * GET /documents/review-queue[?status=...]
   */
  async getReviewQueue(status?: DocumentReviewStatus): Promise<ReviewQueueResponse> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiClient.get<ReviewQueueResponse>(`/documents/review-queue${query}`);
  },

  /**
   * Transition a single document's review status.
   * PATCH /applications/:applicationId/documents/:documentId/review
   *
   * Mirrors the backend contract: `rejectionReason` is required when REJECTED.
   * We validate client-side (fail fast, no wasted round-trip) AND rely on the
   * backend as the source of truth.
   */
  async reviewDocument(
    applicationId: string,
    documentId: string,
    dto: ReviewDocumentDto,
  ): Promise<void> {
    if (dto.status === 'REJECTED' && !dto.rejectionReason?.trim()) {
      throw new ApiError(400, 'Debés indicar el motivo del rechazo.');
    }
    await apiClient.patch<void>(
      `/applications/${applicationId}/documents/${documentId}/review`,
      dto,
    );
  },
};
