'use client';

import { motion } from 'framer-motion';
import {
  Buildings,
  CurrencyDollar,
  ChartLineUp,
  Warning,
  CalendarCheck,
  TrendUp,
  TrendDown,
  ArrowRight,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { Propietario } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

interface PropietarioStatsProps {
  propietario: Propietario;
  variant?: 'full' | 'compact' | 'mini';
  className?: string;
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  color: 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple';
  warning?: boolean;
}

const colorClasses = {
  indigo: {
    bg: 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15',
    text: 'text-[#1A40FF] dark:text-[#5570FF]',
    icon: 'text-[#1A40FF]',
  },
  emerald: {
    bg: 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15',
    text: 'text-[#2C7A53] dark:text-[#3EAE70]',
    icon: 'text-[#2C7A53]',
  },
  amber: {
    bg: 'bg-[#F8F0E0] dark:bg-[#B7791F]/15',
    text: 'text-[#B7791F] dark:text-[#D2992F]',
    icon: 'text-[#B7791F]',
  },
  rose: {
    bg: 'bg-[#F8EAE7] dark:bg-[#C4503B]/15',
    text: 'text-[#C4503B] dark:text-[#E0664D]',
    icon: 'text-[#C4503B]',
  },
  purple: {
    bg: 'bg-neutral-100 dark:bg-neutral-800',
    text: 'text-neutral-600 dark:text-neutral-300',
    icon: 'text-neutral-600 dark:text-neutral-300',
  },
};

function StatCard({ icon: Icon, label, value, subValue, trend, color, warning }: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colors.bg)}>
          <Icon className={cn('w-5 h-5', colors.icon)} />
        </div>
        {warning && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#F8F0E0] dark:bg-[#B7791F]/15">
            <Warning className="w-3.5 h-3.5 text-[#B7791F] dark:text-[#D2992F]" />
          </div>
        )}
      </div>

      <div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{label}</p>
        <p className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</p>
        {subValue && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{subValue}</p>
        )}
      </div>

      {trend && (
        <div className="flex items-center gap-1 mt-2">
          {trend.positive ? (
            <TrendUp className="w-3.5 h-3.5 text-[#2C7A53]" />
          ) : (
            <TrendDown className="w-3.5 h-3.5 text-[#C4503B]" />
          )}
          <span
            className={cn(
              'text-xs font-medium',
              trend.positive ? 'text-[#2C7A53] dark:text-[#3EAE70]' : 'text-[#C4503B] dark:text-[#E0664D]'
            )}
          >
            {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * PropietarioStats - KPI stats display for a property owner
 * Shows key metrics like property count, monthly rent, pending balances
 */
export function PropietarioStats({
  propietario,
  variant = 'full',
  className,
}: PropietarioStatsProps) {
  const { t, locale } = useI18n();
  const hasPendingBalance = propietario.pendingBalance > 0;
  const occupancyRate = propietario.propertyCount > 0
    ? Math.round((propietario.activeLeases / propietario.propertyCount) * 100)
    : 0;

  // Calculate estimated commission (assuming 10% average)
  const estimatedCommission = Math.round(propietario.totalMonthlyRent * 0.10);

  if (variant === 'mini') {
    return (
      <div className={cn('flex items-center gap-4', className)}>
        <div className="flex items-center gap-2">
          <Buildings className="w-4 h-4 text-neutral-400" />
          <span className="text-sm font-medium text-neutral-900 dark:text-white">
            {propietario.propertyCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CurrencyDollar className="w-4 h-4 text-neutral-400" />
          <span className="text-sm font-medium text-neutral-900 dark:text-white">
            {formatCurrency(propietario.totalMonthlyRent)}
          </span>
        </div>
        {hasPendingBalance && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F8F0E0] dark:bg-[#B7791F]/15">
            <Warning className="w-3 h-3 text-[#B7791F] dark:text-[#D2992F]" />
            <span className="text-xs text-[#B7791F] dark:text-[#D2992F]">
              {formatCurrency(propietario.pendingBalance)}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-3', className)}>
        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-[#141416]">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.propietario.stats.properties')}</p>
          <p className="text-xl font-bold text-neutral-900 dark:text-white">
            {propietario.propertyCount}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-[#141416]">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.propietario.stats.rented')}</p>
          <p className="text-xl font-bold text-neutral-900 dark:text-white">
            {propietario.activeLeases}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-[#141416]">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.propietario.stats.monthlyRent')}</p>
          <p className="text-xl font-bold text-neutral-900 dark:text-white">
            {formatCurrency(propietario.totalMonthlyRent)}
          </p>
        </div>
        <div className={cn(
          'p-3 rounded-xl',
          hasPendingBalance
            ? 'bg-[#F8F0E0] dark:bg-[#B7791F]/15'
            : 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15'
        )}>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.propietario.stats.pending')}</p>
          <p className={cn(
            'text-xl font-bold',
            hasPendingBalance
              ? 'text-[#B7791F] dark:text-[#D2992F]'
              : 'text-[#2C7A53] dark:text-[#3EAE70]'
          )}>
            {hasPendingBalance ? formatCurrency(propietario.pendingBalance) : t('inmobiliaria.propietario.stats.upToDate')}
          </p>
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Buildings}
          label={t('inmobiliaria.propietario.stats.consignedProperties')}
          value={propietario.propertyCount}
          subValue={`${propietario.activeLeases} ${t('inmobiliaria.propietario.stats.rented')}`}
          color="indigo"
        />

        <StatCard
          icon={CurrencyDollar}
          label={t('inmobiliaria.propietario.stats.totalMonthlyRent')}
          value={formatCurrency(propietario.totalMonthlyRent)}
          subValue={`~${formatCurrency(estimatedCommission)} ${t('inmobiliaria.propietario.stats.commission')}`}
          color="emerald"
        />

        <StatCard
          icon={ChartLineUp}
          label={t('inmobiliaria.propietario.stats.occupancyRate')}
          value={`${occupancyRate}%`}
          subValue={propietario.propertyCount > 0
            ? `${propietario.propertyCount - propietario.activeLeases} ${t('inmobiliaria.propietario.stats.available')}`
            : t('inmobiliaria.propietario.stats.noProperties')
          }
          trend={occupancyRate >= 80
            ? { value: 5, label: t('inmobiliaria.propietario.stats.vsPrevMonth'), positive: true }
            : occupancyRate < 50
              ? { value: -10, label: t('inmobiliaria.propietario.stats.vsPrevMonth'), positive: false }
              : undefined
          }
          color="purple"
        />

        <StatCard
          icon={hasPendingBalance ? Warning : CalendarCheck}
          label={t('inmobiliaria.propietario.stats.pendingBalance')}
          value={hasPendingBalance ? formatCurrency(propietario.pendingBalance) : t('inmobiliaria.propietario.stats.upToDate')}
          subValue={propietario.lastPaymentDate
            ? `${t('inmobiliaria.propietario.stats.lastPayment')}: ${new Date(propietario.lastPaymentDate).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', { month: 'short', day: 'numeric' })}`
            : undefined
          }
          color={hasPendingBalance ? 'amber' : 'emerald'}
          warning={hasPendingBalance}
        />
      </div>

      {/* Additional insights */}
      {(hasPendingBalance || occupancyRate < 70) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border border-[#B7791F]/30 dark:border-[#B7791F]/40 bg-[#F8F0E0] dark:bg-[#B7791F]/15"
        >
          <div className="flex items-start gap-3">
            <Warning className="w-5 h-5 text-[#B7791F] dark:text-[#D2992F] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-[#B7791F] dark:text-[#D2992F] mb-1">
                {t('inmobiliaria.propietario.stats.attentionRequired')}
              </h4>
              <ul className="text-sm text-[#B7791F] dark:text-[#D2992F] space-y-1">
                {hasPendingBalance && (
                  <li className="flex items-center gap-2">
                    <ArrowRight className="w-3 h-3" />
                    {t('inmobiliaria.propietario.stats.pendingCollection', { amount: formatCurrency(propietario.pendingBalance) })}
                  </li>
                )}
                {occupancyRate < 70 && (
                  <li className="flex items-center gap-2">
                    <ArrowRight className="w-3 h-3" />
                    {t('inmobiliaria.propietario.stats.lowOccupancy')}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default PropietarioStats;
