/**
 * El resumen del negocio, con una inmobiliaria recién abierta.
 *
 * Sin un inmueble y sin un cobro esta pantalla decía «0.0%» de ocupación,
 * «0.0% tasa de cobro», «↗ +0% vs mes anterior» y «0 días» al cierre. Los
 * cuatro números salen de dividir por cero o de comparar contra un mes que
 * no existe. Van en raya, y la flecha desaparece.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { InmobiliariaDashboardKPIs } from '@/lib/types/inmobiliaria';

const { datos } = vi.hoisted(() => ({
  datos: { kpis: null as InmobiliariaDashboardKPIs | null },
}));

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}));
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: () => true, isLoading: false }),
}));
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useInmobiliariaDashboard: () => ({
    kpis: datos.kpis,
    isLoading: false,
    errorCrudo: null,
    refetch: vi.fn(),
  }),
  useAgentes: () => ({ agentes: [] }),
  usePipelineItems: () => ({ pipelineItems: [] }),
  useCobros: () => ({ cobros: [] }),
  useMantenimientos: () => ({ mantenimientos: [] }),
}));

import DashboardPage from './page';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Inmobiliaria nueva: cero inmuebles, cero cobros, cero cierres. */
function enCero(sobre: Partial<InmobiliariaDashboardKPIs> = {}): InmobiliariaDashboardKPIs {
  return {
    totalProperties: 0,
    propertiesAvailable: 0,
    propertiesRented: 0,
    propertiesInProcess: 0,
    occupancyRate: 0,
    expectedRevenue: 0,
    collectedRevenue: 0,
    pendingCollections: 0,
    lateCollections: 0,
    collectionRate: 0,
    totalCommissions: 0,
    collectionTrend: 0,
    commissionsTrend: 0,
    activeLeads: 0,
    scheduledVisits: 0,
    pendingApplications: 0,
    contractsInProgress: 0,
    totalAgents: 0,
    closedThisMonth: 0,
    avgDaysToClose: 0,
    totalPropietarios: 0,
    pendingDispersions: 0,
    ...sobre,
  } as InmobiliariaDashboardKPIs;
}

let root: Root | null = null;

async function montar() {
  const contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  await act(async () => {
    root!.render(<DashboardPage />);
  });
}

/** La tarjeta de KPI cuyo rótulo es `titulo`, entera. */
function tarjeta(titulo: string): HTMLElement {
  const rotulo = Array.from(document.querySelectorAll<HTMLElement>('span, div, p')).find(
    (el) => el.textContent?.trim() === titulo && el.children.length === 0,
  );
  const caja = rotulo?.closest('a, div.rounded-lg');
  if (!caja) throw new Error(`No se encontró la tarjeta «${titulo}»`);
  return caja as HTMLElement;
}

function texto(testid: string): string {
  const el = document.querySelector(`[data-testid="${testid}"]`);
  if (!el) throw new Error(`No se pintó [data-testid="${testid}"]`);
  return el.textContent?.trim() ?? '';
}

beforeEach(() => {
  datos.kpis = enCero();
  document.body.innerHTML = '';
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root!.unmount();
    });
  }
  root = null;
  document.body.innerHTML = '';
});

describe('Resumen del negocio — inmobiliaria en cero', () => {
  it('la ocupación es una raya, NUNCA «0.0%»', async () => {
    await montar();
    const ocupacion = tarjeta('Ocupación').textContent ?? '';
    expect(ocupacion).toContain('—');
    expect(ocupacion).not.toContain('0.0%');
  });

  it('la tasa de recaudo del resumen financiero es una raya', async () => {
    await montar();
    expect(texto('resumen-tasa-de-recaudo')).toBe('—');
  });

  it('sin mes anterior contra el que comparar no hay flecha de tendencia', async () => {
    await montar();
    // El subtítulo «vs mes anterior» sólo se pinta junto a la flecha; si no
    // está, es que no se afirmó ninguna variación.
    expect(document.body.textContent).not.toContain('vs mes anterior');
  });

  it('los días promedio al cierre son una raya: nadie cerró nada todavía', async () => {
    await montar();
    expect(texto('resumen-dias-al-cierre')).toBe('—');
  });
});

