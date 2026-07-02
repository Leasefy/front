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
} from '@phosphor-icons/react';
import { IconButton } from '@leasefy/cadence';
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

  return (
    <div className="overflow-x-auto">
      <Table className="w-full min-w-[900px]">
        <TableHeader>
          <TableRow className="border-b border-border bg-muted/30">
            <TableHead className="text-left p-4">
              {/* allowlist: table column-sort trigger — no Cadence primitive (DataTable has no sort) */}
              <button
                onClick={() => handleSort('propertyTitle')}
                className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                {t('inmobiliaria.consignaciones.table.property')}
                {sortField === 'propertyTitle' && <SortIcon className="w-3.5 h-3.5" />}
              </button>
            </TableHead>
            <TableHead className="text-left p-4">
              {/* allowlist: table column-sort trigger — no Cadence primitive (DataTable has no sort) */}
              <button
                onClick={() => handleSort('propertyZone')}
                className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                {t('inmobiliaria.consignaciones.table.zone')}
                {sortField === 'propertyZone' && <SortIcon className="w-3.5 h-3.5" />}
              </button>
            </TableHead>
            <TableHead className="text-left p-4">
              {/* allowlist: table column-sort trigger — no Cadence primitive (DataTable has no sort) */}
              <button
                onClick={() => handleSort('monthlyRent')}
                className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                {t('inmobiliaria.consignaciones.table.rent')}
                {sortField === 'monthlyRent' && <SortIcon className="w-3.5 h-3.5" />}
              </button>
            </TableHead>
            <TableHead className="text-left p-4">
              {/* allowlist: table column-sort trigger — no Cadence primitive (DataTable has no sort) */}
              <button
                onClick={() => handleSort('commissionPercent')}
                className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                {t('inmobiliaria.consignaciones.table.commission')}
                {sortField === 'commissionPercent' && <SortIcon className="w-3.5 h-3.5" />}
              </button>
            </TableHead>
            <TableHead className="text-left p-4 hidden lg:table-cell">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('inmobiliaria.consignaciones.table.owner')}
              </span>
            </TableHead>
            <TableHead className="text-left p-4 hidden md:table-cell">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('inmobiliaria.consignaciones.table.agent')}
              </span>
            </TableHead>
            <TableHead className="text-left p-4">
              {/* allowlist: table column-sort trigger — no Cadence primitive (DataTable has no sort) */}
              <button
                onClick={() => handleSort('availability')}
                className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                {t('inmobiliaria.consignaciones.table.status')}
                {sortField === 'availability' && <SortIcon className="w-3.5 h-3.5" />}
              </button>
            </TableHead>
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
                <TableCell className="p-4">
                  <div>
                    <p className="font-semibold text-foreground tabular-nums">
                      {formatCurrency(consignacion.monthlyRent)}
                    </p>
                    {consignacion.adminFee && consignacion.adminFee > 0 && (
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
                        <div className="w-7 h-7 rounded-full bg-surface-brand flex items-center justify-center shrink-0">
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
