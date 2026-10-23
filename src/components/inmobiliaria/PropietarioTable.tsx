'use client';

import * as React from 'react';
import { CasillaDeLaFila, CasillaDeLaPagina } from '@/components/masivas/CasillasDeLaTabla';
import { ANCHO_DEL_MENU_DE_ACCIONES } from '@/components/ui/ancho-del-menu-de-acciones';
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
import { Avatar, IconButton, Chip, SegmentedControl, AnimatedNumber, Presence, Stagger, StaggerItem } from '@leasefy/cadence';

import { useI18n } from '@/lib/i18n';
import type { Propietario } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { DatosPorCompletar } from '@/components/inmobiliaria/DatosPorCompletar';
import { SinPorcentajeDelPropietario } from '@/components/inmobiliaria/SinPorcentajeDelPropietario';
import type {
  CampoDeOrden,
  ConteosDePropietarios,
  FiltrosDePropietarios,
} from '@/lib/propietarios/filtrar-propietarios';
import { documentoConTipo } from '@/lib/propietarios/datos-por-completar';
import { plataOculta as laPlataEstaOculta, tipoDeDocumentoEnPalabras } from '@/lib/propietarios/lo-que-muestra-la-lista';
import { datosPendientesDelPropietario, detalleDelAtraso, girosDelPropietario } from '@/lib/propietarios/giros-del-propietario';
import { documentoDelPropietarioConDv } from '@/lib/propietarios/documento-con-dv';
import { cifrasDeLaPantalla } from '@/lib/i18n/idioma-de-las-cifras';

type SortField = CampoDeOrden;

/** Las columnas de plata: con la plata oculta (P-21) no se ordenan ni dicen nada. */
const COLUMNAS_DE_PLATA: ReadonlySet<SortField> = new Set(['totalMonthlyRent', 'pendingBalance', 'lastPaymentDate']);

