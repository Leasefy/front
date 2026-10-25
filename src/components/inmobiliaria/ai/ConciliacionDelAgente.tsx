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

import { fechaCorta } from '@/lib/fechas/fecha-de-la-casa';
import { useRef, useState, type ChangeEvent } from 'react';
import { toast } from '@/components/ui/toast';
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
import { SegmentedControl, Badge, Presence } from '@leasefy/cadence';
// El Dialog del ADAPTADOR local (z del panel y la ✕ del producto), no el de Cadence pelado.
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { leerPlanilla } from '@/lib/importar/leer-planilla';
import {
  CAMPOS_DE_EXTRACTO,
  ajustarMapeoDeExtracto,
  armarFilasDeExtracto,
  faltantesDelMapeo,
} from '@/lib/cobros/extracto-bancario';
import { csvParaElAgente } from '@/lib/cobros/extracto-para-el-agente';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
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
import { plataEnPantalla } from '@/lib/plata/escribir-plata';
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras';

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
  return plataEnPantalla(localeDeLasCifras, {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);
}

/** Ronda 30: la fecha corta de la casa («16 oct 2026»; antes DD/MM/AAAA). */
function fmtDate(iso: string | null): string {
  return fechaCorta(iso);
}

// ── Reject dialog ───────────────────────────────────────────────────────────

/** Lo que devuelve el rechazo: si el back lo confirmó y, si no, el error entero. */
interface ResultadoDelRechazo {
  ok: boolean;
  fallo?: unknown;
}

interface RejectDialogProps {
  /** `null` = cerrado. Antes el padre lo montaba con `{rejectTarget && …}`. */
  matchId: string | null;
  /**
   * Manda el rechazo. El diálogo se queda abierto hasta que el back lo
   * confirme: si falla, el motivo escrito sigue ahí y el error se ve.
   */
  onConfirm: (reason: string) => Promise<ResultadoDelRechazo>;
  onCancel: () => void;
  t: (k: string) => string;
  busy: boolean;
}

/** El id del motivo: el foco y el `aria-describedby` de su error. */
const ID_DEL_MOTIVO = 'rechazo-del-cruce-motivo';

/**
 * El envoltorio: sólo es dueño del `Dialog`.
 *
 * Antes el padre lo montaba con `{rejectTarget && <RejectDialog …>}` y acá
 * dentro el `open` estaba fijo — o sea que cerrar era desmontarlo de un tirón
 * y Radix se quedaba sin nada que animar. Ahora vive siempre y el `open` manda.
 *
 * El motivo escrito NO se conserva a propósito: vive en el cuerpo, que Radix
 * desmonta al terminar la salida, así que la próxima vez el textarea abre
 * vacío —como cuando el padre lo remontaba— pero sin vaciarse a la vista
 * mientras el diálogo se va.
 *
 * 02-10-2026 · Y no se va hasta que el back confirme. Antes se cerraba al
 * apretar «Rechazar», ANTES de mandar: si el micro decía que no, el motivo
 * escrito se perdía y el error quedaba en un toast detrás de una pantalla que
 * ya no tenía el diálogo. Ahora se queda abierto con el botón ocupado; si
 * falla, el motivo sigue ahí y el error se ve en el diálogo: bajo el motivo si
 * es de ese campo, y si no, la frase del traductor.
 */
function RejectDialog({ matchId, onConfirm, onCancel, t, busy }: RejectDialogProps) {
  return (
    <Dialog open={Boolean(matchId)} onOpenChange={(o) => { if (!o && !busy) onCancel(); }}>
      {/* 🔴 `DialogContent` reparte a sus hijos DIRECTOS en cabecera / cuerpo /
          pie (`repartirHijos` en `ui/dialog.tsx`). Un componente interpuesto
          hace que el `DialogHeader` deje de verse como cabecera —título chico,
          con el padding del cuerpo— y que el Content pinte SU aspa además de la
          de la cabecera: dos ✕. Por eso el `DialogContent` vive adentro. */}
      <CuerpoDelRechazo onConfirm={onConfirm} onCancel={onCancel} t={t} busy={busy} />
    </Dialog>
  );
}

