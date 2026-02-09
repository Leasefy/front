'use client';

import { motion } from 'framer-motion';
import { User, Buildings, CurrencyDollar, Warning, CaretRight, Phone, Envelope } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
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
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-500'
            : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] hover:border-neutral-300 dark:hover:border-neutral-600'
        )}
      >
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
          isCompany
            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
            : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
        )}>
          {isCompany ? <Buildings className="w-5 h-5" /> : <User className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-neutral-900 dark:text-white truncate text-sm">
            {propietario.name}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {propietario.propertyCount} {propietario.propertyCount === 1 ? 'propiedad' : 'propiedades'}
          </p>
        </div>
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

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      className={cn(
        'w-full p-5 rounded-2xl border bg-white dark:bg-[#1a1a1c] text-left transition-all duration-200 group',
        selected
          ? 'border-indigo-500 ring-2 ring-indigo-500/20'
          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-lg'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center',
            isCompany
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
              : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
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
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
            <Warning className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Pendiente</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-[#141416]">
          <div className="flex items-center gap-2 mb-1">
            <Buildings className="w-4 h-4 text-neutral-400" />
            <span className="text-xs text-neutral-500 dark:text-neutral-400">Propiedades</span>
          </div>
          <p className="text-lg font-semibold text-neutral-900 dark:text-white">
            {propietario.propertyCount}
          </p>
          <p className="text-xs text-neutral-500">
            {propietario.activeLeases} arrendadas
          </p>
        </div>
        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-[#141416]">
          <div className="flex items-center gap-2 mb-1">
            <CurrencyDollar className="w-4 h-4 text-neutral-400" />
            <span className="text-xs text-neutral-500 dark:text-neutral-400">Canon mensual</span>
          </div>
          <p className="text-lg font-semibold text-neutral-900 dark:text-white">
            {formatCurrency(propietario.totalMonthlyRent)}
          </p>
          {hasPendingBalance && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {formatCurrency(propietario.pendingBalance)} pend.
            </p>
          )}
        </div>
      </div>

      {/* Contact */}
      <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); window.location.href = `mailto:${propietario.email}`; }}
            className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title="Enviar email"
          >
            <Envelope className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${propietario.phone}`; }}
            className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title="Llamar"
          >
            <Phone className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 group-hover:text-indigo-500 transition-colors">
          Ver detalle
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
