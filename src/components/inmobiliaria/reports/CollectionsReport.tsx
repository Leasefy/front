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
import { textoDeTasa } from '@/lib/tasas';
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
          subtitle={`${textoDeTasa(summary.moraRate)} tasa de mora`}
        />
        {/* Sin nadie atrasado no hay atraso promedio: el «Prom. 0 dias» decía
            que la cartera estaba medida y al día, no que estaba vacía. */}
        <KPICard
          label="Tasa de recuperacion"
          value={textoDeTasa(summary.recoveryRate)}
          icon={ArrowClockwise}
          color="violet"
          subtitle={
            summary.avgDaysLate === null
              ? undefined
              : `Prom. ${summary.avgDaysLate} dias de atraso`
          }
        />
      </div>

      {/* Monthly Breakdown - Stacked CSS Bar Chart */}
      <div className="rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <ChartBar className="w-4 h-4 text-fg-muted" />
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
                  {textoDeTasa(m.moraRate)} mora
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
      <div className="rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendUp className="w-4 h-4 text-fg-muted" />
          Tasa de mora mensual
        </h3>
        <div className="space-y-2">
          {byMonth.map((m) => (
            <div key={m.month} className="flex items-center gap-3 text-sm">
              <span className="w-20 text-muted-foreground text-xs shrink-0">
                {m.month.split(' ')[0]}
              </span>
              {/* Un mes sin cobros emitidos caía en la banda verde «óptima»:
                  afirmaba una cartera sana donde no había cartera. */}
              <Progress
                value={m.moraRate === null ? 0 : Math.min(m.moraRate * 5, 100)}
                size="xs"
                variant={
                  m.moraRate === null
                    ? 'default'
                    : m.moraRate <= 5
                      ? 'success'
                      : m.moraRate <= 8
                        ? 'default'
                        : m.moraRate <= 10
                          ? 'warning'
                          : 'error'
                }
                className="flex-1"
              />
              <span
                className={cn(
                  'w-12 text-right text-xs font-medium',
                  m.moraRate === null
                    ? 'text-fg-muted'
                    : m.moraRate <= 5
                      ? 'text-success'
                      : m.moraRate <= 8
                        ? 'text-primary'
                        : m.moraRate <= 10
                          ? 'text-warning'
                          : 'text-danger'
                )}
              >
                {textoDeTasa(m.moraRate)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Delinquents Table */}
      <div className="rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg overflow-hidden">
        <div className="p-4 border-b border-border dark:border-border-strong">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Warning className="w-4 h-4 text-danger" />
            Principales morosos
          </h3>
        </div>
        <div className="overflow-x-auto">
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="border-b border-border-faint dark:border-border-strong">
                <TableHead className="text-left py-3 px-4">Inquilino</TableHead>
                <TableHead className="text-left py-3 px-4">Propiedad</TableHead>
                <TableHead className="text-right py-3 px-4">Dias mora</TableHead>
                <TableHead className="text-right py-3 px-4">Monto</TableHead>
                <TableHead className="text-right py-3 px-4">Intentos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topDelinquents.map((d, i) => (
                <TableRow
                  key={i}
                  className="border-b border-border-faint dark:border-border-strong/50 hover:bg-surface-muted dark:hover:bg-ink transition-colors"
                >
                  <TableCell className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-surface-muted dark:bg-ink flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-fg-muted" />
                      </div>
                      <span className="font-medium text-foreground">{d.tenantName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 px-4 text-muted-foreground">{d.propertyTitle}</TableCell>
                  <TableCell className="py-2.5 px-4 text-right">
                    <Badge variant={d.daysLate >= 30 ? 'destructive' : 'warning'} className="gap-1">
                      <Clock className="w-3 h-3" />
                      {d.daysLate}d
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2.5 px-4 text-right font-medium text-foreground">
                    {formatCurrency(d.amount)}
                  </TableCell>
                  <TableCell className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      {d.attempts}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
    bg: 'bg-surface-muted dark:bg-ink',
    text: 'text-fg-muted dark:text-fg-subtle',
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
    <div className="p-4 rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg">
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
