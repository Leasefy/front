'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Buildings,
  House,
  Storefront,
  Warehouse,
  Briefcase,
  MapPin,
  User,
  CaretRight,
  Eye,
  PencilSimple,
  Percent,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { Consignacion, PropertyAvailability, ConsignacionStatus } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

interface ConsignacionCardProps {
  consignacion: Consignacion;
  propietarioName?: string;
  agenteName?: string;
  agenteAvatar?: string;
  onClick?: () => void;
  onView?: () => void;
  onEdit?: () => void;
  selected?: boolean;
  variant?: 'default' | 'compact';
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

/**
 * ConsignacionCard - Card for displaying consigned property summary
 * Used in grid layouts and selection lists
 */
export function ConsignacionCard({
  consignacion,
  propietarioName,
  agenteName,
  agenteAvatar,
  onClick,
  onView,
  onEdit,
  selected,
  variant = 'default',
}: ConsignacionCardProps) {
  const { t, locale } = useI18n();

  // Availability status colors
  const AVAILABILITY_COLORS: Record<PropertyAvailability, { bg: string; text: string; label: string }> = useMemo(() => ({
    available: {
      bg: 'bg-success-soft',
      text: 'text-success',
      label: t('inmobiliaria.portafolio.card.availability.available'),
    },
    rented: {
      bg: 'bg-primary-soft',
      text: 'text-primary',
      label: t('inmobiliaria.portafolio.card.availability.rented'),
    },
    in_process: {
      bg: 'bg-warning-soft',
      text: 'text-warning',
      label: t('inmobiliaria.portafolio.card.availability.inProcess'),
    },
    maintenance: {
      bg: 'bg-danger-soft',
      text: 'text-danger',
      label: t('inmobiliaria.portafolio.card.availability.maintenance'),
    },
  }), [t]);

  // Consignacion status colors (secondary indicator)
  const STATUS_COLORS: Record<ConsignacionStatus, { bg: string; text: string; label: string }> = useMemo(() => ({
    active: {
      bg: 'bg-success-soft',
      text: 'text-success',
      label: t('inmobiliaria.portafolio.card.status.active'),
    },
    pending: {
      bg: 'bg-warning-soft',
      text: 'text-warning',
      label: t('inmobiliaria.portafolio.card.status.pending'),
    },
    expired: {
      bg: 'bg-neutral-100 dark:bg-neutral-800',
      text: 'text-neutral-600 dark:text-neutral-400',
      label: t('inmobiliaria.portafolio.card.status.expired'),
    },
    terminated: {
      bg: 'bg-danger-soft',
      text: 'text-danger',
      label: t('inmobiliaria.portafolio.card.status.terminated'),
    },
  }), [t]);

  const PropertyIcon = PROPERTY_TYPE_ICONS[consignacion.propertyType];
  const availability = AVAILABILITY_COLORS[consignacion.availability];
  const status = STATUS_COLORS[consignacion.status];

  // Compact variant - single row for list views
  if (variant === 'compact') {
    return (
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={cn(
          'w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left',
          selected
            ? 'border-primary/30 bg-primary-soft dark:border-primary/30'
            : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] hover:border-neutral-300 dark:hover:border-neutral-600'
        )}
      >
        {/* Thumbnail or Icon */}
        {consignacion.propertyThumbnail ? (
          <div className="w-12 h-12 rounded-md overflow-hidden shrink-0">
            <img
              src={consignacion.propertyThumbnail}
              alt={consignacion.propertyTitle}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
            <PropertyIcon className="w-6 h-6 text-neutral-400" />
          </div>
        )}

        {/* Property info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-neutral-900 dark:text-white truncate text-sm">
            {consignacion.propertyTitle}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
            {consignacion.propertyZone} · {formatCurrency(consignacion.monthlyRent)}{t('inmobiliaria.portafolio.card.perMonth')}
          </p>
        </div>

        {/* Status badge */}
        <span className={cn('px-2 py-1 rounded-full text-xs font-medium shrink-0', availability.bg, availability.text)}>
          {availability.label}
        </span>

        {/* Selection indicator */}
        {selected && (
          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
            <motion.svg
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </motion.svg>
          </div>
        )}
      </motion.button>
    );
  }

