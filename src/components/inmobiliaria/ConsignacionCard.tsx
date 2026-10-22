'use client';

import { SituacionComercialCorta } from '@/components/comercial/SituacionComercial';
import type { VacanciaYMandato } from '@/lib/comercial/comercial';
import { TEXTO_CANON_POR_CONFIRMAR } from '@/lib/inmuebles/canon-por-confirmar';
import { CanonPorConfirmarBadge } from './CanonPorConfirmar';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Pressable, motionSpring } from '@leasefy/cadence';
import {
  Buildings,
  House,
  Storefront,
  Warehouse,
  Briefcase,
  Eye,
  PencilSimple,
  CalendarPlus,
  Car,
  Mountains,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import type { Consignacion, PropertyAvailability, ConsignacionStatus } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { textoDeLaComision } from '@/lib/inmuebles/comision-del-mandato';
import { barrioYCiudad } from '@/lib/inmuebles/barrio-y-ciudad';
import { cajonDelInmueble } from '@/lib/inmobiliaria/cajon-del-inmueble';

interface ConsignacionCardProps {
  consignacion: Consignacion;
  propietarioName?: string;
  agenteName?: string;
  agenteAvatar?: string;
  onClick?: () => void;
  onView?: () => void;
  onEdit?: () => void;
  onAgendarCita?: () => void;
  selected?: boolean;
  variant?: 'default' | 'compact';
  /** COMERCIAL (04-10-2026): días de vacancia y mandato que se vence. */
  comercial?: VacanciaYMandato;
}

// Property type icons
const PROPERTY_TYPE_ICONS: Record<Consignacion['propertyType'], React.ElementType> = {
  apartment: Buildings,
  house: House,
  studio: Buildings,
  commercial: Storefront,
  office: Briefcase,
  warehouse: Warehouse,
  parking: Car,
  land: Mountains,
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
  onAgendarCita,
  selected,
  variant = 'default',
  comercial,
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
      bg: 'bg-surface-muted dark:bg-ink',
      text: 'text-fg-muted dark:text-fg-subtle',
      label: t('inmobiliaria.portafolio.card.status.expired'),
    },
    terminated: {
      bg: 'bg-danger-soft',
      text: 'text-danger',
      label: t('inmobiliaria.portafolio.card.status.terminated'),
    },
  }), [t]);

  // Guarded — same "never index this map by hand" rule as
  // `ConsignacionTable.tsx`'s `getPropertyIcon`/`AVAILABILITY_COLORS`
  // fallback (confirmed crash-on-missing-key: an unmapped `propertyType`
  // renders `undefined` as a component and unmounts the whole card tree,
  // not just this one). Both maps are exhaustive for `Consignacion`'s own
  // narrow types today, but a hand-indexed lookup with no fallback is a
  // latent trap the moment either type widens — the same trap this task
  // already found and fixed in the table.
  const PropertyIcon = PROPERTY_TYPE_ICONS[consignacion.propertyType] ?? Buildings;
  // QA con avatares (04-10): un borrador salía «Disponible». Misma regla que
  // el chip «Borrador» de la lista (`cajonDelInmueble`).
  const availability =
    cajonDelInmueble({ kind: 'consignacion', ...consignacion }) === 'borrador'
      ? {
          bg: 'bg-surface-muted dark:bg-ink',
          text: 'text-fg-muted dark:text-fg-subtle',
          label: t('inmobiliaria.portafolio.card.availability.draft'),
        }
      : AVAILABILITY_COLORS[consignacion.availability] ?? AVAILABILITY_COLORS.available;
  const status = STATUS_COLORS[consignacion.status] ?? STATUS_COLORS.active;

  // Compact variant - single row for list views
  if (variant === 'compact') {
    return (
      <Pressable
        as="button"
        hover="scale"
        press="sm"
        onClick={onClick}
        className={cn(
          'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors duration-base text-left',
          selected
            ? 'border-primary/30 bg-primary-soft dark:border-primary/30'
            : 'border-border dark:border-border-strong bg-surface dark:bg-bg hover:border-border dark:hover:border-border-strong'
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
          <div className="w-12 h-12 rounded-md bg-surface-muted dark:bg-ink flex items-center justify-center shrink-0">
            <PropertyIcon className="w-6 h-6 text-fg-subtle" />
          </div>
        )}

        {/* Property info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-fg truncate text-sm">
            {consignacion.propertyTitle}
          </p>
          <p className="text-xs text-fg-muted dark:text-fg-subtle truncate">
            {consignacion.propertyZone} ·{' '}
            {consignacion.listingType === 'sale'
              ? textoDeLaComision(consignacion)
              : consignacion.canonPorConfirmar
                ? TEXTO_CANON_POR_CONFIRMAR
                : consignacion.monthlyRent != null
                ? `${formatCurrency(consignacion.monthlyRent)}${t('inmobiliaria.portafolio.card.perMonth')}`
                : '—'}
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
              transition={motionSpring.bouncy}
              className="w-3 h-3 text-primary-fg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </motion.svg>
          </div>
        )}
      </Pressable>
    );
  }

  // Default variant — revisora r22 (Inmuebles #4): a 390 cada tarjeta medía ≈520 px, con 160 px de cuadro gris
  // con un edificio, tres íconos sueltos más «Ver detalle» (que repetía el ojo) y el inquilino en una caja de
  // voltaje. Ahora: la foto sólo si existe (chica), el título en dos renglones con su estado, el canon en mono,
  // el inquilino en un renglón gris, y la tarjeta entera abre el detalle.
  const fechaDeFin = consignacion.leaseEndDate
    ? new Date(consignacion.leaseEndDate).toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;
  return (
    <Pressable
      hover="lift"
      press="none"
      className={cn(
        'w-full rounded-lg border bg-surface dark:bg-bg overflow-hidden transition-[border-color,box-shadow] duration-base group',
        selected
          ? 'border-primary/30 ring-2 ring-primary/30'
          : 'border-border dark:border-border-strong',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
      data-testid="tarjeta-del-inmueble"
    >
      <div className="flex gap-3 p-4">
        {consignacion.propertyThumbnail ? (
          <img
            src={consignacion.propertyThumbnail}
            alt={consignacion.propertyTitle}
            className="h-16 w-16 shrink-0 rounded-md object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 break-words font-medium leading-snug text-fg">
              {consignacion.propertyTitle}
            </h3>
            <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-caption font-medium', availability.bg, availability.text)}>
              {availability.label}
            </span>
          </div>
          <p className="flex min-w-0 items-center gap-1.5 text-body-sm text-fg-muted">
            <PropertyIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {barrioYCiudad(consignacion.propertyZone, consignacion.propertyCity)}
              {' · '}
              {t(`inmobiliaria.portafolio.card.propertyType.${consignacion.propertyType}`)}
            </span>
          </p>
          <SituacionComercialCorta datos={comercial} />

          {/* El canon (en venta, la comisión de venta: nunca «$ 0/mes», §A.2) y la comisión UNA vez (IN-03). */}
          {consignacion.listingType === 'sale' ? (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-mono text-xl tabular-nums text-fg">{textoDeLaComision(consignacion)}</span>
              <span className="text-body-sm text-fg-muted">{t('inmobiliaria.portafolio.card.saleCommission')}</span>
              {/* Nico 14-10: la venta que entró sin precio. */}
              {consignacion.canonPorConfirmar ? (
                <CanonPorConfirmarBadge inmuebleId={consignacion.propertyId} esVenta />
              ) : null}
            </div>
          ) : (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-mono text-xl tabular-nums text-fg">
                {consignacion.canonPorConfirmar
                  ? TEXTO_CANON_POR_CONFIRMAR
                  : consignacion.monthlyRent != null ? formatCurrency(consignacion.monthlyRent) : '—'}
              </span>
              {consignacion.canonPorConfirmar ? (
                <CanonPorConfirmarBadge inmuebleId={consignacion.propertyId} />
              ) : (
                <span className="text-body-sm text-fg-muted">{t('inmobiliaria.portafolio.card.perMonth')}</span>
              )}
              {/* COMERCIAL (QA 04-10): con `adminFee === 0` pintaba un «0» suelto al lado del canon. */}
              {consignacion.adminFee != null && consignacion.adminFee > 0 && (
                <span className="text-caption text-fg-subtle">
                  + {formatCurrency(consignacion.adminFee)} {t('inmobiliaria.portafolio.card.admin')}
                </span>
              )}
              <span className="text-caption text-fg-muted">· {textoDeLaComision(consignacion)}</span>
            </div>
          )}

          {consignacion.availability === 'rented' && consignacion.currentTenantName ? (
            <p className="truncate text-caption text-fg-muted" data-testid="inquilino-de-la-tarjeta">
              {t('inmobiliaria.portafolio.card.currentTenant')}: <span className="text-fg">{consignacion.currentTenantName}</span>
              {fechaDeFin ? ` · ${t('inmobiliaria.portafolio.card.leaseUntil', { date: fechaDeFin })}` : ''}
            </p>
          ) : null}
          {propietarioName || agenteName ? (
            <p className="truncate text-caption text-fg-muted">
              {propietarioName ? (
                <>
                  {t('inmobiliaria.portafolio.card.owner')}: <span className="text-fg">{propietarioName}</span>
                </>
              ) : null}
              {propietarioName && agenteName ? ' · ' : null}
              {agenteName ? (
                <>
                  {t('inmobiliaria.portafolio.card.agent')}: <span className="text-fg">{agenteName}</span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>

      {/* Las acciones que no son «ver» (la tarjeta entera ya abre el detalle). */}
      {onEdit || onAgendarCita || (onView && !onClick) ? (
        <div className="flex flex-wrap items-center gap-1 border-t border-border-faint px-2 py-1.5">
          {onView && !onClick ? (
            <Button size="sm" variant="ghost" hideArrow onClick={(e) => { e.stopPropagation(); onView(); }}>
              <Eye className="h-4 w-4" />
              {t('inmobiliaria.portafolio.card.viewDetail')}
            </Button>
          ) : null}
          {onEdit ? (
            <Button size="sm" variant="ghost" hideArrow onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <PencilSimple className="h-4 w-4" />
              {t('inmobiliaria.portafolio.card.editTitle')}
            </Button>
          ) : null}
          {onAgendarCita ? (
            <Button size="sm" variant="ghost" hideArrow onClick={(e) => { e.stopPropagation(); onAgendarCita(); }}>
              <CalendarPlus className="h-4 w-4" />
              {t('inmobiliaria.agenda.pedirCita')}
            </Button>
          ) : null}
        </div>
      ) : null}
    </Pressable>
  );
}

export default ConsignacionCard;
