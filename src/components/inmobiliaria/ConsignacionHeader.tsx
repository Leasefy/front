'use client';

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
import {
  Button,
  DropdownList,
  DropdownListTrigger,
  DropdownListContent,
  DropdownListItem,
} from '@/components/ui';
import { IconButton } from '@leasefy/cadence';
import type { Consignacion, PropertyAvailability, ConsignacionStatus } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

interface ConsignacionHeaderProps {
  consignacion: Consignacion;
  /**
   * First photo of the linked `Property` (from `properties.mapper.ts` →
   * `thumbnailUrl`). `consignacion.propertyThumbnail` is never populated by
   * the back — the consignaciones endpoint doesn't own property photos, the
   * Property entity does (T-0022 WU-1). Falls back to
   * `consignacion.propertyThumbnail` only in case the back ever starts
   * sending it directly; falsy/empty renders the placeholder icon, which is
   * also the correct state while the property is loading or its fetch failed.
   */
  propertyThumbnailUrl?: string;
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
    bg: 'bg-success-soft',
    text: 'text-success',
    labelKey: 'inmobiliaria.consignaciones.availability.available',
    icon: CheckCircle,
  },
  rented: {
    bg: 'bg-primary-soft',
    text: 'text-primary',
    labelKey: 'inmobiliaria.consignaciones.availability.rented',
    icon: House,
  },
  in_process: {
    bg: 'bg-warning-soft',
    text: 'text-warning',
    labelKey: 'inmobiliaria.consignaciones.availability.inProcess',
    icon: Timer,
  },
  maintenance: {
    bg: 'bg-danger-soft',
    text: 'text-danger',
    labelKey: 'inmobiliaria.consignaciones.availability.maintenance',
    icon: Wrench,
  },
};

// Consignacion status colors (labels resolved via i18n in component)
const STATUS_STYLES: Record<ConsignacionStatus, { bg: string; text: string; labelKey: string }> = {
  active: {
    bg: 'bg-success-soft',
    text: 'text-success',
    labelKey: 'inmobiliaria.consignaciones.status.active',
  },
  pending: {
    bg: 'bg-warning-soft',
    text: 'text-warning',
    labelKey: 'inmobiliaria.consignaciones.status.pending',
  },
  expired: {
    bg: 'bg-surface-muted dark:bg-ink',
    text: 'text-fg-muted dark:text-fg-subtle',
    labelKey: 'inmobiliaria.consignaciones.status.expired',
  },
  terminated: {
    bg: 'bg-danger-soft',
    text: 'text-danger',
    labelKey: 'inmobiliaria.consignaciones.status.terminated',
  },
};

/**
 * ConsignacionHeader - Header section for consignacion detail page
 * Displays property info, status, and action buttons
 */
