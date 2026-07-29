/**
 * Pure helpers for tenant-document review status.
 *
 * Backend enum: PENDING | IN_REVIEW | APPROVED | REJECTED.
 * UI copy is Colombian Spanish; identifiers stay English.
 */

import type { DocumentReviewStatus } from '@/lib/api/applications.types';

export type { DocumentReviewStatus };

/** Spanish (es-CO) labels for each backend review status. */
export const REVIEW_STATUS_LABELS: Record<DocumentReviewStatus, string> = {
  PENDING: 'Pendiente',
  IN_REVIEW: 'En revisión',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
};

const KNOWN_STATUSES = new Set<DocumentReviewStatus>([
  'PENDING',
  'IN_REVIEW',
  'APPROVED',
  'REJECTED',
]);

/**
 * Coerce any backend/legacy value into a canonical status.
 * Unknown, null or absent values default to PENDING (fail-safe, non-approving).
 */
export function normalizeReviewStatus(
  raw: string | null | undefined,
): DocumentReviewStatus {
  if (raw && KNOWN_STATUSES.has(raw as DocumentReviewStatus)) {
    return raw as DocumentReviewStatus;
  }
  return 'PENDING';
}

/** Human label for a (possibly unknown) status. */
export function getReviewStatusLabel(raw: string | null | undefined): string {
  return REVIEW_STATUS_LABELS[normalizeReviewStatus(raw)];
}

/** Counts shape shared with the agency review-queue endpoint. */
export interface ReviewCounts {
  total: number;
  pending: number;
  inReview: number;
  approved: number;
  rejected: number;
}

/**
 * Derive per-status counters from a list of documents. Absent/unknown
 * statuses fold into `pending` so the totals always reconcile.
 */
export function deriveReviewCounts(
  docs: ReadonlyArray<{ reviewStatus?: string | null }>,
): ReviewCounts {
  const counts: ReviewCounts = {
    total: docs.length,
    pending: 0,
    inReview: 0,
    approved: 0,
    rejected: 0,
  };
  for (const doc of docs) {
    switch (normalizeReviewStatus(doc.reviewStatus)) {
      case 'IN_REVIEW':
        counts.inReview += 1;
        break;
      case 'APPROVED':
        counts.approved += 1;
        break;
      case 'REJECTED':
        counts.rejected += 1;
        break;
      default:
        counts.pending += 1;
    }
  }
  return counts;
}

/** Design-system `<Badge>` variant for a review status (color + icon paired in UI). */
export type ReviewBadgeVariant = 'success' | 'warning' | 'destructive' | 'secondary';

export function reviewStatusBadgeVariant(
  raw: string | null | undefined,
): ReviewBadgeVariant {
  switch (normalizeReviewStatus(raw)) {
    case 'APPROVED':
      return 'success';
    case 'IN_REVIEW':
      return 'warning';
    case 'REJECTED':
      return 'destructive';
    default:
      return 'secondary';
  }
}
