'use client';

/**
 * InmuebleSinMandatoCard — the grid-view counterpart of the table's
 * mandate-less row (C10). Before this component existed, the agency
 * portfolio GRID filtered `kind === 'sinMandato'` rows out entirely
 * (`page.tsx`): `ConsignacionCard` is typed to a pure `Consignacion`
 * (commission, `currentTenantName`, `availability` — none of which a
 * mandate-less property has), so extending it looked riskier than hiding
 * the rows. That filtering IS the bug — bulk import (WU-4) makes a
 * mandate-less row the common case, not the edge case: an agency that
 * imports 300 properties saw an empty grid.
 *
 * Reuses `getPropertyIcon` from `ConsignacionTable.tsx` — the one guarded
 * property-type lookup for this whole surface. Do not add a second one:
 * `PROPERTY_TYPE_ICONS`/`AVAILABILITY_COLORS` (`ConsignacionCard.tsx`) were
 * already confirmed crash-on-missing-key before this task guarded them.
 */

import { motion } from 'framer-motion';
import { MapPin, WarningCircle, CaretRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { getPropertyIcon } from './ConsignacionTable';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import type { InmuebleSinConsignacion } from '@/lib/types/inmobiliaria';

interface InmuebleSinMandatoCardProps {
  inmueble: InmuebleSinConsignacion;
  onClick?: () => void;
  onCompletarMandato?: (inmueble: InmuebleSinConsignacion) => void;
}

export function InmuebleSinMandatoCard({
  inmueble,
  onClick,
  onCompletarMandato,
}: InmuebleSinMandatoCardProps) {
  const { t } = useI18n();
  const PropertyIcon = getPropertyIcon(inmueble.propertyType);
  const isSale = inmueble.listingType === 'sale';

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border bg-surface dark:bg-bg overflow-hidden transition-all duration-200 group',
        'border-border dark:border-border-strong hover:border-border dark:hover:border-border-strong',
        onClick && 'cursor-pointer',
      )}
      data-testid="inmueble-sin-mandato-card"
    >
      <div className="relative h-40 bg-surface-muted dark:bg-ink">
        {inmueble.propertyThumbnail ? (
          <img
            src={inmueble.propertyThumbnail}
            alt={inmueble.propertyTitle}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PropertyIcon className="w-16 h-16 text-fg-subtle dark:text-fg-muted" />
          </div>
        )}

        {/* No `availability` badge exists for a mandate-less row (the
            "availability trap" — same reasoning as ConsignacionTable's
            missing-mandate cell) — the missing-mandate CTA IS the status. */}
        <div className="absolute top-3 left-3">
          <Button
            variant="ghost"
            size="sm"
            hideArrow
            onClick={(e) => {
              e.stopPropagation();
              onCompletarMandato?.(inmueble);
            }}
            className="h-auto gap-1.5 bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning hover:bg-warning-soft hover:opacity-80"
          >
            <WarningCircle className="w-3.5 h-3.5" weight="fill" />
            {t('inmobiliaria.consignaciones.table.missingMandate')}
          </Button>
        </div>
      </div>

      <div className="p-5">
        <div className="mb-3">
          <h3 className="font-semibold text-fg line-clamp-1 mb-1">
            {inmueble.propertyTitle}
          </h3>
          <div className="flex items-center gap-1.5 text-sm text-fg-muted dark:text-fg-subtle">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {[inmueble.propertyZone, inmueble.propertyCity].filter(Boolean).join(', ') || '—'}
            </span>
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-xl font-bold text-fg">
            {isSale
              ? (inmueble.salePrice != null ? formatCurrency(inmueble.salePrice) : '—')
              : (inmueble.monthlyRent != null ? formatCurrency(inmueble.monthlyRent) : '—')}
          </span>
          {!isSale && (
            <span className="text-sm text-fg-muted dark:text-fg-subtle">
              {t('inmobiliaria.portafolio.card.perMonth')}
            </span>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          hideArrow
          onClick={(e) => {
            e.stopPropagation();
            onCompletarMandato?.(inmueble);
          }}
          className="h-auto w-full gap-1.5 bg-surface-muted py-2.5 text-sm font-medium dark:bg-ink dark:text-fg-subtle hover:bg-primary-soft hover:text-primary"
        >
          {t('inmobiliaria.consignaciones.table.missingMandate')}
          <CaretRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
