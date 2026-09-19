'use client';

/**
 * Renovaciones — la tabla, con el mismo patrón que Contratos.
 *
 * Una tarjeta: encabezado (icono, título, qué hace el clic), los filtros
 * adentro, la tabla del DS y el vacío DENTRO de la tabla (fila con colSpan),
 * no un cartel suelto debajo de un encabezado flotante. Antes esta tabla
 * vivía sin tarjeta, con checkboxes y acciones masivas que abrían UN solo
 * cajón para N filas, y un vacío que no distinguía «no hay» de «el filtro no
 * encontró».
 *
 * Todo lo que se pinta viene del back: los conteos de los cajones se cuentan
 * sobre la lista real, los días los recalcula el back al leer.
 *
 * ── 🔴 Los tres arreglos del 19-09-2026 ─────────────────────────────────────
 *
 * **1. El menú de cinco puertas a la misma habitación.** La última celda tenía
 * un menú con «Ver detalle», «Notificar al inquilino», «Iniciar negociación»,
 * «Calcular IPC» y «Ver historial» — cinco rótulos distintos, cinco `onSelect`
 * distintos y **una sola cosa**: la página cableaba los cinco al mismo
 * `openWorkflow`. Abrías cualquiera y salía el mismo cajón. Y la fila entera
 * YA abría ese cajón, así que el menú no agregaba ni una acción: agregaba
 * cuatro promesas falsas y un clic de más.
 *
 * Un menú que ofrece cinco cosas y hace una es peor que no tener menú: enseña
 * que los rótulos de esta pantalla no significan nada. Se fue entero. En su
 * lugar va un `CaretRight` —el mismo de las listas de la casa— que dice lo
 * único cierto: **esta fila se abre**. Las acciones están donde siempre
 * estuvieron, adentro del cajón, que es el que sabe en qué paso va cada
 * renovación y cuál es la acción de ese paso.
 *
 * **2. No había buscador sobre 183 renovaciones.** En la agencia migrada hay
 * 139 contratos venciendo en los próximos 90 días. Sin buscador, llegar a uno
 * es pasar páginas. Busca por inmueble, dirección, inquilino, propietario y
 * NÚMERO DE CONTRATO, que es como la inmobiliaria nombra las cosas.
 *
 * **3. Los filtros estaban en dos renglones y en dos idiomas visuales**: el
 * estado como `Select` metido en el encabezado de la tarjeta, arriba a la
 * derecha, y los cajones de urgencia como `Chip`s en una franja aparte. Dos
 * controles que hacen lo mismo —achicar la lista— con dos formas distintas y
 * en dos lugares distintos. Ahora es UNA franja pegada a la tabla: los
 * cajones, el estado y el buscador, en ese orden, y debajo el alcance
 * («12 de 183») cuando hay algo puesto.
 */

