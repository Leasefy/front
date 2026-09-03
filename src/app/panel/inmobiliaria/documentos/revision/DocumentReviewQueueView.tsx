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
import Link from 'next/link';
import { Badge, Button, Spinner } from '@/components/ui';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { SinDatos } from '@/components/estado/SinDatos';
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
  /**
   * El error ENTERO, no su mensaje: `FalloDeCarga` clasifica por status para
   * saber si reintentar sirve. Con un string todo caía en «problema nuestro».
   */
  error: unknown;
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
          Soportes de candidatos
        </h1>
        <p className="text-sm text-fg-muted max-w-2xl">
          Revisa los soportes que adjuntan al postularse —cédula, comprobante de ingresos,
          carta laboral— y apruébalos o recházalos con un motivo.
        </p>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {COUNT_CARDS.map(({ key, label, icon: CardIcon }) => (
          <div
            key={key}
            data-testid={`count-${key}`}
            className="p-4 rounded-lg border border-border bg-card"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center">
                <CardIcon className="w-5 h-5 text-fg-muted" />
              </div>
              <div className="min-w-0">
                {/* Con la consulta caída, `counts` viene en ceros: cinco
                    tarjetas afirmando «0 pendientes» sobre un dato que nadie
                    trajo. Mientras carga tampoco se sabe todavía. */}
                <p className="text-2xl font-semibold tabular-nums text-fg">
                  {isLoading || error ? '—' : counts[key]}
                </p>
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
        <FalloDeCarga
          error={error}
          queEs="la cola de revisión"
          onReintentar={onRetry}
        />
      ) : items.length === 0 ? (
        /* Sin filtros en esta pantalla: acá el vacío es siempre «todavía no
           llegó nada», nunca «filtraste mal». Y no se crea desde acá — los
           soportes los sube quien se postula—, así que la salida útil es ir a
           ver las postulaciones. */
        <SinDatos
          queSon="soportes por revisar"
          icono={FolderOpen}
          titulo="No hay soportes por revisar"
          descripcion="Los soportes los adjunta el candidato al postularse. Apenas alguien mande los suyos, aparecen acá."
          accion={
            <Button asChild variant="outline">
              <Link href="/panel/inmobiliaria/postulaciones">Ver postulaciones</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <section
              key={item.applicationId}
              data-testid="review-group"
              className="rounded-lg border border-border bg-card overflow-hidden"
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
