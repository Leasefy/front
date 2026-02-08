'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { cn } from '@/lib/utils';
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

// Availability status colors
const AVAILABILITY_COLORS: Record<PropertyAvailability, { bg: string; text: string; label: string }> = {
  available: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    label: 'Disponible',
  },
  rented: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-700 dark:text-indigo-400',
    label: 'Arrendado',
  },
  in_process: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    label: 'En proceso',
  },
  maintenance: {
    bg: 'bg-rose-100 dark:bg-rose-900/30',
    text: 'text-rose-700 dark:text-rose-400',
    label: 'Mantenimiento',
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
    <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
      <table className="w-full min-w-[900px]">
        <thead>
          <tr className="border-b border-neutral-100 dark:border-neutral-800">
            <th className="text-left p-4">
              <button
                onClick={() => handleSort('propertyTitle')}
                className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                Propiedad
                {sortField === 'propertyTitle' && <SortIcon className="w-3.5 h-3.5" />}
              </button>
            </th>
            <th className="text-left p-4">
              <button
                onClick={() => handleSort('propertyZone')}
                className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                Zona
                {sortField === 'propertyZone' && <SortIcon className="w-3.5 h-3.5" />}
              </button>
            </th>
            <th className="text-left p-4">
              <button
                onClick={() => handleSort('monthlyRent')}
                className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                Canon
                {sortField === 'monthlyRent' && <SortIcon className="w-3.5 h-3.5" />}
              </button>
            </th>
            <th className="text-left p-4">
              <button
                onClick={() => handleSort('commissionPercent')}
                className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                Comisión
                {sortField === 'commissionPercent' && <SortIcon className="w-3.5 h-3.5" />}
              </button>
            </th>
            <th className="text-left p-4 hidden lg:table-cell">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Propietario
              </span>
            </th>
            <th className="text-left p-4 hidden md:table-cell">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Agente
              </span>
            </th>
            <th className="text-left p-4">
              <button
                onClick={() => handleSort('availability')}
                className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                Estado
                {sortField === 'availability' && <SortIcon className="w-3.5 h-3.5" />}
              </button>
            </th>
            <th className="w-12 p-4"></th>
          </tr>
        </thead>
        <tbody>
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
                className="border-b border-neutral-50 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-[#141416] cursor-pointer transition-colors"
              >
                {/* Property */}
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {consignacion.propertyThumbnail ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                        <img
                          src={consignacion.propertyThumbnail}
                          alt={consignacion.propertyTitle}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                        <PropertyIcon className="w-6 h-6 text-neutral-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-900 dark:text-white truncate max-w-[200px]">
                        {consignacion.propertyTitle}
                      </p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate max-w-[200px]">
                        {consignacion.propertyAddress}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Zone */}
                <td className="p-4">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-neutral-900 dark:text-white truncate">
                        {consignacion.propertyZone}
                      </p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {consignacion.propertyCity}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Canon */}
                <td className="p-4">
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      {formatCurrency(consignacion.monthlyRent)}
                    </p>
                    {consignacion.adminFee && consignacion.adminFee > 0 && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        + {formatCurrency(consignacion.adminFee)} admin
                      </p>
                    )}
                  </div>
                </td>

                {/* Commission */}
                <td className="p-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm font-medium">
                    <Percent className="w-3.5 h-3.5" />
                    {consignacion.commissionPercent}%
                  </span>
                </td>

                {/* Propietario */}
                <td className="p-4 hidden lg:table-cell">
                  {propietarioName ? (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-neutral-700 dark:text-neutral-300 truncate max-w-[120px]">
                        {propietarioName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </td>

                {/* Agente */}
                <td className="p-4 hidden md:table-cell">
                  {agenteInfo ? (
                    <div className="flex items-center gap-2">
                      {agenteInfo.avatar ? (
                        <img
                          src={agenteInfo.avatar}
                          alt={agenteInfo.name}
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                            {agenteInfo.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span className="text-neutral-700 dark:text-neutral-300 truncate max-w-[100px]">
                        {agenteInfo.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </td>

                {/* Status */}
                <td className="p-4">
                  <span className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-medium', availability.bg, availability.text)}>
                    {availability.label}
                  </span>
                </td>

                {/* Actions */}
                <td className="p-4">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === consignacion.id ? null : consignacion.id);
                      }}
                      className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    >
                      <DotsThree className="w-5 h-5 text-neutral-500" weight="bold" />
                    </button>

                    <AnimatePresence>
                      {openMenuId === consignacion.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-full mt-1 w-40 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-xl z-10"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onView(consignacion);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="text-sm">Ver detalle</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(consignacion);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                          >
                            <PencilSimple className="w-4 h-4" />
                            <span className="text-sm">Editar</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>

      {/* Empty State */}
      {sortedConsignaciones.length === 0 && (
        <div className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <Buildings className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
            No se encontraron propiedades
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400">
            Ajusta los filtros o agrega una nueva consignacion
          </p>
        </div>
      )}
    </div>
  );
}

export default ConsignacionTable;