  // Default variant - full card with stats
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        'w-full rounded-xl border bg-white dark:bg-[#1a1a1c] overflow-hidden transition-all duration-200 group',
        selected
          ? 'border-primary/30 ring-2 ring-primary/30'
          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      {/* Image/Thumbnail Header */}
      <div className="relative h-40 bg-neutral-100 dark:bg-neutral-800">
        {consignacion.propertyThumbnail ? (
          <img
            src={consignacion.propertyThumbnail}
            alt={consignacion.propertyTitle}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PropertyIcon className="w-16 h-16 text-neutral-300 dark:text-neutral-600" />
          </div>
        )}

        {/* Availability badge - top left */}
        <div className="absolute top-3 left-3">
          <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', availability.bg, availability.text)}>
            {availability.label}
          </span>
        </div>

        {/* Commission pill - top right */}
        <div className="absolute top-3 right-3">
          <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-1">
            <Percent className="w-3 h-3" />
            {consignacion.commissionPercent}%
          </span>
        </div>

        {/* Property type indicator - bottom left */}
        <div className="absolute bottom-3 left-3">
          <span className="px-2.5 py-1 rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
            <PropertyIcon className="w-3.5 h-3.5" />
            {t(`inmobiliaria.portafolio.card.propertyType.${consignacion.propertyType}`)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Title and Address */}
        <div className="mb-3">
          <h3 className="font-semibold text-neutral-900 dark:text-white line-clamp-1 mb-1">
            {consignacion.propertyTitle}
          </h3>
          <div className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{consignacion.propertyZone}, {consignacion.propertyCity}</span>
          </div>
        </div>

        {/* Rent Info */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-xl font-bold text-neutral-900 dark:text-white">
            {formatCurrency(consignacion.monthlyRent)}
          </span>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.portafolio.card.perMonth')}</span>
          {consignacion.adminFee && consignacion.adminFee > 0 && (
            <span className="text-xs text-neutral-400 dark:text-neutral-500">
              + {formatCurrency(consignacion.adminFee)} {t('inmobiliaria.portafolio.card.admin')}
            </span>
          )}
        </div>

        {/* Propietario and Agente */}
        <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
          {/* Propietario */}
          {propietarioName && (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.portafolio.card.owner')}</p>
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                  {propietarioName}
                </p>
              </div>
            </div>
          )}

          {/* Agente */}
          {agenteName && (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {agenteAvatar ? (
                <img
                  src={agenteAvatar}
                  alt={agenteName}
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium text-primary">
                    {agenteName.charAt(0)}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.portafolio.card.agent')}</p>
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                  {agenteName}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tenant info (if rented) */}
        {consignacion.availability === 'rented' && consignacion.currentTenantName && (
          <div className="mb-4 p-3 rounded-xl bg-primary-soft">
            <p className="text-xs text-primary mb-0.5">{t('inmobiliaria.portafolio.card.currentTenant')}</p>
            <p className="text-sm font-medium text-primary">
              {consignacion.currentTenantName}
            </p>
            {consignacion.leaseEndDate && (
              <p className="text-xs text-primary mt-1">
                {t('inmobiliaria.portafolio.card.leaseUntil', {
                  date: new Date(consignacion.leaseEndDate).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }),
                })}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onView && (
              <button
                onClick={(e) => { e.stopPropagation(); onView(); }}
                className="p-2 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                title={t('inmobiliaria.portafolio.card.viewDetailTitle')}
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="p-2 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                title={t('inmobiliaria.portafolio.card.editTitle')}
              >
                <PencilSimple className="w-4 h-4" />
              </button>
            )}
          </div>
          {onClick && (
            <div className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 group-hover:text-primary transition-colors">
              {t('inmobiliaria.portafolio.card.viewDetail')}
              <CaretRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default ConsignacionCard;
