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
 */

import { useMemo, useState } from 'react';
import {
  SortAscending,
  SortDescending,
  DotsThree,
  Eye,
  ArrowsClockwise,
  Warning,
  Funnel,
  Bell,
  Calculator,
  ClockCounterClockwise,
  TrendUp,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
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
import {
  DropdownList,
  DropdownListTrigger,
  DropdownListContent,
  DropdownListItem,
  DropdownListSeparator,
} from '@/components/ui/dropdown-menu';
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
type BucketFilter = 'all' | '0-30' | '31-60' | '61-90';
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
  onStartRenewal?: (renovacion: Renovacion) => void;
  onNotifyTenant?: (renovacion: Renovacion) => void;
  onViewDetails?: (renovacion: Renovacion) => void;
  onCalculateIPC?: (renovacion: Renovacion) => void;
  onViewHistory?: (renovacion: Renovacion) => void;
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
  onStartRenewal,
  onNotifyTenant,
  onViewDetails,
  onCalculateIPC,
  onViewHistory,
}: RenovacionesTableProps) {
  const { t, locale } = useI18n();
  const [sortField, setSortField] = useState<SortField>('daysUntilExpiry');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const bucketCounts = useMemo(
    () => ({
      all: data.length,
      '0-30': data.filter((r) => r.urgencyBucket === '0-30').length,
      '31-60': data.filter((r) => r.urgencyBucket === '31-60').length,
      '61-90': data.filter((r) => r.urgencyBucket === '61-90').length,
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
  }, [data, bucketFilter, statusFilter, sortField, sortDirection]);

  /*
   * Paginado de presentación: `useRenovaciones()` trae todas y crecen con la
   * cantidad de contratos por vencer. `resetKey` sólo con los filtros:
   * ordenar cambia el orden, no el conjunto.
   */
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(filtradas, { resetKey: `${bucketFilter}|${statusFilter}` });

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

  const hayFiltros = bucketFilter !== 'all' || statusFilter !== 'all';
  const limpiarFiltros = () => {
    setBucketFilter('all');
    setStatusFilter('all');
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
      {/* Encabezado de la tarjeta — el mismo de Contratos. */}
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
              Toca una renovación para ver el detalle y avanzarla.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Funnel className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {t('inmobiliaria.finance.renewals.statusLabel')}:
          </span>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-9 w-auto gap-2 text-sm font-medium" data-testid="filtro-estado">
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
      </div>

      {/* Los cajones de urgencia: 0-30 críticas, 31-60 urgentes, 61-90 próximas
          (el preaviso de la Ley 820 son 90 días). */}
      <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-border">
        {chip('all', t('inmobiliaria.finance.renewals.all'), 'bg-muted')}
        {chip('0-30', t('inmobiliaria.finance.renewals.critical'), 'bg-danger-soft text-danger')}
        {chip('31-60', t('inmobiliaria.finance.renewals.urgent'), 'bg-warning-soft text-warning')}
        {chip('61-90', t('inmobiliaria.finance.renewals.upcoming'), 'bg-primary-soft text-primary')}
      </div>

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
                onClick={() => onViewDetails?.(item)}
                className={cn(
                  'border-b border-border last:border-0 transition-colors',
                  onViewDetails && 'cursor-pointer hover:bg-muted/40',
                )}
                data-testid={`renovacion-${item.id}`}
              >
                <TableCell className="px-5 py-4 max-w-[240px]">
                  <p className="font-medium text-foreground truncate">{item.propertyTitle}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.propertyAddress}</p>
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

                <TableCell className="px-3 py-4 text-right">
                  <DropdownList>
                    <DropdownListTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        hideArrow
                        onClick={(e) => e.stopPropagation()}
                        className="h-8 w-8 text-muted-foreground"
                        aria-label="Acciones"
                      >
                        <DotsThree className="w-5 h-5" weight="bold" />
                      </Button>
                    </DropdownListTrigger>
                    <DropdownListContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
                      {onViewDetails && (
                        <DropdownListItem
                          onSelect={() => onViewDetails(item)}
                          className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          <span>{t('inmobiliaria.finance.renewals.viewDetails')}</span>
                        </DropdownListItem>
                      )}
                      {onNotifyTenant && item.status === 'pending' && (
                        <DropdownListItem
                          onSelect={() => onNotifyTenant(item)}
                          className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                        >
                          <Bell className="w-4 h-4" />
                          <span>{t('inmobiliaria.finance.renewals.notifyTenant')}</span>
                        </DropdownListItem>
                      )}
                      {onStartRenewal && ['pending', 'notified'].includes(item.status) && (
                        <>
                          <DropdownListSeparator />
                          <DropdownListItem
                            onSelect={() => onStartRenewal(item)}
                            className="flex items-center gap-3 px-3 py-2 cursor-pointer text-primary focus:text-primary"
                          >
                            <ArrowsClockwise className="w-4 h-4" />
                            <span>{t('inmobiliaria.finance.renewals.startNegotiation')}</span>
                          </DropdownListItem>
                        </>
                      )}
                      {onCalculateIPC && (
                        <DropdownListItem
                          onSelect={() => onCalculateIPC(item)}
                          className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                        >
                          <Calculator className="w-4 h-4" />
                          <span>{t('inmobiliaria.finance.renewals.calculateIPC')}</span>
                        </DropdownListItem>
                      )}
                      {onViewHistory && (
                        <DropdownListItem
                          onSelect={() => onViewHistory(item)}
                          className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                        >
                          <ClockCounterClockwise className="w-4 h-4" />
                          <span>{t('inmobiliaria.finance.renewals.viewHistory')}</span>
                        </DropdownListItem>
                      )}
                    </DropdownListContent>
                  </DropdownList>
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
