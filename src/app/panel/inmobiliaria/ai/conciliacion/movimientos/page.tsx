'use client';

// F10 (SPEC §4): relocated VERBATIM from /panel/inmobiliaria/conciliacion —
// the legacy movimientos/extractos surface is now the 5th page of the
// Conciliación workspace; the old URL server-redirects to the Sala.

import { useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import {
  Bank,
  Plus,
  Info,
  UploadSimple,
  ArrowsClockwise,
  CheckCircle,
  XCircle,
  ArrowCounterClockwise,
  Warning,
  Spinner,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { SectionLabel } from '@/components/ui/section-label';
import { EmptyState } from '@/components/ui/empty-state';
import { PageGuard } from '@/components/auth/PageGuard';
import {
  useConciliacionQueue,
  type ConciliacionQueueItem,
  type IngestBank,
} from '@/lib/hooks/conciliacion/use-conciliacion-queue';

// ── Summary card config ─────────────────────────────────────────────────────

const RESUMEN_ITEMS = [
  { key: 'conciliados',       dot: 'bg-emerald-500', field: 'conciliados'       },
  { key: 'parciales',         dot: 'bg-amber-500',   field: 'parciales'         },
  { key: 'duplicados',        dot: 'bg-violet-500',  field: 'duplicados'        },
  { key: 'noIdentificados',   dot: 'bg-slate-400',   field: 'noIdentificados'   },
  { key: 'diferencias',       dot: 'bg-rose-500',    field: 'diferencias'       },
  { key: 'fueraFecha',        dot: 'bg-blue-500',    field: 'fueraDeFecha'      },
] as const;

// ── Caso badge ──────────────────────────────────────────────────────────────

const CASO_STYLES: Record<string, string> = {
  conciliado:       'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  parcial:          'bg-amber-100  text-amber-800  dark:bg-amber-950/50  dark:text-amber-300',
  duplicado:        'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300',
  no_identificado:  'bg-slate-100  text-slate-700  dark:bg-slate-800      dark:text-slate-300',
  diferencia_valor: 'bg-rose-100   text-rose-800   dark:bg-rose-950/50   dark:text-rose-300',
  fuera_de_fecha:   'bg-blue-100   text-blue-800   dark:bg-blue-950/50   dark:text-blue-300',
  confirmado:       'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  rechazado:        'bg-slate-100  text-slate-500  dark:bg-slate-800      dark:text-slate-400',
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

/** Mask a party string: keep first 3 chars + *** */
function maskTercero(s: string | null): string {
  if (!s) return '—';
  return s.length <= 3 ? s : `${s.slice(0, 3)}***`;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl p-6 space-y-4">
        <h3 className="text-h4 text-foreground">{t(k('rejectDialogTitle'))}</h3>
        <p className="text-body-sm text-muted-foreground">{t(k('rejectDialogDesc'))}</p>
        <textarea
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder={t(k('rejectReasonPlaceholder'))}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-label={t(k('rejectReasonPlaceholder'))}
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="h-9 px-4 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {t(k('cancel'))}
          </button>
          <button
            onClick={() => { if (reason.trim()) onConfirm(reason.trim()); }}
            disabled={!reason.trim() || busy}
            className="h-9 px-4 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {busy && <Spinner className="w-3.5 h-3.5 animate-spin" />}
            {t(k('rejectConfirm'))}
          </button>
        </div>
      </div>
    </div>
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
          <button
            onClick={onConfirm}
            disabled={busy}
            title={t(k('actionConfirm'))}
            aria-label={t(k('actionConfirm'))}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {busy ? <Spinner className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" weight="fill" />}
            {t(k('actionConfirm'))}
          </button>
          <button
            onClick={onReject}
            disabled={busy}
            title={t(k('actionReject'))}
            aria-label={t(k('actionReject'))}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {busy ? <Spinner className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" weight="fill" />}
            {t(k('actionReject'))}
          </button>
        </>
      )}
      {isConfirmed && (
        <button
          onClick={onReverse}
          disabled={busy}
          title={t(k('actionReverse'))}
          aria-label={t(k('actionReverse'))}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 text-xs font-medium transition-colors disabled:opacity-50"
        >
          {busy ? <Spinner className="w-3.5 h-3.5 animate-spin" /> : <ArrowCounterClockwise className="w-3.5 h-3.5" />}
          {t(k('actionReverse'))}
        </button>
      )}
    </div>
  );
}

// ── Skeleton ────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border last:border-0 animate-pulse">
          {Array.from({ length: 8 }).map((_, j) => (
            <td key={j} className="px-5 py-3.5">
              <div className="h-4 rounded bg-muted w-16" />
            </td>
          ))}
        </tr>
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
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <SectionLabel>{t(k('label'))}</SectionLabel>
          <h1 className="text-h2 text-foreground">{t(k('title'))}</h1>
          <p className="text-body text-muted-foreground max-w-2xl">{t(k('subtitle'))}</p>
        </div>
        <button
          onClick={() => toast.info(t(k('newSoon')))}
          className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-primary text-primary-foreground font-mono uppercase tracking-wide text-sm transition-transform active:scale-[0.97] flex-shrink-0"
        >
          <Plus className="w-4 h-4" weight="bold" />
          {t(k('new'))}
        </button>
      </header>

      {/* Phase-honest banner */}
      <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-3 flex items-start gap-2.5">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" weight="fill" />
        <div>
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">{t(k('m2BannerTitle'))}</p>
          <p className="text-xs text-blue-600 dark:text-blue-300/90 mt-0.5">{t(k('m2BannerDesc'))}</p>
        </div>
      </div>

      {/*
        Cargar fuente bancaria — wired to POST /api/agency/{id}/conciliacion/ingest.
        Persists the CSV rows synchronously (created/skipped) and enqueues the
        reconciliation run; matching is async (Inngest), so new suggestions surface
        on a later refresh of the queue below.
      */}
      <div className="rounded-2xl border-2 border-dashed border-border bg-muted/20 p-5 space-y-4">
        {/* Bank selector */}
        <div className="flex items-center gap-2">
          <span className="text-caption text-muted-foreground">{t(k('uploadBankLabel'))}</span>
          <div
            className="inline-flex rounded-lg border border-border bg-background p-0.5"
            role="group"
            aria-label={t(k('uploadBankLabel'))}
          >
            {(['bancolombia', 'davivienda'] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBank(b)}
                disabled={uploading}
                aria-pressed={bank === b}
                className={cn(
                  'h-7 px-3 rounded-md text-xs font-medium transition-colors disabled:opacity-50',
                  bank === b
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t(k(b === 'bancolombia' ? 'bankBancolombia' : 'bankDavivienda'))}
              </button>
            ))}
          </div>
        </div>

        {/* Click-to-upload dropzone */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label={t(k('uploadTitle'))}
          className="w-full rounded-xl border-2 border-dashed border-border bg-background/40 p-8 flex flex-col items-center justify-center gap-2 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 disabled:cursor-wait disabled:opacity-60"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mb-1">
            {uploading ? (
              <Spinner className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
            ) : (
              <UploadSimple className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
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
                <p className="mt-1.5 text-2xl font-mono tabular-nums text-foreground">
                  {isLoading ? <span className="inline-block w-8 h-6 rounded bg-muted animate-pulse" /> : value}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-4 flex items-start gap-2.5">
          <Warning className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" weight="fill" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">{t(k('errorTitle'))}</p>
            <p className="text-xs text-rose-600 dark:text-rose-300/90 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => void refetch()}
            className="h-7 px-2.5 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-medium hover:bg-rose-200 dark:hover:bg-rose-900/70 transition-colors flex-shrink-0"
          >
            {t(k('retry'))}
          </button>
        </div>
      )}

      {/* Movimientos table */}
      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0">
              <ArrowsClockwise className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-h4 text-foreground">{t(k('movimientosTitle'))}</h2>
              <p className="text-caption text-muted-foreground mt-0.5">{t(k('movimientosDesc'))}</p>
            </div>
          </div>
          {!isLoading && !error && (
            <button
              onClick={() => void refetch()}
              title={t(k('refresh'))}
              aria-label={t(k('refresh'))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <ArrowsClockwise className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {COLUMNS.map((col) => (
                  <th
                    key={col}
                    className="text-left px-5 py-2.5 text-label text-muted-foreground font-normal whitespace-nowrap"
                  >
                    {t(k(col))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && <TableSkeleton />}

              {!isLoading && !error && items.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="p-0">
                    <EmptyState
                      icon={Bank}
                      title={t(k('emptyQueueTitle'))}
                      description={t(k('emptyQueueDesc'))}
                    />
                  </td>
                </tr>
              )}

              {!isLoading && items.map((item) => {
                const caso = itemCaso(item);
                const isBusy = busyRow === item.id;
                const dateStr = fmtDate(item.movement.valueDate ?? item.createdAt);
                const ref = item.movement.reference ?? item.movement.description ?? '—';
                const tercero = maskTercero(item.movement.description);
                const valorBanco = fmtCop(item.movement.amountCop);
                const valorEsperado = item.matchedAmountCop ? fmtCop(item.matchedAmountCop) : '—';

                return (
                  <tr
                    key={item.id}
                    className={cn(
                      'border-b border-border last:border-0 transition-colors',
                      isBusy ? 'opacity-60' : 'hover:bg-muted/30',
                    )}
                  >
                    <td className="px-5 py-3.5 tabular-nums whitespace-nowrap text-muted-foreground">
                      {dateStr}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs max-w-[140px] truncate" title={ref}>
                      {ref}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs max-w-[120px] truncate" title={item.movement.description ?? ''}>
                      {tercero}
                    </td>
                    <td className="px-5 py-3.5 max-w-[160px] truncate text-muted-foreground" title={item.domain}>
                      {item.domain}
                    </td>
                    <td className="px-5 py-3.5 tabular-nums font-mono whitespace-nowrap">
                      {valorBanco}
                    </td>
                    <td className="px-5 py-3.5 tabular-nums font-mono whitespace-nowrap text-muted-foreground">
                      {valorEsperado}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
                          CASO_STYLES[caso] ?? 'bg-muted text-muted-foreground',
                        )}
                      >
                        {t(k(`caso_badge_${caso}`))}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <RowActions
                        item={item}
                        onConfirm={() => void handleConfirm(item.id)}
                        onReject={() => setRejectTarget(item.id)}
                        onReverse={() => void handleReverse(item.id)}
                        busy={isBusy}
                        t={t}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
    <PageGuard adminOnly>
      <ConciliacionContent />
    </PageGuard>
  );
}
