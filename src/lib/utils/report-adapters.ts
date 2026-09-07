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
import { promedioMedido, tasaMedida } from '@/lib/tasas';
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

  // 🔴 Acá salía «NaN Vacantes» en la pantalla del cliente.
  //
  // Esto sumaba `report.totalAvailable + report.totalInProcess` y el back no
  // manda ninguno de los dos: manda `totalVacant`. Dos `undefined` sumados dan
  // NaN, el tipo los declaraba obligatorios, y `tsc` pasó sin decir palabra.
  // Ver el comentario de `OcupacionReport` en lib/types/inmobiliaria.ts.
  const vacant = report.totalVacant;
  // Sin un inmueble cargado no hay vacancia que medir: `null`, no 0. El 0 se
  // pintaba en rojo con flecha arriba, afirmando una vacancia inmejorable.
  const vacancyRate = tasaMedida(vacant, report.totalProperties);

  return {
    summary: {
      totalProperties: report.totalProperties,
      rented: report.totalOccupied,
      vacant,
      vacancyRate: vacancyRate === null ? null : Math.round(vacancyRate * 10) / 10,
      // El back no guarda desde cuándo está vacío un inmueble: `null` (dato
      // que falta), no `0` (medición perfecta).
      avgDaysVacant: null,
    },
    byProperty: (report.byProperty ?? []).map((p: OcupacionPropertyItem) => ({
      id: p.consignacionId,
      title: p.propertyTitle,
      zone: p.propertyZone,
      status: p.availability === 'RENTED' ? 'rented' : 'vacant',
      tenant: p.tenantName,
      rentAmount: p.monthlyRent,
    })),
    // El mismo desajuste, por zona: `totalProperties`, `available`, `inProcess`
    // y `occupancyRate` tampoco existen — por eso salía «Medellín 5/ (NaN%)»,
    // con el denominador en blanco. El back manda `total`, `vacant` y
    // `vacancyRate` ya en 0–100 y ya guardada contra el denominador cero.
    byZone: report.zones.map((z) => ({
      zone: z.zone,
      total: z.total,
      rented: z.occupied,
      vacant: z.vacant,
      vacancyRate: z.total > 0 ? Math.round(z.vacancyRate * 10) / 10 : null,
    })),
    monthlyTrend: (report.monthlyTrend ?? []).map((t: OcupacionTrendItem) => ({
      month: formatMonthLabel(t.month),
      occupancyRate: t.rate === null ? null : Math.round(t.rate * 10) / 10,
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
  // Sin un solo contrato atrasado no hay atraso que promediar. El 0 decía
  // «Prom. 0 días de atraso», que se lee como una cartera medida y sana.
  const avgDaysLate = promedioMedido(lateItems.map((i: CarteraItem) => i.daysLate));

  // Derive summary totals from byMonth[] (current period is last month in the series)
  const byMonth: CarteraMonthItem[] = report.byMonth ?? [];
  const currentMonth = byMonth[byMonth.length - 1];
  const totalExpected = currentMonth?.total ?? 0;
  const totalCollected = currentMonth?.collected ?? 0;
  const moraRate = tasaMedida(totalLate, totalExpected);
  /*
   * `collectionRate` del mes ya viene del back en 0 cuando no hubo cobros, y
   * un 0 acá caía en la banda verde «óptima» del gráfico: afirmaba una
   * cartera sana sobre una cartera inexistente. Sin mes, no hay recuperación.
   */
  const recoveryRate =
    currentMonth === undefined ? null : tasaMedida(currentMonth.collected, currentMonth.total);

  return {
    summary: {
      totalExpected,
      totalCollected,
      totalLate,
      moraRate: moraRate === null ? null : Math.round(moraRate * 10) / 10,
      avgDaysLate: avgDaysLate === null ? null : Math.round(avgDaysLate),
      recoveryRate: recoveryRate === null ? null : Math.round(recoveryRate * 10) / 10,
    },
    byMonth: byMonth.map((m: CarteraMonthItem) => ({
      month: formatMonthLabel(m.month),
      expected: m.total,
      collected: m.collected,
      late: m.overdue,
      moraRate: m.total > 0 ? Math.round((m.overdue / m.total) * 1000) / 10 : null,
    })),
    topDelinquents: lateItems
      .sort((a, b) => b.pendingAmount - a.pendingAmount)
      .slice(0, 10)
      .map((item) => ({
        tenantName: item.tenantName ?? '',
        propertyTitle: item.propertyTitle,
        daysLate: item.daysLate,
        amount: item.pendingAmount,
        // Los recordatorios que se enviaron de verdad. Antes era un 0 fijo: la
        // columna «Intentos» afirmaba, para TODA la cartera, que nadie había
        // sido contactado — que no es lo mismo que no saberlo.
        attempts: item.remindersSent,
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
  // Sin agentes no hay a quién promediarle nada: «0% de conversión» y «0d al
  // cierre» acusaban a un equipo que todavía no existe.
  const avgConversion = promedioMedido(agents.map((a) => a.conversionRate));
  const avgDaysToClose = promedioMedido(agents.map((a) => a.avgDaysToClose));

  return {
    agents,
    teamSummary: {
      totalClosings,
      avgConversion: avgConversion === null ? null : Math.round(avgConversion * 10) / 10,
      totalRevenue,
      avgDaysToClose: avgDaysToClose === null ? null : Math.round(avgDaysToClose),
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

  // 🔴 Dos errores en dos líneas, los dos por el mismo tipo inventado.
  //
  // `overallOccupancyRate` ya viene en 0–100 desde el back; multiplicarlo por
  // 100 lo llevaba a 8.300 para una ocupación del 83 %, y el «health score»
  // salía en miles. Y `previousMonthOccupancyRate` nunca existió, así que el
  // «mes anterior» siempre era igual al actual: la comparación era una copia.
  const occupancyPct = ocupacion?.overallOccupancyRate ?? 0;
  // Sin el dato del mes pasado no hay variación que mostrar; igualarlo al mes
  // actual es lo único honesto hasta que el back lo mande.
  const prevOccupancyPct = occupancyPct;

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
        // Sin `previousValue`: `/reports/flujo-caja` no trae el mes anterior.
        // Ponía `0` y la tarjeta pintaba una variación de «0,0 %».
        format: 'currency',
        higherIsBetter: true,
      },
      {
        id: 'balance',
        labelEs: 'Balance neto',
        labelEn: 'Net balance',
        currentValue: flujo?.totals.netBalance ?? 0,
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
