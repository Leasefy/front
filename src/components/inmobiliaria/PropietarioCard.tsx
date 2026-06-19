'use client';

import { motion } from 'framer-motion';
import { User, Buildings, CurrencyDollar, Warning, CaretRight, Phone, Envelope } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
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
            ? 'border-[#1A40FF]/30 bg-[#EEF1FF] dark:bg-[#1A40FF]/15 dark:border-[#1A40FF]/30'
            : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] hover:border-neutral-300 dark:hover:border-neutral-600'
        )}
      >
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
          isCompany
            ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
            : 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15 text-[#1A40FF] dark:text-[#5570FF]'
        )}>
          {isCompany ? <Buildings className="w-5 h-5" /> : <User className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-neutral-900 dark:text-white truncate text-sm">
            {propietario.name}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {propietario.propertyCount} {propietario.propertyCount === 1 ? t('inmobiliaria.propietarios.card.property') : t('inmobiliaria.propietarios.card.properties')}
          </p>
        </div>
        {selected && (
          <div className="w-5 h-5 rounded-full bg-[#1A40FF] flex items-center justify-center shrink-0">
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

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      className={cn(
        'w-full p-5 rounded-xl border bg-white dark:bg-[#1a1a1c] text-left transition-all duration-200 group',
        selected
          ? 'border-[#1A40FF]/30 ring-2 ring-[#1A40FF]/20'
          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center',
            isCompany
              ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
              : 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15 text-[#1A40FF] dark:text-[#5570FF]'
          )}>
            {isCompany ? <Buildings className="w-6 h-6" /> : <User className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white line-clamp-1">
              {propietario.name}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {propietario.documentType}: {propietario.documentNumber}
            </p>
          </div>
        </div>
        {hasPendingBalance && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#F8F0E0] dark:bg-[#B7791F]/15 text-[#B7791F] dark:text-[#D2992F]">
            <Warning className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{t('inmobiliaria.propietarios.card.pendingBadge')}</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-[#141416]">
          <div className="flex items-center gap-2 mb-1">
            <Buildings className="w-4 h-4 text-neutral-400" />
            <span className="text-xs text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.propietarios.card.propertiesLabel')}</span>
          </div>
          <p className="text-lg font-semibold text-neutral-900 dark:text-white">
            {propietario.propertyCount}
          </p>
          <p className="text-xs text-neutral-500">
            {propietario.activeLeases} {t('inmobiliaria.propietarios.card.rented')}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-[#141416]">
          <div className="flex items-center gap-2 mb-1">
            <CurrencyDollar className="w-4 h-4 text-neutral-400" />
            <span className="text-xs text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.propietarios.card.monthlyRent')}</span>
          </div>
          <p className="text-lg font-semibold text-neutral-900 dark:text-white">
            {formatCurrency(propietario.totalMonthlyRent)}
          </p>
          {hasPendingBalance && (
            <p className="text-xs text-[#B7791F] dark:text-[#D2992F]">
              {formatCurrency(propietario.pendingBalance)} {t('inmobiliaria.propietarios.card.pendingAbbr')}
            </p>
          )}
        </div>
      </div>

      {/* Contact */}
      <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); window.location.href = `mailto:${propietario.email}`; }}
            className="p-2 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title={t('inmobiliaria.propietarios.card.sendEmail')}
          >
            <Envelope className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${propietario.phone}`; }}
            className="p-2 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title={t('inmobiliaria.propietarios.card.call')}
          >
            <Phone className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 group-hover:text-[#1A40FF] transition-colors">
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
              className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-400"
            >
              {tag}
            </span>
          ))}
          {propietario.tags.length > 3 && (
            <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-500">
              +{propietario.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </motion.button>
  );
}

export default PropietarioCard;
