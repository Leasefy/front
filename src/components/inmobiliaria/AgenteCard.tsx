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
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-400',
      label: t('inmobiliaria.agentes.card.role.agent'),
    },
    coordinator: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-700 dark:text-purple-400',
      label: t('inmobiliaria.agentes.card.role.coordinator'),
    },
    director: {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-400',
      label: t('inmobiliaria.agentes.card.role.director'),
    },
  }), [t]);

  // Status badge colors
  const STATUS_COLORS: Record<AgenteStatus, { bg: string; text: string; label: string }> = useMemo(() => ({
    active: {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      label: t('inmobiliaria.agentes.card.status.active'),
    },
    inactive: {
      bg: 'bg-neutral-100 dark:bg-neutral-800',
      text: 'text-neutral-600 dark:text-neutral-400',
      label: t('inmobiliaria.agentes.card.status.inactive'),
    },
    on_leave: {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-400',
      label: t('inmobiliaria.agentes.card.status.onLeave'),
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
          'w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left',
          selected
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-500'
            : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] hover:border-neutral-300 dark:hover:border-neutral-600'
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
          <p className="font-medium text-neutral-900 dark:text-white truncate text-sm">
            {agente.name}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
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
          <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
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
        'w-full rounded-2xl border bg-white dark:bg-[#1a1a1c] overflow-hidden transition-all duration-200 group',
        selected
          ? 'border-indigo-500 ring-2 ring-indigo-500/20'
          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-lg',
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
                <h3 className="font-semibold text-neutral-900 dark:text-white truncate">
                  {agente.name}
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
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
                <span className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
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
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
            <div className="flex items-center gap-2 mb-1">
              <Buildings className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              <span className="text-xs text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.agentes.card.properties')}</span>
            </div>
            <p className="text-lg font-bold text-neutral-900 dark:text-white">
              {agente.metrics.assignedProperties}
            </p>
          </div>

          {/* Active Leases */}
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
            <div className="flex items-center gap-2 mb-1">
              <Handshake className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              <span className="text-xs text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.agentes.card.leases')}</span>
            </div>
            <p className="text-lg font-bold text-neutral-900 dark:text-white">
              {agente.metrics.activeLeases}
            </p>
          </div>

          {/* Closings this month */}
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
            <div className="flex items-center gap-2 mb-1">
              <ChartLineUp className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              <span className="text-xs text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.agentes.card.closingsMonth')}</span>
            </div>
            <p className="text-lg font-bold text-neutral-900 dark:text-white">
              {agente.metrics.closedThisMonth}
            </p>
          </div>

          {/* Commissions this month */}
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
            <div className="flex items-center gap-2 mb-1">
              <CurrencyDollar className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              <span className="text-xs text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.agentes.card.commissions')}</span>
            </div>
            <p className="text-base font-bold text-neutral-900 dark:text-white truncate">
              {formatCurrency(agente.metrics.commissionsThisMonth)}
            </p>
          </div>
        </div>
      </div>

      {/* Commission Split Pill */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
          <span className="text-sm text-indigo-600 dark:text-indigo-400">{t('inmobiliaria.agentes.card.commissionSplit')}</span>
          <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
            {agente.commissionSplit}%
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onView && (
              <button
                onClick={(e) => { e.stopPropagation(); onView(); }}
                className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                title={t('inmobiliaria.agentes.card.viewDetailTitle')}
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                title={t('inmobiliaria.agentes.card.editTitle')}
              >
                <PencilSimple className="w-4 h-4" />
              </button>
            )}
          </div>
          {onClick && (
            <div className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 group-hover:text-indigo-500 transition-colors">
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
