'use client';

import {
  MagnifyingGlass,
  Funnel,
  SortAscending,
  SortDescending,
  Buildings,
  User,
  Warning,
  DotsThree,
  PencilSimple,
  Eye,
  TrashSimple,
  Envelope,
  Phone,
  X,
  Export,
  Info,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableCell,
  TableBodyAnimado,
  TableRowAnimada,
} from '@/components/ui/table';
import {
  DropdownList,
  DropdownListTrigger,
  DropdownListContent,
  DropdownListItem,
  DropdownListSeparator,
} from '@/components/ui/dropdown-menu';
import { IconButton, Chip, SegmentedControl, AnimatedNumber, Presence, Stagger, StaggerItem } from '@leasefy/cadence';

import { useI18n } from '@/lib/i18n';
import type { Propietario } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { DatosPorCompletar } from '@/components/inmobiliaria/DatosPorCompletar';
import type {
  CampoDeOrden,
  ConteosDePropietarios,
  FiltrosDePropietarios,
} from '@/lib/propietarios/filtrar-propietarios';
import { documentoConTipo } from '@/lib/propietarios/datos-por-completar';
import { plataOculta as laPlataEstaOculta, tipoDeDocumentoEnPalabras } from '@/lib/propietarios/lo-que-muestra-la-lista';
import { datosPendientesDelPropietario, detalleDelAtraso, girosDelPropietario } from '@/lib/propietarios/giros-del-propietario';
import { documentoDelPropietarioConDv } from '@/lib/propietarios/documento-con-dv';

type SortField = CampoDeOrden;

/** Las columnas de plata: con la plata oculta (P-21) no se ordenan ni dicen nada. */
const COLUMNAS_DE_PLATA: ReadonlySet<SortField> = new Set(['totalMonthlyRent', 'pendingBalance', 'lastPaymentDate']);

const NUMERO = new Intl.NumberFormat('es-CO');

/**
 * P-21 (QA de Propietarios, 03-10): el monto que el back no le mostró a quien
 * mira. Un «—» que el lector de pantalla dice como «Sin acceso a la plata»;
 * nunca «$0» ni «Al día», que son afirmaciones.
 */
function SinAccesoALaPlata({ texto }: { texto: string }) {
  return (
    <span className="text-fg-subtle" title={texto} data-testid="sin-acceso-a-la-plata">
      <span aria-hidden="true">—</span>
      <span className="sr-only">{texto}</span>
    </span>
  );
}

/** «(1 arrendada)» / «(3 arrendadas)» (P-08). */
function arrendadas(t: (k: string) => string, n: number): string {
  return `${n} ${n === 1 ? t('inmobiliaria.propietario.table.rentedOne') : t('inmobiliaria.propietario.table.rented')}`;
}

/**
 * Una etiqueta de filtro con su número al lado.
 *
 * Mismo patrón que los chips de Renovaciones (`RenovacionesTable`): el número
 * en una pastilla `tabular-nums` pegada a la derecha del texto. Un cero se
 * dice igual que cualquier otro número — «Empresa 0» es la respuesta a por qué
 * la lista está vacía, y esconderlo devuelve el defecto.
 */