function CuerpoDelRechazo({
  onConfirm,
  onCancel,
  t,
  busy,
}: Omit<RejectDialogProps, 'matchId'>) {
  const [reason, setReason] = useState('');
  /** Lo que el micro dijo del motivo (un 400 con `campos`): va debajo del motivo. */
  const [errorDelMotivo, setErrorDelMotivo] = useState<string | null>(null);
  /** Lo demás (un 409, un 5xx con su referencia, la red), por el traductor. */
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const k = (s: string) => `inmobiliaria.conciliacion.${s}`;

  async function confirmar() {
    const motivo = reason.trim();
    if (!motivo || busy) return;
    setErrorDelMotivo(null);
    setErrorGeneral(null);
    const resultado = await onConfirm(motivo);
    if (resultado.ok) return;
    const reparto = repartirErroresDelServidor<'reason'>(resultado.fallo, {
      campos: ['reason'],
      porDefecto: 'No se pudo rechazar el cruce.',
      accion: 'rechazar el cruce',
    });
    setErrorDelMotivo(reparto.porCampo.reason ?? null);
    setErrorGeneral(reparto.sueltos.length > 0 ? reparto.sueltos.join(' · ') : null);
    if (reparto.porCampo.reason) {
      requestAnimationFrame(() => document.getElementById(ID_DEL_MOTIVO)?.focus());
    }
  }

  return (
    <DialogContent variant="destructive" icon={<XCircle weight="bold" />} size="sm">
        <DialogHeader>
          <DialogTitle>{t(k('rejectDialogTitle'))}</DialogTitle>
          <DialogDescription>{t(k('rejectDialogDesc'))}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Textarea
            id={ID_DEL_MOTIVO}
            className="h-24 resize-none"
            placeholder={t(k('rejectReasonPlaceholder'))}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setErrorDelMotivo(null);
            }}
            aria-label={t(k('rejectReasonPlaceholder'))}
            {...(errorDelMotivo
              ? { 'aria-describedby': `${ID_DEL_MOTIVO}-error`, 'aria-invalid': true as const }
              : {})}
          />
          <ErrorDelCampo id={`${ID_DEL_MOTIVO}-error`} mensaje={errorDelMotivo} className="mt-0" />
          <Presence
            as="p"
            show={Boolean(errorGeneral)}
            role="alert"
            className="text-caption text-danger"
            data-testid="rechazo-del-cruce-error"
          >
            {errorGeneral}
          </Presence>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy} hideArrow>
            {t(k('cancel'))}
          </Button>
          <Button
            variant="destructive"
            onClick={() => void confirmar()}
            disabled={!reason.trim() || busy}
            isLoading={busy}
            hideArrow
            data-testid="rechazo-del-cruce-confirmar"
          >
            {t(k('rejectConfirm'))}
          </Button>
        </DialogFooter>
    </DialogContent>
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
  // Ojo el orden: con los dos en null, `busyRow === rejectTarget` sería cierto
  // y el diálogo cerrado se creería ocupado.
  const rechazoEnCurso = rejectTarget !== null && busyRow === rejectTarget;
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
      // La descripción dice qué pasó, con la regla de oro (antes: el código
      // del micro o el status crudo).
      toast.error(t(k('toastActionError')), {
        description: mensajeParaLaPersona(result.fallo, {
          porDefecto: 'No se pudo confirmar el cruce.',
          accion: 'confirmar el cruce',
        }),
      });
    }
  }

  /**
   * El diálogo se queda abierto (y ocupado) hasta que el back confirme. Si
   * falla, NO se cierra: el motivo escrito sigue ahí y el diálogo dice qué
   * pasó (`CuerpoDelRechazo`).
   */
  async function handleRejectSubmit(reason: string): Promise<ResultadoDelRechazo> {
    if (!rejectTarget) return { ok: false };
    const matchId = rejectTarget;
    setBusyRow(matchId);
    const result = await rejectMatch(matchId, reason);
    setBusyRow(null);
    if (result.ok) {
      setRejectTarget(null);
      toast.success(t(k('toastRejected')));
    }
    return result;
  }

  async function handleReverse(matchId: string) {
    setBusyRow(matchId);
    const result = await reverseMatch(matchId);
    setBusyRow(null);
    if (result.ok) {
      toast.success(t(k('toastReversed')));
    } else {
      toast.error(t(k('toastActionError')), {
        description: mensajeParaLaPersona(result.fallo, {
          porDefecto: 'No se pudo revertir el cruce.',
          accion: 'revertir el cruce',
        }),
      });
    }
  }

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so re-selecting the same file fires onChange
    if (!file) return;

    // 🔴 20-10-2026 (Nico: «igual para conciliación»): el extracto se lee COMO
    // VENGA (Excel o CSV, cualquier orden de columnas, con la cuenta arriba) y
    // se reescribe en el formato del banco que el micro lee por posición.
    setUploading(true);
    let csv: string;
    let descartadas = 0;
    try {
      const leida = await leerPlanilla(file, CAMPOS_DE_EXTRACTO);
      const mapeo = ajustarMapeoDeExtracto(leida.mapeo);
      const faltan = faltantesDelMapeo(mapeo);
      if (faltan.length > 0) {
        setUploading(false);
        toast.error(t(k('uploadError')), {
          description: `No encontramos ${faltan.join(', ').toLowerCase()} en el archivo. Usa «Cargar extracto» arriba para elegir las columnas a mano.`,
        });
        return;
      }
      const armadas = armarFilasDeExtracto(leida.filas, mapeo);
      descartadas = armadas.descartadas.length;
      if (armadas.filas.length === 0) {
        setUploading(false);
        toast.error(t(k('uploadError')), { description: t(k('uploadEmptyFile')) });
        return;
      }
      csv = csvParaElAgente(armadas.filas, bank);
    } catch (error) {
      setUploading(false);
      toast.error(t(k('uploadError')), {
        description: mensajeParaLaPersona(error, { porDefecto: 'No se pudo leer el archivo.' }),
      });
      return;
    }

    const result = await ingestStatement(bank, csv);
    setUploading(false);
    if (result.ok && descartadas > 0) {
      toast.warning(
        descartadas === 1
          ? '1 línea del archivo no se pudo leer (sin fecha o sin valor) y no se mandó.'
          : `${descartadas} líneas del archivo no se pudieron leer (sin fecha o sin valor) y no se mandaron.`,
      );
    }

    if (result.ok) {
      toast.success(t(k('uploadSuccess')), {
        description: t(k('uploadSuccessDesc'), {
          created: result.created ?? 0,
          skipped: result.skipped ?? 0,
        }),
      });
    } else {
      toast.error(t(k('uploadError')), {
        description: mensajeParaLaPersona(result.fallo, {
          porDefecto: 'El agente no recibió el extracto.',
          accion: 'cargar el extracto',
        }),
      });
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
          <h2 className="text-base font-medium text-fg">Lo que vio el agente</h2>
          <p className="mt-0.5 text-caption text-fg-muted">
            {tieneDatos
              ? `${total} ${total === 1 ? 'movimiento' : 'movimientos'} propios del agente, con su clasificación por caso. Confirmar aquí no emite recibo de caja.`
              : 'El agente todavía no tiene movimientos propios. Puedes cargarle un CSV de Bancolombia o Davivienda para que los clasifique.'}
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
                <h3 className="text-sm font-medium text-fg">{t(k('movimientosTitle'))}</h3>
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
          recibos. Habla del MICRO: aquí adentro dice la verdad.
        */}
        <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-muted p-3">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-fg-muted" weight="duotone" aria-hidden="true" />
          <div>
            <p className="text-caption font-medium text-fg-muted">{t(k('m2BannerTitle'))}</p>
            <p className="mt-0.5 text-caption text-fg-muted">{t(k('m2BannerDesc'))}</p>
          </div>
        </div>

        {/*
          Cargar al AGENTE — POST /api/agency/{id}/conciliacion/ingest.
          Segundo lugar donde se sube un archivo, y a propósito: éste NO emite
          recibos, sólo le da de comer al clasificador del micro (CSV, y sólo
          Bancolombia o Davivienda). El de arriba —el del ERP— es el que mueve
          plata. Por eso vive aquí adentro, plegado, y dice para qué es.
        */}
        <section className="space-y-3">
          <SectionLabel>Cargarle un extracto al agente</SectionLabel>
          <p className="max-w-2xl text-caption text-fg-muted">
            Sólo CSV de Bancolombia o Davivienda, y sólo para que el agente lo clasifique: esto no
            emite recibos de caja ni toca los cobros. Para conciliar de verdad usa el extracto de
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
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-surface-muted/50 p-6 text-center transition-colors hover:border-border-strong hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60"
          >
            <div className="mb-1 flex h-10 w-10 items-center justify-center">
              {uploading ? (
                <Spinner size="md" variant="default" />
              ) : (
                <UploadSimple className="h-6 w-6 text-fg-muted" aria-hidden="true" />
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
            accept=".csv,.txt,.xlsx,.xls,.ods,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={handleFileSelected}
          />
        </section>

        {!tieneDatos && (
          <p className="flex items-start gap-2 text-caption text-fg-muted">
            <Bank className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Cuando el agente tenga movimientos propios, aquí aparecen su resumen por caso y la cola
            con confirmar, rechazar y revertir.
          </p>
        )}
      </div>

      {/* Reject dialog — montado siempre: si lo montara `{rejectTarget && …}`
          cerrar sería borrarlo del árbol y no habría animación de salida. */}
      <RejectDialog
        matchId={rejectTarget}
        onConfirm={handleRejectSubmit}
        onCancel={() => setRejectTarget(null)}
        t={t}
        busy={rechazoEnCurso}
      />
    </details>
  );
}
