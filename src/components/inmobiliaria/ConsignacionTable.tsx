'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Buildings,
  House,
  Storefront,
  Warehouse,
  Briefcase,
  SortAscending,
  SortDescending,
  DotsThree,
  Eye,
  PencilSimple,
  MapPin,
  User,
  Percent,
  CalendarPlus,
  ArrowSquareOut,
  Users,
  Trash,
  WarningCircle,
} from '@phosphor-icons/react';
import { IconButton } from '@leasefy/cadence';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
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
  DropdownListContent,
  DropdownListItem,
  DropdownListTrigger,
} from '@/components/ui/dropdown-menu';
import type {
  Consignacion,
  PropertyAvailability,
  PortafolioRow,
  InmuebleSinConsignacion,
} from '@/lib/types/inmobiliaria';
import { formatCurrency, portafolioRowKey } from '@/lib/types/inmobiliaria';

type SortField = 'propertyTitle' | 'propertyZone' | 'monthlyRent' | 'commissionPercent' | 'availability';
type SortDirection = 'asc' | 'desc';

interface ConsignacionTableProps {
  /**
   * T-0030: la tabla del portafolio ahora mezcla dos fuentes — mandatos
   * reales (`Consignacion`) y propiedades sin mandato
   * (`InmuebleSinConsignacion`, `GET /inmobiliaria/inmuebles/sin-consignacion`,
   * contract.md T-0030 §3). `kind` discrimina cada fila; ver `PortafolioRow`.
   */
  consignaciones: PortafolioRow[];
  propietariosMap?: Record<string, string>; // id -> name
  agentesMap?: Record<string, { name: string; avatar?: string }>; // id -> { name, avatar }
  onView: (consignacion: Consignacion) => void;
  onEdit: (consignacion: Consignacion) => void;
  onAgendarCita?: (consignacion: Consignacion) => void;
  /**
   * Las tres que traía «Inmuebles · catálogo» cuando era una pantalla aparte.
   * Al fusionar las dos listas tenían que venirse con ella o se perdían.
   * Opcionales para no obligar a los demás call sites (el detalle del agente,
   * el del propietario) a inventarse un comportamiento.
   */
  onVerAviso?: (consignacion: Consignacion) => void;
  onCandidatos?: (consignacion: Consignacion) => void;
  onEliminar?: (consignacion: Consignacion) => void;
  /**
   * R4 (T-0030): activar el alert de una fila sin mandato va DIRECTO a
   * llenarlo, prefiltrado con esta misma fila — nunca a una pantalla de
   * edición genérica ni a una ruta clavada por id de consignación (no lo
   * tiene). Ver contract.md T-0030 §3.4.
   */
  onCompletarMandato?: (inmueble: InmuebleSinConsignacion) => void;
}

// Property type icons. Total lookup vía `getPropertyIcon` — nunca indexar
// este record a mano: `ROOM` (T-0030) no tiene entrada acá porque
// `ConsignacionPropertyType` (back) no lo incluye, y usar `undefined` como
// componente tira "Element type is invalid" y desmonta la tabla ENTERA, no
// una fila (contract.md T-0030 §3.2, "ROOM trap").
const PROPERTY_TYPE_ICONS: Record<Consignacion['propertyType'], React.ElementType> = {
  apartment: Buildings,
  house: House,
  studio: Buildings,
  commercial: Storefront,
  office: Briefcase,
  warehouse: Warehouse,
};

/**
 * Exported — this is the ONE guarded property-type icon lookup for the
 * whole portfolio surface (table + grid). contract-addendum-2.md's own
 * WU-6 brief: "do not add a third unguarded map lookup" alongside this one
 * and `ConsignacionCard`'s (now also guarded, see that file).
 */
export function getPropertyIcon(propertyType: string): React.ElementType {
  return (
    PROPERTY_TYPE_ICONS[propertyType as Consignacion['propertyType']] ??
    // 'room' degrada al ícono de apartamento — mismo criterio que el mapper
    // del front para el filtro de tipo (contract.md T-0030 §3.2).
    Buildings
  );
}

// Availability status (labels resolved via i18n in component) → Cadence Badge variant
const AVAILABILITY_COLORS: Record<
  PropertyAvailability,
  { variant: 'success' | 'default' | 'warning' | 'destructive'; labelKey: string }
