'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Buildings,
  Handshake,
  CurrencyDollar,
  ChartLineUp,
  CaretRight,
  Eye,
  PencilSimple,
  MapPin,
} from '@phosphor-icons/react';
import { IconButton } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { Agente, AgenteRole, AgenteStatus } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

interface AgenteCardProps {
  agente: Agente;
  onClick?: () => void;
  onView?: () => void;
  onEdit?: () => void;
  selected?: boolean;
  variant?: 'default' | 'compact';
}

/**
 * AgenteCard - Card for displaying agent info with metrics
 * Used in grid layouts and selection lists
 */
export function AgenteCard({
  agente,
  onClick,
  onView,
  onEdit,
  selected,
  variant = 'default',
}: AgenteCardProps) {
  const { t } = useI18n();

  // Role badge colors
  const ROLE_COLORS: Record<AgenteRole, { bg: string; text: string; label: string }> = useMemo(() => ({
    agent: {
      bg: 'bg-primary-soft',
      text: 'text-primary',
      label: t('inmobiliaria.agentes.card.role.agent'),
    },
    coordinator: {
      bg: 'bg-surface-muted',
      text: 'text-fg-muted',
      label: t('inmobiliaria.agentes.card.role.coordinator'),
    },
    director: {
      bg: 'bg-warning-soft',
      text: 'text-warning',
      label: t('inmobiliaria.agentes.card.role.director'),
    },
  }), [t]);

  // Status badge colors
  const STATUS_COLORS: Record<AgenteStatus, { bg: string; text: string; label: string }> = useMemo(() => ({
    active: {
      bg: 'bg-success-soft',
      text: 'text-success',
      label: t('inmobiliaria.agentes.card.status.active'),
    },
    inactive: {
      bg: 'bg-surface-muted',
      text: 'text-fg-muted',
      label: t('inmobiliaria.agentes.card.status.inactive'),
    },
    on_leave: {
      bg: 'bg-warning-soft',
      text: 'text-warning',
      label: t('inmobiliaria.agentes.card.status.onLeave'),
    },
    invited: {
      bg: 'bg-warning-soft',
      text: 'text-warning',
      label: t('inmobiliaria.agentes.card.status.invited'),
    },
  }), [t]);

  const role = ROLE_COLORS[agente.role];
  const status = STATUS_COLORS[agente.status];

  // Get initials for avatar fallback
  const initials = agente.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Compact variant - single row for list views
  if (variant === 'compact') {
    return (
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={cn(
          'w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 text-left',
          selected
            ? 'border-primary/30 bg-primary-soft'
            : 'border-border bg-card hover:border-fg/20'
        )}
      >
        {/* Avatar */}
        {agente.avatar ? (
          <img
            src={agente.avatar}
            alt={agente.name}
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
            role.bg
          )}>
            <span className={cn('text-sm font-semibold', role.text)}>
              {initials}
            </span>
          </div>
        )}

        {/* Agent info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-fg truncate text-sm">
            {agente.name}
          </p>
          <p className="text-xs text-fg-muted truncate">
            {agente.email}
          </p>
        </div>

        {/* Role badge */}
        <span className={cn('px-2 py-1 rounded-full text-xs font-medium shrink-0', role.bg, role.text)}>
          {role.label}
        </span>

        {/* Status badge */}
        <span className={cn('px-2 py-1 rounded-full text-xs font-medium shrink-0', status.bg, status.text)}>
          {status.label}
        </span>

        {/* Selection indicator */}
        {selected && (
          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
            <motion.svg
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-3 h-3 text-primary-foreground"
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
        'w-full rounded-lg border bg-card overflow-hidden transition-all duration-200 group',
        selected
          ? 'border-primary/30 ring-2 ring-primary/20'
          : 'border-border hover:border-fg/20',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      {/* Header with avatar and info */}
      <div className="p-5 pb-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          {agente.avatar ? (
            <img
              src={agente.avatar}
              alt={agente.name}
              className="w-14 h-14 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center shrink-0',
              role.bg
            )}>
              <span className={cn('text-lg font-semibold', role.text)}>
                {initials}
              </span>
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-fg truncate">
                  {agente.name}
                </h3>
                <p className="text-sm text-fg-muted truncate">
                  {agente.email}
                </p>
              </div>
              {/* Status badge */}
              <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium shrink-0', status.bg, status.text)}>
                {status.label}
              </span>
            </div>

            {/* Role and Zone */}
            <div className="flex items-center gap-2 mt-2">
              <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', role.bg, role.text)}>
                {role.label}
              </span>
              {agente.zone && (
                <span className="flex items-center gap-1 text-xs text-fg-muted">
                  <MapPin className="w-3.5 h-3.5" />
                  {agente.zone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="px-5 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Properties */}
          <div className="p-3 rounded-lg bg-surface-muted">
            <div className="flex items-center gap-2 mb-1">
              <Buildings className="w-4 h-4 text-fg-muted" />
              <span className="text-xs text-fg-muted">{t('inmobiliaria.agentes.card.properties')}</span>
            </div>
            <p className="text-lg font-semibold font-mono tabular-nums text-fg">
              {agente.metrics.assignedProperties}
            </p>
          </div>

          {/* Active Leases */}
          <div className="p-3 rounded-lg bg-surface-muted">
            <div className="flex items-center gap-2 mb-1">
              <Handshake className="w-4 h-4 text-fg-muted" />
              <span className="text-xs text-fg-muted">{t('inmobiliaria.agentes.card.leases')}</span>
            </div>
            <p className="text-lg font-semibold font-mono tabular-nums text-fg">
              {agente.metrics.activeLeases}
            </p>
          </div>

          {/* Closings this month */}
          <div className="p-3 rounded-lg bg-surface-muted">
            <div className="flex items-center gap-2 mb-1">
              <ChartLineUp className="w-4 h-4 text-fg-muted" />
              <span className="text-xs text-fg-muted">{t('inmobiliaria.agentes.card.closingsMonth')}</span>
            </div>
            <p className="text-lg font-semibold font-mono tabular-nums text-fg">
              {agente.metrics.closedThisMonth}
            </p>
          </div>

          {/* Commissions this month */}
          <div className="p-3 rounded-lg bg-surface-muted">
            <div className="flex items-center gap-2 mb-1">
              <CurrencyDollar className="w-4 h-4 text-fg-muted" />
              <span className="text-xs text-fg-muted">{t('inmobiliaria.agentes.card.commissions')}</span>
            </div>
            <p className="text-base font-semibold font-mono tabular-nums text-fg truncate">
              {formatCurrency(agente.metrics.commissionsThisMonth)}
            </p>
          </div>
        </div>
      </div>

      {/* Commission Split Pill */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary-soft">
          <span className="text-sm text-primary">{t('inmobiliaria.agentes.card.commissionSplit')}</span>
          <span className="text-lg font-semibold font-mono tabular-nums text-primary">
            {agente.commissionSplit}%
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onView && (
              <IconButton
                variant="ghost"
                size="sm"
                icon={<Eye className="w-4 h-4" />}
                onClick={(e) => { e.stopPropagation(); onView(); }}
                title={t('inmobiliaria.agentes.card.viewDetailTitle')}
                aria-label={t('inmobiliaria.agentes.card.viewDetailTitle')}
              />
            )}
            {onEdit && (
              <IconButton
                variant="ghost"
                size="sm"
                icon={<PencilSimple className="w-4 h-4" />}
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                title={t('inmobiliaria.agentes.card.editTitle')}
                aria-label={t('inmobiliaria.agentes.card.editTitle')}
              />
            )}
          </div>
          {onClick && (
            <div className="flex items-center gap-1 text-sm text-fg-muted group-hover:text-primary transition-colors">
              {t('inmobiliaria.agentes.card.viewDetail')}
              <CaretRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default AgenteCard;
