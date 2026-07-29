/**
 * document-review.service.test.ts — review queue + per-document review action.
 *
 * Endpoints (on NEXT_PUBLIC_BACKEND_URL, NOT the agent):
 *   GET   /documents/review-queue?status=<optional>
 *   PATCH /applications/:applicationId/documents/:documentId/review
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { documentReviewApi } from '../document-review.service';
import type { ReviewQueueResponse } from '../document-review.types';

function mockFetchOnce(body: unknown, status = 200) {
  // apiClient reads res.text() then JSON.parse (never res.json()).
  return vi.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
    json: async () => body,
  } as unknown as Response);
}

const QUEUE: ReviewQueueResponse = {
  counts: { total: 3, pending: 1, inReview: 1, approved: 1, rejected: 0 },
  items: [
    {
      applicationId: 'app-1',
      tenant: { id: 'ten-1', title: 'Juan Pérez' },
      documents: [
        {
          id: 'doc-1',
          type: 'ID_DOCUMENT',
          originalName: 'cedula.pdf',
          size: 12345,
          reviewStatus: 'PENDING',
          reviewedAt: null,
          rejectionReason: null,
        },
      ],
    },
  ],
};

// apiClient binds BACKEND_URL at import time; env has no override, so it uses
// the built-in default. Assert against it rather than fighting module load order.
const BASE = 'http://localhost:3000';

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('documentReviewApi.getReviewQueue', () => {
  it('GETs the review queue without a status filter', async () => {
    const fetchMock = mockFetchOnce(QUEUE);
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const result = await documentReviewApi.getReviewQueue();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/documents/review-queue`);
    expect(init.method).toBe('GET');
    expect(result.counts.total).toBe(3);
    expect(result.items[0].tenant.title).toBe('Juan Pérez');
    expect(result.items[0].documents[0].reviewStatus).toBe('PENDING');
  });

  it('appends the status query param when provided', async () => {
    const fetchMock = mockFetchOnce(QUEUE);
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    await documentReviewApi.getReviewQueue('PENDING');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/documents/review-queue?status=PENDING`);
  });
});

describe('documentReviewApi.reviewDocument', () => {
  it('PATCHes the correct nested path with the status body', async () => {
    const fetchMock = mockFetchOnce(undefined, 204);
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    await documentReviewApi.reviewDocument('app-1', 'doc-1', { status: 'IN_REVIEW' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/applications/app-1/documents/doc-1/review`);
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ status: 'IN_REVIEW' });
  });

  it('sends rejectionReason when rejecting', async () => {
    const fetchMock = mockFetchOnce(undefined, 204);
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    await documentReviewApi.reviewDocument('app-1', 'doc-1', {
      status: 'REJECTED',
      rejectionReason: 'Documento ilegible',
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      status: 'REJECTED',
      rejectionReason: 'Documento ilegible',
    });
  });

  it('throws WITHOUT hitting the network when REJECTED has no reason', async () => {
    const fetchMock = mockFetchOnce(undefined, 204);
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    await expect(
      documentReviewApi.reviewDocument('app-1', 'doc-1', { status: 'REJECTED' }),
    ).rejects.toThrow(/motivo/i);

    await expect(
      documentReviewApi.reviewDocument('app-1', 'doc-1', {
        status: 'REJECTED',
        rejectionReason: '   ',
      }),
    ).rejects.toThrow(/motivo/i);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
