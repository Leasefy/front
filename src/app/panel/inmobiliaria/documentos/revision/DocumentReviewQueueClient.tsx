'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { documentReviewApi } from '@/lib/api/document-review.service';
import type {
  ReviewQueueResponse,
  ReviewQueueItem,
  ReviewQueueDocument,
  ReviewActionStatus,
} from '@/lib/api/document-review.types';
import { useAgencyAccess } from '@/lib/auth/useAgencyAccess';
import { DocumentReviewQueueView } from './DocumentReviewQueueView';
import { RejectReasonDrawer } from './RejectReasonDrawer';

const EMPTY_COUNTS = { total: 0, pending: 0, inReview: 0, approved: 0, rejected: 0 };

const SUCCESS_MESSAGE: Record<ReviewActionStatus, string> = {
  IN_REVIEW: 'Documento tomado a revisión',
  APPROVED: 'Documento aprobado',
  REJECTED: 'Documento rechazado',
};

interface RejectTarget {
  applicationId: string;
  doc: ReviewQueueDocument;
}

/**
 * Data + interaction layer for the tenant-document review queue.
 * Write actions are gated by manager role (ADMIN/AGENTE) — the front equivalent
 * of the backend's AGENT/LANDLORD/ADMIN authorization. CONTADOR/VIEWER see the
 * queue read-only. The backend remains the source of truth (403 otherwise).
 */
export function DocumentReviewQueueClient() {
  const { isManager } = useAgencyAccess();

  const [data, setData] = useState<ReviewQueueResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // El error ENTERO, no su mensaje: sin el status, `FalloDeCarga` no puede
  // distinguir un 404 —donde reintentar es una promesa falsa— de un 401 por
  // token recién renovado o de un 500. Todo caía en «fue un problema nuestro».
  const [error, setError] = useState<unknown>(null);
  const [pendingDocId, setPendingDocId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await documentReviewApi.getReviewQueue();
      setData(res);
    } catch (err) {
      setError(err);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const runReview = useCallback(
    async (
      applicationId: string,
      documentId: string,
      status: ReviewActionStatus,
      rejectionReason?: string,
    ): Promise<boolean> => {
      setPendingDocId(documentId);
      try {
        await documentReviewApi.reviewDocument(applicationId, documentId, {
          status,
          rejectionReason,
        });
        toast.success(SUCCESS_MESSAGE[status]);
        await fetchQueue();
        return true;
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'No pudimos actualizar el documento',
        );
        return false;
      } finally {
        setPendingDocId(null);
      }
    },
    [fetchQueue],
  );

  const handleTakeToReview = useCallback(
    (applicationId: string, documentId: string) => {
      void runReview(applicationId, documentId, 'IN_REVIEW');
    },
    [runReview],
  );

  const handleApprove = useCallback(
    (applicationId: string, documentId: string) => {
      void runReview(applicationId, documentId, 'APPROVED');
    },
    [runReview],
  );

  const handleReject = useCallback((item: ReviewQueueItem, doc: ReviewQueueDocument) => {
    setRejectTarget({ applicationId: item.applicationId, doc });
  }, []);

  const confirmReject = useCallback(
    async (reason: string) => {
      if (!rejectTarget) return;
      setIsRejecting(true);
      const ok = await runReview(
        rejectTarget.applicationId,
        rejectTarget.doc.id,
        'REJECTED',
        reason,
      );
      setIsRejecting(false);
      if (ok) setRejectTarget(null);
    },
    [rejectTarget, runReview],
  );

  return (
    <>
      <DocumentReviewQueueView
        counts={data?.counts ?? EMPTY_COUNTS}
        items={data?.items ?? []}
        isLoading={isLoading}
        error={error}
        canReview={isManager}
        pendingDocId={pendingDocId}
        onTakeToReview={handleTakeToReview}
        onApprove={handleApprove}
        onReject={handleReject}
        onRetry={fetchQueue}
      />
      <RejectReasonDrawer
        open={rejectTarget !== null}
        documentName={rejectTarget?.doc.originalName}
        isSubmitting={isRejecting}
        onClose={() => {
          if (!isRejecting) setRejectTarget(null);
        }}
        onConfirm={confirmReject}
      />
    </>
  );
}
