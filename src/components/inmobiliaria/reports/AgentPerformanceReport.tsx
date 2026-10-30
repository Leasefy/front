'use client';

import { useMemo } from 'react';
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
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { useOrdenDeLaTabla } from '@/lib/hooks/use-orden-de-la-tabla';
import { EncabezadoOrdenable } from '@/components/ui/encabezado-ordenable';
import { SelectorDeOrden } from '@/components/ui/selector-de-orden';
import { TablePagination } from '@/components/ui/pagination';
import {
  PAGE_SIZE_OPTIONS,
  useTablePagination,
} from '@/lib/hooks/use-table-pagination';
import { SIN_MEDIR, textoDeTasa } from '@/lib/tasas';
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
    bg: 'bg-surface-muted',
    text: 'text-fg-muted',
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
  const rankedAgents = useMemo(
    () => [...agents].sort((a, b) => b.closings - a.closings),
    [agents]
  );
  const topPerformerId = rankedAgents[0]?.id;
  // El puesto es el del ranking por cierres, se ordene la tabla como se ordene.
  const puestoDe = useMemo(() => new Map(rankedAgents.map((a, i) => [a.id, i + 1])), [rankedAgents]);

  // Nico 28-10: «que todas las tablas tengan lo de ordenamiento general y por columnas». Sin orden elegido, el ranking;
  // el elegido ordena a TODOS los agentes antes de cortar la página.
  const { ordenadas, orden, ordenarPor, setOrden } = useOrdenDeLaTabla(
    rankedAgents,
    {
      puesto: (a) => puestoDe.get(a.id) ?? null,
      agente: (a) => a.name,
      cierres: (a) => a.closings,
      conversion: (a) => a.conversionRate,
      dias: (a) => a.avgDaysToClose,
      leads: (a) => a.activeLeads,
    },
    { primero: { cierres: 'desc', conversion: 'desc', leads: 'desc' } },
  );

  // Sólo se pagina el RANKING. La comparación de barras de abajo es un gráfico:
  // recortarla dejaría de ser una comparación entre agentes.
  const {
    pageItems: agentesDeLaPagina,
    total: totalAgentes,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(ordenadas, { resetKey: `${orden?.campo ?? ''}|${orden?.sentido ?? ''}` });

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
        {/* Sin agentes cargados no hay promedio de equipo: «0%» y «0d»
            acusaban de bajo rendimiento a un equipo que no existe. */}
        <KPICard
          label="Conversion promedio"
          value={textoDeTasa(teamSummary.avgConversion)}
          icon={ChartLineUp}
          color="blue"
        />
        {/* 🔴 17-09: era «Ingresos totales» sumando la comisión atribuida a
            cada asesor. La comisión es de la INMOBILIARIA y la de los asesores
            se liquida por fuera de Leasefy. */}
        <KPICard
          label="Comisión de la inmobiliaria"
          value={formatCurrency(teamSummary.comisionDeLaAgenciaCop)}
          icon={CurrencyDollar}
          color="emerald"
        />
        <KPICard
          label="Prom. dias al cierre"
          value={teamSummary.avgDaysToClose === null ? SIN_MEDIR : `${teamSummary.avgDaysToClose}d`}
          icon={Clock}
          color="violet"
        />
      </div>

      {/* Agent Ranking Table */}
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-fg-muted" />
            Ranking de agentes
          </h3>
          {agents.length > 1 ? (
            <SelectorDeOrden
              orden={orden}
              onCambiar={setOrden}
              className="w-full sm:w-56"
              formas={[
                { campo: 'cierres', sentido: 'desc', etiqueta: 'Más cierres' },
                { campo: 'conversion', sentido: 'desc', etiqueta: 'Mejor conversión' },
                { campo: 'dias', sentido: 'asc', etiqueta: 'Cierra más rápido' },
                { campo: 'agente', sentido: 'asc', etiqueta: 'Agente (A–Z)' },
              ]}
            />
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="border-b border-border-faint">
                <EncabezadoOrdenable campo="puesto" orden={orden} onOrdenar={ordenarPor} className="text-left py-3 px-4 w-12">
                  #
                </EncabezadoOrdenable>
                <EncabezadoOrdenable campo="agente" orden={orden} onOrdenar={ordenarPor} className="text-left py-3 px-4">
                  Agente
                </EncabezadoOrdenable>
                <EncabezadoOrdenable campo="cierres" orden={orden} onOrdenar={ordenarPor} className="text-right py-3 px-4" alineacion="derecha">
                  Cierres
                </EncabezadoOrdenable>
                <EncabezadoOrdenable campo="conversion" orden={orden} onOrdenar={ordenarPor} className="text-left py-3 px-4 min-w-[180px]">
                  Tasa de conversión
                </EncabezadoOrdenable>
                <EncabezadoOrdenable campo="dias" orden={orden} onOrdenar={ordenarPor} className="text-right py-3 px-4" alineacion="derecha">
                  Prom. días
                </EncabezadoOrdenable>
                <EncabezadoOrdenable campo="leads" orden={orden} onOrdenar={ordenarPor} className="text-right py-3 px-4" alineacion="derecha">
                  Leads activos
                </EncabezadoOrdenable>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentesDeLaPagina.map((agent) => {
                const isTop = agent.id === topPerformerId;
                const conversionWidth =
                  maxConversion > 0
                    ? (agent.conversionRate / maxConversion) * 100
                    : 0;

                return (
                  <TableRow
                    key={agent.id}
                    className={cn(
                      'border-b border-border-faint transition-colors',
                      isTop
                        ? 'bg-warning-soft/50 hover:bg-warning-soft'
                        : 'hover:bg-surface-muted'
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
                            {puestoDe.get(agent.id)}
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
                      <span className="font-medium text-foreground">
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
                        <span className="text-caption text-muted-foreground w-10 text-right">
                          {agent.conversionRate}%
                        </span>
                      </div>
                    </TableCell>

                    {/* Avg Days */}
                    <TableCell className="py-3 px-4 text-right text-muted-foreground">
                      {agent.avgDaysToClose}d
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

        {/* Pie: sólo si hay más de una página. */}
        {shouldPaginate && (
          <div className="border-t border-border px-4 py-3">
            <TablePagination
              total={totalAgentes}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>

      {/* Performance Comparison - Horizontal Bars */}
      <div className="rounded-lg border border-border bg-surface p-5">
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
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
    <div className="p-4 rounded-lg border border-border bg-surface">
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
          <p className="text-2xl font-medium text-foreground">{value}</p>
          <p className="text-caption text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
