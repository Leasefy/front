'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Buildings,
  House,
  Storefront,
  Warehouse,
  Briefcase,
  MapPin,
  CaretDown,
  CaretUp,
  Plus,
  CheckCircle,
  Timer,
  Wrench,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/use-translation';
import type { Consignacion, PropertyAvailability } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

interface AgentePropertyListProps {
  consignaciones: Consignacion[];
  onAssignProperty?: () => void;
  className?: string;
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

// Availability status config
const AVAILABILITY_CONFIG: Record<PropertyAvailability, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  available: {
    label: 'Disponible',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    icon: CheckCircle,
  },
  rented: {
    label: 'Arrendado',
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-700 dark:text-indigo-400',
    icon: House,
  },
  in_process: {
    label: 'En proceso',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    icon: Timer,
  },
  maintenance: {
    label: 'Mantenimiento',
    bg: 'bg-rose-100 dark:bg-rose-900/30',
    text: 'text-rose-700 dark:text-rose-400',
    icon: Wrench,
  },
};

/**
 * AgentePropertyList - List of properties assigned to an agente
 * Collapsible section with property cards and navigation to detail page
 */
export function AgentePropertyList({ consignaciones, onAssignProperty, className }: AgentePropertyListProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);

  const availabilityLabels: Record<PropertyAvailability, string> = {
    available: t('inmobiliaria.agente.available'),
    rented: t('inmobiliaria.agente.rented'),
    in_process: t('inmobiliaria.agente.inProcess'),
    maintenance: t('inmobiliaria.agente.maintenance'),
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <Buildings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-neutral-900 dark:text-white">
              {t('inmobiliaria.agente.assignedProperties')}
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-600 dark:text-neutral-400">
              {consignaciones.length}
            </span>
          </div>
        </div>
        {isExpanded ? (
          <CaretUp className="w-5 h-5 text-neutral-400" />
        ) : (
          <CaretDown className="w-5 h-5 text-neutral-400" />
        )}
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 space-y-3">
              {consignaciones.length > 0 ? (
                <>
                  {consignaciones.map((consignacion) => {
                    const PropertyIcon = PROPERTY_TYPE_ICONS[consignacion.propertyType];
                    const availability = AVAILABILITY_CONFIG[consignacion.availability];
                    const AvailabilityIcon = availability.icon;

                    return (
                      <Link
                        key={consignacion.id}
                        href={`/panel/inmobiliaria/portafolio/${consignacion.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-[#141416] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group"
                      >
                        {/* Thumbnail */}
                        <div className="w-14 h-14 rounded-xl bg-neutral-200 dark:bg-neutral-700 overflow-hidden shrink-0">
                          {consignacion.propertyThumbnail ? (
                            <img
                              src={consignacion.propertyThumbnail}
                              alt={consignacion.propertyTitle}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <PropertyIcon className="w-6 h-6 text-neutral-400" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-neutral-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {consignacion.propertyTitle}
                          </h4>
                          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{consignacion.propertyZone}</span>
                          </div>
                        </div>

                        {/* Status and Rent */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                              availability.bg,
                              availability.text
                            )}
                          >
                            <AvailabilityIcon className="w-3 h-3" />
                            {availabilityLabels[consignacion.availability]}
                          </span>
                          <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                            {formatCurrency(consignacion.monthlyRent)}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                    <Buildings className="w-6 h-6 text-neutral-400" />
                  </div>
                  <p className="text-neutral-600 dark:text-neutral-400 font-medium mb-1">
                    {t('inmobiliaria.agente.noAssignedProperties')}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-500">
                    {t('inmobiliaria.agente.noPropertiesInPortfolio')}
                  </p>
                </div>
              )}

              {/* Assign Property Button */}
              <button
                onClick={onAssignProperty}
                disabled
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-400 dark:text-neutral-500 font-medium opacity-60 cursor-not-allowed"
                title={t('inmobiliaria.agente.comingSoon')}
              >
                <Plus className="w-4 h-4" />
                {t('inmobiliaria.agente.assignProperty')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AgentePropertyList;
