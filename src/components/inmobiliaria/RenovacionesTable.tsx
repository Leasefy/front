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

import { CasillaDeLaFila, CasillaDeLaPagina } from '@/components/masivas/CasillasDeLaTabla';
import { useMemo, useState } from 'react';
import {
  SortAscending,
  SortDescending,
  ArrowsClockwise,
  CaretRight,
  MagnifyingGlass,
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
  TableBodyAnimado,
  TableRowAnimada,
} from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { Presence } from '@leasefy/cadence';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { textoLegible } from '@/lib/renovaciones/texto-legible';
import { diasParaVencer } from '@/lib/renovaciones/dias-para-vencer';
import type { ReactNode } from 'react';

import type { Renovacion, RenovacionStatus } from '@/lib/types/inmobiliaria';
import {
  formatCurrency,
  getRenovacionStatusColor,
  getRenovacionStatusLabel,
} from '@/lib/types/inmobiliaria';

/** Una renovación cerrada ya no espera nada: sale de «Todos los estados». */
export function estaCerrada(status: string): boolean {
  return status === 'completed' || status === 'terminated';
}

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
  /**
   * El último renglón de la tarjeta, antes de la paginación: las acciones
   * masivas (revisora r25: «Marca renovaciones…» quedaba suelto debajo de la
   * tabla; en Contratos va en su pie).
   */
  pie?: ReactNode;
  /** Qué día es hoy, para contar los días que faltan; sólo las pruebas lo fijan. */
  hoy?: Date;
  /** Acciones masivas (Nico, 10-10-2026): con esto la tabla pinta las casillas. */
  marcadas?: ReadonlySet<string>;
  onMarcar?: (ids: readonly string[], si: boolean) => void;
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

const COLUMNAS = 6;

/**
 * B1 (revisora r25): «vence hoy» salía también en los contratos que vencieron
 * hace tres días (`<= 0`). Hoy es hoy; antes, «venció hace N días».
 */