const NUMERO = cifrasDeLaPantalla();

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
        className="rounded bg-muted px-1.5 py-0.5 text-caption tabular-nums"
        data-testid={`conteo-${etiqueta.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {NUMERO.format(cuantos)}
      </span>
    </span>
  );
}

/**
 * El formato de la plata de la página (ronda 19: la franja decía «$ 2.466.800,00» y la fila
 * «$ 2.466.800»). Sin él, el de siempre. Igual que `FormatoDeLaPlata` de Inquilinos.
 */
const FormatoDeLaPlata = React.createContext<((n: number) => string) | null>(null);
function usePlata(): (n: number) => string {
  return React.useContext(FormatoDeLaPlata) ?? ((n: number) => formatCurrency(n));
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
  /** QA-PROP-95 (A-52, A-60): sin permiso no se pasa y el menú no lo ofrece. */
  onEdit?: (propietario: Propietario) => void;
  onDelete?: (propietario: Propietario) => void;
  onExport?: () => void;
  /**
   * P-21: quien mira no ve la plata de los propietarios (el back la oculta por
   * rol). Sin esto la tabla pintaba «$0» y «Al día» en cada fila y ofrecía
   * «Con saldo pendiente 0». Se calcula en la página con la lista COMPLETA.
   */
  plataOculta?: boolean;
  /**
   * QA-PROP-95 (A-28): sólo la barra (buscador, Exportar y chips), para la
   * vista de tarjetas: antes las tarjetas no tenían cómo buscar ni filtrar.
   */
  soloBarra?: boolean;
  /**
   * GLOW UP 21-10: la página trae la cifra «Con giros atrasados» que filtra la lista (en la franja,
   * dentro de la tarjeta). Con esto la barra no repite el mismo filtro como chip.
   */
  filtroDeSaldoAfuera?: boolean;
  /**
   * Pestañas por tarea (Nico, 22-10-2026): la página trae «Por girar · Por completar · Con
   * inmuebles · Todos» arriba y «Persona / Empresa» pasa al panel de «Filtros», que abre el botón
   * de la barra. El panel queda montado (escondido) para el lector de pantalla y las pruebas.
   */
  tipoEnFiltros?: boolean;
  /** El formato de la plata de la página (el mismo de la franja de cifras). */
  formato?: (n: number) => string;
  /** Lo que se dice cuando la pestaña o la búsqueda no deja a nadie (lo arma la página). */
  vacio?: React.ReactNode;
  /**
   * Acciones masivas (Nico, 10-10-2026): con esto la tabla pinta las casillas.
   * Lo marcado y lo que se hace con ello lo lleva la página.
   */
  marcadas?: ReadonlySet<string>;
  onMarcar?: (ids: readonly string[], si: boolean) => void;
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
  soloBarra = false,
  filtroDeSaldoAfuera = false,
  tipoEnFiltros = false,
  vacio,
  formato,
  marcadas,
  onMarcar,
}: PropietarioTableProps) {
  const { t, locale } = useI18n();
  const plataDelContexto = usePlata();
  const plata = formato ?? plataDelContexto;
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
  const [filtrosAbiertos, setFiltrosAbiertos] = React.useState(false);
  const idDelPanel = `filtros-de-propietarios-${React.useId().replace(/:/g, '')}`;

  /* «Persona · Empresa» con su número: en la barra (como siempre) o en el panel de «Filtros». */
  const selectorDeTipo = (
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
  );

  return (
    <FormatoDeLaPlata.Provider value={formato ?? null}>
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

          <div className="flex flex-wrap items-center gap-2">
            {tipoEnFiltros && (
              <Button
                variant="secondary"
                hideArrow
                // Ronda 21: a la altura del buscador (44 px).
                className="h-11 gap-2"
                aria-expanded={filtrosAbiertos}
                aria-controls={idDelPanel}
                onClick={() => setFiltrosAbiertos((v) => !v)}
                data-testid="propietarios-filtros"
              >
                <Funnel className="h-4 w-4" aria-hidden />
                {t('inmobiliaria.propietario.table.filtros')}
                {activeFiltersCount > 0 ? (
                  <span className="font-mono text-caption tabular-nums">({activeFiltersCount})</span>
                ) : null}
              </Button>
            )}

            {/* Export */}
            {onExport && (
              <Button
                variant="secondary"
                hideArrow
                onClick={onExport}
                className="h-11 gap-2"
              >
                <Export className="w-4 h-4" />
                <span className="text-sm">{t('inmobiliaria.propietario.table.export')}</span>
              </Button>
            )}
          </div>
        </div>

        {/* El panel de «Filtros»: montado siempre, visible sólo al abrirlo. */}
        {tipoEnFiltros && (
          <div
            id={idDelPanel}
            className={cn('flex-wrap items-center gap-2 rounded-lg bg-surface-muted/60 p-3', filtrosAbiertos ? 'flex' : 'hidden')}
            data-testid="propietarios-panel-de-filtros"
          >
            <span className="text-body-sm text-fg-muted">{t('inmobiliaria.propietario.table.tipoDePersona')}</span>
            {selectorDeTipo}
          </div>
        )}

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
          {!tipoEnFiltros && selectorDeTipo}

          {/* P-21: sin la plata, «Con saldo pendiente 0» sería otra afirmación
              falsa (el saldo llega en null y se lee 0). No se ofrece. */}
          {!plataOculta && !filtroDeSaldoAfuera && (
            <>
              {/* Separator */}
              <div className="hidden sm:block w-px h-6 bg-border" />

              {/* Pending Balance Toggle */}
              <Chip
                selected={filterPending}
                icon={<Warning className="w-4 h-4" />}
                onClick={() => setFilterPending(!filterPending)}
                // QA-PROP-95 G-14: el Chip ya es `role="checkbox"` con `aria-checked`;
                // un `aria-pressed` encima es un atributo que ese rol no admite (axe crítico).
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
                 pisa al primero — «Limpiar» dejaba el saldo pendiente puesto.
                 QA-PROP-95 (A-15): también vacía la búsqueda, como dice. */
              onClick={() => onFiltros({ ...filtros, soloConSaldo: false, tipo: 'all', busqueda: '' })}
              className="gap-1.5 text-warning"
            >
              <Funnel className="w-4 h-4" weight="fill" />
              {t('inmobiliaria.propietario.table.clear')}
              <X className="w-3.5 h-3.5" />
            </Button>
          )}

          {/* Results Count — con las pestañas, sólo cuando algo achica la pestaña (su número ya lo dice). */}
          <span className={cn('ml-auto text-sm text-muted-foreground tabular-nums', tipoEnFiltros && activeFiltersCount === 0 && !searchQuery && 'hidden')}>
            {/* Ronda 13: con separador de miles («1.751 de 1.751»). */}
            <AnimatedNumber value={totalFiltrado} format={(n) => Math.round(n).toLocaleString('es-CO')} /> {t('inmobiliaria.propietario.table.of')} {total.toLocaleString('es-CO')}
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

      {soloBarra ? null : esCelular ? (
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
              {marcadas && onMarcar && (
                <TableHead className="w-10 py-4 pl-4 pr-0">
                  <CasillaDeLaPagina
                    ids={filteredPropietarios.map((p) => p.id)}
                    marcadas={marcadas}
                    onMarcar={onMarcar}
                    queSon="propietarios"
                  />
                </TableHead>
              )}
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
                  {marcadas && onMarcar && (
                    <TableCell className="w-10 py-4 pl-4 pr-0">
                      <CasillaDeLaFila
                        id={propietario.id}
                        nombre={propietario.name}
                        marcadas={marcadas}
                        onMarcar={onMarcar}
                      />
                    </TableCell>
                  )}
                  {/* Propietario */}
                  <TableCell className="p-4">
                    <div className="flex items-center gap-3">
                      {/* GLOW UP 21-10: su Avatar (iniciales y su tono, que sale del nombre); antes el mismo
                          muñequito azul para todos. La empresa conserva su edificio adentro. */}
                      <Avatar name={propietario.name} size="md" className="shrink-0">
                        {isCompany ? <Buildings className="size-5" /> : undefined}
                      </Avatar>
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
                          onCompletar={onEdit ? () => onEdit(propietario) : undefined}
                          className="mt-1 flex flex-wrap items-center gap-2"
                        />
                        {/* 🔴 Copropiedad migrada sin porcentaje: no se gira (04-10). */}
                        <SinPorcentajeDelPropietario
                          inmuebles={propietario.inmueblesSinPorcentaje}
                          className="mt-1 flex flex-wrap items-center gap-2"
                        />
                      </div>
                    </div>
                  </TableCell>

                  {/* Properties */}
                  <TableCell className="p-4">
                    <div>
                      {/* La cifra arriba en mono; cuántas están arrendadas, debajo (antes se partía «0 (0 / arrendadas)»). */}
                      {/* Glow up 22-10: sin inmuebles, «—» atenuado (no «0 / 0 arrendadas» en cada fila). */}
                      <span className={cn('font-mono tabular-nums', propietario.propertyCount === 0 ? 'text-fg-subtle' : 'text-foreground')}>
                        {propietario.propertyCount === 0 ? '—' : propietario.propertyCount}
                      </span>
                      {propietario.propertyCount > 0 ? (
                        <span className="block whitespace-nowrap text-caption text-muted-foreground">
                          {arrendadas(t, propietario.activeLeases)}
                        </span>
                      ) : null}
                      {/* El minoritario existe: sus copropiedades van aparte
                          del conteo de mandatos donde es principal. */}
                      {(propietario.copropiedadesCount ?? 0) > 0 && (
                        <span
                          className="block text-caption text-muted-foreground tabular-nums"
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
                      <span className={cn('font-mono tabular-nums', propietario.totalMonthlyRent ? 'text-foreground' : 'text-fg-subtle')}>
                        {propietario.totalMonthlyRent ? plata(propietario.totalMonthlyRent) : '—'}
                      </span>
                    )}
                  </TableCell>

                  {/* Pending Balance */}
                  <TableCell className="p-4">
                    {sinPlata ? (
                      <SinAccesoALaPlata texto={sinAcceso} />
                    ) : hasPending ? (
                      <>
                        <Badge variant="warning" className="gap-1 font-mono tabular-nums">
                          <Warning className="w-3.5 h-3.5" />
                          {plata(propietario.pendingBalance)}
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
                        {/* «Al día» en tinta suave: no pide nada (el azul es sólo de la acción principal). */}
                        <span className="text-fg-muted text-sm">
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
                      {/* Ronda 20: «17 oct 2026», la fecha corta de la casa (sin los «de»). */}
                      {propietario.lastPaymentDate
                        ? new Date(propietario.lastPaymentDate)
                            .toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                            .replace(/ de /g, ' ')
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
        <Presence show={totalFiltrado === 0 && Boolean(vacio)} initial={false} className="px-6 py-10">
          {vacio}
        </Presence>
        <Presence show={totalFiltrado === 0 && !vacio} initial={false} className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">
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
    </FormatoDeLaPlata.Provider>
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
  /** QA-PROP-95 (A-52, A-60): sin permiso no se pasa y el menú no lo ofrece. */
  onEdit?: (propietario: Propietario) => void;
  onDelete?: (propietario: Propietario) => void;
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
      <DropdownListContent align="end" className={ANCHO_DEL_MENU_DE_ACCIONES} onClick={(e) => e.stopPropagation()}>
        <DropdownListItem onSelect={() => onView(propietario)}>
          <Eye className="w-4 h-4" />
          <span className="text-sm">{t('inmobiliaria.propietario.table.viewDetail')}</span>
        </DropdownListItem>
        {onEdit && (
        <DropdownListItem onSelect={() => onEdit(propietario)}>
          <PencilSimple className="w-4 h-4" />
          <span className="text-sm">{t('inmobiliaria.propietario.table.edit')}</span>
        </DropdownListItem>
        )}
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
        {onDelete && (
          <>
        <DropdownListSeparator />
        <DropdownListItem
          onSelect={() => onDelete(propietario)}
          className="text-danger"
        >
          <TrashSimple className="w-4 h-4" />
          <span className="text-sm">{t('inmobiliaria.propietario.table.delete')}</span>
        </DropdownListItem>
          </>
        )}
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
  const plata = usePlata();
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
          {t('inmobiliaria.propietario.giros.generado', { monto: plata(generado) })}
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
  const plata = usePlata();
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
                <span className="mt-0.5 shrink-0" aria-hidden="true">
                  <Avatar name={propietario.name} size="sm">
                    {isCompany ? <Buildings className="size-4" /> : undefined}
                  </Avatar>
                </span>
                <span className="min-w-0">
                  {/* El nombre se ajusta en dos renglones; nunca «Constructora Ñan…». */}
                  <span className="block break-words font-medium text-fg">{propietario.name}</span>
                  <span className="block truncate text-sm text-fg-muted">
                    {documentoConTipo(tipoDeDocumentoEnPalabras(t, propietario.documentType), documentoDelPropietarioConDv(propietario))}
                  </span>
                </span>
              </span>
              {/* Revisora r22 (Propietarios #2): «1 inmueble · 1 arrendado» y «Canon $ …» en un renglón; lo atrasado y
                  sus giros, a lo ancho debajo (antes la columna de la plata partía «1 / inmueble / (1 arrendado)»). */}
              {/* Ronda 23, B2: a 390 los dos lados son `whitespace-nowrap` y no cabían en un renglón: «1 inmueble ·
                  1 arrendado» se montaba encima del canon. Con `flex-wrap`, si no caben, el canon baja al siguiente. */}
              <span className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-sm text-fg-muted">
                  {propietario.propertyCount === 0 ? (
                    <span className="text-fg-subtle">Sin inmuebles</span>
                  ) : (
                    <span className="whitespace-nowrap">
                      <span className="font-mono tabular-nums text-fg">{propietario.propertyCount}</span>{' '}
                      {propietario.propertyCount === 1
                        ? t('inmobiliaria.propietarios.card.property')
                        : t('inmobiliaria.propietarios.card.properties')}{' '}
                      · {arrendadas(t, propietario.activeLeases)}
                    </span>
                  )}
                  {copropiedades > 0 && (
                    <span className="block text-caption tabular-nums">
                      {t('inmobiliaria.propietario.table.copropiedades', { n: copropiedades })}
                    </span>
                  )}
                </span>
                {sinPlata ? null : (
                  <span className="shrink-0 whitespace-nowrap text-right text-sm">
                    <span className="text-caption text-fg-subtle">Canon </span>
                    <span className={cn('font-mono tabular-nums', propietario.totalMonthlyRent ? 'text-fg' : 'text-fg-subtle')}>
                      {propietario.totalMonthlyRent ? plata(propietario.totalMonthlyRent) : '—'}
                    </span>
                  </span>
                )}
              </span>
              <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                {sinPlata ? (
                  <SinAccesoALaPlata texto={sinAcceso} />
                ) : (
                  <>
                    {hasPending ? (
                      <Badge variant="warning" className="gap-1 font-mono tabular-nums">
                        <Warning className="h-3.5 w-3.5" aria-hidden="true" />
                        {plata(propietario.pendingBalance)}
                      </Badge>
                    ) : girosDelPropietario(propietario).sinDiaDeGiro ? (
                      <span className="text-caption text-fg-muted" data-testid="sin-dia-de-giro">
                        {t('inmobiliaria.propietario.giros.sinDiaDeGiro')}
                      </span>
                    ) : (
                      <span className="text-caption text-fg-muted">
                        {t('inmobiliaria.propietario.table.upToDate')}
                      </span>
                    )}
                    <LineasDelGiro propietario={propietario} />
                  </>
                )}
              </span>
            </button>
            <DatosPorCompletar pendientes={datosPendientesDelPropietario(propietario)} className="mt-2 flex flex-wrap items-center gap-2" />
            {/* 🔴 Copropiedad migrada sin porcentaje: no se gira (04-10). En el celular también. */}
            <SinPorcentajeDelPropietario
              inmuebles={propietario.inmueblesSinPorcentaje}
              className="mt-2 flex flex-wrap items-center gap-2"
            />
            <div className="absolute right-2 top-2.5">{menu(propietario)}</div>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}

export default PropietarioTable;
