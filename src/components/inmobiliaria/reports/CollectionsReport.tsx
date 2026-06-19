'use client';

import {
  CurrencyDollar,
  ChartBar,
  TrendUp,
  Warning,
  Clock,
  ArrowClockwise,
  User,
  Phone,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { CollectionsData } from '@/lib/data/mock-reports';

interface CollectionsReportProps {
  data: CollectionsData;
}

/**
 * CollectionsReport - Shows mora rate, avg days late, recovery rate, monthly breakdown.
 * Pure CSS/Tailwind visualizations (no charting library).
 */
export function CollectionsReport({ data }: CollectionsReportProps) {
  const { formatCurrency } = useI18n();

  const { summary, byMonth, topDelinquents } = data;

  // Find max expected for scaling bars
  const maxExpected = Math.max(...byMonth.map((m) => m.expected));

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Esperado"
          value={formatCurrency(summary.totalExpected)}
          icon={CurrencyDollar}
          color="blue"
        />
        <KPICard
          label="Recaudado"
          value={formatCurrency(summary.totalCollected)}
          icon={CurrencyDollar}
          color="emerald"
        />
        <KPICard
          label="En mora"
          value={formatCurrency(summary.totalLate)}
          icon={Warning}
          color="red"
          subtitle={`${summary.moraRate}% tasa de mora`}
        />
        <KPICard
          label="Tasa de recuperacion"
          value={`${summary.recoveryRate}%`}
          icon={ArrowClockwise}
          color="violet"
          subtitle={`Prom. ${summary.avgDaysLate} dias de atraso`}
        />
      </div>

      {/* Monthly Breakdown - Stacked CSS Bar Chart */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1c] p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <ChartBar className="w-4 h-4 text-neutral-500" />
          Recaudo mensual vs esperado
        </h3>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-success" />
            <span>Recaudado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-danger" />
            <span>En mora</span>
          </div>
        </div>

        <div className="flex items-end gap-1.5 h-40">
          {byMonth.map((m) => {
            const collectedPct = (m.collected / maxExpected) * 100;
            const latePct = (m.late / maxExpected) * 100;
            return (
              <div
                key={m.month}
                className="flex-1 flex flex-col items-center gap-1 group"
              >
                <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity font-medium whitespace-nowrap">
                  {m.moraRate}% mora
                </span>
                <div className="w-full flex-1 flex flex-col justify-end gap-px">
                  <div
                    className="w-full bg-danger dark:bg-danger/60 rounded-t transition-all duration-300"
                    style={{ height: `${latePct}%` }}
                  />
                  <div
                    className="w-full bg-success dark:bg-success rounded-b transition-all duration-300"
                    style={{ height: `${collectedPct}%` }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground leading-none truncate w-full text-center">
                  {m.month.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mora Rate Trend */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1c] p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendUp className="w-4 h-4 text-neutral-500" />
          Tasa de mora mensual
        </h3>
        <div className="space-y-2">
          {byMonth.map((m) => (
            <div key={m.month} className="flex items-center gap-3 text-sm">
              <span className="w-20 text-muted-foreground text-xs shrink-0">
                {m.month.split(' ')[0]}
              </span>
              <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    m.moraRate <= 5
                      ? 'bg-success'
                      : m.moraRate <= 8
                        ? 'bg-primary'
                        : m.moraRate <= 10
                          ? 'bg-warning'
                          : 'bg-danger'
                  )}
                  style={{ width: `${Math.min(m.moraRate * 5, 100)}%` }}
                />
              </div>
              <span
                className={cn(
                  'w-12 text-right text-xs font-medium',
                  m.moraRate <= 5
                    ? 'text-success'
                    : m.moraRate <= 8
                      ? 'text-primary'
                      : m.moraRate <= 10
                        ? 'text-warning'
                        : 'text-danger'
                )}
              >
                {m.moraRate}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Delinquents Table */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1c] overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Warning className="w-4 h-4 text-danger" />
            Principales morosos
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800">
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Inquilino</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Propiedad</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Dias mora</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Monto</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Intentos</th>
              </tr>
            </thead>
            <tbody>
              {topDelinquents.map((d, i) => (
                <tr
                  key={i}
                  className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors"
                >
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-neutral-500" />
                      </div>
                      <span className="font-medium text-foreground">{d.tenantName}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-muted-foreground">{d.propertyTitle}</td>
                  <td className="py-2.5 px-4 text-right">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                        d.daysLate >= 30
                          ? 'bg-danger-soft text-danger'
                          : d.daysLate >= 15
                            ? 'bg-warning-soft text-warning'
                            : 'bg-warning-soft text-warning'
                      )}
                    >
                      <Clock className="w-3 h-3" />
                      {d.daysLate}d
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium text-foreground">
                    {formatCurrency(d.amount)}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      {d.attempts}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// KPI Card Sub-component
// ============================================================================

const COLOR_MAP = {
  blue: {
    bg: 'bg-primary-soft',
    text: 'text-primary',
  },
  emerald: {
    bg: 'bg-success-soft',
    text: 'text-success',
  },
  red: {
    bg: 'bg-danger-soft',
    text: 'text-danger',
  },
  violet: {
    bg: 'bg-neutral-100 dark:bg-neutral-800',
    text: 'text-neutral-600 dark:text-neutral-300',
  },
} as const;

function KPICard({
  label,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: keyof typeof COLOR_MAP;
  subtitle?: string;
}) {
  const colors = COLOR_MAP[color];
  return (
    <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1c]">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-md flex items-center justify-center',
            colors.bg
          )}
        >
          <Icon className={cn('w-5 h-5', colors.text)} />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-foreground truncate">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {subtitle && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