import { useMemo, useState } from 'react';
import {
  SortAscending,
  SortDescending,
  ArrowsClockwise,
  CaretRight,
  MagnifyingGlass,
  Warning,
  TrendUp,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { SinDatos } from '@/components/estado/SinDatos';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { Chip } from '@leasefy/cadence';
import type { Renovacion, RenovacionStatus } from '@/lib/types/inmobiliaria';
import {
  formatCurrency,
  getRenovacionStatusColor,
  getRenovacionStatusLabel,
  getUrgencyColor,
} from '@/lib/types/inmobiliaria';

type SortField = 'propertyTitle' | 'tenantName' | 'propietarioName' | 'daysUntilExpiry' | 'status' | 'currentRent';
type SortDirection = 'asc' | 'desc';
/*
 * 🔴 19-09 (visto en el navegador, con las 28 de la agencia de QA): faltaba
 * `'90+'`. La franja decía «Todas 28» y al lado «Críticas 6 · Urgentes 8 ·
 * Próximas 6» —que suman 20—, porque ocho renovaciones caían en un cajón que
 * el tipo del back SÍ tiene (`urgencyBucket: '0-30' | '31-60' | '61-90' |
 * '90+'`) y la franja no dibujaba. Ocho filas que no se podían aislar y un
 * número que no cuadraba con los de al lado.
 */
type BucketFilter = 'all' | '0-30' | '31-60' | '61-90' | '90+';
type StatusFilter = 'all' | RenovacionStatus;

interface RenovacionesTableProps {
  data: Renovacion[];
  /** Mientras carga se pintan filas de esqueleto, no «no hay renovaciones». */
  isLoading?: boolean;
  /**
   * Lo que tiró la carga, si falló.
   *
   * Sin esto la tabla afirmaba «no hay renovaciones» sobre una petición
   * muerta: un fallo llegaba como lista vacía y se pintaba como cartera al
   * día. El vacío son DOS (nunca hubo / el filtro no encontró) y con red de
   * por medio son TRES.
   */
  error?: unknown;
  /** Para el botón de reintentar del estado de fallo. */
  onReintentar?: () => void;
  /**
   * Abrir el cajón de una renovación. UNO, no cinco.
   *
   * 🔴 Antes eran `onStartRenewal`, `onNotifyTenant`, `onViewDetails`,
   * `onCalculateIPC` y `onViewHistory`, y la página los cableaba a los cinco
   * al MISMO `openWorkflow`. Cinco props para una conducta es la forma en que
   * un menú termina ofreciendo cinco acciones que no existen.
   */
  onAbrir?: (renovacion: Renovacion) => void;
}

/**
 * «31 dic 2026», leyendo la parte `YYYY-MM-DD`: la fecha es un DATE que viaja
 * como medianoche UTC, y en Bogotá `new Date(iso)` cae al día anterior.
 */
function fechaCorta(iso: string | null | undefined, locale: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!partes) return '—';
  const d = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  return d
    .toLocaleDateString(locale === 'en' ? 'en-US' : 'es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    .replace(/ de /g, ' ')
    .replace(/\.$/, '');
}

/**
 * Lo que el buscador mira de una renovación.
 *
 * 🔴 El NÚMERO DE CONTRATO va primero a propósito: es como la inmobiliaria
 * nombra las cosas —«el 1686»—, y era el único dato de la fila por el que no
 * se podía buscar porque ni siquiera se mostraba.
 */
function textoBuscableDe(r: Renovacion): string {
  return [
    r.contractNumero,
    r.contractCode === null || r.contractCode === undefined ? null : String(r.contractCode),
    r.propertyTitle,
    r.propertyAddress,
    r.tenantName,
    r.propietarioName,
  ]
    .filter(Boolean)
    .join(' ');
}

/** Sin tildes y en minúsculas: nadie escribe «Ramírez» con tilde en un buscador. */
function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** «Contrato 1686» o «Contrato #4120» — lo que la inmobiliaria reconoce. */
function rotuloDelContrato(r: Renovacion): string | null {
  if (r.contractNumero) return `Contrato ${r.contractNumero}`;
  if (r.contractCode !== null && r.contractCode !== undefined) return `Contrato #${r.contractCode}`;
  return null;
}

const ORDEN_DE_ESTADO: Record<RenovacionStatus, number> = {
  terminated: 0,
  pending: 1,
  notified: 2,
  negotiating: 3,
  approved: 4,
  signed: 5,
  completed: 6,
};

const COLUMNAS = 9;

function FilasDeCarga() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i} className="border-b border-border last:border-0 animate-pulse">
          {Array.from({ length: COLUMNAS }).map((__, j) => (
            <td key={j} className="px-5 py-4">
              <div className="h-4 rounded bg-muted w-20" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function RenovacionesTable({
  data,
  isLoading = false,
  error,
  onReintentar,
  onAbrir,
}: RenovacionesTableProps) {
  const { t, locale } = useI18n();
  const [sortField, setSortField] = useState<SortField>('daysUntilExpiry');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [busqueda, setBusqueda] = useState('');

  const bucketCounts = useMemo(
    () => ({
      all: data.length,
      '0-30': data.filter((r) => r.urgencyBucket === '0-30').length,
      '31-60': data.filter((r) => r.urgencyBucket === '31-60').length,
      '61-90': data.filter((r) => r.urgencyBucket === '61-90').length,
      '90+': data.filter((r) => r.urgencyBucket === '90+').length,
    }),
    [data],
  );

  const filtradas = useMemo(() => {
    let result = [...data];
    if (bucketFilter !== 'all') {
      result = result.filter((item) => item.urgencyBucket === bucketFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter((item) => item.status === statusFilter);
    }
    const q = normalizar(busqueda);
    if (q !== '') {
      result = result.filter((item) => normalizar(textoBuscableDe(item)).includes(q));
    }
    result.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      switch (sortField) {
        case 'propertyTitle':
          aVal = a.propertyTitle.toLowerCase();
          bVal = b.propertyTitle.toLowerCase();
          break;
        case 'tenantName':
          aVal = (a.tenantName ?? '').toLowerCase();
          bVal = (b.tenantName ?? '').toLowerCase();
          break;
        case 'propietarioName':
          aVal = a.propietarioName.toLowerCase();
          bVal = b.propietarioName.toLowerCase();
          break;
        case 'daysUntilExpiry':
          aVal = a.daysUntilExpiry;
          bVal = b.daysUntilExpiry;
          break;
        case 'currentRent':
          aVal = a.currentRent;
          bVal = b.currentRent;
          break;
        case 'status':
          aVal = ORDEN_DE_ESTADO[a.status];
          bVal = ORDEN_DE_ESTADO[b.status];
          break;
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [data, bucketFilter, statusFilter, busqueda, sortField, sortDirection]);

  /*
   * Paginado de presentación: `useRenovaciones()` trae todas y crecen con la
   * cantidad de contratos por vencer. `resetKey` sólo con los filtros:
   * ordenar cambia el orden, no el conjunto.
   */
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(filtradas, { resetKey: `${bucketFilter}|${statusFilter}|${busqueda}` });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = sortDirection === 'asc' ? SortAscending : SortDescending;

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead className="whitespace-nowrap">
      {/*
        allowlist: disparador de orden — no hay primitiva en Cadence. El
        `<button>` no hereda las mayúsculas del `TH` (el navegador fuerza
        `text-transform: none` en los controles), así que las repite y toma el
        resto de la tipografía con `inherit`. Canónico: DispersionTable.
      */}
      <button
        type="button"
        onClick={() => handleSort(field)}
        className="flex items-center gap-2 font-[inherit] text-[inherit] uppercase tracking-[inherit] text-fg-subtle transition-colors hover:text-fg"
      >
        {children}
        {sortField === field && <SortIcon className="w-3.5 h-3.5" />}
      </button>
    </TableHead>
  );

  const hayFiltros =
    bucketFilter !== 'all' || statusFilter !== 'all' || busqueda.trim() !== '';
  const limpiarFiltros = () => {
    setBucketFilter('all');
    setStatusFilter('all');
    setBusqueda('');
  };

  const chip = (valor: BucketFilter, etiqueta: string, tono: string) => (
    <Chip selected={bucketFilter === valor} onClick={() => setBucketFilter(valor)}>
      {etiqueta}
      <span
        className={cn(
          'ml-1.5 px-1.5 py-0.5 rounded text-xs tabular-nums',
          bucketFilter === valor && valor !== 'all' ? tono : 'bg-muted',
        )}
      >
        {bucketCounts[valor]}
      </span>
    </Chip>
  );

  return (
    <section
      className="rounded-lg border border-border bg-card overflow-hidden"
      data-testid="renovaciones-tabla"
    >
      {/* Encabezado de la tarjeta — el mismo de Contratos. Sin filtros
          adentro: el `Select` de estado vivía acá arriba a la derecha y los
          cajones abajo en otra franja, o sea dos controles que hacen lo mismo
          en dos lugares y con dos formas. Ahora los filtros están todos en la
          franja de abajo, pegados a la tabla. */}
      <div className="flex flex-col gap-3 p-5 border-b border-border sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-muted flex items-center justify-center flex-shrink-0">
            <ArrowsClockwise className="w-[18px] h-[18px] text-fg-muted" weight="duotone" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {t('inmobiliaria.nav.renovaciones')}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Toca una renovación para abrir su cajón: ahí se manda la propuesta,
              se registra la respuesta del inquilino y se sube el contrato firmado.
            </p>
          </div>
        </div>
      </div>

      {/* 🔴 UNA franja de filtros, pegada a la tabla: los cajones de urgencia
          (0-30 críticas, 31-60 urgentes, 61-90 próximas — el preaviso de la
          Ley 820 son 90 días), el estado, y el buscador. */}
      <div className="flex flex-col gap-3 border-b border-border px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {chip('all', t('inmobiliaria.finance.renewals.all'), 'bg-muted')}
          {chip('0-30', t('inmobiliaria.finance.renewals.critical'), 'bg-danger-soft text-danger')}
          {chip('31-60', t('inmobiliaria.finance.renewals.urgent'), 'bg-warning-soft text-warning')}
          {chip('61-90', t('inmobiliaria.finance.renewals.upcoming'), 'bg-primary-soft text-primary')}
          {/* El cuarto, para que los tres de al lado sumen lo que dice «Todas».
              Sólo aparece si de verdad hay alguna: en la mayoría de las
              inmobiliarias la lista se corta en 90 días y un chip en cero
              sería una puerta a un cuarto vacío. */}
          {bucketCounts['90+'] > 0
            ? chip('90+', 'Más de 90 días', 'bg-muted text-muted-foreground')
            : null}
          <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-border lg:block" />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger
              className="h-9 w-auto gap-2 text-sm font-medium"
              aria-label={t('inmobiliaria.finance.renewals.statusLabel')}
              data-testid="filtro-estado"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('inmobiliaria.finance.renewals.allStatuses')}</SelectItem>
              <SelectItem value="pending">{t('inmobiliaria.finance.renewals.statusPending')}</SelectItem>
              <SelectItem value="notified">{t('inmobiliaria.finance.renewals.statusNotified')}</SelectItem>
              <SelectItem value="negotiating">{t('inmobiliaria.finance.renewals.statusNegotiating')}</SelectItem>
              <SelectItem value="approved">{t('inmobiliaria.finance.renewals.statusApproved')}</SelectItem>
              <SelectItem value="signed">{t('inmobiliaria.finance.renewals.statusSigned')}</SelectItem>
              <SelectItem value="completed">{t('inmobiliaria.finance.renewals.statusCompleted')}</SelectItem>
              <SelectItem value="terminated">{t('inmobiliaria.finance.renewals.statusTerminated')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="relative w-full lg:max-w-xs">
          <MagnifyingGlass
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
            aria-hidden="true"
          />
          <Input
            className="pl-9"
            placeholder="Contrato, inmueble, inquilino o propietario"
            aria-label="Buscar renovaciones"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            data-testid="buscar-renovaciones"
          />
        </div>
      </div>

      {/* El alcance, sólo cuando hay algo puesto: la lista de arriba dice 183
          y la tabla 12, y los dos números tienen que poder conciliarse. */}
      {hayFiltros && (
        <p
          className="border-b border-border px-5 py-2 text-xs text-fg-muted"
          data-testid="alcance-de-renovaciones"
        >
          {filtradas.length} de {data.length}{' '}
          {data.length === 1 ? 'renovación' : 'renovaciones'}.{' '}
          <button
            type="button"
            onClick={limpiarFiltros}
            className="font-medium text-primary underline-offset-4 hover:underline"
            data-testid="limpiar-filtros-renovaciones"
          >
            Quitar los filtros
          </button>
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader field="propertyTitle">{t('inmobiliaria.finance.renewals.property')}</SortableHeader>
            <SortableHeader field="tenantName">{t('inmobiliaria.finance.renewals.tenant')}</SortableHeader>
            <SortableHeader field="propietarioName">{t('inmobiliaria.finance.renewals.owner')}</SortableHeader>
            <TableHead className="whitespace-nowrap">{t('inmobiliaria.finance.renewals.expiration')}</TableHead>
            <SortableHeader field="daysUntilExpiry">{t('inmobiliaria.finance.renewals.days')}</SortableHeader>
            <SortableHeader field="currentRent">{t('inmobiliaria.finance.renewals.currentRent')}</SortableHeader>
            <TableHead className="whitespace-nowrap">{t('inmobiliaria.finance.renewals.proposed')}</TableHead>
            <SortableHeader field="status">{t('inmobiliaria.finance.renewals.status')}</SortableHeader>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && data.length === 0 && <FilasDeCarga />}

          {/* Falló → vacío, en ese orden: si la petición murió, `data` llega
              vacía y pintar «no hay renovaciones» sería afirmar que la cartera
              está al día sin haberlo podido verificar. */}
          {!isLoading && Boolean(error) && (
            <TableRow>
              <TableCell colSpan={COLUMNAS} className="p-0">
                <FalloDeCarga error={error} queEs="las renovaciones" onReintentar={onReintentar} />
              </TableCell>
            </TableRow>
          )}

          {!isLoading && !error && filtradas.length === 0 && (
            <TableRow>
              <TableCell colSpan={COLUMNAS} className="p-0">
                <SinDatos
                  queSon="renovaciones"
                  icono={ArrowsClockwise}
                  hayFiltros={hayFiltros}
                  onLimpiarFiltros={limpiarFiltros}
                  titulo="Sin renovaciones en curso"
                  descripcion="Cuando un contrato entre en sus últimos 90 días, aparece acá solo, con su inquilino y su canon."
                />
              </TableCell>
            </TableRow>
          )}

          {pageItems.map((item) => {
            const esCritica = item.urgencyBucket === '0-30';
            const propuesto = item.negotiatedRent || item.proposedRent;
            const incremento =
              propuesto && item.currentRent > 0
                ? (((propuesto - item.currentRent) / item.currentRent) * 100).toFixed(1)
                : null;

            return (
              <TableRow
                key={item.id}
                onClick={() => onAbrir?.(item)}
                className={cn(
                  'border-b border-border last:border-0 transition-colors',
                  onAbrir && 'cursor-pointer hover:bg-muted/40',
                )}
                data-testid={`renovacion-${item.id}`}
              >
                <TableCell className="px-5 py-4 max-w-[240px]">
                  <p className="font-medium text-foreground truncate">{item.propertyTitle}</p>
                  {/* 🔴 El número del contrato: es como la inmobiliaria nombra
                      las cosas («el 1686») y era el único dato de la fila por
                      el que no se podía buscar porque no se mostraba. */}
                  <p className="text-xs text-muted-foreground truncate">
                    {item.propertyAddress}
                    {rotuloDelContrato(item) ? ` · ${rotuloDelContrato(item)}` : ''}
                  </p>
                </TableCell>

                <TableCell className="px-5 py-4 max-w-[200px]">
                  <p className="text-foreground truncate">{item.tenantName || '—'}</p>
                  {item.tenantPhone ? (
                    <p className="text-xs text-muted-foreground truncate">{item.tenantPhone}</p>
                  ) : null}
                </TableCell>

                <TableCell className="px-5 py-4 max-w-[160px]">
                  <span className="text-foreground truncate block">{item.propietarioName}</span>
                </TableCell>

                <TableCell className="px-5 py-4 whitespace-nowrap text-muted-foreground tabular-nums">
                  {fechaCorta(item.leaseEndDate, locale)}
                </TableCell>

                <TableCell className="px-5 py-4 whitespace-nowrap">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium tabular-nums',
                      getUrgencyColor(item.urgencyBucket),
                    )}
                  >
                    {esCritica && <Warning className="w-3.5 h-3.5" weight="fill" />}
                    {item.daysUntilExpiry} {item.daysUntilExpiry === 1 ? 'día' : 'días'}
                  </span>
                </TableCell>

                <TableCell className="px-5 py-4 whitespace-nowrap tabular-nums font-mono text-foreground">
                  {formatCurrency(item.currentRent)}
                </TableCell>

                <TableCell className="px-5 py-4 whitespace-nowrap tabular-nums font-mono">
                  {propuesto ? (
                    <div className="flex flex-col">
                      <span className="text-foreground">{formatCurrency(propuesto)}</span>
                      {incremento ? (
                        <span className="inline-flex items-center gap-1 text-xs text-success font-sans">
                          <TrendUp className="w-3 h-3" />
                          {Number(incremento) >= 0 ? '+' : ''}
                          {incremento}%
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell className="px-5 py-4 whitespace-nowrap">
                  <span
                    className={cn(
                      'inline-flex px-2.5 py-1 rounded-full text-xs font-medium',
                      getRenovacionStatusColor(item.status),
                    )}
                  >
                    {getRenovacionStatusLabel(item.status)}
                  </span>
                </TableCell>

                {/* 🔴 Acá vivía un menú con CINCO items —«Ver detalle»,
                    «Notificar al inquilino», «Iniciar negociación», «Calcular
                    IPC», «Ver historial»— que la página cableaba a los cinco
                    al MISMO `openWorkflow`: cinco rótulos, una conducta. Y la
                    fila entera ya abría ese cajón. Queda lo único cierto:
                    esta fila se abre. */}
                <TableCell className="px-3 py-4 text-right">
                  <CaretRight
                    className="ml-auto h-4 w-4 text-fg-subtle"
                    aria-hidden="true"
                    data-testid={`abrir-${item.id}`}
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
            total={total}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </section>
  );
}

export default RenovacionesTable;
