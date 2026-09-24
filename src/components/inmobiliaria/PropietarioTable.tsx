'use client';

import { motion } from 'framer-motion';
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
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  DropdownList,
  DropdownListTrigger,
  DropdownListContent,
  DropdownListItem,
  DropdownListSeparator,
} from '@/components/ui/dropdown-menu';
import { IconButton, Chip, SegmentedControl } from '@leasefy/cadence';
import { useI18n } from '@/lib/i18n';
import type { Propietario } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import type {
  CampoDeOrden,
  ConteosDePropietarios,
  FiltrosDePropietarios,
} from '@/lib/propietarios/filtrar-propietarios';

type SortField = CampoDeOrden;

const NUMERO = new Intl.NumberFormat('es-CO');

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
}: PropietarioTableProps) {
  const { t, locale } = useI18n();
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
  }) => (
    <TableHead className="text-left p-4">
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
            {totalFiltrado} {t('inmobiliaria.propietario.table.of')} {total}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table className="min-w-[800px]">
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
          <TableBody>
            {filteredPropietarios.map((propietario, index) => {
              const isCompany = propietario.documentType === 'NIT';
              const hasPending = propietario.pendingBalance > 0;

              return (
                <motion.tr
                  key={propietario.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
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
                        ({propietario.activeLeases} {t('inmobiliaria.propietario.table.rented')})
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
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatCurrency(propietario.totalMonthlyRent)}
                    </span>
                  </TableCell>

                  {/* Pending Balance */}
                  <TableCell className="p-4">
                    {hasPending ? (
                      <Badge variant="warning" className="gap-1 tabular-nums">
                        <Warning className="w-3.5 h-3.5" />
                        {formatCurrency(propietario.pendingBalance)}
                      </Badge>
                    ) : (
                      <span className="text-primary text-sm font-medium">
                        {t('inmobiliaria.propietario.table.upToDate')}
                      </span>
                    )}
                  </TableCell>

                  {/* Last Payment */}
                  <TableCell className="p-4">
                    <span className="text-muted-foreground text-sm tabular-nums">
                      {propietario.lastPaymentDate
                        ? new Date(propietario.lastPaymentDate).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="p-4">
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
                  </TableCell>
                </motion.tr>
              );
            })}
          </TableBody>
        </Table>

        {/* Empty State — se mira el total con filtros, no las filas de ESTA
            página: son cosas distintas en cuanto hay paginación. */}
        {totalFiltrado === 0 && (
          <div className="p-12 text-center">
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
          </div>
        )}
      </div>
    </div>
  );
}

export default PropietarioTable;
