/**
 * Adapters that convert backend report responses to the shapes expected
 * by the advanced report components (OccupancyReport, CollectionsReport,
 * AgentPerformanceReport, ExecutiveSummary).
 *
 * Backend shapes are simpler/canonical — frontend components expect richer
 * structures with pre-computed fields. These mappers fill the gap and provide
 * sensible defaults for data the backend doesn't return yet.
 */

import type {
  OcupacionReport,
  OcupacionPropertyItem,
  OcupacionTrendItem,
  CarteraReport,
  CarteraMonthItem,
  CarteraItem,
  ComisionesAgenteReport,
  RendimientoAgentesReport,
  FlujoCajaReport,
} from '@/lib/types/inmobiliaria';
import type {
  OccupancyData,
  CollectionsData,
  AgentPerformanceData,
  ExecutiveData,
} from '@/lib/data/mock-reports';

/** Short month label like "Abr 2025" from backend "2025-04" */
function formatMonthLabel(iso: string): string {
  const [year, month] = iso.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const idx = Math.max(0, Math.min(11, parseInt(month, 10) - 1));
  return `${months[idx]} ${year}`;
}

// ============================================================================
// Occupancy
// ============================================================================

export function adaptOccupancy(report: OcupacionReport | null | undefined): OccupancyData | null {
  if (!report) return null;

  const vacant = report.totalAvailable + report.totalInProcess;
  const vacancyRate = report.totalProperties > 0
    ? ((vacant / report.totalProperties) * 100)
    : 0;

  return {
    summary: {
      totalProperties: report.totalProperties,
      rented: report.totalOccupied,
      vacant,
      vacancyRate: Math.round(vacancyRate * 10) / 10,
      avgDaysVacant: 0, // backend doesn't track this yet
    },
    byProperty: (report.byProperty ?? []).map((p: OcupacionPropertyItem) => ({
      id: p.consignacionId,
      title: p.propertyTitle,
      zone: p.propertyZone,
      status: p.availability === 'RENTED' ? 'rented' : 'vacant',
      tenant: p.tenantName,
      rentAmount: p.monthlyRent,
    })),
    byZone: report.zones.map((z) => ({
      zone: z.zone,
      total: z.totalProperties,
      rented: z.occupied,
      vacant: z.available + z.inProcess,
      vacancyRate: Math.round((1 - z.occupancyRate) * 1000) / 10,
    })),
    monthlyTrend: (report.monthlyTrend ?? []).map((t: OcupacionTrendItem) => ({
      month: formatMonthLabel(t.month),
      occupancyRate: Math.round(t.rate * 10) / 10,
    })),
  };
}

// ============================================================================
// Collections (from CarteraReport)
// ============================================================================

export function adaptCollections(report: CarteraReport | null | undefined): CollectionsData | null {
  if (!report) return null;

  const totalLate = report.summary.totalPending;
  const lateItems = report.items.filter((i: CarteraItem) => i.daysLate > 0);
  const avgDaysLate = lateItems.length > 0
    ? lateItems.reduce((sum: number, i: CarteraItem) => sum + i.daysLate, 0) / lateItems.length
    : 0;

  // Derive summary totals from byMonth[] (current period is last month in the series)
  const byMonth: CarteraMonthItem[] = report.byMonth ?? [];
  const currentMonth = byMonth[byMonth.length - 1];
  const totalExpected = currentMonth?.total ?? 0;
  const totalCollected = currentMonth?.collected ?? 0;
  const moraRate = totalExpected > 0 ? (totalLate / totalExpected) * 100 : 0;
  const recoveryRate = currentMonth?.collectionRate ?? 0;

  return {
    summary: {
      totalExpected,
      totalCollected,
      totalLate,
      moraRate: Math.round(moraRate * 10) / 10,
      avgDaysLate: Math.round(avgDaysLate),
      recoveryRate: Math.round(recoveryRate * 10) / 10,
    },
    byMonth: byMonth.map((m: CarteraMonthItem) => ({
      month: formatMonthLabel(m.month),
      expected: m.total,
      collected: m.collected,
      late: m.overdue,
      moraRate: m.total > 0 ? Math.round((m.overdue / m.total) * 1000) / 10 : 0,
    })),
    topDelinquents: lateItems
      .sort((a, b) => b.pendingAmount - a.pendingAmount)
      .slice(0, 10)
      .map((item) => ({
        tenantName: item.tenantName,
        propertyTitle: item.propertyTitle,
        daysLate: item.daysLate,
        amount: item.pendingAmount,
        attempts: 0,
      })),
  };
}