> = {
  available: {
    variant: 'success',
    labelKey: 'inmobiliaria.consignaciones.availability.available',
  },
  rented: {
    variant: 'default',
    labelKey: 'inmobiliaria.consignaciones.availability.rented',
  },
  in_process: {
    variant: 'warning',
    labelKey: 'inmobiliaria.consignaciones.availability.inProcess',
  },
  maintenance: {
    variant: 'destructive',
    labelKey: 'inmobiliaria.consignaciones.availability.maintenance',
  },
};

/**
 * ConsignacionTable - Full-featured data table for consigned properties
 * Includes sorting and row actions
 */
export function ConsignacionTable({
  consignaciones,
  propietariosMap = {},
  agentesMap = {},
  onView,
  onEdit,
  onAgendarCita,
  onVerAviso,
  onCandidatos,
  onEliminar,
  onCompletarMandato,
}: ConsignacionTableProps) {
  const { t } = useI18n();
  const [sortField, setSortField] = useState<SortField>('propertyTitle');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Sort consignaciones
  const sortedConsignaciones = useMemo(() => {
    const result = [...consignaciones];

    result.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'propertyTitle':
          aVal = a.propertyTitle.toLowerCase();
          bVal = b.propertyTitle.toLowerCase();
          break;
        case 'propertyZone':
          aVal = `${a.propertyCity} ${a.propertyZone}`.toLowerCase();
          bVal = `${b.propertyCity} ${b.propertyZone}`.toLowerCase();
          break;
        case 'monthlyRent':
          // T-0038: a SALE row's `monthlyRent` is `null` — sink it to the
          // bottom with the same sentinel pattern `commissionPercent`/
          // `availability` already use below, rather than letting
          // `null < number` silently misorder the column.
          //
          // contract-addendum-2.md §A.10 — CORRECTION: this used to say only
          // a `sinMandato` row could carry a null `monthlyRent`. That is no
          // longer true — a `consignacion` (mandated) row is null too when
          // it is a SALE mandate (§A.2). The `?? -1` below already handles
          // both cases correctly; only the comment was wrong.
          aVal = a.monthlyRent ?? -1;
          bVal = b.monthlyRent ?? -1;
          break;
        case 'commissionPercent':
          // Una fila sin mandato no tiene comisión — no es 0 (eso mentiría
          // "comisión cero"), es "no aplica". La hundimos al fondo del orden
          // ascendente con un centinela en vez de romper el comparador. Una
          // fila con mandato de VENTA tampoco tiene comisión de arriendo
          // (commissionPercent es 0 por diseño, §A.3) — ordena por
          // saleCommissionPercent en su lugar.
          aVal = a.kind === 'consignacion' ? (a.listingType === 'sale' ? (a.saleCommissionPercent ?? -1) : a.commissionPercent) : -1;
          bVal = b.kind === 'consignacion' ? (b.listingType === 'sale' ? (b.saleCommissionPercent ?? -1) : b.commissionPercent) : -1;
          break;
        case 'availability':
          // Mismo criterio: sin mandato no hay `availability` (contract.md
          // T-0030 §3.2, "availability trap"). Nunca leerla sin guardar.
          aVal = a.kind === 'consignacion' ? a.availability : '~sin-mandato';
          bVal = b.kind === 'consignacion' ? b.availability : '~sin-mandato';
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [consignaciones, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = sortDirection === 'asc' ? SortAscending : SortDescending;

  const SortableHeader = ({
    field,
    children,
    className,
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => (
    <TableHead className={cn('p-4 text-left', className)}>
      {/*
        allowlist: disparador de orden — Cadence no trae uno (DataTable no
        ordena). El botón HEREDA el tratamiento del encabezado del DS en vez de
        traer el suyo. Dos motivos, los dos medidos en pantalla:
        1. `text-xs font-semibold` reemplazaba la mono de 11px del `TH` por otra
           tipografía, así que esta tabla se leía distinta de las demás.
        2. El navegador le da `text-transform: none` a los controles de
           formulario, y eso PISA el `uppercase` que el `TH` hereda. Por eso
           «Propiedad» salía capitalizada mientras «PROPIETARIO» —que es un
           `span`, no un `button`— sí salía en mayúscula. El `uppercase`
           explícito de acá es lo que devuelve la consistencia.
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

  return (
    <div className="overflow-x-auto">
      <Table className="w-full min-w-[900px]">
        <TableHeader>
          <TableRow className="border-b border-border bg-muted/30">
            {/*
              T-0038 §3.2.5 (D2) — código humano-legible, por agencia/propietario.
              Sin ordenamiento propio (ya viene ordenado por antigüedad de
              creación desde el back) y sin sombra en `Consignacion`:
              `GET /inmobiliaria/consignaciones` no cambió (SYSTEM-MAP.md), así
              que sólo las filas `sinMandato` (`sin-consignacion`, sí frozen
              con `propertyCode`) lo traen — una fila con mandato muestra `—`
              hasta que ese endpoint también lo exponga (gap reportado, no un
              bug de esta unidad de trabajo).
            */}
            <TableHead className="text-left p-4 w-16">
              {t('inmobiliaria.consignaciones.table.code')}
            </TableHead>
            <SortableHeader field="propertyTitle">
              {t('inmobiliaria.consignaciones.table.property')}
            </SortableHeader>
            <SortableHeader field="propertyZone">
              {t('inmobiliaria.consignaciones.table.zone')}
            </SortableHeader>
            <SortableHeader field="monthlyRent">
              {t('inmobiliaria.consignaciones.table.rent')}
            </SortableHeader>
            <SortableHeader field="commissionPercent">
              {t('inmobiliaria.consignaciones.table.commission')}
            </SortableHeader>
            {/* Sin ordenamiento: el `TH` del DS ya viste la etiqueta (mono 11px
                en mayúscula). Envolverla en un `span` con tipografía propia era
                justamente lo que hacía convivir dos estilos en la misma fila. */}
            <TableHead className="text-left p-4 hidden lg:table-cell">
              {t('inmobiliaria.consignaciones.table.owner')}
            </TableHead>
            <TableHead className="text-left p-4 hidden md:table-cell">
              {t('inmobiliaria.consignaciones.table.agent')}
            </TableHead>
            <SortableHeader field="availability">
              {t('inmobiliaria.consignaciones.table.status')}
            </SortableHeader>
            <TableHead className="w-12 p-4"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedConsignaciones.map((row, index) => {
            const rowKey = portafolioRowKey(row);
            const PropertyIcon = getPropertyIcon(row.propertyType);
            const availability =
              row.kind === 'consignacion'
                ? AVAILABILITY_COLORS[row.availability] ?? AVAILABILITY_COLORS.available
                : null;
            const propietarioName =
              row.kind === 'consignacion' ? propietariosMap[row.propietarioId] : undefined;
            const agenteInfo = row.kind === 'consignacion' ? agentesMap[row.agenteId] : undefined;
            const zoneText = row.propertyZone?.trim() ? row.propertyZone : null;

            const handleCompletarMandato = () => {
              if (row.kind === 'sinMandato') onCompletarMandato?.(row);
            };

            // contract.md T-0038 §3.2.5 — PORTFOLIO-only, but only the
            // `sinMandato` source (sin-consignacion) carries it on the wire
            // today; `GET /inmobiliaria/consignaciones` is unchanged.
            // El código lo traen las dos fuentes: `sin-consignacion` como
            // `code`, y `GET /consignaciones` como `propertyCode` (T-0038
            // WU-5). Antes las filas con mandato pintaban «—» aunque el back
            // ya lo mandaba (Nico lo vio en su tabla, 2026-09-02).
            const propertyCode = row.kind === 'sinMandato' ? row.code : (row.propertyCode ?? undefined);

            return (
              <motion.tr
                key={rowKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => (row.kind === 'consignacion' ? onView(row) : handleCompletarMandato())}
                className="border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
              >
                {/* Code (T-0038 §3.2.5) */}
                <TableCell className="p-4">
                  <span className="font-mono tabular-nums text-fg-muted text-sm">
                    {propertyCode != null ? `#${propertyCode}` : '—'}
                  </span>
                </TableCell>

                {/* Property */}
                <TableCell className="p-4">
                  <div className="flex items-center gap-3">
                    {row.propertyThumbnail ? (
                      <div className="w-12 h-12 rounded-md overflow-hidden shrink-0">
                        <img
                          src={row.propertyThumbnail}
                          alt={row.propertyTitle}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <PropertyIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate max-w-[200px]">
                        {row.propertyTitle}
                      </p>
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {row.propertyAddress}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* Zone */}
                <TableCell className="p-4">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      {/* Zona vacía (posible en el back, contract.md T-0030
                          §3.2) → se omite la línea entera, nunca un renglón
                          en blanco arriba de la ciudad. */}
                      {zoneText && (
                        <p className="text-foreground truncate">{zoneText}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {row.propertyCity}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* Canon */}
                {/*
                  `whitespace-nowrap`: la columna es angosta y el importe se
                  partía en dos renglones. Un monto cortado a mitad se lee como
                  otra cifra, así que acá el número manda sobre el ancho — para
                  eso la tabla tiene su propio scroll horizontal.
                */}
                <TableCell className="p-4 whitespace-nowrap">
                  <div>
                    {/*
                      contract-addendum-2.md §A.10 — CORRECTION: this used to
                      say only a `sinMandato` row could be a SALE listing.
                      That is no longer true: a `consignacion` (mandated) row
                      is also SALE-able (§A.1), but `Consignacion` carries no
                      `salePrice` (that field lives on `Property`, never
                      denormalised here) — so a mandated sale row shows the
                      sale tag with no price, while a mandate-less imported
                      sale row still shows `Property.salePrice`. Either way,
                      never `formatCurrency(null)` (it silently renders
                      "$ 0", C6).
                    */}
                    {row.listingType === 'sale' ? (
                      row.kind === 'sinMandato' ? (
                        <p className="font-semibold text-foreground tabular-nums">
                          {row.salePrice != null ? formatCurrency(row.salePrice) : '—'}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            {t('inmobiliaria.consignaciones.table.saleTag')}
                          </span>
                        </p>
                      ) : (
                        <p className="font-semibold text-muted-foreground tabular-nums">
                          {t('inmobiliaria.consignaciones.table.saleTag')}
                        </p>
                      )
                    ) : (
                      <p className="font-semibold text-foreground tabular-nums">
                        {row.monthlyRent != null ? formatCurrency(row.monthlyRent) : '—'}
                      </p>
                    )}
                    {/*
                      Antes: `consignacion.adminFee && consignacion.adminFee > 0 && (…)`.
                      Con `adminFee === 0` la primera guarda devuelve `0` —no `false`—
                      y React pinta ese cero: quedaba un «0» suelto debajo del canon,
                      que se ve igual que un importe partido en dos renglones.
                      Tampoco se pinta en una fila en venta, con o sin mandato
                      (§A.2 — "Administración: $0" no debe aparecer nunca).
                    */}
                    {row.listingType !== 'sale' && row.adminFee != null && row.adminFee > 0 && (
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {t('inmobiliaria.consignaciones.table.adminFee', { amount: formatCurrency(row.adminFee) })}
                      </p>
                    )}
                  </div>
                </TableCell>

                {/* Commission — no existe sin mandato. Con mandato de venta
                    (§A.3), `commissionPercent` es siempre 0: se muestra
                    `saleCommissionPercent` en su lugar. */}
                <TableCell className="p-4">
                  {row.kind === 'consignacion' ? (
                    <Badge variant="secondary" className="gap-1 tabular-nums">
                      <Percent className="w-3.5 h-3.5" />
                      {row.listingType === 'sale'
                        ? (row.saleCommissionPercent != null ? `${row.saleCommissionPercent}%` : '—')
                        : `${row.commissionPercent}%`}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Propietario */}
                <TableCell className="p-4 hidden lg:table-cell">
                  {propietarioName ? (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-surface-muted dark:bg-ink flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-fg-muted dark:text-fg-subtle" />
                      </div>
                      <span className="text-foreground truncate max-w-[120px]">
                        {propietarioName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Agente */}
                <TableCell className="p-4 hidden md:table-cell">
                  {agenteInfo ? (
                    <div className="flex items-center gap-2">
                      {agenteInfo.avatar ? (
                        <img
                          src={agenteInfo.avatar}
                          alt={agenteInfo.name}
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
                          <span className="text-xs font-medium text-primary">
                            {agenteInfo.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span className="text-foreground truncate max-w-[100px]">
                        {agenteInfo.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Status — sin mandato, el Estado ES el alert de R4: no hay
                    `availability` que pintar (contract.md T-0030 §3.2,
                    "availability trap"), así que la celda entera se vuelve el
                    disparador que manda a llenar el mandato. */}
                <TableCell className="p-4">
                  {availability ? (
                    <Badge variant={availability.variant}>
                      {t(availability.labelKey)}
                    </Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      hideArrow
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompletarMandato();
                      }}
                      className="h-auto gap-1.5 bg-warning-soft px-3 py-1 text-xs font-medium text-warning hover:bg-warning-soft hover:opacity-80"
                    >
                      <WarningCircle className="w-3.5 h-3.5" weight="fill" />
                      {t('inmobiliaria.consignaciones.table.missingMandate')}
                    </Button>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell className="p-4" onClick={(e) => e.stopPropagation()}>
                  <DropdownList
                    open={openMenuId === rowKey}
                    onOpenChange={(o) => setOpenMenuId(o ? rowKey : null)}
                  >
                    <DropdownListTrigger asChild>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        icon={<DotsThree className="w-5 h-5" weight="bold" />}
                        aria-label="Acciones"
                      />
                    </DropdownListTrigger>
                    <DropdownListContent align="end" className="w-40">
                      {row.kind === 'consignacion' ? (
                        <>
                          <DropdownListItem
                            className="gap-3"
                            onClick={() => onView(row)}
                          >
                            <Eye className="w-4 h-4" />
                            <span className="text-sm">{t('inmobiliaria.consignaciones.table.viewDetail')}</span>
                          </DropdownListItem>
                          <DropdownListItem
                            className="gap-3"
                            onClick={() => onEdit(row)}
                          >
                            <PencilSimple className="w-4 h-4" />
                            <span className="text-sm">{t('inmobiliaria.consignaciones.table.edit')}</span>
                          </DropdownListItem>
                          {onAgendarCita && (
                            <DropdownListItem
                              className="gap-3"
                              onClick={() => onAgendarCita(row)}
                            >
                              <CalendarPlus className="w-4 h-4" />
                              <span className="text-sm">{t('inmobiliaria.agenda.pedirCita')}</span>
                            </DropdownListItem>
                          )}
                          {onCandidatos && (
                            <DropdownListItem
                              className="gap-3"
                              onClick={() => onCandidatos(row)}
                            >
                              <Users className="w-4 h-4" />
                              <span className="text-sm">
                                {t('inmobiliaria.inmuebles.acciones.candidatos')}
                              </span>
                            </DropdownListItem>
                          )}
                          {/* El aviso público sólo existe si hay inmueble: un
                              mandato de la migración de cartera puede no tenerlo
                              todavía, y un enlace a la nada no es una acción. */}
                          {onVerAviso && row.propertyId && (
                            <DropdownListItem
                              className="gap-3"
                              onClick={() => onVerAviso(row)}
                            >
                              <ArrowSquareOut className="w-4 h-4" />
                              <span className="text-sm">
                                {t('inmobiliaria.inmuebles.acciones.verAviso')}
                              </span>
                            </DropdownListItem>
                          )}
                          {onEliminar && (
                            <DropdownListItem
                              className="gap-3 text-danger focus:text-danger"
                              onClick={() => onEliminar(row)}
                            >
                              <Trash className="w-4 h-4" />
                              <span className="text-sm">
                                {t('inmobiliaria.inmuebles.acciones.eliminar')}
                              </span>
                            </DropdownListItem>
                          )}
                        </>
                      ) : (
                        // Sin mandato: nada consignación-keyed — no hay `id`
                        // de consignación al que navegar (contract.md T-0030
                        // §3.2 lo omite a propósito). La única acción posible
                        // es completar el mandato.
                        <DropdownListItem
                          className="gap-3"
                          onClick={handleCompletarMandato}
                        >
                          <WarningCircle className="w-4 h-4" />
                          <span className="text-sm">
                            {t('inmobiliaria.consignaciones.table.missingMandate')}
                          </span>
                        </DropdownListItem>
                      )}
                    </DropdownListContent>
                  </DropdownList>
                </TableCell>
              </motion.tr>
            );
          })}
        </TableBody>
      </Table>

      {/* Empty State */}
      {sortedConsignaciones.length === 0 && (
        <div className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Buildings className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {t('inmobiliaria.consignaciones.table.emptyTitle')}
          </h3>
          <p className="text-muted-foreground">
            {t('inmobiliaria.consignaciones.table.emptyDescription')}
          </p>
        </div>
      )}
    </div>
  );
}

export default ConsignacionTable;
