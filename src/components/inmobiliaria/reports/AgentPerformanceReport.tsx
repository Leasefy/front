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
import type { AgentPerformanceData } from '@/lib/data/mock-reports';

interface AgentPerformanceReportProps {
  data: AgentPerformanceData;
}

// ============================================================================
// Color map for KPI cards
// ============================================================================

const COLOR_MAP = {
  amber: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-600 dark:text-amber-400',
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
  },
  emerald: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  violet: {
    bg: 'bg-violet-100 dark:bg-violet-900/30',
    text: 'text-violet-600 dark:text-violet-400',
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
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1c] overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-neutral-500" />
            Ranking de agentes
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800">
                <th className="text-left py-3 px-4 text-muted-foreground font-medium w-12">
                  #
                </th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">
                  Agente
                </th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">
                  Cierres
                </th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium min-w-[180px]">
                  Tasa conversion
                </th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">
                  Prom. dias
                </th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">
                  Ingresos
                </th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">
                  Leads activos
                </th>
              </tr>
            </thead>
            <tbody>
              {rankedAgents.map((agent, index) => {
                const isTop = agent.id === topPerformerId;
                const conversionWidth =
                  maxConversion > 0
                    ? (agent.conversionRate / maxConversion) * 100
                    : 0;

                return (
                  <tr
                    key={agent.id}
                    className={cn(
                      'border-b border-neutral-50 dark:border-neutral-800/50 transition-colors',
                      isTop
                        ? 'bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30'
                    )}
                  >
                    {/* Rank */}
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        {isTop ? (
                          <Medal
                            className="w-5 h-5 text-amber-500"
                            weight="fill"
                          />
                        ) : (
                          <span className="text-muted-foreground font-medium">
                            {index + 1}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Name */}
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          'font-medium',
                          isTop ? 'text-foreground' : 'text-foreground'
                        )}
                      >
                        {agent.name}
                      </span>
                    </td>

                    {/* Closings */}
                    <td className="py-3 px-4 text-right">
                      <span className="font-semibold text-foreground">
                        {agent.closings}
                      </span>
                    </td>

                    {/* Conversion Rate with mini bar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              agent.conversionRate >= 70
                                ? 'bg-emerald-500'
                                : agent.conversionRate >= 50
                                  ? 'bg-blue-500'
                                  : 'bg-amber-500'
                            )}
                            style={{ width: `${conversionWidth}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {agent.conversionRate}%
                        </span>
                      </div>
                    </td>

                    {/* Avg Days */}
                    <td className="py-3 px-4 text-right text-muted-foreground">
                      {agent.avgDaysToClose}d
                    </td>

                    {/* Revenue */}
                    <td className="py-3 px-4 text-right font-medium text-foreground">
                      {formatCurrency(agent.totalRevenue)}
                    </td>

                    {/* Active Leads */}
                    <td className="py-3 px-4 text-right text-muted-foreground">
                      {agent.activeLeads}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Comparison - Horizontal Bars */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1c] p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <ChartLineUp className="w-4 h-4 text-neutral-500" />
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
                <div className="h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      agent.conversionRate >= 70
                        ? 'bg-emerald-500'
                        : agent.conversionRate >= 50
                          ? 'bg-blue-500'
                          : 'bg-amber-500'
                    )}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
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
    <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1c]">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
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
