'use client';

// F10 (SPEC §4): relocated VERBATIM from /panel/inmobiliaria/conciliacion —
// the legacy movimientos/extractos surface is now the 5th page of the
// Conciliación workspace; the old URL server-redirects to the Sala.

import { useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import {
  Bank,
  Info,
  UploadSimple,
  ArrowsClockwise,
  CheckCircle,
  XCircle,
  ArrowCounterClockwise,
  Warning,
} from '@phosphor-icons/react';
import {
  SegmentedControl,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { SectionLabel } from '@/components/ui/section-label';
import { EmptyState } from '@/components/ui/empty-state';
import { PageGuard } from '@/components/auth/PageGuard';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import {
  useConciliacionQueue,
  type ConciliacionQueueItem,
  type IngestBank,
} from '@/lib/hooks/conciliacion/use-conciliacion-queue';

// ── Summary card config ─────────────────────────────────────────────────────

const RESUMEN_ITEMS = [
  { key: 'conciliados',       dot: 'bg-success-500', field: 'conciliados'       },
  { key: 'parciales',         dot: 'bg-warning-500', field: 'parciales'         },
  { key: 'duplicados',        dot: 'bg-fg-subtle', field: 'duplicados'        },
  { key: 'noIdentificados',   dot: 'bg-fg-subtle', field: 'noIdentificados'   },
  { key: 'diferencias',       dot: 'bg-error-500',   field: 'diferencias'       },
  { key: 'fueraFecha',        dot: 'bg-fg-subtle', field: 'fueraDeFecha'      },
] as const;

// ── Caso badge ──────────────────────────────────────────────────────────────

type CasoBadgeVariant = 'success' | 'warning' | 'neutral' | 'danger';
const CASO_VARIANT: Record<string, CasoBadgeVariant> = {
  conciliado:       'success',
  parcial:          'warning',
  duplicado:        'neutral',
  no_identificado:  'neutral',
  diferencia_valor: 'danger',
  fuera_de_fecha:   'neutral',
  confirmado:       'success',
  rechazado:        'neutral',
};

/** Derive display caso from queue item fields */
function itemCaso(item: ConciliacionQueueItem): string {
  if (item.status === 'confirmed')   return 'confirmado';
  if (item.status === 'rejected')    return 'rechazado';
  if (item.status === 'unidentified') return 'no_identificado';
  if (item.matchLayer?.includes('duplicate'))      return 'duplicado';
  if (item.matchLayer?.includes('out_of_window'))  return 'fuera_de_fecha';
  if (item.matchedAmountCop < item.movement.amountCop) return 'parcial';
  if (item.matchedAmountCop !== item.movement.amountCop) return 'diferencia_valor';
  return 'conciliado';
}

/** Format COP amounts */
function fmtCop(val: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);
}

/** Format ISO date string to DD/MM/YYYY */
function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ── Reject dialog ───────────────────────────────────────────────────────────

interface RejectDialogProps {
  matchId: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  t: (k: string) => string;
  busy: boolean;
}

function RejectDialog({ matchId: _matchId, onConfirm, onCancel, t, busy }: RejectDialogProps) {
  const [reason, setReason] = useState('');
  const k = (s: string) => `inmobiliaria.conciliacion.${s}`;

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !busy) onCancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t(k('rejectDialogTitle'))}</DialogTitle>
          <DialogDescription>{t(k('rejectDialogDesc'))}</DialogDescription>
        </DialogHeader>
        <Textarea
          className="h-24 resize-none"
          placeholder={t(k('rejectReasonPlaceholder'))}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-label={t(k('rejectReasonPlaceholder'))}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={busy} hideArrow>
            {t(k('cancel'))}
          </Button>
          <Button
            variant="destructive"
            onClick={() => { if (reason.trim()) onConfirm(reason.trim()); }}
            disabled={!reason.trim() || busy}
            isLoading={busy}
            hideArrow
            className="gap-1.5"
          >
            {t(k('rejectConfirm'))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Table row actions ───────────────────────────────────────────────────────

interface RowActionsProps {
  item: ConciliacionQueueItem;
  onConfirm: () => void;
  onReject: () => void;
  onReverse: () => void;
  busy: boolean;
  t: (k: string) => string;
}

function RowActions({ item, onConfirm, onReject, onReverse, busy, t }: RowActionsProps) {
  const k = (s: string) => `inmobiliaria.conciliacion.${s}`;
  const isConfirmed = item.status === 'confirmed';
  const isInQueue   = item.status === 'suggested' || item.status === 'unidentified';

  if (!isInQueue && !isConfirmed) {
    // rejected / reversed — no actions
    return <span className="text-caption text-muted-foreground">—</span>;
  }

  return (
    <div className="flex items-center gap-1.5">
      {isInQueue && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onConfirm}
            disabled={busy}
            title={t(k('actionConfirm'))}
            aria-label={t(k('actionConfirm'))}
            hideArrow
            className="gap-1 text-success-700 hover:bg-success-50 hover:text-success-700 dark:text-success-500 dark:hover:bg-success-500/15"
          >
            {busy ? <Spinner size="xs" variant="current" /> : <CheckCircle className="w-3.5 h-3.5" weight="fill" />}
            {t(k('actionConfirm'))}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReject}
            disabled={busy}
            title={t(k('actionReject'))}
            aria-label={t(k('actionReject'))}
            hideArrow
            className="gap-1 text-error-700 hover:bg-error-50 hover:text-error-700 dark:text-error-500 dark:hover:bg-error-500/15"
          >
            {busy ? <Spinner size="xs" variant="current" /> : <XCircle className="w-3.5 h-3.5" weight="fill" />}
            {t(k('actionReject'))}
          </Button>
        </>
      )}
      {isConfirmed && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReverse}
          disabled={busy}
          title={t(k('actionReverse'))}
          aria-label={t(k('actionReverse'))}
          hideArrow
          className="gap-1 text-muted-foreground"
        >
          {busy ? <Spinner size="xs" variant="current" /> : <ArrowCounterClockwise className="w-3.5 h-3.5" />}
          {t(k('actionReverse'))}
        </Button>
      )}
    </div>
  );
}

