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
import { Badge } from '@/components/ui/badge';
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
    bg: 'bg-primary-soft',
    text: 'text-primary',
    icon: 'text-primary',
  },
  emerald: {
    bg: 'bg-success-soft',
    text: 'text-success',
    icon: 'text-success',
  },
  amber: {
    bg: 'bg-warning-soft',
    text: 'text-warning',
    icon: 'text-warning',
  },
  rose: {
    bg: 'bg-danger-soft',
    text: 'text-danger',
    icon: 'text-danger',
  },
  purple: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    icon: 'text-muted-foreground',
  },
};

function StatCard({ icon: Icon, label, value, subValue, trend, color, warning }: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colors.bg)}>
          <Icon className={cn('w-5 h-5', colors.icon)} />
        </div>
        {warning && (
          <Badge variant="warning" aria-label="Atención requerida">
            <Warning className="w-3.5 h-3.5" />
          </Badge>
        )}
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        {subValue && (
          <p className="text-sm text-muted-foreground mt-0.5">{subValue}</p>
        )}
      </div>

      {trend && (
        <div className="flex items-center gap-1 mt-2">
          {trend.positive ? (
            <TrendUp className="w-3.5 h-3.5 text-success" />
          ) : (
            <TrendDown className="w-3.5 h-3.5 text-danger" />
          )}
          <span
            className={cn(
              'text-xs font-medium',
              trend.positive ? 'text-success' : 'text-danger'
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
          <Buildings className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {propietario.propertyCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CurrencyDollar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {formatCurrency(propietario.totalMonthlyRent)}
          </span>
        </div>
        {hasPendingBalance && (
          <Badge variant="warning" className="gap-1">
            <Warning className="w-3 h-3" />
            {formatCurrency(propietario.pendingBalance)}
          </Badge>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-3', className)}>
        <div className="p-3 rounded-xl bg-muted/50">
          <p className="text-xs text-muted-foreground">{t('inmobiliaria.propietario.stats.properties')}</p>
          <p className="text-xl font-semibold text-foreground">
            {propietario.propertyCount}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-muted/50">
          <p className="text-xs text-muted-foreground">{t('inmobiliaria.propietario.stats.rented')}</p>
          <p className="text-xl font-semibold text-foreground">
            {propietario.activeLeases}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-muted/50">
          <p className="text-xs text-muted-foreground">{t('inmobiliaria.propietario.stats.monthlyRent')}</p>
          <p className="text-xl font-semibold text-foreground">
            {formatCurrency(propietario.totalMonthlyRent)}
          </p>
        </div>
        <div className={cn(
          'p-3 rounded-xl',
          hasPendingBalance
            ? 'bg-warning-soft'
            : 'bg-success-soft'
        )}>
          <p className="text-xs text-muted-foreground">{t('inmobiliaria.propietario.stats.pending')}</p>
          <p className={cn(
            'text-xl font-semibold',
            hasPendingBalance
              ? 'text-warning'
              : 'text-success'
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
          // Sin historial de ocupación no hay «vs mes anterior»: el ±5 % que
          // salía acá era inventado a partir del porcentaje de hoy.
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
          className="p-4 rounded-xl border border-warning/30 bg-warning-soft"
        >
          <div className="flex items-start gap-3">
            <Warning className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <h4 className="text-base font-semibold text-warning mb-1">
                {t('inmobiliaria.propietario.stats.attentionRequired')}
              </h4>
              <ul className="text-sm text-warning space-y-1">
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
