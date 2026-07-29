'use client';

import {
  FileText,
  FolderOpen,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  User,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { Badge, Button, Spinner, EmptyState, ErrorState } from '@/components/ui';
import { getReviewStatusLabel, reviewStatusBadgeVariant } from '@/lib/documents/review-status';
import type {
  ReviewQueueCounts,
  ReviewQueueItem,
  ReviewQueueDocument,
} from '@/lib/api/document-review.types';

// Minimal es-CO labels for the canonical backend document types. Unknown types
// fall back to a humanized version of the raw key.
const DOC_TYPE_LABELS: Record<string, string> = {
  ID_DOCUMENT: 'Documento de identidad',
  INCOME_PROOF: 'Comprobante de ingresos',
  EMPLOYMENT_LETTER: 'Carta laboral',
  BANK_STATEMENT: 'Extracto bancario',
  PAY_STUB: 'Desprendible de nómina',
  CREDIT_REPORT: 'Reporte crediticio',
  OTHER: 'Otro documento',
};

function docTypeLabel(type: string): string {
  return DOC_TYPE_LABELS[type] ?? type.replace(/_/g, ' ').toLowerCase();
}

function formatSize(bytes: number): string {
  if (!bytes) return '—';
  return bytes > 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

export interface DocumentReviewQueueViewProps {
  counts: ReviewQueueCounts;
  items: ReviewQueueItem[];
  isLoading: boolean;
  error: string | null;
  /** Whether the current user may run review actions (manager roles only). */
  canReview: boolean;
  /** id of the document currently being mutated — disables its row buttons. */
  pendingDocId: string | null;
  onTakeToReview: (applicationId: string, documentId: string) => void;
  onApprove: (applicationId: string, documentId: string) => void;
  onReject: (item: ReviewQueueItem, doc: ReviewQueueDocument) => void;
  onRetry: () => void;
}

interface CountCard {
  key: keyof ReviewQueueCounts;
  label: string;
  icon: Icon;
}

const COUNT_CARDS: CountCard[] = [
  { key: 'total', label: 'Total', icon: FolderOpen },
  { key: 'pending', label: 'Pendientes', icon: Clock },
  { key: 'inReview', label: 'En revisión', icon: Eye },
  { key: 'approved', label: 'Aprobados', icon: CheckCircle },
  { key: 'rejected', label: 'Rechazados', icon: XCircle },
];

export function DocumentReviewQueueView({
  counts,
  items,
  isLoading,
  error,
  canReview,
  pendingDocId,
  onTakeToReview,
  onApprove,
  onReject,
  onRetry,
}: DocumentReviewQueueViewProps) {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-fg flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center">
            <FileText className="w-5 h-5 text-fg-muted" />
          </div>
          Revisión de documentos
        </h1>
        <p className="text-sm text-fg-muted max-w-2xl">
          Revisá los documentos que suben los inquilinos en sus postulaciones y aprobalos o
          rechazalos con un motivo.
        </p>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {COUNT_CARDS.map(({ key, label, icon: CardIcon }) => (
          <div
            key={key}
            data-testid={`count-${key}`}
            className="p-4 rounded-xl border border-border bg-card"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center">
                <CardIcon className="w-5 h-5 text-fg-muted" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-semibold tabular-nums text-fg">{counts[key]}</p>
                <p className="text-xs text-fg-muted">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <ErrorState
          title="No pudimos cargar la cola de revisión"
          description={error}
          onRetry={onRetry}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No hay documentos por revisar"
          description="Cuando los inquilinos suban documentos en sus postulaciones, aparecerán acá para revisión."
        />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <section
              key={item.applicationId}
              data-testid="review-group"
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              {/* Tenant header */}
              <header className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-fg-muted" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fg truncate">{item.tenant.title}</p>
                  <p className="text-xs text-fg-muted tabular-nums">
                    {item.documents.length}{' '}
                    {item.documents.length === 1 ? 'documento' : 'documentos'}
                  </p>
                </div>
              </header>

              {/* Documents */}
              <ul className="divide-y divide-border">
                {item.documents.map((doc) => {
                  const busy = pendingDocId === doc.id;
                  const showTake = doc.reviewStatus === 'PENDING';
                  const showApprove = doc.reviewStatus !== 'APPROVED';
                  const showReject = doc.reviewStatus !== 'REJECTED';
                  return (
                    <li
                      key={doc.id}
                      data-testid="review-doc"
                      className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-surface-muted flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-fg-muted" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-fg truncate">
                            {docTypeLabel(doc.type)}
                          </p>
                          <p className="text-xs text-fg-muted truncate">
                            {doc.originalName} · {formatSize(doc.size)}
                          </p>
                          {doc.reviewStatus === 'REJECTED' && doc.rejectionReason && (
                            <p className="mt-1 text-xs text-danger break-words">
                              Motivo: {doc.rejectionReason}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                        <Badge variant={reviewStatusBadgeVariant(doc.reviewStatus)}>
                          {getReviewStatusLabel(doc.reviewStatus)}
                        </Badge>

                        {canReview && (
                          <>
                            {showTake && (
                              <Button
                                size="sm"
                                variant="outline"
                                hideArrow
                                disabled={busy}
                                onClick={() => onTakeToReview(item.applicationId, doc.id)}
                              >
                                Tomar a revisión
                              </Button>
                            )}
                            {showApprove && (
                              <Button
                                size="sm"
                                hideArrow
                                disabled={busy}
                                isLoading={busy}
                                onClick={() => onApprove(item.applicationId, doc.id)}
                              >
                                Aprobar
                              </Button>
                            )}
                            {showReject && (
                              <Button
                                size="sm"
                                variant="destructive"
                                hideArrow
                                disabled={busy}
                                onClick={() => onReject(item, doc)}
                              >
                                Rechazar
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