function ConChip({ etiqueta, cuantos }: { etiqueta: string; cuantos: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {etiqueta}
      <span
        className="rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums"
        data-testid={`conteo-${etiqueta.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {NUMERO.format(cuantos)}
      </span>
    </span>
  );
}

interface PropietarioTableProps {
  /**
   * Las filas que se pintan: **ya filtradas, ordenadas y paginadas** por quien
   * llama. La tabla no vuelve a tocarlas.
   *
   * 🔴 Antes filtraba ella, sobre el `slice` de la página actual que le pasaba
   * la lista — así que buscar sólo miraba 10 filas de N. Ver
   * `lib/propietarios/filtrar-propietarios.ts`.
   */
  propietarios: Propietario[];
  /** Cuántas filas hay en total con estos filtros (todas las páginas). */
  totalFiltrado: number;
  /** Cuántas hay sin filtro ninguno. */
  total: number;
  filtros: FiltrosDePropietarios;
  /**
   * Cuántos hay detrás de cada chip. Los calcula quien llama porque necesita
   * la lista COMPLETA: la tabla sólo tiene la página. Ver
   * `conteosDePropietarios` para la regla del número.
   */
  conteos: ConteosDePropietarios;
  onFiltros: (filtros: FiltrosDePropietarios) => void;
  onView: (propietario: Propietario) => void;
  onEdit: (propietario: Propietario) => void;
  onDelete: (propietario: Propietario) => void;
  onExport?: () => void;
  /**
   * P-21: quien mira no ve la plata de los propietarios (el back la oculta por
   * rol). Sin esto la tabla pintaba «$0» y «Al día» en cada fila y ofrecía
   * «Con saldo pendiente 0». Se calcula en la página con la lista COMPLETA.
   */
  plataOculta?: boolean;
}

/**
 * PropietarioTable - Full-featured data table for propietarios
 * Includes search, filters, sorting, and row actions
 */
export function PropietarioTable({
  propietarios,
  totalFiltrado,
  total,
  filtros,
  conteos,
  onFiltros,
  onView,
  onEdit,
  onDelete,
  onExport,
  plataOculta = false,
}: PropietarioTableProps) {
  const { t, locale } = useI18n();
  /*
   * P-22 (QA de Propietarios, 03-10): a 390 px la tabla se corría de lado y
   * sólo se veía el nombre. En el celular cada propietario es una TARJETA con
   * lo esencial: nombre, documento, inmuebles, canon y pendiente. El primer
   * pintado (servidor) es la tabla, como en Inquilinos.
   */
  const esCelular = useIsMobile();
  const sinAcceso = t('inmobiliaria.propietario.table.sinAccesoALaPlata');
  const searchQuery = filtros.busqueda;
  const filterType = filtros.tipo;
  const filterPending = filtros.soloConSaldo;
  const sortField = filtros.campo;
  const sortDirection = filtros.sentido;

  const setSearchQuery = (busqueda: string) => onFiltros({ ...filtros, busqueda });
  const setFilterType = (tipo: FiltrosDePropietarios['tipo']) => onFiltros({ ...filtros, tipo });
  const setFilterPending = (soloConSaldo: boolean) => onFiltros({ ...filtros, soloConSaldo });

  const filteredPropietarios = propietarios;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      onFiltros({ ...filtros, sentido: sortDirection === 'asc' ? 'desc' : 'asc' });
    } else {
      onFiltros({ ...filtros, campo: field, sentido: 'asc' });
    }
  };

  const SortIcon = sortDirection === 'asc' ? SortAscending : SortDescending;

  const SortableHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => {
    // P-21: una columna de plata oculta no se ordena: ordenar «—» contra «—» no dice nada.
    if (plataOculta && COLUMNAS_DE_PLATA.has(field)) {
      return <TableHead className="text-left p-4">{children}</TableHead>;
    }
    return (
      <TableHead
        className="text-left p-4"
        // P-09: el lector de pantalla también sabe por qué columna va ordenada.
        aria-sort={sortField === field ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        {/*
          allowlist: disparador de orden — no hay primitiva en Cadence. `uppercase`
          va explícito porque un `<button>` trae `text-transform: none` del
          navegador y perdía las mayúsculas del `TH`. Ver DispersionTable.
        */}
        <button
          type="button"
          onClick={() => handleSort(field)}
          className="flex items-center gap-2 uppercase hover:text-fg"
        >
          {children}
          {sortField === field && <SortIcon className="w-3.5 h-3.5" />}
        </button>
      </TableHead>
    );
  };

  const activeFiltersCount = [filterPending, filterType !== 'all'].filter(Boolean).length;

  return (
    <div>
      {/* Search and Filters Bar */}
      <div className="p-4 space-y-4 border-b border-border">
        {/* Row 1: Search + Export */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
            <Input
              type="text"
              placeholder={t('inmobiliaria.propietario.table.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4"
            />
            {searchQuery && (
              <IconButton
                variant="ghost"
                size="sm"
                icon={<X className="w-4 h-4" />}
                onClick={() => setSearchQuery('')}
                aria-label={t('inmobiliaria.propietario.table.clear')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2"
              />
            )}
          </div>

          {/* Export */}
          {onExport && (
            <Button
              variant="secondary"
              hideArrow
              onClick={onExport}
              className="gap-2"
            >
              <Export className="w-4 h-4" />
              <span className="text-sm">{t('inmobiliaria.propietario.table.export')}</span>
            </Button>
          )}
        </div>

        {/* Row 2: Inline Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Type Filter Tabs */}
          {/* 🔴 20-09 · Con número. Sin él, para saber si hay empresas entre
              los 1.733 propietarios había que clickear cada chip y leer el
              contador del otro extremo de la barra. Ver
              `conteosDePropietarios`: cada número es lo que verías al
              clickear, no el total de la inmobiliaria. */}
          {/* P-22: a 390 px los tres chips con su número miden más que la
              tarjeta: se desplazan dentro de su riel, nunca fuera del borde. */}
          <div className="min-w-0 max-w-full overflow-x-auto">
          <SegmentedControl<FiltrosDePropietarios['tipo']>
            value={filterType}
            onChange={setFilterType}
            options={[
              {
                value: 'all',
                label: <ConChip etiqueta={t('inmobiliaria.propietario.table.all')} cuantos={conteos.todos} />,
                ariaLabel: `${t('inmobiliaria.propietario.table.all')}: ${conteos.todos}`,
              },
              {
                value: 'person',
                label: <ConChip etiqueta={t('inmobiliaria.propietario.table.person')} cuantos={conteos.persona} />,
                ariaLabel: `${t('inmobiliaria.propietario.table.person')}: ${conteos.persona}`,
              },
              {
                value: 'company',
                label: <ConChip etiqueta={t('inmobiliaria.propietario.table.company')} cuantos={conteos.empresa} />,
                ariaLabel: `${t('inmobiliaria.propietario.table.company')}: ${conteos.empresa}`,
              },
            ]}
          />
          </div>

          {/* P-21: sin la plata, «Con saldo pendiente 0» sería otra afirmación
              falsa (el saldo llega en null y se lee 0). No se ofrece. */}
          {!plataOculta && (
            <>
              {/* Separator */}
              <div className="hidden sm:block w-px h-6 bg-border" />

              {/* Pending Balance Toggle */}
              <Chip
                selected={filterPending}
                icon={<Warning className="w-4 h-4" />}
                onClick={() => setFilterPending(!filterPending)}
                aria-pressed={filterPending}
              >
                <ConChip
                  etiqueta={t('inmobiliaria.propietario.table.withPendingBalance')}
                  cuantos={conteos.conSaldo}
                />
              </Chip>
            </>
          )}

          {/* Clear Filters */}
          {activeFiltersCount > 0 && (
            <Button
              variant="link"
              size="sm"
              hideArrow
              /* Los dos en UN solo cambio: encadenar
                 `setFilterPending(false)` y `setFilterType('all')` arma los
                 dos objetos a partir del mismo `filtros` viejo, y el segundo
                 pisa al primero — «Limpiar» dejaba el saldo pendiente puesto. */
              onClick={() => onFiltros({ ...filtros, soloConSaldo: false, tipo: 'all' })}
              className="gap-1.5 text-warning"
            >
              <Funnel className="w-4 h-4" weight="fill" />
              {t('inmobiliaria.propietario.table.clear')}
              <X className="w-3.5 h-3.5" />
            </Button>
          )}

          {/* Results Count */}
          <span className="ml-auto text-sm text-muted-foreground tabular-nums">
            <AnimatedNumber value={totalFiltrado} format={(n) => String(Math.round(n))} /> {t('inmobiliaria.propietario.table.of')} {total}
          </span>
        </div>

        {/* P-21: por qué las columnas de plata dicen «—». Una vez, no en cada celda. */}
        {plataOculta && (
          <p className="flex items-start gap-2 text-sm text-fg-muted" data-testid="plata-oculta-por-rol">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t('inmobiliaria.propietario.table.plataOculta')}
          </p>
        )}
      </div>

      {esCelular ? (
        <TarjetasDePropietarios
          propietarios={propietarios}
          plataOculta={plataOculta}
          onView={onView}
          menu={(p) => <MenuDeLaFila propietario={p} onView={onView} onEdit={onEdit} onDelete={onDelete} />}
        />
      ) : null}

      {/* Table — en el celular la reemplazan las tarjetas de arriba; el vacío de
          abajo sigue valiendo para las dos. */}
      <div className="overflow-x-auto">
        <Table className={cn('min-w-[800px]', esCelular && 'hidden')}>
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/30">
              <SortableHeader field="name">{t('inmobiliaria.propietario.table.owner')}</SortableHeader>
              <SortableHeader field="propertyCount">{t('inmobiliaria.propietario.table.properties')}</SortableHeader>
              <SortableHeader field="totalMonthlyRent">{t('inmobiliaria.propietario.table.monthlyRent')}</SortableHeader>
              <SortableHeader field="pendingBalance">{t('inmobiliaria.propietario.table.pending')}</SortableHeader>
              <SortableHeader field="lastPaymentDate">{t('inmobiliaria.propietario.table.lastPayment')}</SortableHeader>
              <TableHead className="w-12 p-4" />
            </TableRow>
          </TableHeader>
          {/* Las filas entran escalonadas (techo de 320 ms) y, al filtrar o
              buscar, la que se va sale en su lugar: `key` = el id. */}
          <TableBodyAnimado>
            {filteredPropietarios.map((propietario) => {
              const isCompany = propietario.documentType === 'NIT';
              const sinPlata = plataOculta || laPlataEstaOculta(propietario);
              const hasPending = !sinPlata && propietario.pendingBalance > 0;

              return (
                <TableRowAnimada
                  key={propietario.id}
                  onClick={() => onView(propietario)}
                  className="border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  {/* Propietario */}
                  <TableCell className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                          isCompany
                            ? 'bg-surface-muted dark:bg-ink text-fg-muted dark:text-fg-subtle'
                            : 'bg-primary-soft text-primary'
                        )}
                      >
                        {isCompany ? <Buildings className="w-5 h-5" /> : <User className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {propietario.name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {propietario.email ?? '—'}
                        </p>
                        {/* T-0128: ficha creada por la migración sin todos sus datos. */}
                        <DatosPorCompletar
                          pendientes={datosPendientesDelPropietario(propietario)}
                          onCompletar={() => onEdit(propietario)}
                          className="mt-1 flex flex-wrap items-center gap-2"
                        />
                      </div>
                    </div>
                  </TableCell>

                  {/* Properties */}
                  <TableCell className="p-4">
                    <div>
                      <span className="font-semibold text-foreground tabular-nums">
                        {propietario.propertyCount}
                      </span>
                      <span className="text-muted-foreground ml-1">
                        ({arrendadas(t, propietario.activeLeases)})
                      </span>
                      {/* El minoritario existe: sus copropiedades van aparte
                          del conteo de mandatos donde es principal. */}
                      {(propietario.copropiedadesCount ?? 0) > 0 && (
                        <span
                          className="block text-xs text-muted-foreground tabular-nums"
                          data-testid="copropiedades-del-propietario"
                        >
                          {t('inmobiliaria.propietario.table.copropiedades', { n: propietario.copropiedadesCount ?? 0 })}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Monthly Rent */}
                  <TableCell className="p-4">
                    {sinPlata ? (
                      <SinAccesoALaPlata texto={sinAcceso} />
                    ) : (
                      <span className="font-semibold text-foreground tabular-nums">
                        {formatCurrency(propietario.totalMonthlyRent)}
                      </span>
                    )}
                  </TableCell>

                  {/* Pending Balance */}
                  <TableCell className="p-4">
                    {sinPlata ? (
                      <SinAccesoALaPlata texto={sinAcceso} />
                    ) : hasPending ? (
                      <>
                        <Badge variant="warning" className="gap-1 tabular-nums">
                          <Warning className="w-3.5 h-3.5" />
                          {formatCurrency(propietario.pendingBalance)}
                        </Badge>
                        <LineasDelGiro propietario={propietario} />
                      </>
                    ) : girosDelPropietario(propietario).sinDiaDeGiro ? (
                      // COLA-FRONT (04-10): algo arrendado y ningún giro programado.
                      <span className="text-sm text-fg-muted" data-testid="sin-dia-de-giro">
                        {t('inmobiliaria.propietario.giros.sinDiaDeGiro')}
                      </span>
                    ) : (
                      <>
                        <span className="text-primary text-sm font-medium">
                          {t('inmobiliaria.propietario.table.upToDate')}
                        </span>
                        <LineasDelGiro propietario={propietario} />
                      </>
                    )}
                  </TableCell>

                  {/* Last Payment */}
                  <TableCell className="p-4">
                    {sinPlata ? (
                      <SinAccesoALaPlata texto={sinAcceso} />
                    ) : (
                    <span className="text-muted-foreground text-sm tabular-nums">
                      {propietario.lastPaymentDate
                        ? new Date(propietario.lastPaymentDate).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </span>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="p-4">
                    <MenuDeLaFila propietario={propietario} onView={onView} onEdit={onEdit} onDelete={onDelete} />
                  </TableCell>
                </TableRowAnimada>
              );
            })}
          </TableBodyAnimado>
        </Table>

        {/* Empty State — se mira el total con filtros, no las filas de ESTA
            página: son cosas distintas en cuanto hay paginación. */}
        <Presence show={totalFiltrado === 0} initial={false} className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {t('inmobiliaria.propietario.table.noResults')}
          </h3>
          <p className="text-muted-foreground">
            {searchQuery
              ? t('inmobiliaria.propietario.table.tryOtherTerms')
              : t('inmobiliaria.propietario.table.addFirstOwner')}
          </p>
        </Presence>
      </div>
    </div>
  );
}

/**
 * El menú «…» de un propietario. Sale de la fila de la tabla tal cual estaba
 * (QA de Propietarios, 03-10) para que la tarjeta del celular ofrezca lo mismo.
 */
function MenuDeLaFila({
  propietario,
  onView,
  onEdit,
  onDelete,
}: {
  propietario: Propietario;
  onView: (propietario: Propietario) => void;
  onEdit: (propietario: Propietario) => void;
  onDelete: (propietario: Propietario) => void;
}) {
  const { t } = useI18n();
  return (
    <DropdownList>
      <DropdownListTrigger asChild>
        <IconButton
          variant="ghost"
          size="sm"
          icon={<DotsThree className="w-5 h-5" weight="bold" />}
          onClick={(e) => e.stopPropagation()}
          aria-label="Acciones"
        />
      </DropdownListTrigger>
      {/* El menú vive en un portal, pero sus clics suben por el árbol de React
          hasta la fila, que abre la ficha: «Editar» y «Eliminar» navegaban
          en vez de abrir su diálogo. Mismo corte que en RenovacionesTable. */}
      <DropdownListContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
        <DropdownListItem onSelect={() => onView(propietario)}>
          <Eye className="w-4 h-4" />
          <span className="text-sm">{t('inmobiliaria.propietario.table.viewDetail')}</span>
        </DropdownListItem>
        <DropdownListItem onSelect={() => onEdit(propietario)}>
          <PencilSimple className="w-4 h-4" />
          <span className="text-sm">{t('inmobiliaria.propietario.table.edit')}</span>
        </DropdownListItem>
        {propietario.email && (
          <DropdownListItem asChild>
            <a
              href={`mailto:${propietario.email}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Envelope className="w-4 h-4" />
              <span className="text-sm">{t('inmobiliaria.propietario.table.sendEmail')}</span>
            </a>
          </DropdownListItem>
        )}
        {propietario.phone && (
          <DropdownListItem asChild>
            <a
              href={`tel:${propietario.phone}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="w-4 h-4" />
              <span className="text-sm">{t('inmobiliaria.propietario.table.call')}</span>
            </a>
          </DropdownListItem>
        )}
        <DropdownListSeparator />
        <DropdownListItem
          onSelect={() => onDelete(propietario)}
          className="text-danger"
        >
          <TrashSimple className="w-4 h-4" />
          <span className="text-sm">{t('inmobiliaria.propietario.table.delete')}</span>
        </DropdownListItem>
      </DropdownListContent>
    </DropdownList>
  );
}

/**
 * 🔴 P-10 (back 5731a4e2): debajo del giro atrasado, cuántos giros y desde
 * cuándo («3 giros vencidos desde el 1 ago»), y lo generado en Dispersiones
 * aparte y con su nombre —antes era ESE el número de la columna—. Sin nada que
 * decir (o sin la plata), no pinta nada.
 */
function LineasDelGiro({ propietario }: { propietario: Propietario }) {
  const { t } = useI18n();
  const giros = girosDelPropietario(propietario);
  if (giros.oculto) return null;
  const detalle = detalleDelAtraso(giros, t);
  const generado = giros.generadoSinGirar ?? 0;
  if (!detalle && generado <= 0) return null;
  return (
    <span className="mt-1 block space-y-0.5 text-caption text-fg-muted" data-testid="lineas-del-giro">
      {detalle ? <span className="block tabular-nums">{detalle}</span> : null}
      {generado > 0 ? (
        <span className="block tabular-nums" data-testid="generado-sin-girar">
          {t('inmobiliaria.propietario.giros.generado', { monto: formatCurrency(generado) })}
        </span>
      ) : null}
    </span>
  );
}

/**
 * P-22: la lista en el celular. Una tarjeta por propietario con lo que en la
 * tabla eran columnas: documento, inmuebles (y arrendados), canon y
 * pendiente. Toda la tarjeta abre la ficha; el «…» va aparte (un menú no
 * puede vivir dentro de un botón). Entran escalonadas, como las filas.
 */
function TarjetasDePropietarios({
  propietarios,
  plataOculta,
  onView,
  menu,
}: {
  propietarios: Propietario[];
  plataOculta: boolean;
  onView: (propietario: Propietario) => void;
  menu: (propietario: Propietario) => React.ReactNode;
}) {
  const { t } = useI18n();
  const sinAcceso = t('inmobiliaria.propietario.table.sinAccesoALaPlata');
  return (
    <Stagger as="ul" className="divide-y divide-border" data-testid="propietarios-tarjetas">
      {propietarios.map((propietario) => {
        const isCompany = propietario.documentType === 'NIT';
        const sinPlata = plataOculta || laPlataEstaOculta(propietario);
        const hasPending = !sinPlata && propietario.pendingBalance > 0;
        const copropiedades = propietario.copropiedadesCount ?? 0;
        return (
          <StaggerItem
            as="li"
            key={propietario.id}
            className="relative px-4 py-3.5"
            data-testid="propietario-tarjeta"
          >
            <button
              type="button"
              onClick={() => onView(propietario)}
              className="block w-full min-w-0 rounded-md pr-10 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="flex items-start gap-3">
                <span
                  className={cn(
                    'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    isCompany
                      ? 'bg-surface-muted dark:bg-ink text-fg-muted dark:text-fg-subtle'
                      : 'bg-primary-soft text-primary'
                  )}
                  aria-hidden="true"
                >
                  {isCompany ? <Buildings className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </span>
                <span className="min-w-0">
                  {/* El nombre se ajusta en dos renglones; nunca «Constructora Ñan…». */}
                  <span className="block break-words font-medium text-fg">{propietario.name}</span>
                  <span className="block truncate text-sm text-fg-muted">
                    {documentoConTipo(tipoDeDocumentoEnPalabras(t, propietario.documentType), documentoDelPropietarioConDv(propietario))}
                  </span>
                </span>
              </span>
              <span className="mt-2.5 flex items-start justify-between gap-3">
                <span className="min-w-0 text-sm text-fg-muted">
                  <span className="font-semibold tabular-nums text-fg">{propietario.propertyCount}</span>{' '}
                  {propietario.propertyCount === 1
                    ? t('inmobiliaria.propietarios.card.property')
                    : t('inmobiliaria.propietarios.card.properties')}{' '}
                  <span className="whitespace-nowrap">({arrendadas(t, propietario.activeLeases)})</span>
                  {copropiedades > 0 && (
                    <span className="block text-caption tabular-nums">
                      {t('inmobiliaria.propietario.table.copropiedades', { n: copropiedades })}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1 text-right">
                  {sinPlata ? (
                    <SinAccesoALaPlata texto={sinAcceso} />
                  ) : (
                    <>
                      <span className="whitespace-nowrap font-mono text-sm font-semibold tabular-nums text-fg">
                        {formatCurrency(propietario.totalMonthlyRent)}
                      </span>
                      {hasPending ? (
                        <Badge variant="warning" className="gap-1 tabular-nums">
                          <Warning className="h-3.5 w-3.5" aria-hidden="true" />
                          {formatCurrency(propietario.pendingBalance)}
                        </Badge>
                      ) : girosDelPropietario(propietario).sinDiaDeGiro ? (
                        <span className="text-caption text-fg-muted" data-testid="sin-dia-de-giro">
                          {t('inmobiliaria.propietario.giros.sinDiaDeGiro')}
                        </span>
                      ) : (
                        <span className="text-caption font-medium text-primary">
                          {t('inmobiliaria.propietario.table.upToDate')}
                        </span>
                      )}
                      <LineasDelGiro propietario={propietario} />
                    </>
                  )}
                </span>
              </span>
            </button>
            <DatosPorCompletar pendientes={datosPendientesDelPropietario(propietario)} className="mt-2 flex flex-wrap items-center gap-2" />
            <div className="absolute right-2 top-2.5">{menu(propietario)}</div>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}

export default PropietarioTable;
