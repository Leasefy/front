/**
 * Types for the tenant-document review feature.
 *
 * Endpoints (NEXT_PUBLIC_BACKEND_URL — NOT the agent service):
 *   GET   /documents/review-queue?status=<optional>
 *   PATCH /applications/:applicationId/documents/:documentId/review
 */

import type { DocumentReviewStatus } from './applications.types';

export type { DocumentReviewStatus };

/** Statuses a reviewer can transition a document INTO (PENDING is the initial state only). */
export type ReviewActionStatus = Exclude<DocumentReviewStatus, 'PENDING'>;

/** Aggregate counters returned by GET /documents/review-queue. */
export interface ReviewQueueCounts {
  total: number;
  pending: number;
  inReview: number;
  approved: number;
  rejected: number;
}

/** One document row inside a review-queue item. */
export interface ReviewQueueDocument {
  id: string;
  type: string;
  originalName: string;
  size: number;
  reviewStatus: DocumentReviewStatus;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
}

/** The tenant/application a group of documents belongs to. */
export interface ReviewQueueTenant {
  id: string;
  title: string;
}

/** Documents grouped per application/tenant. */
export interface ReviewQueueItem {
  applicationId: string;
  tenant: ReviewQueueTenant;
  documents: ReviewQueueDocument[];
}

/** Full GET /documents/review-queue response. */
export interface ReviewQueueResponse {
  counts: ReviewQueueCounts;
  items: ReviewQueueItem[];
}

/**
 * Body for PATCH .../review.
 * `rejectionReason` is REQUIRED when status is REJECTED (enforced client-side too).
 */
export interface ReviewDocumentDto {
  status: ReviewActionStatus;
  rejectionReason?: string;
}
