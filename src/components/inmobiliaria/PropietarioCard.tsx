'use client';

import { motion } from 'framer-motion';
import { User, Buildings, CurrencyDollar, Warning, CaretRight, Phone, Envelope } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { IconButton } from '@leasefy/cadence';
import type { Propietario } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

interface PropietarioCardProps {
  propietario: Propietario;
  onClick?: () => void;
  selected?: boolean;
  variant?: 'default' | 'compact';
}

/**
 * PropietarioCard - Compact card for displaying property owner summary
 * Used in grid layouts and selection lists
 */
export function PropietarioCard({
  propietario,
  onClick,
  selected,
  variant = 'default',
}: PropietarioCardProps) {
  const { t } = useI18n();
  const hasPendingBalance = propietario.pendingBalance > 0;
  const isCompany = propietario.documentType === 'NIT';

  if (variant === 'compact') {
    return (
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={cn(
          'w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left',
          selected
            ? 'border-primary/30 bg-primary-soft'
            : 'border-border bg-card hover:border-primary/30'
        )}
      >
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
          isCompany
            ? 'bg-muted text-muted-foreground'
            : 'bg-surface-brand text-primary'
        )}>
          {isCompany ? <Buildings className="w-5 h-5" /> : <User className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate text-sm">
            {propietario.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {propietario.propertyCount} {propietario.propertyCount === 1 ? t('inmobiliaria.propietarios.card.property') : t('inmobiliaria.propietarios.card.properties')}
          </p>
        </div>
        {selected && (
          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
            <motion.svg
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-3 h-3 text-primary-fg"
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

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      className={cn(
        'w-full p-5 rounded-xl border bg-card text-left transition-all duration-200 group',
        selected
          ? 'border-primary/30 ring-2 ring-primary/20'
          : 'border-border hover:border-primary/30'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center',
            isCompany
              ? 'bg-muted text-muted-foreground'
              : 'bg-primary-soft text-primary'
          )}>
            {isCompany ? <Buildings className="w-6 h-6" /> : <User className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground line-clamp-1">
              {propietario.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {propietario.documentType}: {propietario.documentNumber}
            </p>
          </div>
        </div>
        {hasPendingBalance && (
          <Badge variant="warning" className="gap-1">
            <Warning className="w-3.5 h-3.5" />
            {t('inmobiliaria.propietarios.card.pendingBadge')}
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-muted/50">
          <div className="flex items-center gap-2 mb-1">
            <Buildings className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{t('inmobiliaria.propietarios.card.propertiesLabel')}</span>
          </div>
          <p className="text-lg font-semibold text-foreground">
            {propietario.propertyCount}
          </p>
          <p className="text-xs text-muted-foreground">
            {propietario.activeLeases} {t('inmobiliaria.propietarios.card.rented')}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-muted/50">
          <div className="flex items-center gap-2 mb-1">
            <CurrencyDollar className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{t('inmobiliaria.propietarios.card.monthlyRent')}</span>
          </div>
          <p className="text-lg font-semibold text-foreground">
            {formatCurrency(propietario.totalMonthlyRent)}
          </p>
          {hasPendingBalance && (
            <p className="text-xs text-warning">
              {formatCurrency(propietario.pendingBalance)} {t('inmobiliaria.propietarios.card.pendingAbbr')}
            </p>
          )}
        </div>
      </div>

      {/* Contact */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-3">
          <IconButton
            variant="solid"
            size="md"
            onClick={(e) => { e.stopPropagation(); window.location.href = `mailto:${propietario.email}`; }}
            title={t('inmobiliaria.propietarios.card.sendEmail')}
            aria-label={t('inmobiliaria.propietarios.card.sendEmail')}
            icon={<Envelope className="w-4 h-4" />}
          />
          <IconButton
            variant="solid"
            size="md"
            onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${propietario.phone}`; }}
            title={t('inmobiliaria.propietarios.card.call')}
            aria-label={t('inmobiliaria.propietarios.card.call')}
            icon={<Phone className="w-4 h-4" />}
          />
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground group-hover:text-primary transition-colors">
          {t('inmobiliaria.propietarios.card.viewDetail')}
          <CaretRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>

      {/* Tags */}
      {propietario.tags && propietario.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {propietario.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {propietario.tags.length > 3 && (
            <span className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
              +{propietario.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </motion.button>
  );
}

export default PropietarioCard;