// ── Skeleton ────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i} className="animate-pulse">
          {Array.from({ length: 8 }).map((_, j) => (
            <TableCell key={j} className="px-5 py-3.5">
              <div className="h-4 rounded bg-muted w-16" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ── Main content ────────────────────────────────────────────────────────────

const COLUMNS = [
  'colFecha', 'colReferencia', 'colTercero', 'colContrato',
  'colValorBanco', 'colValorEsperado', 'colCaso', 'colAccion',
];

function ConciliacionContent() {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.conciliacion.${s}`;

  const { items, summary, total, isLoading, error, refetch, confirmMatch, rejectMatch, reverseMatch, ingestStatement } =
    useConciliacionQueue();

  /**
   * Paginado de presentación, no del servidor.
   *
   * `useConciliacionQueue` SÍ acepta `page`/`pageSize` y el back devuelve
   * `total`, pero el resumen de arriba (`deriveQueueSummary`) se calcula en el
   * cliente sobre `items`: si le pidiéramos una página al back, los tiles
   * pasarían a contar sólo la página visible. Mientras no exista endpoint de
   * resumen, el recorte va acá. Esta pantalla no tiene filtros ⇒ sin `resetKey`.
   */
  const {
    pageItems,
    total: totalPaginado,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(items);

  // Per-row busy state
  const [busyRow, setBusyRow] = useState<string | null>(null);
  // Reject dialog state
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  // Statement upload state
  const [bank, setBank] = useState<IngestBank>('bancolombia');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleConfirm(matchId: string) {
    setBusyRow(matchId);
    const result = await confirmMatch(matchId);
    setBusyRow(null);
    if (result.ok) {
      toast.success(t(k('toastConfirmed')));
    } else {
      toast.error(t(k('toastActionError')), { description: result.error });
    }
  }

  async function handleRejectSubmit(reason: string) {
    if (!rejectTarget) return;
    const matchId = rejectTarget;
    setRejectTarget(null);
    setBusyRow(matchId);
    const result = await rejectMatch(matchId, reason);
    setBusyRow(null);
    if (result.ok) {
      toast.success(t(k('toastRejected')));
    } else {
      toast.error(t(k('toastActionError')), { description: result.error });
    }
  }

  async function handleReverse(matchId: string) {
    setBusyRow(matchId);
    const result = await reverseMatch(matchId);
    setBusyRow(null);
    if (result.ok) {
      toast.success(t(k('toastReversed')));
    } else {
      toast.error(t(k('toastActionError')), { description: result.error });
    }
  }

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so re-selecting the same file fires onChange
    if (!file) return;

    const text = await file.text();
    if (!text.trim()) {
      toast.error(t(k('uploadError')), { description: t(k('uploadEmptyFile')) });
      return;
    }

    setUploading(true);
    const result = await ingestStatement(bank, text);
    setUploading(false);

    if (result.ok) {
      toast.success(t(k('uploadSuccess')), {
        description: t(k('uploadSuccessDesc'), {
          created: result.created ?? 0,
          skipped: result.skipped ?? 0,
        }),
      });
    } else {
      toast.error(t(k('uploadError')), { description: result.error });
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header — subir extracto (abajo) ES la acción principal; sin CTA extra */}
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t(k('title'))}</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">{t(k('subtitle'))}</p>
      </header>

      {/* Phase-honest banner */}
      <div className="rounded-xl bg-surface-muted border border-border p-3 flex items-start gap-2.5">
        <Info className="w-5 h-5 text-fg-muted flex-shrink-0 mt-0.5" weight="duotone" />
        <div>
          <p className="text-xs font-semibold text-fg-muted">{t(k('m2BannerTitle'))}</p>
          <p className="text-xs text-fg-muted mt-0.5">{t(k('m2BannerDesc'))}</p>
        </div>
      </div>

      {/*
        Cargar fuente bancaria — wired to POST /api/agency/{id}/conciliacion/ingest.
        Persists the CSV rows synchronously (created/skipped) and enqueues the
        reconciliation run; matching is async (Inngest), so new suggestions surface
        on a later refresh of the queue below.
      */}
      <div id="upload" className="scroll-mt-24 rounded-xl border-2 border-dashed border-border bg-muted/20 p-5 space-y-4">
        {/* Bank selector — selector excluyente → SegmentedControl del DS */}
        <div className="flex items-center gap-2">
          <span className="text-caption text-muted-foreground">{t(k('uploadBankLabel'))}</span>
          <SegmentedControl<IngestBank>
            aria-label={t(k('uploadBankLabel'))}
            value={bank}
            onChange={setBank}
            disabled={uploading}
            options={[
              { value: 'bancolombia', label: t(k('bankBancolombia')) },
              { value: 'davivienda', label: t(k('bankDavivienda')) },
            ]}
          />
        </div>

        {/* Click-to-upload dropzone */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label={t(k('uploadTitle'))}
          className="w-full rounded-xl border-2 border-dashed border-border bg-background/40 p-8 flex flex-col items-center justify-center gap-2 text-center transition-colors hover:border-primary/30 hover:bg-primary/5 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-1">
            {uploading ? (
              <Spinner size="md" variant="default" />
            ) : (
              <UploadSimple className="w-6 h-6 text-primary" weight="duotone" />
            )}
          </div>
          <p className="text-body-sm font-medium text-foreground">
            {uploading ? t(k('uploadProcessing')) : t(k('uploadTitle'))}
          </p>
          <p className="text-caption text-muted-foreground">{t(k('uploadHint'))}</p>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>

      {/* Resumen por caso — derived from live queue data */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel>{t(k('resumenLabel'))}</SectionLabel>
          {!isLoading && (
            <span className="text-caption text-muted-foreground">
              {total} {t(k('totalMovimientos'))}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {RESUMEN_ITEMS.map((item) => {
            const value = isLoading ? '—' : summary[item.field as keyof typeof summary];
            return (
              <div key={item.key} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', item.dot)} />
                  <span className="text-caption text-muted-foreground truncate">{t(k(`caso_${item.key}`))}</span>
                </div>
                <p className="mt-1.5 text-2xl font-medium tabular-nums text-foreground">
                  {isLoading ? <span className="inline-block w-8 h-6 rounded bg-muted animate-pulse" /> : value}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-error-500/30 dark:border-error-500/40 bg-error-50 dark:bg-error-500/15 p-4 flex items-start gap-2.5">
          <Warning className="w-5 h-5 text-error-700 dark:text-error-500 flex-shrink-0 mt-0.5" weight="fill" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-error-700 dark:text-error-500">{t(k('errorTitle'))}</p>
            <p className="text-xs text-error-700/90 dark:text-error-500/90 mt-0.5">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            hideArrow
            className="shrink-0"
          >
            {t(k('retry'))}
          </Button>
        </div>
      )}

      {/* Movimientos table */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-surface-muted flex items-center justify-center flex-shrink-0">
              <ArrowsClockwise className="w-[18px] h-[18px] text-fg-muted" weight="duotone" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{t(k('movimientosTitle'))}</h2>
              <p className="text-caption text-muted-foreground mt-0.5">{t(k('movimientosDesc'))}</p>
            </div>
          </div>
          {!isLoading && !error && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void refetch()}
              title={t(k('refresh'))}
              aria-label={t(k('refresh'))}
              hideArrow
              className="text-muted-foreground"
            >
              <ArrowsClockwise className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table className="w-full text-sm">
            <TableHeader>
              <TableRow>
                {COLUMNS.map((col) => (
                  <TableHead key={col} className="whitespace-nowrap">
                    {t(k(col))}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableSkeleton />}

              {!isLoading && !error && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} className="p-0">
                    <EmptyState
                      icon={Bank}
                      title={t(k('emptyQueueTitle'))}
                      description={t(k('emptyQueueDesc'))}
                    />
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && pageItems.map((item) => {
                const caso = itemCaso(item);
                const isBusy = busyRow === item.id;
                const dateStr = fmtDate(item.movement.valueDate ?? item.createdAt);
                const ref = item.movement.reference ?? item.movement.description ?? '—';
                const tercero = item.movement.description ?? '—';
                const valorBanco = fmtCop(item.movement.amountCop);
                const valorEsperado = item.matchedAmountCop ? fmtCop(item.matchedAmountCop) : '—';

                return (
                  <TableRow
                    key={item.id}
                    className={cn(
                      'transition-colors',
                      isBusy ? 'opacity-60' : 'hover:bg-muted/30',
                    )}
                  >
                    <TableCell className="px-5 py-3.5 tabular-nums whitespace-nowrap text-muted-foreground">
                      {dateStr}
                    </TableCell>
                    <TableCell className="px-5 py-3.5 font-mono text-xs max-w-[140px] truncate" title={ref}>
                      {ref}
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-xs max-w-[200px] truncate" title={tercero}>
                      {tercero}
                    </TableCell>
                    <TableCell className="px-5 py-3.5 max-w-[160px] truncate text-muted-foreground" title={item.domain}>
                      {item.domain}
                    </TableCell>
                    <TableCell className="px-5 py-3.5 tabular-nums whitespace-nowrap">
                      {valorBanco}
                    </TableCell>
                    <TableCell className="px-5 py-3.5 tabular-nums whitespace-nowrap text-muted-foreground">
                      {valorEsperado}
                    </TableCell>
                    <TableCell className="px-5 py-3.5">
                      <Badge variant={CASO_VARIANT[caso] ?? 'neutral'}>
                        {t(k(`caso_badge_${caso}`))}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-3.5">
                      <RowActions
                        item={item}
                        onConfirm={() => void handleConfirm(item.id)}
                        onReject={() => setRejectTarget(item.id)}
                        onReverse={() => void handleReverse(item.id)}
                        busy={isBusy}
                        t={t}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pie: sólo si hay más de una página. */}
        {shouldPaginate && (
          <div className="border-t border-border px-4 py-3">
            <TablePagination
              total={totalPaginado}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </section>

      {/* Reject dialog */}
      {rejectTarget && (
        <RejectDialog
          matchId={rejectTarget}
          onConfirm={handleRejectSubmit}
          onCancel={() => setRejectTarget(null)}
          t={t}
          busy={busyRow === rejectTarget}
        />
      )}
    </div>
  );
}

export default function ConciliacionPage() {
  return (
    // Aligned with the nav gate in layout.tsx: ADMIN|CONTADOR (was adminOnly,
    // which blocked agency ADMIN/CONTADOR members the nav already lets in).
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <ConciliacionContent />
    </PageGuard>
  );
}