/**
 * 🔴 «1 DISPONIBLES» (21-09-2026). El subtítulo de la tarjeta de propiedades
 * salía de una clave de i18n con el plural clavado.
 */
describe('🔴 el plural del subtítulo', () => {
  it('con UN inmueble disponible dice «1 disponible», no «1 disponibles»', async () => {
    datos.kpis = enCero({
      totalProperties: 108,
      propertiesInCatalog: 6,
      propertiesOutOfCatalog: 102,
      propertiesRented: 5,
      propertiesAvailable: 1,
    });
    await montar();
    const cuerpo = document.body.textContent ?? '';
    // El positivo va con el separador pegado, porque «1 disponible» es un
    // prefijo de «1 disponibles» y solo pasaría en los dos casos.
    expect(cuerpo).toContain('1 disponible ·');
    expect(cuerpo).not.toContain('1 disponibles');
  });

  it('con una sola arrendada, lo mismo del otro lado', async () => {
    datos.kpis = enCero({
      totalProperties: 3,
      propertiesRented: 1,
      propertiesAvailable: 2,
    });
    await montar();
    const cuerpo = document.body.textContent ?? '';
    expect(cuerpo).toContain('1 arrendada ·');
    expect(cuerpo).not.toContain('1 arrendadas');
    expect(cuerpo).toContain('2 disponibles');
  });
});

/**
 * 🔴 EL «+100%» QUE NADIE MIDIÓ (21-09-2026).
 *
 * Abrir esta pantalla en la inmobiliaria migrada mostró
 * «RECAUDO DEL MES $8.200.000 · +100% vs mes anterior» con el mes anterior en
 * CERO. Quien lo lee entiende que el recaudo se duplicó; lo que pasó es que
 * pasó de nada a algo, y eso no tiene porcentaje. El back devolvía 100 por
 * `curr > 0 ? 100 : 0`; ahora devuelve `null` y la pantalla calla.
 */
describe('🔴 sin mes anterior no hay porcentaje', () => {
  it('con recaudo y `collectionTrend` en null NO dice «+100%» ni pinta flecha', async () => {
    datos.kpis = enCero({
      collectedRevenue: 8_200_000,
      collectionTrend: null,
      totalCommissions: 33_416_000,
      commissionsTrend: null,
    });
    await montar();
    const cuerpo = document.body.textContent ?? '';
    expect(cuerpo).toContain('$8.200.000');
    expect(cuerpo).not.toContain('vs mes anterior');
    expect(cuerpo).not.toContain('100%');
  });

  it('pero una variación de verdad SÍ se muestra, aunque sea del 100 %', async () => {
    // Un mes anterior de $1M y uno actual de $2M sí es +100 %, y eso se dice.
    datos.kpis = enCero({ collectedRevenue: 2_000_000, collectionTrend: 100 });
    await montar();
    expect(document.body.textContent).toContain('vs mes anterior');
    expect(document.body.textContent).toContain('100%');
  });

  it('una respuesta vieja en caché con 0 contra 0 sigue sin pintar flecha', async () => {
    datos.kpis = enCero({ collectedRevenue: 0, collectionTrend: 0 });
    await montar();
    expect(document.body.textContent).not.toContain('vs mes anterior');
  });

  it('una caída también se muestra, con su signo', async () => {
    datos.kpis = enCero({ collectedRevenue: 500_000, collectionTrend: -40 });
    await montar();
    const cuerpo = document.body.textContent ?? '';
    expect(cuerpo).toContain('vs mes anterior');
    expect(cuerpo).toContain('40%');
    expect(cuerpo).not.toContain('+40%');
  });
});

