'use client';

import {
  Buildings,
  Handshake,
  CheckCircle,
  Calendar,
  Clock,
  ChartLineUp,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { AgenteMetrics as AgenteMetricsType } from '@/lib/types/inmobiliaria';
import { textoDeTasa } from '@/lib/tasas';

/**
 * 🔴 17-09: acá vivían «Comisiones del mes» y «Comisiones totales», y con
 * ellas todo un aparato para explicar por qué salían en $0 (ningún inmueble
 * tenía asesor asignado). La comisión de los asesores se paga por fuera de
 * Leasefy: la pantalla ya no le atribuye un peso a nadie. Lo que sí se mide
 * —quién captó y quién arrendó— vive en «Captaciones y arriendos».
 */
interface AgenteMetricsProps {
  metrics: AgenteMetricsType;
  className?: string;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  /** Por qué el valor no es un dato: se lee al pasar el cursor y por lector de pantalla. */
  motivo?: string | null;
  icon: React.ReactNode;
  iconBg: string;
  performance?: 'above' | 'average' | 'below';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function MetricCard({ label, value, motivo, icon: _icon, iconBg: _iconBg, performance }: MetricCardProps) {
  // Ronda 30 (Cadence 2): la cifra en arena, sin borde (vive dentro de la tarjeta de la ficha:
  // antes era tarjeta en tarjeta), sin fondo verde/rojo ni el ícono en una caja de color.
  // Cómo va se lee en el color de la cifra y en la leyenda de abajo.
  return (
    <div className="rounded-lg bg-surface-muted p-4">
      <p className="mb-1 truncate text-caption text-fg-muted">{label}</p>
      <p
        className={cn(
          'truncate font-mono text-xl tabular-nums',
          motivo
            ? 'text-fg-subtle'
            : performance === 'above'
              ? 'text-success'
              : performance === 'below'
                ? 'text-danger'
                : 'text-fg',
        )}
        title={motivo ?? undefined}
        aria-label={motivo ? `${label}: sin dato. ${motivo}` : undefined}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * AgenteMetrics - Detailed KPI cards for agente performance
 * Displays 8 metrics in a 2x4 grid with color-coded performance indicators
 */
export function AgenteMetrics({ metrics, className }: AgenteMetricsProps) {
  const { t } = useI18n();
  // Determine performance levels
  // Above average: conversionRate > 60%, avgDaysToClose < 25
  // Below average: conversionRate < 30%
  // `conversionRate` ya es un porcentaje (0–100): compararlo con 0.6 dejaba a
  // todo el que tuviera un solo cierre «por encima del promedio».
  const conversionPerformance = metrics.conversionRate >= 60
    ? 'above'
    : metrics.conversionRate < 30
    ? 'below'
    : 'average';

  const daysToClosePerformance = metrics.avgDaysToClose > 0 && metrics.avgDaysToClose < 25
    ? 'above'
    : metrics.avgDaysToClose > 35
    ? 'below'
    : 'average';

  const closedThisMonthPerformance = metrics.closedThisMonth >= 2
    ? 'above'
    : 'average';

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <ChartLineUp className="w-5 h-5 text-fg-muted" />
        <h2 className="text-lg font-medium text-fg dark:text-white">
          {t('inmobiliaria.agente.performanceMetrics')}
        </h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Row 1: Property and Lease counts */}
        <MetricCard
          label={t('inmobiliaria.agente.assignedProperties')}
          value={metrics.assignedProperties}
          icon={<Buildings className="w-5 h-5 text-primary" />}
          iconBg="bg-primary-soft"
        />
        <MetricCard
          label={t('inmobiliaria.agente.activeLeases')}
          value={metrics.activeLeases}
          icon={<Handshake className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />}
          iconBg="bg-surface-muted dark:bg-ink"
        />
        <MetricCard
          label={t('inmobiliaria.agente.closingsThisMonth')}
          value={metrics.closedThisMonth}
          icon={<CheckCircle className="w-5 h-5 text-success" />}
          iconBg="bg-success-soft"
          performance={closedThisMonthPerformance}
        />
        <MetricCard
          label={t('inmobiliaria.agente.closingsThisYear')}
          value={metrics.closedThisYear}
          icon={<Calendar className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />}
          iconBg="bg-surface-muted dark:bg-ink"
        />

        {/* Row 2: Efficiency */}
        <MetricCard
          label={t('inmobiliaria.agente.avgDaysToClose')}
          value={metrics.avgDaysToClose > 0 ? `${metrics.avgDaysToClose} ${t('inmobiliaria.agente.daysUnit')}` : 'N/A'}
          icon={<Clock className="w-5 h-5 text-primary" />}
          iconBg="bg-primary-soft"
          performance={daysToClosePerformance}
        />
        <MetricCard
          label={t('inmobiliaria.agente.conversionRate')}
          value={textoDeTasa(metrics.conversionRate, 0)}
          icon={<ChartLineUp className="w-5 h-5 text-danger" />}
          iconBg="bg-danger-soft"
          performance={conversionPerformance}
        />
      </div>

      {/* Performance Legend */}
      <div className="flex flex-wrap items-center gap-4 pt-2 text-caption text-fg-muted dark:text-fg-subtle">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-success" />
          <span>{t('inmobiliaria.agente.aboveAverage')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-muted dark:bg-ink" />
          <span>{t('inmobiliaria.agente.average')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-danger" />
          <span>{t('inmobiliaria.agente.belowAverage')}</span>
        </div>
      </div>
    </div>
  );
}

export default AgenteMetrics;
