'use client';

/**
 * Lo que ve el AGENTE de conciliación — la otra mitad de `/ai/conciliacion/movimientos`.
 *
 * ── Por qué existe este componente ──────────────────────────────────────────
 *
 * Había DOS pantallas de conciliación bancaria y ninguna de las dos sobraba:
 *
 *   · `/cobros/extracto-bancario` (retirada) hablaba con el MONOLITO: subía el
 *     extracto en CSV **o Excel** de cualquier banco, lo cruzaba contra los
 *     cobros con saldo y conciliar EMITÍA UN RECIBO DE CAJA. Ahí está la plata.
 *   · esta pantalla habla con el MICRO: taxonomía de excepciones (parcial,
 *     duplicado, fuera de fecha, diferencia de valor), sugerencias del agente y
 *     `reverse` de lo ya confirmado. Confirmar acá NO emite recibo.
 *
 * Se midió antes de unificarlas: en la agencia de pruebas el ERP tiene 6 filas
 * en `movimientos_bancarios` y el micro 0 en `agent.bank_movements`. O sea: la
 * pantalla del agente miraba una tabla vacía mientras la plata vivía en el ERP.
 *
 * Por eso la página abre con el extracto del ERP (`<ExtractoBancario />`) y
 * este bloque queda debajo, con UNA regla: **si el micro tiene datos se
 * muestran; si no tiene, no se inventa nada**. Sin cola, sin resumen; el
 * bloque se pliega y sólo deja a mano la carga hacia el agente, que es la
 * única forma de sembrarlo desde la UI.
 *
 * Fail-soft, igual que el resumen de la Sala: si el micro contesta error o no
 * contesta, este bloque no se renderiza y la pantalla del ERP se basta sola.
 */

import { useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import {
  Bank,
  Info,
  UploadSimple,
  CheckCircle,
  XCircle,
  ArrowCounterClockwise,
  ArrowsClockwise,
  CaretRight,
  Robot,
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
import {
  useConciliacionQueue,
  type ConciliacionQueueItem,
  type IngestBank,
} from '@/lib/hooks/conciliacion/use-conciliacion-queue';

// ── Summary card config ─────────────────────────────────────────────────────

const RESUMEN_ITEMS = [
  { key: 'conciliados',       dot: 'bg-success',     field: 'conciliados'       },
  { key: 'parciales',         dot: 'bg-warning',     field: 'parciales'         },
  { key: 'duplicados',        dot: 'bg-fg-subtle',   field: 'duplicados'        },
  { key: 'noIdentificados',   dot: 'bg-fg-subtle',   field: 'noIdentificados'   },
  { key: 'diferencias',       dot: 'bg-danger',      field: 'diferencias'       },
  { key: 'fueraFecha',        dot: 'bg-fg-subtle',   field: 'fueraDeFecha'      },
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
    return <span className="text-caption text-fg-muted">—</span>;
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
            className="gap-1 text-success hover:bg-success-soft hover:text-success"
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
            className="gap-1 text-danger hover:bg-danger-soft hover:text-danger"
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
          className="gap-1 text-fg-muted"
        >
          {busy ? <Spinner size="xs" variant="current" /> : <ArrowCounterClockwise className="w-3.5 h-3.5" />}
          {t(k('actionReverse'))}
        </Button>
      )}
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

const COLUMNS = [
  'colFecha', 'colReferencia', 'colTercero', 'colContrato',
  'colValorBanco', 'colValorEsperado', 'colCaso', 'colAccion',
];

export function ConciliacionDelAgente() {
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
  // Statement upload state (hacia el MICRO, no hacia el ERP)
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

  /*
   * Fail-soft y sin inventar:
   *   · mientras carga  → nada (no se pinta un esqueleto de algo que puede no existir)
   *   · error del micro → nada; el extracto del ERP de arriba se basta solo
   * Con 0 movimientos el bloque SÍ se renderiza, pero plegado y sin resumen ni
   * tabla: sólo la carga hacia el agente, que es la única puerta para sembrarlo.
   */
  if (isLoading || error) return null;

  const tieneDatos = items.length > 0;

  return (
    <details
      className="group rounded-lg border border-border bg-surface"
      open={tieneDatos}
      data-testid="conciliacion-agente"
      data-con-datos={tieneDatos ? 'si' : 'no'}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 p-5 [&::-webkit-details-marker]:hidden">
        <CaretRight
          className="h-4 w-4 shrink-0 text-fg-muted transition-transform group-open:rotate-90"
          aria-hidden="true"
        />
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
          <Robot className="h-[18px] w-[18px] text-fg-muted" weight="duotone" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-fg">Lo que vio el agente</h2>
          <p className="mt-0.5 text-caption text-fg-muted">
            {tieneDatos
              ? `${total} ${total === 1 ? 'movimiento' : 'movimientos'} propios del agente, con su clasificación por caso. Confirmar acá no emite recibo de caja.`
              : 'El agente todavía no tiene movimientos propios. Podés cargarle un CSV de Bancolombia o Davivienda para que los clasifique.'}
          </p>
        </div>
      </summary>

      <div className="space-y-6 border-t border-border p-5">
        {/* Resumen por caso — sólo si hay datos: con la tabla vacía serían seis ceros inventados. */}
        {tieneDatos && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionLabel>{t(k('resumenLabel'))}</SectionLabel>
              <span className="text-caption text-fg-muted">
                {total} {t(k('totalMovimientos'))}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              {RESUMEN_ITEMS.map((item) => (
                <div key={item.key} className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', item.dot)} />
                    <span className="truncate text-caption text-fg-muted">
                      {t(k(`caso_${item.key}`))}
                    </span>
                  </div>
                  <p className="mt-1.5 text-2xl font-medium tabular-nums text-fg">
                    {summary[item.field as keyof typeof summary]}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Cola del agente — taxonomía, sugerencias y reverse. */}
        {tieneDatos && (
          <section className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <h3 className="text-sm font-semibold text-fg">{t(k('movimientosTitle'))}</h3>
                <p className="mt-0.5 text-caption text-fg-muted">{t(k('movimientosDesc'))}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void refetch()}
                title={t(k('refresh'))}
                aria-label={t(k('refresh'))}
                hideArrow
                className="text-fg-muted"
              >
                <ArrowsClockwise className="h-4 w-4" />
              </Button>
            </div>

              <Table>
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
                  {pageItems.map((item) => {
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
                        className={cn(isBusy && 'opacity-60')}
                      >
                        <TableCell className="whitespace-nowrap tabular-nums text-fg-muted">
                          {dateStr}
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate font-mono text-caption" title={ref}>
                          {ref}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={tercero}>
                          {tercero}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate text-fg-muted" title={item.domain}>
                          {item.domain}
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {valorBanco}
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums text-fg-muted">
                          {valorEsperado}
                        </TableCell>
                        <TableCell>
                          <Badge variant={CASO_VARIANT[caso] ?? 'neutral'}>
                            {t(k(`caso_badge_${caso}`))}
                          </Badge>
                        </TableCell>
                        <TableCell>
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
        )}

        {/*
          El banner «modo sombra» venía del encabezado de esta pantalla, donde
          quedaba arriba de todo y parecía hablar del extracto que emite
          recibos. Habla del MICRO: acá adentro dice la verdad.
        */}
        <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-muted p-3">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-fg-muted" weight="duotone" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-fg-muted">{t(k('m2BannerTitle'))}</p>
            <p className="mt-0.5 text-xs text-fg-muted">{t(k('m2BannerDesc'))}</p>
          </div>
        </div>

        {/*
          Cargar al AGENTE — POST /api/agency/{id}/conciliacion/ingest.
          Segundo lugar donde se sube un archivo, y a propósito: éste NO emite
          recibos, sólo le da de comer al clasificador del micro (CSV, y sólo
          Bancolombia o Davivienda). El de arriba —el del ERP— es el que mueve
          plata. Por eso vive acá adentro, plegado, y dice para qué es.
        */}
        <section className="space-y-3">
          <SectionLabel>Cargarle un extracto al agente</SectionLabel>
          <p className="max-w-2xl text-xs text-fg-muted">
            Sólo CSV de Bancolombia o Davivienda, y sólo para que el agente lo clasifique: esto no
            emite recibos de caja ni toca los cobros. Para conciliar de verdad usá el extracto de
            arriba.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-caption text-fg-muted">{t(k('uploadBankLabel'))}</span>
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

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label={t(k('uploadTitle'))}
            data-testid="conciliacion-agente-cargar"
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-surface-muted/50 p-6 text-center transition-colors hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60"
          >
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-md bg-primary-soft">
              {uploading ? (
                <Spinner size="md" variant="default" />
              ) : (
                <UploadSimple className="h-5 w-5 text-primary" weight="duotone" aria-hidden="true" />
              )}
            </div>
            <p className="text-body-sm font-medium text-fg">
              {uploading ? t(k('uploadProcessing')) : t(k('uploadTitle'))}
            </p>
            <p className="text-caption text-fg-muted">{t(k('uploadHint'))}</p>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileSelected}
          />
        </section>

        {!tieneDatos && (
          <p className="flex items-start gap-2 text-xs text-fg-muted">
            <Bank className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Cuando el agente tenga movimientos propios, acá aparecen su resumen por caso y la cola
            con confirmar, rechazar y revertir.
          </p>
        )}
      </div>

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
    </details>
  );
}
