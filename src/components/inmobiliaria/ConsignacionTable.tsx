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
} from '@phosphor-icons/react';
import { IconButton } from '@leasefy/cadence';
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
import type { Consignacion, PropertyAvailability } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

type SortField = 'propertyTitle' | 'propertyZone' | 'monthlyRent' | 'commissionPercent' | 'availability';
type SortDirection = 'asc' | 'desc';

interface ConsignacionTableProps {
  consignaciones: Consignacion[];
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
}

// Property type icons
const PROPERTY_TYPE_ICONS: Record<Consignacion['propertyType'], React.ElementType> = {
  apartment: Buildings,
  house: House,
  studio: Buildings,
  commercial: Storefront,
  office: Briefcase,
  warehouse: Warehouse,
};

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
          aVal = a.monthlyRent;
          bVal = b.monthlyRent;
          break;
        case 'commissionPercent':
          aVal = a.commissionPercent;
          bVal = b.commissionPercent;
          break;
        case 'availability':
          aVal = a.availability;
          bVal = b.availability;
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
          {sortedConsignaciones.map((consignacion, index) => {
            const PropertyIcon = PROPERTY_TYPE_ICONS[consignacion.propertyType];
            const availability = AVAILABILITY_COLORS[consignacion.availability];
            const propietarioName = propietariosMap[consignacion.propietarioId];
            const agenteInfo = agentesMap[consignacion.agenteId];

            return (
              <motion.tr
                key={consignacion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => onView(consignacion)}
                className="border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
              >
                {/* Property */}
                <TableCell className="p-4">
                  <div className="flex items-center gap-3">
                    {consignacion.propertyThumbnail ? (
                      <div className="w-12 h-12 rounded-md overflow-hidden shrink-0">
                        <img
                          src={consignacion.propertyThumbnail}
                          alt={consignacion.propertyTitle}
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
                        {consignacion.propertyTitle}
                      </p>
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {consignacion.propertyAddress}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* Zone */}
                <TableCell className="p-4">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-foreground truncate">
                        {consignacion.propertyZone}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {consignacion.propertyCity}
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
                    <p className="font-semibold text-foreground tabular-nums">
                      {formatCurrency(consignacion.monthlyRent)}
                    </p>
                    {/*
                      Antes: `consignacion.adminFee && consignacion.adminFee > 0 && (…)`.
                      Con `adminFee === 0` la primera guarda devuelve `0` —no `false`—
                      y React pinta ese cero: quedaba un «0» suelto debajo del canon,
                      que se ve igual que un importe partido en dos renglones.
                    */}
                    {consignacion.adminFee != null && consignacion.adminFee > 0 && (
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {t('inmobiliaria.consignaciones.table.adminFee', { amount: formatCurrency(consignacion.adminFee) })}
                      </p>
                    )}
                  </div>
                </TableCell>

                {/* Commission */}
                <TableCell className="p-4">
                  <Badge variant="secondary" className="gap-1 tabular-nums">
                    <Percent className="w-3.5 h-3.5" />
                    {consignacion.commissionPercent}%
                  </Badge>
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

                {/* Status */}
                <TableCell className="p-4">
                  <Badge variant={availability.variant}>
                    {t(availability.labelKey)}
                  </Badge>
                </TableCell>

                {/* Actions */}
                <TableCell className="p-4" onClick={(e) => e.stopPropagation()}>
                  <DropdownList
                    open={openMenuId === consignacion.id}
                    onOpenChange={(o) => setOpenMenuId(o ? consignacion.id : null)}
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
                      <DropdownListItem
                        className="gap-3"
                        onClick={() => onView(consignacion)}
                      >
                        <Eye className="w-4 h-4" />
                        <span className="text-sm">{t('inmobiliaria.consignaciones.table.viewDetail')}</span>
                      </DropdownListItem>
                      <DropdownListItem
                        className="gap-3"
                        onClick={() => onEdit(consignacion)}
                      >
                        <PencilSimple className="w-4 h-4" />
                        <span className="text-sm">{t('inmobiliaria.consignaciones.table.edit')}</span>
                      </DropdownListItem>
                      {onAgendarCita && (
                        <DropdownListItem
                          className="gap-3"
                          onClick={() => onAgendarCita(consignacion)}
                        >
                          <CalendarPlus className="w-4 h-4" />
                          <span className="text-sm">{t('inmobiliaria.agenda.pedirCita')}</span>
                        </DropdownListItem>
                      )}
                      {onCandidatos && (
                        <DropdownListItem
                          className="gap-3"
                          onClick={() => onCandidatos(consignacion)}
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
                      {onVerAviso && consignacion.propertyId && (
                        <DropdownListItem
                          className="gap-3"
                          onClick={() => onVerAviso(consignacion)}
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
                          onClick={() => onEliminar(consignacion)}
                        >
                          <Trash className="w-4 h-4" />
                          <span className="text-sm">
                            {t('inmobiliaria.inmuebles.acciones.eliminar')}
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
