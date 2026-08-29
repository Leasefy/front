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
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
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
    bg: 'bg-success-soft',
    text: 'text-success',
    icon: CheckCircle,
  },
  rented: {
    label: 'Arrendado',
    bg: 'bg-primary-soft',
    text: 'text-primary',
    icon: House,
  },
  in_process: {
    label: 'En proceso',
    bg: 'bg-warning-soft',
    text: 'text-warning',
    icon: Timer,
  },
  maintenance: {
    label: 'Mantenimiento',
    bg: 'bg-danger-soft',
    text: 'text-danger',
    icon: Wrench,
  },
};

/**
 * AgentePropertyList - List of properties assigned to an agente
 * Collapsible section with property cards and navigation to detail page
 */
export function AgentePropertyList({ consignaciones, onAssignProperty, className }: AgentePropertyListProps) {
  const { t } = useI18n();
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
        'rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#14130F] overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className="w-full flex items-center justify-between px-5 py-4 border-b border-border-faint dark:border-border-strong hover:bg-surface-muted dark:hover:bg-ink transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary-soft flex items-center justify-center">
            <Buildings className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-fg dark:text-white">
              {t('inmobiliaria.agente.assignedProperties')}
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-surface-muted dark:bg-ink text-xs font-medium text-fg-muted dark:text-fg-subtle">
              {consignaciones.length}
            </span>
          </div>
        </div>
        {isExpanded ? (
          <CaretUp className="w-5 h-5 text-fg-subtle" />
        ) : (
          <CaretDown className="w-5 h-5 text-fg-subtle" />
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
                        href={`/panel/inmobiliaria/inmuebles/${consignacion.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl bg-surface-muted dark:bg-[#14130F] hover:bg-surface-muted dark:hover:bg-ink transition-colors group"
                      >
                        {/* Thumbnail */}
                        <div className="w-14 h-14 rounded-xl bg-surface-muted dark:bg-ink overflow-hidden shrink-0">
                          {consignacion.propertyThumbnail ? (
                            <img
                              src={consignacion.propertyThumbnail}
                              alt={consignacion.propertyTitle}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <PropertyIcon className="w-6 h-6 text-fg-subtle" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-fg dark:text-white truncate group-hover:text-primary dark:group-hover:text-primary transition-colors">
                            {consignacion.propertyTitle}
                          </h4>
                          <div className="flex items-center gap-1.5 text-xs text-fg-muted dark:text-fg-subtle mt-0.5">
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
                          <span className="text-sm font-semibold text-fg dark:text-white">
                            {consignacion.listingType === 'sale'
                              ? (consignacion.saleCommissionPercent != null ? `${consignacion.saleCommissionPercent}%` : '—')
                              : (consignacion.monthlyRent != null ? formatCurrency(consignacion.monthlyRent) : '—')}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-muted dark:bg-ink flex items-center justify-center">
                    <Buildings className="w-6 h-6 text-fg-subtle" />
                  </div>
                  <p className="text-fg-muted dark:text-fg-subtle font-medium mb-1">
                    {t('inmobiliaria.agente.noAssignedProperties')}
                  </p>
                  <p className="text-sm text-fg-muted dark:text-fg-muted">
                    {t('inmobiliaria.agente.noPropertiesInPortfolio')}
                  </p>
                </div>
              )}

              {/* Assign Property Button */}
              <Button
                variant="outline"
                hideArrow
                onClick={onAssignProperty}
                disabled
                className="w-full border-dashed gap-2"
                title={t('inmobiliaria.agente.comingSoon')}
              >
                <Plus className="w-4 h-4" />
                {t('inmobiliaria.agente.assignProperty')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AgentePropertyList;
