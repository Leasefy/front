/**
 * Los adaptadores de Reportes con una inmobiliaria en cero.
 *
 * Estos tres adaptadores alimentan «Cartera» y «Rendimiento de agentes». Con
 * una agencia nueva devolvían 0 en cada tasa y en cada promedio, y la pantalla
 * lo pintaba como medición: «0% tasa de mora» (banda verde, cartera sana),
 * «Prom. 0 dias de atraso», «0% conversion promedio», «0d al cierre».
 * Ninguna de esas cosas se midió. Van en `null` para que salga una raya.
 */
import { describe, it, expect } from 'vitest';

import { adaptAgentPerformance, adaptCollections } from './report-adapters';
import type {
  CarteraItem,
  CarteraMonthItem,
  CarteraReport,
  RendimientoAgentesReport,
} from '@/lib/types/inmobiliaria';

function itemDeCartera(sobre: Partial<CarteraItem> = {}): CarteraItem {
  return {
    cobroId: 'c-1',
    consignacionId: 'cons-1',
    propertyTitle: 'Apto 402',
    propertyAddress: 'Calle 1 #2-3',
    tenantName: 'Pérez',
    tenantPhone: null,
    propietarioId: null,
    propietarioName: null,
    agenteId: null,
    agenteName: null,
    month: '2026-09',
    dueDate: '2026-09-05',
    totalAmount: 1_000_000,
    paidAmount: 0,
    pendingAmount: 1_000_000,
    daysLate: 0,
    status: 'LATE',
    remindersSent: 0,
    lastReminderDate: null,
    ...sobre,
  };
}

function cartera(sobre: Partial<CarteraReport> = {}): CarteraReport {
  return {
    generatedAt: '2026-09-05T10:00:00.000Z',
    items: [],
    summary: {
      totalPending: 0,
      bucket0to30: 0,
      bucket31to60: 0,
      bucket61to90: 0,
      bucket90plus: 0,
    },
    byMonth: [],
    ...sobre,
  };
}

function mes(sobre: Partial<CarteraMonthItem> = {}): CarteraMonthItem {
  return { month: '2026-09', total: 0, collected: 0, overdue: 0, collectionRate: 0, ...sobre };
}

function rendimiento(agentes: RendimientoAgentesReport['agentes']): RendimientoAgentesReport {
  return { generatedAt: '2026-09-05T10:00:00.000Z', agentes };
}

describe('adaptCollections — cartera de una inmobiliaria nueva', () => {
  it('sin cobros emitidos las tres tasas del resumen van en null, no en 0', () => {
    const data = adaptCollections(cartera())!;
    expect(data.summary.moraRate).toBeNull();
    expect(data.summary.recoveryRate).toBeNull();
    // Nadie atrasado ⇒ no hay atraso que promediar.
    expect(data.summary.avgDaysLate).toBeNull();
  });

  it('un mes sin cobros emitidos no tiene tasa de mora: null, no la banda verde', () => {
    // Con 0 caía en «moraRate <= 5» ⇒ verde ⇒ afirmaba una cartera sana.
    const data = adaptCollections(cartera({ byMonth: [mes()] }))!;
    expect(data.byMonth[0].moraRate).toBeNull();
  });

  it('una cartera MEDIDA y sana sigue diciendo 0, no una raya', () => {
    // $10M esperados, todo cobrado, nadie atrasado: la mora es cero de verdad.
    const data = adaptCollections(
      cartera({
        items: [itemDeCartera({ daysLate: 0 })],
        byMonth: [mes({ total: 10_000_000, collected: 10_000_000, overdue: 0 })],
      }),
    )!;
    expect(data.summary.moraRate).toBe(0);
    expect(data.summary.recoveryRate).toBe(100);
    expect(data.byMonth[0].moraRate).toBe(0);
  });

  it('con atrasos reales promedia los días de verdad', () => {
    const data = adaptCollections(
      cartera({
        items: [itemDeCartera({ daysLate: 10 }), itemDeCartera({ daysLate: 20 })],
        summary: {
          totalPending: 2_000_000,
          bucket0to30: 2_000_000,
          bucket31to60: 0,
          bucket61to90: 0,
          bucket90plus: 0,
        },
        byMonth: [mes({ total: 10_000_000, collected: 8_000_000, overdue: 2_000_000 })],
      }),
    )!;
    expect(data.summary.avgDaysLate).toBe(15);
    expect(data.summary.moraRate).toBe(20);
  });
});

describe('adaptAgentPerformance — equipo sin agentes', () => {
  it('sin agentes no hay promedio de equipo: null, no «0%» ni «0d»', () => {
    const data = adaptAgentPerformance(rendimiento([]))!;
    expect(data.teamSummary.avgConversion).toBeNull();
    expect(data.teamSummary.avgDaysToClose).toBeNull();
  });

  it('con agentes promedia de verdad, y un promedio de cero sigue siendo cero', () => {
    const data = adaptAgentPerformance(
      rendimiento([
        { userId: 'a1', agenteName: 'Ana', activeLeads: 5, completedDeals: 3, conversionRate: 60, avgDaysToClose: 12 },
        { userId: 'a2', agenteName: 'Beto', activeLeads: 2, completedDeals: 1, conversionRate: 40, avgDaysToClose: 20 },
      ]),
    )!;
    expect(data.teamSummary.avgConversion).toBe(50);
    expect(data.teamSummary.avgDaysToClose).toBe(16);

    const enCero = adaptAgentPerformance(
      rendimiento([
        { userId: 'a1', activeLeads: 9, completedDeals: 0, conversionRate: 0, avgDaysToClose: 0 },
      ]),
    )!;
    // Un agente con nueve leads y ningún cierre SÍ tiene 0% medido.
    expect(enCero.teamSummary.avgConversion).toBe(0);
  });
});