describe('Resumen del negocio — con operación de verdad', () => {
  it('mide ocupación y recaudo, y muestra la variación contra el mes anterior', async () => {
    datos.kpis = enCero({
      totalProperties: 10,
      propertiesRented: 8,
      expectedRevenue: 10_000_000,
      collectedRevenue: 9_000_000,
      collectionRate: 90,
      occupancyRate: 80,
      collectionTrend: 12,
      avgDaysToClose: 18,
    });
    await montar();
    expect(tarjeta('Ocupación').textContent).toContain('80.0%');
    expect(texto('resumen-tasa-de-recaudo')).toBe('90.0%');
    expect(document.body.textContent).toContain('vs mes anterior');
    expect(texto('resumen-dias-al-cierre')).toContain('18');
  });

  it('la ocupación se mide contra el CATÁLOGO y dice qué quedó afuera', async () => {
    /*
     * Nico, 2026-09-12: «esa tasa de ocupación se debe medir contra el
     * inmueble disponible, no contra el no disponible, porque ya está fuera
     * del catálogo». Sus números reales, redondeados: 730 arrendados, 880 en
     * catálogo, 1.944 afuera. Contra el portafolio entero (2.824) la tasa
     * daría 25,8 %; contra el catálogo da 83,0 %.
     */
    datos.kpis = enCero({
      totalProperties: 2824,
      propertiesInCatalog: 880,
      propertiesOutOfCatalog: 1944,
      propertiesRented: 730,
      propertiesAvailable: 150,
      occupancyRate: 82.95,
    });
    await montar();
    const ocupacion = tarjeta('Ocupación').textContent ?? '';
    expect(ocupacion).toContain('83.0%');
    expect(ocupacion).toContain('730 arrendados de 880 en catálogo');
    expect(ocupacion).toContain('1.944 fuera del catálogo');
    // La tasa NO se mide contra los 2.824.
    expect(ocupacion).not.toContain('25.');
  });

  it('sin el denominador nuevo cae al de antes, sin romperse', async () => {
    // Una respuesta vieja en caché no trae `propertiesInCatalog`.
    datos.kpis = enCero({ totalProperties: 10, propertiesRented: 8 });
    await montar();
    expect(tarjeta('Ocupación').textContent).toContain('80.0%');
  });

  it('🔴 la tasa dice con qué fórmula se midió, y es la que mandó el back', async () => {
    /*
     * La agencia de QA eligió medir sobre lo emitido: el Resumen tiene que
     * decir 43,6 % «Pagado de lo emitido», no rehacer la cuenta con lo causado
     * (8,2 M de 364,8 M = 2,2 %) y rotularla igual.
     */
    datos.kpis = enCero({
      totalProperties: 4,
      expectedRevenue: 364_795_650,
      collectedRevenue: 8_200_000,
      collectionRate: 43.62,
      tasaDeRecaudo: {
        base: 'EMITIDO',
        porDefecto: false,
        rotulo: 'Pagado de lo emitido',
        definicion: '',
        numeradorCop: 8_200_000,
        denominadorCop: 18_800_000,
        pct: 43.617,
      },
    });
    await montar();
    expect(texto('resumen-tasa-de-recaudo')).toBe('43.6%');
    expect(texto('resumen-rotulo-de-la-tasa')).toBe('Pagado de lo emitido');
    expect(texto('resumen-cifras-de-la-tasa')).toContain('pagados de');
    expect(tarjeta('Recaudo del Mes').textContent).toContain('43.6% · Pagado de lo emitido');
  });

  it('una respuesta de antes, sin la tasa, se lee como lo que era: sobre lo causado', async () => {
    datos.kpis = enCero({ expectedRevenue: 10_000_000, collectedRevenue: 9_000_000, collectionRate: 90 });
    await montar();
    expect(texto('resumen-tasa-de-recaudo')).toBe('90.0%');
    expect(texto('resumen-rotulo-de-la-tasa')).toBe('Recaudo sobre lo causado');
  });

  it('un recaudo MEDIDO en cero no es una raya: se esperaba plata y no entró', async () => {
    // La distinción entera: 0 de $10M es una mora del 100%, no «sin datos».
    datos.kpis = enCero({
      totalProperties: 4,
      propertiesRented: 0,
      expectedRevenue: 10_000_000,
      collectedRevenue: 0,
    });
    await montar();
    expect(texto('resumen-tasa-de-recaudo')).toBe('0.0%');
    expect(tarjeta('Ocupación').textContent).toContain('0.0%');
  });
});