// ============================================================================
// Agent Performance (from ComisionesAgenteReport)
// ============================================================================

/**
 * Build agent performance data from the rendimiento-agentes endpoint (has
 * activeLeads / conversionRate / avgDaysToClose) and optionally enrich with
 * totalRevenue from the comisiones endpoint.
 */
export function adaptAgentPerformance(
  rendimiento: RendimientoAgentesReport | null | undefined,
  comisiones?: ComisionesAgenteReport | null,
): AgentPerformanceData | null {
  if (!rendimiento) return null;

  const commissionByAgent = new Map<string, number>(
    (comisiones?.agentes ?? []).map((c) => [c.agenteId, c.totalCommission]),
  );

  const agents = rendimiento.agentes.map((a: RendimientoAgentesReport['agentes'][number]) => ({
    id: a.userId,
    name: a.agenteName ?? a.userId,
    closings: a.completedDeals,
    avgDaysToClose: a.avgDaysToClose,
    conversionRate: a.conversionRate,
    totalRevenue: commissionByAgent.get(a.userId) ?? 0,
    activeLeads: a.activeLeads,
  }));

  const totalClosings = agents.reduce((sum: number, a) => sum + a.closings, 0);
  const totalRevenue = agents.reduce((sum: number, a) => sum + a.totalRevenue, 0);
  const avgConversion = agents.length > 0
    ? agents.reduce((sum: number, a) => sum + a.conversionRate, 0) / agents.length
    : 0;
  const avgDaysToClose = agents.length > 0
    ? agents.reduce((sum: number, a) => sum + a.avgDaysToClose, 0) / agents.length
    : 0;

  return {
    agents,
    teamSummary: {
      totalClosings,
      avgConversion: Math.round(avgConversion * 10) / 10,
      totalRevenue,
      avgDaysToClose: Math.round(avgDaysToClose),
    },
  };
}

// ============================================================================
// Executive (aggregates from FlujoCajaReport + OcupacionReport)
// ============================================================================

export function adaptExecutive(
  flujo: FlujoCajaReport | null | undefined,
  ocupacion: OcupacionReport | null | undefined,
): ExecutiveData | null {
  if (!flujo && !ocupacion) return null;

  const occupancyPct = ocupacion ? ocupacion.overallOccupancyRate * 100 : 0;
  const prevOccupancyPct = ocupacion?.previousMonthOccupancyRate
    ? ocupacion.previousMonthOccupancyRate * 100
    : occupancyPct;

  // Simple health score: weighted avg of occupancy + positive cash balance
  const cashHealthy = (flujo?.totals.netBalance ?? 0) > 0 ? 100 : 50;
  const healthScore = Math.round((occupancyPct * 0.6) + (cashHealthy * 0.4));
  const healthLevel: ExecutiveData['healthLevel'] =
    healthScore >= 85 ? 'excellent' : healthScore >= 70 ? 'good' : healthScore >= 50 ? 'warning' : 'critical';

  return {
    healthScore,
    healthLevel,
    metrics: [
      {
        id: 'occupancy',
        labelEs: 'Tasa de ocupación',
        labelEn: 'Occupancy rate',
        currentValue: occupancyPct,
        previousValue: prevOccupancyPct,
        format: 'percent',
        higherIsBetter: true,
      },
      {
        id: 'revenue',
        labelEs: 'Ingresos totales',
        labelEn: 'Total revenue',
        currentValue: flujo?.totals.totalIngresos ?? 0,
        previousValue: 0,
        format: 'currency',
        higherIsBetter: true,
      },
      {
        id: 'balance',
        labelEs: 'Balance neto',
        labelEn: 'Net balance',
        currentValue: flujo?.totals.netBalance ?? 0,
        previousValue: 0,
        format: 'currency',
        higherIsBetter: true,
      },
    ],
    monthlySummary: (flujo?.months ?? []).map((m) => ({
      month: m.month,
      revenue: m.ingresos,
      expenses: m.dispersiones + m.comisiones,
      netIncome: m.balance,
    })),
  };
}
