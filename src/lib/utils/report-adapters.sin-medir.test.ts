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
    cuotaId: 'q-1',
    cobroId: null,
    contractId: 'ct-1',
    contrato: '#12',
    contratoDeLeasefy: null,
    propertyId: 'inm-1',
    consignacionId: 'cons-1',
    propertyTitle: 'Apto 402',
    propertyAddress: 'Calle 1 #2-3',
    tenantName: 'Pérez',
    tenantPhone: null,
    tenantDocument: null,
    propietarioId: null,
    propietarioName: null,
    agenteId: null,
    agenteName: null,
    month: '2026-09',
    vence: '2026-09-05',
    estado: 'PENDIENTE',
    cajon: 'CARTERA',
    diasDeMora: 0,
    diasDePlazo: 0,
    esVencida: true,
    totalAmount: 1_000_000,
    paidAmount: 0,
    pendingAmount: 1_000_000,
    remindersSent: null,
    lastReminderDate: null,
    ...sobre,
  };
}

function resumen(sobre: Partial<CarteraReport['summary']> = {}): CarteraReport['summary'] {
  return {
    deudaTotalCop: 0,
    porVencerCop: 0,
    vencidaEnPlazoCop: 0,
    carteraCop: 0,
    carteraVivaCop: 0,
    enSiniestroCop: 0,
    bucket0to30: 0,
    bucket31to60: 0,
    bucket61to90: 0,
    bucket90plus: 0,
    cuotas: 0,
    cuotasPorVencer: 0,
    cuotasVencidasEnPlazo: 0,
    cuotasEnCartera: 0,
    cuotasEnSiniestro: 0,
    ...sobre,
  };
}

function cartera(sobre: Partial<CarteraReport> = {}): CarteraReport {
  return {
    generadoEn: '2026-09-05T10:00:00.000Z',
    hoy: '2026-09-05',
    items: [],
    summary: resumen(),
    byMonth: [],
    siniestros: { cantidad: 0, totalCop: 0, diasParaSiniestro: 30, items: [] },
    sinCamino: {
      sinInmueble: 0,
      sinMandato: 0,
      sinPropietario: 0,
      sinAgente: 0,
      sinDireccion: 0,
      sinTelefono: 0,
    },
    contratosSinCuotas: 0,
    avisos: [],
    ...sobre,
  };
}

function mes(sobre: Partial<CarteraMonthItem> = {}): CarteraMonthItem {
  return {
    month: '2026-09',
    total: 0,
    collected: 0,
    overdue: 0,
    cuotas: 0,
    collectionRate: 0,
    ...sobre,
  };
}

function rendimiento(agentes: RendimientoAgentesReport['agentes']): RendimientoAgentesReport {
  return { generatedAt: '2026-09-05T10:00:00.000Z', agentes };
}

describe('adaptCollections — cartera de una inmobiliaria nueva', () => {
  it('sin nada que medir las tres tasas del resumen van en null, no en 0', () => {
    const data = adaptCollections(cartera())!;
    expect(data.summary.moraRate).toBeNull();
    expect(data.summary.recoveryRate).toBeNull();
    // Nadie atrasado ⇒ no hay atraso que promediar.
    expect(data.summary.avgDaysLate).toBeNull();
  });

  it('un mes sin cuotas no tiene tasa de mora: null, no la banda verde', () => {
    // Con 0 caía en «moraRate <= 5» ⇒ verde ⇒ afirmaba una cartera sana.
    const data = adaptCollections(cartera({ byMonth: [mes()] }))!;
    expect(data.byMonth[0].moraRate).toBeNull();
  });

  it('una cartera MEDIDA y sana sigue diciendo 0, no una raya', () => {
    // $10M esperados, todo cobrado, nadie atrasado: la mora es cero de verdad.
    const data = adaptCollections(
      cartera({
        items: [itemDeCartera({ cajon: 'POR_VENCER', esVencida: false })],
        // El back manda la tasa del mes ya medida: 100 sobre lo causado.
        byMonth: [mes({ total: 10_000_000, collected: 10_000_000, overdue: 0, collectionRate: 100 })],
      }),
    )!;
    expect(data.summary.moraRate).toBe(0);
    expect(data.summary.recoveryRate).toBe(100);
    expect(data.byMonth[0].moraRate).toBe(0);
  });

  it('con atrasos reales promedia los días de verdad', () => {
    const data = adaptCollections(
      cartera({
        items: [itemDeCartera({ diasDeMora: 10 }), itemDeCartera({ diasDeMora: 20 })],
        summary: resumen({
          deudaTotalCop: 2_000_000,
          carteraCop: 2_000_000,
          carteraVivaCop: 2_000_000,
          bucket0to30: 2_000_000,
          cuotas: 2,
          cuotasEnCartera: 2,
        }),
        byMonth: [mes({ total: 10_000_000, collected: 8_000_000, overdue: 2_000_000 })],
      }),
    )!;
    expect(data.summary.avgDaysLate).toBe(15);
    expect(data.summary.moraRate).toBe(20);
  });

  it('🔴 «atrasado» es CARTERA: lo que no vence y lo vencido en plazo no cuentan', () => {
    // Antes «atrasado» era todo lo pendiente. Con la definición vieja, esta
    // cartera reportaría $12M de mora donde hay $2M, y el promedio de días
    // saldría de tres filas en vez de una.
    const data = adaptCollections(
      cartera({
        items: [
          itemDeCartera({ cuotaId: 'a', cajon: 'POR_VENCER', esVencida: false, pendingAmount: 9_000_000 }),
          itemDeCartera({ cuotaId: 'b', cajon: 'VENCIDA_EN_PLAZO', pendingAmount: 1_000_000 }),
          itemDeCartera({ cuotaId: 'c', diasDeMora: 12, pendingAmount: 2_000_000 }),
        ],
        summary: resumen({
          deudaTotalCop: 12_000_000,
          porVencerCop: 9_000_000,
          vencidaEnPlazoCop: 1_000_000,
          carteraCop: 2_000_000,
          carteraVivaCop: 2_000_000,
          bucket0to30: 2_000_000,
          cuotas: 3,
          cuotasEnCartera: 1,
        }),
        byMonth: [mes({ total: 10_000_000, collected: 8_000_000, overdue: 2_000_000 })],
      }),
    )!;
    expect(data.summary.totalLate).toBe(2_000_000);
    expect(data.summary.avgDaysLate).toBe(12);
    expect(data.topDelinquents.map((d) => d.amount)).toEqual([2_000_000]);
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