export function cuantoFalta(dias: number): string {
  if (dias === 0) return 'vence hoy';
  if (dias < 0) {
    const n = Math.abs(dias);
    return `venció hace ${n} ${n === 1 ? 'día' : 'días'}`;
  }
  return `en ${dias} ${dias === 1 ? 'día' : 'días'}`;
}

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
  marcadas,
  onMarcar,
  pie,
  hoy,
}: RenovacionesTableProps) {
  const conCasillas = Boolean(marcadas && onMarcar);
  const { t, locale } = useI18n();
  const [sortField, setSortField] = useState<SortField>('daysUntilExpiry');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [busqueda, setBusqueda] = useState('');

  /*
   * CONTR-9 (QA de agentes 17-10): «sigue acá hasta que se cierra». Con «Todos
   * los estados» sólo las abiertas, y los cajones cuentan ésas; una cerrada
   * (completada, no renueva) se ve eligiendo su estado.
   */
  const visibles = useMemo(
    () => (statusFilter === 'all' ? data.filter((r) => !estaCerrada(r.status)) : data),
    [data, statusFilter],
  );

  const bucketCounts = useMemo(
    () => ({
      all: visibles.length,
      '0-30': visibles.filter((r) => r.urgencyBucket === '0-30').length,
      '31-60': visibles.filter((r) => r.urgencyBucket === '31-60').length,
      '61-90': visibles.filter((r) => r.urgencyBucket === '61-90').length,
      '90+': visibles.filter((r) => r.urgencyBucket === '90+').length,
    }),
    [visibles],
  );

  const filtradas = useMemo(() => {
    let result = [...visibles];
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
          aVal = diasParaVencer(a, hoy);
          bVal = diasParaVencer(b, hoy);
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
  }, [visibles, bucketFilter, statusFilter, busqueda, sortField, sortDirection, hoy]);

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

  const SortableHeader = ({ field, children, derecha = false }: { field: SortField; children: React.ReactNode; derecha?: boolean }) => (
    <TableHead className={cn('whitespace-nowrap', derecha && 'text-right')}>
      {/*
        allowlist: disparador de orden — no hay primitiva en Cadence. El
        `<button>` no hereda las mayúsculas del `TH` (el navegador fuerza
        `text-transform: none` en los controles), así que las repite y toma el
        resto de la tipografía con `inherit`. Canónico: DispersionTable.
      */}
      <button
        type="button"
        onClick={() => handleSort(field)}
        className={cn(
          'flex items-center gap-2 font-[inherit] text-[inherit] uppercase tracking-[inherit] text-fg-subtle transition-colors hover:text-fg',
          derecha && 'ml-auto flex-row-reverse',
        )}
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

  /*
   * Revisora r25 (T2): las cubetas eran chips rectangulares de colores hechos a
   * mano, con «Próximas» en azul. Ahora son las pestañas de estado de la casa:
   * conteo en mono, sin ceros (salvo «Todas») y el punto ámbar en «Críticas».
   */
  const pestanasDeUrgencia = [
    { valor: 'all' as const, etiqueta: t('inmobiliaria.finance.renewals.all'), cuantos: bucketCounts.all, fija: true },
    { valor: '0-30' as const, etiqueta: t('inmobiliaria.finance.renewals.critical'), cuantos: bucketCounts['0-30'], tono: 'aviso' as const },
    { valor: '31-60' as const, etiqueta: t('inmobiliaria.finance.renewals.urgent'), cuantos: bucketCounts['31-60'] },
    { valor: '61-90' as const, etiqueta: t('inmobiliaria.finance.renewals.upcoming'), cuantos: bucketCounts['61-90'] },
    // El cuarto, para que los de al lado sumen lo que dice «Todas»; en cero no sale.
    { valor: '90+' as const, etiqueta: 'Más de 90 días', cuantos: bucketCounts['90+'] },
  ];

  /*
   * Revisora r25: «Propuesto» decía «—» en las diez filas y «Estado»
   * «Pendiente» en las diez. Una columna que dice lo mismo en todas las filas
   * no informa: «Propuesto» sale sólo si alguna tiene propuesta, y el estado,
   * si todas van en el mismo, se dice UNA vez al pie.
   */
  const hayPropuestas = visibles.some((r) => Boolean(r.negotiatedRent || r.proposedRent));
  const estadoUnico =
    visibles.length > 1 && visibles.every((r) => r.status === visibles[0].status) ? visibles[0].status : null;
  const columnas = 4 + (hayPropuestas ? 1 : 0) + (estadoUnico ? 0 : 1);

  return (
    <section
      className="rounded-lg border border-border bg-card overflow-hidden"
      data-testid="renovaciones-tabla"
    >
      {/* Sin encabezado propio (revisión de Operación, 21-10): la página ya dice
          «Renovaciones» y cómo se abre una; repetirlo arriba de la tabla era ruido. */}
      {/* 🔴 UNA franja de filtros, pegada a la tabla: los cajones de urgencia
          (0-30 críticas, 31-60 urgentes, 61-90 próximas — el preaviso de la
          Ley 820 son 90 días), el estado, y el buscador. */}
      <div className="flex flex-col gap-3 border-b border-border px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <PestanasDeEstado
            pestanas={pestanasDeUrgencia}
            valor={bucketFilter}
            onCambio={setBucketFilter}
            etiqueta="Cuánto le falta a cada contrato para vencer"
            data-testid="pestanas-de-renovaciones"
          />
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
          {/* El estado, UNA vez y al lado de su filtro, cuando todas van en el
              mismo (revisora r27: suelto en el pie, sobre la paginación, sobraba). */}
          {estadoUnico && filtradas.length > 0 ? (
            <span className="text-caption text-fg-muted" data-testid="estado-de-todas">
              {visibles.length === data.length ? 'Todas' : `Las ${visibles.length} abiertas`} en «{getRenovacionStatusLabel(estadoUnico)}»
            </span>
          ) : null}
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
      <Presence
        show={hayFiltros}
        initial={false}
        distance="xs"
        as="p"
        className="border-b border-border px-5 py-2 text-caption text-fg-muted"
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
      </Presence>

      <Table className="max-md:block">
        <TableHeader className="max-md:hidden">
          <TableRow>
            {marcadas && onMarcar && (
              <TableHead className="w-10 pl-4 pr-0">
                <CasillaDeLaPagina ids={pageItems.map((r) => r.id)} marcadas={marcadas} onMarcar={onMarcar} queSon="renovaciones" />
              </TableHead>
            )}
            {/* 21-10 (revisión de Operación): de 9 columnas a 6 — se corría a 1440 y a 390.
                El inquilino va bajo el inmueble; «Vencimiento» y «Días» son una sola
                columna; el propietario y el teléfono, en el cajón (y en el `title`). */}
            <SortableHeader field="propertyTitle">{t('inmobiliaria.finance.renewals.property')}</SortableHeader>
            <SortableHeader field="daysUntilExpiry">{t('inmobiliaria.finance.renewals.expiration')}</SortableHeader>
            <SortableHeader field="currentRent" derecha>{t('inmobiliaria.finance.renewals.currentRent')}</SortableHeader>
            {hayPropuestas ? (
              <TableHead className="whitespace-nowrap text-right">{t('inmobiliaria.finance.renewals.proposed')}</TableHead>
            ) : null}
            {estadoUnico ? null : (
              <SortableHeader field="status">{t('inmobiliaria.finance.renewals.status')}</SortableHeader>
            )}
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
              <TableCell colSpan={columnas + (conCasillas ? 1 : 0)} className="p-0">
                <FalloDeCarga error={error} queEs="las renovaciones" onReintentar={onReintentar} />
              </TableCell>
            </TableRow>
          )}

          {!isLoading && !error && filtradas.length === 0 && (
            <TableRow>
              <TableCell colSpan={columnas + (conCasillas ? 1 : 0)} className="p-0">
                <SinDatos
                  queSon="renovaciones"
                  icono={ArrowsClockwise}
                  hayFiltros={hayFiltros}
                  onLimpiarFiltros={limpiarFiltros}
                  titulo="Sin renovaciones en curso"
                  descripcion="Cuando un contrato entre en sus últimos 90 días, aparece aquí solo, con su inquilino y su canon."
                />
              </TableCell>
            </TableRow>
          )}

        </TableBody>
        {/* Las filas de datos en su propio cuerpo animado: entran escalonadas
            (techo de 320 ms) y, al filtrar o buscar, las que se van salen en
            su lugar (`key` = el id). */}
        <TableBodyAnimado className="max-md:block">
          {pageItems.map((item) => {
            const dias = diasParaVencer(item, hoy);
            const propuesto = item.negotiatedRent || item.proposedRent;
            const incremento =
              propuesto && item.currentRent > 0
                ? (((propuesto - item.currentRent) / item.currentRent) * 100).toFixed(1)
                : null;

            return (
              <TableRowAnimada
                key={item.id}
                onClick={() => onAbrir?.(item)}
                className={cn(
                  'border-b border-border last:border-0 transition-colors max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:items-center max-md:gap-x-3 max-md:gap-y-1.5 max-md:px-4 max-md:py-3.5',
                  onAbrir && 'cursor-pointer hover:bg-muted/40',
                )}
                data-testid={`renovacion-${item.id}`}
              >
                {marcadas && onMarcar && (
                  <TableCell className="w-10 pl-4 pr-0 max-md:hidden">
                    <CasillaDeLaFila id={item.id} nombre={`la renovación de ${item.tenantName}`} marcadas={marcadas} onMarcar={onMarcar} />
                  </TableCell>
                )}
                {/* El inmueble y quién vive. 🔴 El número del contrato: es como la
                    inmobiliaria nombra las cosas («el 1686») y se busca por él. */}
                {/* A 390 (revisora r27), cada cosa en su sitio: arriba el inmueble
                    (a lo ancho si no hay estado) y el estado; abajo la fecha y, a
                    la derecha, el canon. Antes el canon caía donde lo dejara la
                    rejilla, a media tarjeta, y cortaba el nombre a 14 letras. */}
                <TableCell
                  className={cn(
                    'max-w-[320px] px-5 py-4 max-md:col-start-1 max-md:row-start-1 max-md:block max-md:max-w-none max-md:p-0',
                    estadoUnico && 'max-md:col-span-2',
                  )}
                  title={[item.propertyAddress, item.propietarioName ? `Propietario: ${item.propietarioName}` : null, item.tenantPhone].filter(Boolean).join(' · ')}
                >
                  <p className="truncate font-medium text-foreground">{textoLegible(item.propertyTitle)}</p>
                  <p className="truncate text-caption text-muted-foreground">
                    {textoLegible(item.tenantName) || '—'}
                    {rotuloDelContrato(item) ? ` · ${rotuloDelContrato(item)}` : ''}
                  </p>
                </TableCell>

                {/* Vence: la fecha y cuánto falta. Rojo sólo a 7 días o menos; ámbar hasta 30. */}
                <TableCell className="whitespace-nowrap px-5 py-4 tabular-nums max-md:col-start-1 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-caption">
                  <span className="text-foreground">{fechaCorta(item.leaseEndDate, locale)}</span>
                  <span className="md:hidden"> · </span>
                  <span
                    className={cn(
                      'text-caption md:block',
                      dias <= 7
                        ? 'font-medium text-danger'
                        : dias <= 30
                          ? 'font-medium text-warning'
                          : 'text-muted-foreground',
                    )}
                  >
                    {cuantoFalta(dias)}
                  </span>
                </TableCell>

                <TableCell className="whitespace-nowrap px-5 py-4 text-right font-mono tabular-nums text-foreground max-md:col-start-2 max-md:row-start-2 max-md:block max-md:p-0">
                  {formatCurrency(item.currentRent)}
                </TableCell>

                {hayPropuestas ? (
                <TableCell className="whitespace-nowrap px-5 py-4 text-right font-mono tabular-nums max-md:col-start-2 max-md:row-start-3 max-md:block max-md:p-0">
                  {propuesto ? (
                    <div className="flex flex-col items-end">
                      <span className="text-foreground">{formatCurrency(propuesto)}</span>
                      {incremento ? (
                        <span className="inline-flex items-center gap-1 font-sans text-caption text-success">
                          <TrendUp className="h-3 w-3" />
                          {Number(incremento) >= 0 ? '+' : ''}
                          {incremento}%
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-muted-foreground max-md:hidden">—</span>
                  )}
                </TableCell>
                ) : null}

                {estadoUnico ? null : (
                <TableCell className="whitespace-nowrap px-5 py-4 max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0 max-md:text-right">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2.5 py-1 text-caption font-medium',
                      getRenovacionStatusColor(item.status),
                    )}
                  >
                    {getRenovacionStatusLabel(item.status)}
                  </span>
                </TableCell>
                )}

                {/* 🔴 Acá vivía un menú con CINCO items —«Ver detalle»,
                    «Notificar al inquilino», «Iniciar negociación», «Calcular
                    IPC», «Ver historial»— que la página cableaba a los cinco
                    al MISMO `openWorkflow`: cinco rótulos, una conducta. Y la
                    fila entera ya abría ese cajón. Queda lo único cierto:
                    esta fila se abre. */}
                <TableCell className="px-3 py-4 text-right max-md:hidden">
                  <CaretRight
                    className="ml-auto h-4 w-4 text-fg-subtle"
                    aria-hidden="true"
                    data-testid={`abrir-${item.id}`}
                  />
                </TableCell>
              </TableRowAnimada>
            );
          })}
        </TableBodyAnimado>
      </Table>

      {pie}

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
