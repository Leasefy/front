import { describe, it, expect } from 'vitest';
import {
  REVIEW_STATUS_LABELS,
  getReviewStatusLabel,
  normalizeReviewStatus,
  deriveReviewCounts,
  reviewStatusBadgeVariant,
} from '../review-status';

describe('review-status labels', () => {
  it('maps every backend enum value to its Colombian-Spanish label', () => {
    expect(REVIEW_STATUS_LABELS.PENDING).toBe('Pendiente');
    expect(REVIEW_STATUS_LABELS.IN_REVIEW).toBe('En revisión');
    expect(REVIEW_STATUS_LABELS.APPROVED).toBe('Aprobado');
    expect(REVIEW_STATUS_LABELS.REJECTED).toBe('Rechazado');
  });

  it('getReviewStatusLabel resolves a known status', () => {
    expect(getReviewStatusLabel('APPROVED')).toBe('Aprobado');
    expect(getReviewStatusLabel('IN_REVIEW')).toBe('En revisión');
  });

  it('getReviewStatusLabel falls back to "Pendiente" for unknown/absent', () => {
    expect(getReviewStatusLabel(undefined)).toBe('Pendiente');
    expect(getReviewStatusLabel('WHATEVER')).toBe('Pendiente');
  });
});

describe('normalizeReviewStatus', () => {
  it('passes through the four canonical values', () => {
    expect(normalizeReviewStatus('PENDING')).toBe('PENDING');
    expect(normalizeReviewStatus('IN_REVIEW')).toBe('IN_REVIEW');
    expect(normalizeReviewStatus('APPROVED')).toBe('APPROVED');
    expect(normalizeReviewStatus('REJECTED')).toBe('REJECTED');
  });

  it('defaults to PENDING for null/undefined/unknown', () => {
    expect(normalizeReviewStatus(null)).toBe('PENDING');
    expect(normalizeReviewStatus(undefined)).toBe('PENDING');
    expect(normalizeReviewStatus('garbage')).toBe('PENDING');
  });
});

describe('deriveReviewCounts', () => {
  it('counts each status bucket and the total from real documents', () => {
    const counts = deriveReviewCounts([
      { reviewStatus: 'APPROVED' },
      { reviewStatus: 'APPROVED' },
      { reviewStatus: 'IN_REVIEW' },
      { reviewStatus: 'REJECTED' },
      { reviewStatus: 'PENDING' },
      { reviewStatus: undefined }, // absent → treated as PENDING
    ]);
    expect(counts).toEqual({
      total: 6,
      pending: 2,
      inReview: 1,
      approved: 2,
      rejected: 1,
    });
  });

  it('returns an all-zero shape for an empty list', () => {
    expect(deriveReviewCounts([])).toEqual({
      total: 0,
      pending: 0,
      inReview: 0,
      approved: 0,
      rejected: 0,
    });
  });
});

describe('reviewStatusBadgeVariant', () => {
  it('maps status to the design-system Badge variant', () => {
    expect(reviewStatusBadgeVariant('APPROVED')).toBe('success');
    expect(reviewStatusBadgeVariant('IN_REVIEW')).toBe('warning');
    expect(reviewStatusBadgeVariant('REJECTED')).toBe('destructive');
    expect(reviewStatusBadgeVariant('PENDING')).toBe('secondary');
  });
});
