'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Buildings,
  House,
  Storefront,
  Warehouse,
  Briefcase,
  MapPin,
  CalendarBlank,
  Percent,
  PencilSimple,
  Eye,
  DotsThree,
  CaretDown,
  ArrowSquareOut,
  ArrowCounterClockwise,
  XCircle,
  Wrench,
  CheckCircle,
  Timer,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { Consignacion, PropertyAvailability, ConsignacionStatus } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

interface ConsignacionHeaderProps {
  consignacion: Consignacion;
  onEdit?: () => void;
  onViewPortal?: () => void;
  onChangeStatus?: (status: PropertyAvailability) => void;
  onTerminate?: () => void;
  onRenew?: () => void;
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

// Availability status colors (labels resolved via i18n in component)
const AVAILABILITY_STYLES: Record<PropertyAvailability, { bg: string; text: string; labelKey: string; icon: React.ElementType }> = {
  available: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    labelKey: 'inmobiliaria.consignaciones.availability.available',
    icon: CheckCircle,
  },
  rented: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-700 dark:text-indigo-400',
    labelKey: 'inmobiliaria.consignaciones.availability.rented',
    icon: House,
  },
  in_process: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    labelKey: 'inmobiliaria.consignaciones.availability.inProcess',
    icon: Timer,
  },
  maintenance: {
    bg: 'bg-rose-100 dark:bg-rose-900/30',
    text: 'text-rose-700 dark:text-rose-400',
    labelKey: 'inmobiliaria.consignaciones.availability.maintenance',
    icon: Wrench,
  },
};

// Consignacion status colors (labels resolved via i18n in component)
const STATUS_STYLES: Record<ConsignacionStatus, { bg: string; text: string; labelKey: string }> = {
  active: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    labelKey: 'inmobiliaria.consignaciones.status.active',
  },
  pending: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    labelKey: 'inmobiliaria.consignaciones.status.pending',
  },
  expired: {
    bg: 'bg-neutral-100 dark:bg-neutral-800',
    text: 'text-neutral-600 dark:text-neutral-400',
    labelKey: 'inmobiliaria.consignaciones.status.expired',
  },
  terminated: {
    bg: 'bg-rose-100 dark:bg-rose-900/30',
    text: 'text-rose-700 dark:text-rose-400',
    labelKey: 'inmobiliaria.consignaciones.status.terminated',
  },
};

/**
 * ConsignacionHeader - Header section for consignacion detail page
 * Displays property info, status, and action buttons
 */
