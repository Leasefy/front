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
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
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

  /**
   * Paginado de presentación: «detalle por propiedad» es una fila por inmueble
   * del portafolio — `adaptOccupancy()` no lo recorta (a diferencia de
   * `adaptCollections()`, que sí capa el top-10 de morosos).
   *
   * El resumen, las zonas y la tendencia siguen calculándose sobre el conjunto
   * completo: sólo se pagina el detalle.
   */
  const {
    pageItems,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(byProperty);

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
      <div className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#14130F] p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-fg-muted" />
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
                <Progress
                  value={occupancyRate}
                  size="default"
                  variant={
                    occupancyRate >= 90
                      ? 'success'
                      : occupancyRate >= 70
                        ? 'default'
                        : occupancyRate >= 50
                          ? 'warning'
                          : 'error'
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly Occupancy Trend - CSS Dot/Bar Chart */}
      <div className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#14130F] p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendUp className="w-4 h-4 text-fg-muted" />
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
                        ? 'bg-success dark:bg-success'
                        : m.occupancyRate >= 85
                          ? 'bg-primary dark:bg-primary'
                          : 'bg-warning dark:bg-warning'
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
      <div className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#14130F] overflow-hidden">
        <div className="p-4 border-b border-border dark:border-border-strong">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <House className="w-4 h-4 text-fg-muted" />
            Detalle por propiedad
          </h3>
        </div>
        <div className="overflow-x-auto">
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="border-b border-border-faint dark:border-border-strong">
                <TableHead className="text-left py-3 px-4">Propiedad</TableHead>
                <TableHead className="text-left py-3 px-4">Zona</TableHead>
                <TableHead className="text-left py-3 px-4">Estado</TableHead>
                <TableHead className="text-right py-3 px-4">Dias vacante</TableHead>
                <TableHead className="text-left py-3 px-4">Inquilino</TableHead>
                <TableHead className="text-right py-3 px-4">Canon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((prop) => (
                <TableRow
                  key={prop.id}
                  className="border-b border-border-faint dark:border-border-strong/50 hover:bg-surface-muted dark:hover:bg-ink transition-colors"
                >
                  <TableCell className="py-2.5 px-4 font-medium text-foreground">{prop.title}</TableCell>
                  <TableCell className="py-2.5 px-4 text-muted-foreground">{prop.zone}</TableCell>
                  <TableCell className="py-2.5 px-4">
                    <Badge variant={prop.status === 'rented' ? 'success' : 'warning'}>
                      {prop.status === 'rented' ? 'Arrendado' : 'Vacante'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2.5 px-4 text-right text-muted-foreground">
                    {prop.daysVacant != null ? `${prop.daysVacant}d` : '-'}
                  </TableCell>
                  <TableCell className="py-2.5 px-4 text-muted-foreground">
                    {prop.tenant || '-'}
                  </TableCell>
                  <TableCell className="py-2.5 px-4 text-right font-medium text-foreground">
                    {formatCurrency(prop.rentAmount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pie: sólo si hay más de una página. */}
        {shouldPaginate && (
          <div className="border-t border-border dark:border-border-strong px-4 py-3">
            <TablePagination
              total={total}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
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
  amber: {
    bg: 'bg-warning-soft',
    text: 'text-warning',
  },
  red: {
    bg: 'bg-danger-soft',
    text: 'text-danger',
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
    <div className="p-4 rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#14130F]">
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
