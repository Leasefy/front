'use client';

import {
  Trophy,
  ChartLineUp,
  CurrencyDollar,
  Clock,
  Users,
  Medal,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import type { AgentPerformanceData } from '@/lib/data/mock-reports';

interface AgentPerformanceReportProps {
  data: AgentPerformanceData;
}

// ============================================================================
// Color map for KPI cards
// ============================================================================

const COLOR_MAP = {
  amber: {
    bg: 'bg-warning-soft',
    text: 'text-warning',
  },
  blue: {
    bg: 'bg-primary-soft',
    text: 'text-primary',
  },
  emerald: {
    bg: 'bg-success-soft',
    text: 'text-success',
  },
  violet: {
    bg: 'bg-surface-muted dark:bg-ink',
    text: 'text-fg-muted dark:text-fg-subtle',
  },
} as const;

// ============================================================================
// AgentPerformanceReport
// ============================================================================

/**
 * AgentPerformanceReport - Shows closings, conversion rate, avg days to close per agent.
 * Includes team summary KPI row and agent ranking table with performance bars.
 */
export function AgentPerformanceReport({ data }: AgentPerformanceReportProps) {
  const { formatCurrency } = useI18n();
  const { agents, teamSummary } = data;

  // Sort agents by closings descending for ranking
  const rankedAgents = [...agents].sort((a, b) => b.closings - a.closings);
  const topPerformerId = rankedAgents[0]?.id;

  // Max conversion rate for proportional bar rendering
  const maxConversion = Math.max(...agents.map((a) => a.conversionRate));

  return (
    <div className="space-y-6">
      {/* Team Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total cierres"
          value={teamSummary.totalClosings}
          icon={Trophy}
          color="amber"
        />
        <KPICard
          label="Conversion promedio"
          value={`${teamSummary.avgConversion}%`}
          icon={ChartLineUp}
          color="blue"
        />
        <KPICard
          label="Ingresos totales"
          value={formatCurrency(teamSummary.totalRevenue)}
          icon={CurrencyDollar}
          color="emerald"
        />
        <KPICard
          label="Prom. dias al cierre"
          value={`${teamSummary.avgDaysToClose}d`}
          icon={Clock}
          color="violet"
        />
      </div>

      {/* Agent Ranking Table */}
      <div className="rounded-xl border border-border dark:border-strong bg-surface dark:bg-[#14130F] overflow-hidden">
        <div className="p-4 border-b border-border dark:border-strong">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-fg-muted" />
            Ranking de agentes
          </h3>
        </div>
        <div className="overflow-x-auto">
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="border-b border-faint dark:border-strong">
                <TableHead className="text-left py-3 px-4 w-12">
                  #
                </TableHead>
                <TableHead className="text-left py-3 px-4">
                  Agente
                </TableHead>
                <TableHead className="text-right py-3 px-4">
                  Cierres
                </TableHead>
                <TableHead className="text-left py-3 px-4 min-w-[180px]">
                  Tasa conversion
                </TableHead>
                <TableHead className="text-right py-3 px-4">
                  Prom. dias
                </TableHead>
                <TableHead className="text-right py-3 px-4">
                  Ingresos
                </TableHead>
                <TableHead className="text-right py-3 px-4">
                  Leads activos
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankedAgents.map((agent, index) => {
                const isTop = agent.id === topPerformerId;
                const conversionWidth =
                  maxConversion > 0
                    ? (agent.conversionRate / maxConversion) * 100
                    : 0;

                return (
                  <TableRow
                    key={agent.id}
                    className={cn(
                      'border-b border-faint dark:border-strong/50 transition-colors',
                      isTop
                        ? 'bg-warning-soft/50 dark:bg-warning/10 hover:bg-warning-soft'
                        : 'hover:bg-surface-muted dark:hover:bg-ink/30'
                    )}
                  >
                    {/* Rank */}
                    <TableCell className="py-3 px-4">
                      <div className="flex items-center">
                        {isTop ? (
                          <Medal
                            className="w-5 h-5 text-warning"
                            weight="fill"
                          />
                        ) : (
                          <span className="text-muted-foreground font-medium">
                            {index + 1}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Name */}
                    <TableCell className="py-3 px-4">
                      <span className="font-medium text-foreground">
                        {agent.name}
                      </span>
                    </TableCell>

                    {/* Closings */}
                    <TableCell className="py-3 px-4 text-right">
                      <span className="font-semibold text-foreground">
                        {agent.closings}
                      </span>
                    </TableCell>

                    {/* Conversion Rate with mini bar */}
                    <TableCell className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={conversionWidth}
                          size="xs"
                          variant={
                            agent.conversionRate >= 70
                              ? 'success'
                              : agent.conversionRate >= 50
                                ? 'default'
                                : 'warning'
                          }
                          className="flex-1"
                        />
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {agent.conversionRate}%
                        </span>
                      </div>
                    </TableCell>

                    {/* Avg Days */}
                    <TableCell className="py-3 px-4 text-right text-muted-foreground">
                      {agent.avgDaysToClose}d
                    </TableCell>

                    {/* Revenue */}
                    <TableCell className="py-3 px-4 text-right font-medium text-foreground">
                      {formatCurrency(agent.totalRevenue)}
                    </TableCell>

                    {/* Active Leads */}
                    <TableCell className="py-3 px-4 text-right text-muted-foreground">
                      {agent.activeLeads}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Performance Comparison - Horizontal Bars */}
      <div className="rounded-xl border border-border dark:border-strong bg-surface dark:bg-[#14130F] p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <ChartLineUp className="w-4 h-4 text-fg-muted" />
          Tasa de conversion por agente
        </h3>
        <div className="space-y-3">
          {rankedAgents.map((agent) => {
            const barWidth =
              maxConversion > 0
                ? (agent.conversionRate / maxConversion) * 100
                : 0;

            return (
              <div key={`perf-${agent.id}`} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground font-medium">
                    {agent.name}
                  </span>
                  <span className="text-muted-foreground">
                    {agent.conversionRate}% ({agent.closings} cierres)
                  </span>
                </div>
                <Progress
                  value={barWidth}
                  size="default"
                  variant={
                    agent.conversionRate >= 70
                      ? 'success'
                      : agent.conversionRate >= 50
                        ? 'default'
                        : 'warning'
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// KPI Card Sub-component
// ============================================================================

function KPICard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: keyof typeof COLOR_MAP;
}) {
  const colors = COLOR_MAP[color];
  return (
    <div className="p-4 rounded-xl border border-border dark:border-strong bg-surface dark:bg-[#14130F]">
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
        </div>
      </div>
    </div>
  );
}