export function ConsignacionHeader({
  consignacion,
  onEdit,
  onViewPortal,
  onChangeStatus,
  onTerminate,
  onRenew,
}: ConsignacionHeaderProps) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const { t, formatDate } = useI18n();

  const PropertyIcon = PROPERTY_TYPE_ICONS[consignacion.propertyType];
  const availability = AVAILABILITY_STYLES[consignacion.availability];
  const status = STATUS_STYLES[consignacion.status];
  const AvailabilityIcon = availability.icon;

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
      <div className="flex flex-col lg:flex-row rounded-xl">
        {/* Image/Thumbnail Section */}
        <div className="relative w-full lg:w-80 xl:w-96 h-48 lg:h-auto shrink-0 bg-neutral-100 dark:bg-neutral-800 overflow-hidden rounded-t-xl lg:rounded-t-none lg:rounded-l-xl">
          {consignacion.propertyThumbnail ? (
            <img
              src={consignacion.propertyThumbnail}
              alt={consignacion.propertyTitle}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <PropertyIcon className="w-20 h-20 text-neutral-300 dark:text-neutral-600" />
            </div>
          )}

          {/* Property type badge */}
          <div className="absolute bottom-3 left-3">
            <span className="px-3 py-1.5 rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <PropertyIcon className="w-4 h-4" />
              {t(`inmobiliaria.consignaciones.propertyType.${consignacion.propertyType}`)}
            </span>
          </div>

          {/* Commission pill */}
          <div className="absolute top-3 right-3">
            <span className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm font-medium flex items-center gap-1.5">
              <Percent className="w-4 h-4" />
              {consignacion.commissionPercent}% {t('inmobiliaria.consignaciones.header.commission')}
            </span>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 p-5 lg:p-6">
          {/* Status Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={cn('px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5', availability.bg, availability.text)}>
              <AvailabilityIcon className="w-4 h-4" />
              {t(availability.labelKey)}
            </span>
            <span className={cn('px-3 py-1 rounded-full text-sm font-medium', status.bg, status.text)}>
              {t('inmobiliaria.consignaciones.header.consignacion')} {t(status.labelKey)}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            {consignacion.propertyTitle}
          </h1>

          {/* Address */}
          <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 mb-4">
            <MapPin className="w-5 h-5 shrink-0" />
            <span className="text-base">
              {consignacion.propertyAddress}, {consignacion.propertyZone}, {consignacion.propertyCity}
            </span>
          </div>

          {/* Rent and Admin Fee */}
          <div className="flex flex-wrap items-baseline gap-3 mb-5">
            <span className="text-3xl lg:text-4xl font-bold text-neutral-900 dark:text-white">
              {formatCurrency(consignacion.monthlyRent)}
            </span>
            <span className="text-lg text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.consignaciones.header.perMonth')}</span>
            {consignacion.adminFee && consignacion.adminFee > 0 && (
              <span className="text-sm text-neutral-400 dark:text-neutral-500">
                + {formatCurrency(consignacion.adminFee)} {t('inmobiliaria.consignaciones.header.admin')}
              </span>
            )}
          </div>

          {/* Contract Dates */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400 mb-6">
            <div className="flex items-center gap-1.5">
              <CalendarBlank className="w-4 h-4" />
              <span>{t('inmobiliaria.consignaciones.header.from')} {formatDate(consignacion.contractDate)}</span>
            </div>
            {consignacion.contractEndDate && (
              <div className="flex items-center gap-1.5">
                <CalendarBlank className="w-4 h-4" />
                <span>{t('inmobiliaria.consignaciones.header.until')} {formatDate(consignacion.contractEndDate)}</span>
              </div>
            )}
            {consignacion.minimumTerm && (
              <div className="flex items-center gap-1.5">
                <Timer className="w-4 h-4" />
                <span>{t('inmobiliaria.consignaciones.header.minimum')} {consignacion.minimumTerm} {t('inmobiliaria.consignaciones.header.months')}</span>
              </div>
            )}
          </div>

          {/* Actions Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            {/* Edit Button */}
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white uppercase tracking-wide font-mono font-medium hover:bg-indigo-700 transition-colors"
            >
              <PencilSimple className="w-4 h-4" />
              {t('inmobiliaria.consignaciones.header.edit')}
            </button>

            {/* View Portal Button */}
            <button
              onClick={onViewPortal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors opacity-50 cursor-not-allowed"
              disabled
              title={t('inmobiliaria.consignaciones.header.comingSoon')}
            >
              <Eye className="w-4 h-4" />
              {t('inmobiliaria.consignaciones.header.viewOnPortal')}
              <ArrowSquareOut className="w-4 h-4" />
            </button>

            {/* Status Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                {t('inmobiliaria.consignaciones.header.changeStatus')}
                <CaretDown className={cn('w-4 h-4 transition-transform', showStatusDropdown && 'rotate-180')} />
              </button>

              {showStatusDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-0 mt-2 w-48 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-lg z-[100]"
                >
                  {(Object.entries(AVAILABILITY_STYLES) as [PropertyAvailability, typeof AVAILABILITY_STYLES[PropertyAvailability]][]).map(([key, style]) => {
                    const Icon = style.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          onChangeStatus?.(key);
                          setShowStatusDropdown(false);
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors first:rounded-t-xl last:rounded-b-xl',
                          consignacion.availability === key && 'bg-neutral-50 dark:bg-neutral-800'
                        )}
                      >
                        <Icon className={cn('w-4 h-4', style.text)} />
                        <span className="text-neutral-700 dark:text-neutral-300">{t(style.labelKey)}</span>
                        {consignacion.availability === key && (
                          <CheckCircle className="w-4 h-4 ml-auto text-indigo-500" />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </div>

            {/* More Actions Menu */}
            <div className="relative ml-auto">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <DotsThree className="w-5 h-5" weight="bold" />
              </button>

              {showMoreMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full right-0 mt-2 w-48 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-lg z-[100]"
                >
                  <button
                    onClick={() => {
                      onRenew?.();
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors rounded-t-xl"
                  >
                    <ArrowCounterClockwise className="w-4 h-4" />
                    {t('inmobiliaria.consignaciones.header.renewConsignment')}
                  </button>
                  <button
                    onClick={() => {
                      onTerminate?.();
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors rounded-b-xl"
                  >
                    <XCircle className="w-4 h-4" />
                    {t('inmobiliaria.consignaciones.header.terminateConsignment')}
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside handlers */}
      {(showStatusDropdown || showMoreMenu) && (
        <div
          className="fixed inset-0 z-[99]"
          onClick={() => {
            setShowStatusDropdown(false);
            setShowMoreMenu(false);
          }}
        />
      )}
    </div>
  );
}

export default ConsignacionHeader;
