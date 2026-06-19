'use client';

import {
  Buildings,
  House,
  Warning,
  TrendUp,
  MapPin,
  User,
  CurrencyDollar,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { OccupancyData } from '@/lib/data/mock-reports';

interface OccupancyReportProps {
  data: OccupancyData;
}

/**
 * OccupancyReport - Shows vacancy rate, avg days vacant, breakdown by property and zone.
 * Pure CSS/Tailwind visualizations (no charting library).
 */
export function OccupancyReport({ data }: OccupancyReportProps) {
  const { formatCurrency } = useI18n();

  const { summary, byProperty, byZone, monthlyTrend } = data;

  // Find max occupancy for trend scaling
  const maxOccupancy = Math.max(...monthlyTrend.map((m) => m.occupancyRate));
  const minOccupancy = Math.min(...monthlyTrend.map((m) => m.occupancyRate));
  const range = maxOccupancy - minOccupancy || 1;

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total propiedades"
          value={summary.totalProperties}
          icon={Buildings}
          color="blue"
        />
        <KPICard
          label="Arrendadas"
          value={summary.rented}
          icon={House}
          color="emerald"
        />
        <KPICard
          label="Vacantes"
          value={summary.vacant}
          icon={Warning}
          color="amber"
        />
        <KPICard
          label="Tasa vacancia"
          value={`${summary.vacancyRate}%`}
          icon={TrendUp}
          color="red"
          subtitle={`Prom. ${summary.avgDaysVacant} dias vacante`}
        />
      </div>

      {/* Occupancy by Zone - CSS Bar Chart */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1c] p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-neutral-500" />
          Ocupacion por zona
        </h3>
        <div className="space-y-3">
          {byZone.map((zone) => {
            const occupancyRate = 100 - zone.vacancyRate;
            return (
              <div key={zone.zone} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground font-medium">{zone.zone}</span>
                  <span className="text-muted-foreground">
                    {zone.rented}/{zone.total} ({occupancyRate.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      occupancyRate >= 90
                        ? 'bg-[#2C7A53]'
                        : occupancyRate >= 70
                          ? 'bg-[#1A40FF]'
                          : occupancyRate >= 50
                            ? 'bg-[#B7791F]'
                            : 'bg-[#C4503B]'
                    )}
                    style={{ width: `${occupancyRate}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly Occupancy Trend - CSS Dot/Bar Chart */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1c] p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendUp className="w-4 h-4 text-neutral-500" />
          Tendencia de ocupacion (12 meses)
        </h3>
        <div className="flex items-end gap-1.5 h-36">
          {monthlyTrend.map((m) => {
            const height = ((m.occupancyRate - minOccupancy + 5) / (range + 10)) * 100;
            return (
              <div
                key={m.month}
                className="flex-1 flex flex-col items-center gap-1 group"
              >
                <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                  {m.occupancyRate}%
                </span>
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={cn(
                      'w-full rounded-t transition-all duration-300 group-hover:opacity-80',
                      m.occupancyRate >= 90
                        ? 'bg-[#2C7A53] dark:bg-[#2C7A53]'
                        : m.occupancyRate >= 85
                          ? 'bg-[#1A40FF] dark:bg-[#1A40FF]'
                          : 'bg-[#B7791F] dark:bg-[#B7791F]'
                    )}
                    style={{ height: `${height}%` }}
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

      {/* Property Table */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1c] overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <House className="w-4 h-4 text-neutral-500" />
            Detalle por propiedad
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800">
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Propiedad</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Zona</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Estado</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Dias vacante</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Inquilino</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Canon</th>
              </tr>
            </thead>
            <tbody>
              {byProperty.map((prop) => (
                <tr
                  key={prop.id}
                  className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors"
                >
                  <td className="py-2.5 px-4 font-medium text-foreground">{prop.title}</td>
                  <td className="py-2.5 px-4 text-muted-foreground">{prop.zone}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                        prop.status === 'rented'
                          ? 'bg-[#E8F3EC] text-[#2C7A53] dark:bg-[#2C7A53]/15 dark:text-[#3EAE70]'
                          : 'bg-[#F8F0E0] text-[#B7791F] dark:bg-[#B7791F]/15 dark:text-[#D2992F]'
                      )}
                    >
                      {prop.status === 'rented' ? 'Arrendado' : 'Vacante'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right text-muted-foreground">
                    {prop.daysVacant != null ? `${prop.daysVacant}d` : '-'}
                  </td>
                  <td className="py-2.5 px-4 text-muted-foreground">
                    {prop.tenant || '-'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium text-foreground">
                    {formatCurrency(prop.rentAmount)}
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
    bg: 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15',
    text: 'text-[#1A40FF] dark:text-[#5570FF]',
  },
  emerald: {
    bg: 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15',
    text: 'text-[#2C7A53] dark:text-[#3EAE70]',
  },
  amber: {
    bg: 'bg-[#F8F0E0] dark:bg-[#B7791F]/15',
    text: 'text-[#B7791F] dark:text-[#D2992F]',
  },
  red: {
    bg: 'bg-[#F8EAE7] dark:bg-[#C4503B]/15',
    text: 'text-[#C4503B] dark:text-[#E0664D]',
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
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {subtitle && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