export function ConsignacionHeader({
  consignacion,
  propertyThumbnailUrl,
  onEdit,
  onViewPortal,
  onChangeStatus,
  onTerminate,
  onRenew,
}: ConsignacionHeaderProps) {
  const { t, formatDate } = useI18n();

  const PropertyIcon = PROPERTY_TYPE_ICONS[consignacion.propertyType];
  const availability = AVAILABILITY_STYLES[consignacion.availability];
  const status = STATUS_STYLES[consignacion.status];
  const AvailabilityIcon = availability.icon;
  const thumbnailUrl = propertyThumbnailUrl || consignacion.propertyThumbnail;
  const canViewPortal = !!consignacion.propertyId;

  return (
    <div className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-bg">
      <div className="flex flex-col lg:flex-row rounded-xl">
        {/* Image/Thumbnail Section */}
        <div className="relative w-full lg:w-80 xl:w-96 h-48 lg:h-auto shrink-0 bg-surface-muted dark:bg-ink overflow-hidden rounded-t-xl lg:rounded-t-none lg:rounded-l-xl">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={consignacion.propertyTitle}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <PropertyIcon className="w-20 h-20 text-fg-subtle dark:text-fg-muted" />
            </div>
          )}

          {/* Property type badge */}
          <div className="absolute bottom-3 left-3">
            <span className="px-3 py-1.5 rounded-full bg-surface-muted backdrop-blur-sm text-sm font-medium text-fg dark:text-fg-subtle flex items-center gap-1.5">
              <PropertyIcon className="w-4 h-4" />
              {t(`inmobiliaria.consignaciones.propertyType.${consignacion.propertyType}`)}
            </span>
          </div>

          {/* Commission pill — a SALE mandate's commissionPercent is always
              0 (contract-addendum-2.md §A.3); show saleCommissionPercent. */}
          <div className="absolute top-3 right-3">
            <span className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm font-medium flex items-center gap-1.5">
              <Percent className="w-4 h-4" />
              {consignacion.listingType === 'sale'
                ? (consignacion.saleCommissionPercent != null ? `${consignacion.saleCommissionPercent}%` : '—')
                : `${consignacion.commissionPercent}%`}{' '}
              {consignacion.listingType === 'sale'
                ? t('inmobiliaria.consignaciones.header.saleCommission')
                : t('inmobiliaria.consignaciones.header.commission')}
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
          <h1 className="text-2xl lg:text-3xl font-bold text-fg dark:text-white mb-2">
            {consignacion.propertyTitle}
          </h1>

          {/* Address */}
          <div className="flex items-center gap-2 text-fg-muted dark:text-fg-subtle mb-4">
            <MapPin className="w-5 h-5 shrink-0" />
            <span className="text-base">
              {consignacion.propertyAddress}, {consignacion.propertyZone}, {consignacion.propertyCity}
            </span>
          </div>

          {/* Rent and Admin Fee — a SALE mandate has no canon (§A.2): show
              the sale commission instead, never "$0" or "$0/mes". */}
          {consignacion.listingType === 'sale' ? (
            <div className="flex flex-wrap items-baseline gap-3 mb-5">
              <span className="text-3xl lg:text-4xl font-bold text-fg dark:text-white">
                {consignacion.saleCommissionPercent != null ? `${consignacion.saleCommissionPercent}%` : '—'}
              </span>
              <span className="text-lg text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.consignaciones.header.saleCommission')}</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-baseline gap-3 mb-5">
              <span className="text-3xl lg:text-4xl font-bold text-fg dark:text-white">
                {consignacion.monthlyRent != null ? formatCurrency(consignacion.monthlyRent) : '—'}
              </span>
              <span className="text-lg text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.consignaciones.header.perMonth')}</span>
              {consignacion.adminFee && consignacion.adminFee > 0 && (
                <span className="text-sm text-fg-subtle dark:text-fg-muted">
                  + {formatCurrency(consignacion.adminFee)} {t('inmobiliaria.consignaciones.header.admin')}
                </span>
              )}
            </div>
          )}

          {/* Contract Dates */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-fg-muted dark:text-fg-subtle mb-6">
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
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border-faint dark:border-border-strong">
            {/* Edit Button */}
            <Button hideArrow onClick={onEdit}>
              <PencilSimple className="w-4 h-4" />
              {t('inmobiliaria.consignaciones.header.edit')}
            </Button>

            {/* View Portal Button */}
            <Button
              variant="secondary"
              hideArrow
              onClick={onViewPortal}
              disabled={!canViewPortal}
              title={canViewPortal ? undefined : t('inmobiliaria.consignaciones.header.viewOnPortalUnavailable')}
            >
              <Eye className="w-4 h-4" />
              {t('inmobiliaria.consignaciones.header.viewOnPortal')}
              <ArrowSquareOut className="w-4 h-4" />
            </Button>

            {/* Status Dropdown */}
            <DropdownList>
              <DropdownListTrigger asChild>
                <Button variant="secondary" hideArrow>
                  {t('inmobiliaria.consignaciones.header.changeStatus')}
                  <CaretDown className="w-4 h-4" />
                </Button>
              </DropdownListTrigger>
              <DropdownListContent align="start" className="w-48">
                {(Object.entries(AVAILABILITY_STYLES) as [PropertyAvailability, typeof AVAILABILITY_STYLES[PropertyAvailability]][]).map(([key, style]) => {
                  const Icon = style.icon;
                  return (
                    <DropdownListItem
                      key={key}
                      onSelect={() => onChangeStatus?.(key)}
                      className={cn(consignacion.availability === key && 'bg-surface-muted dark:bg-ink')}
                    >
                      <Icon className={cn('w-4 h-4', style.text)} />
                      <span className="text-fg dark:text-fg-subtle">{t(style.labelKey)}</span>
                      {consignacion.availability === key && (
                        <CheckCircle className="w-4 h-4 ml-auto text-primary" />
                      )}
                    </DropdownListItem>
                  );
                })}
              </DropdownListContent>
            </DropdownList>

            {/* More Actions Menu */}
            <DropdownList>
              <DropdownListTrigger asChild>
                <IconButton
                  variant="outline"
                  aria-label={t('inmobiliaria.consignaciones.header.moreActions')}
                  className="ml-auto"
                  icon={<DotsThree className="w-5 h-5" weight="bold" />}
                />
              </DropdownListTrigger>
              <DropdownListContent align="end" className="w-48">
                <DropdownListItem onSelect={() => onRenew?.()}>
                  <ArrowCounterClockwise className="w-4 h-4" />
                  {t('inmobiliaria.consignaciones.header.renewConsignment')}
                </DropdownListItem>
                <DropdownListItem
                  onSelect={() => onTerminate?.()}
                  className="text-danger focus:text-danger"
                >
                  <XCircle className="w-4 h-4" />
                  {t('inmobiliaria.consignaciones.header.terminateConsignment')}
                </DropdownListItem>
              </DropdownListContent>
            </DropdownList>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConsignacionHeader;
