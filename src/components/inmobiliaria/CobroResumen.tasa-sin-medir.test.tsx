/**
 * La tasa de recaudo de un mes SIN un solo cobro.
 *
 * El bug: una inmobiliaria recién abierta veía «0.0%» en letra grande, la
 * etiqueta «Bajo» al lado y la flecha ↘ de tendencia. Tres afirmaciones sobre
 * algo que nunca se midió — nadie recaudó mal, no hubo nada que recaudar.
 * El patrón correcto ya estaba en Conciliación: sin denominador, una raya.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

import { CobroResumen, CobroResumenCompact } from './CobroResumen';
import type { CobroSummary } from '@/lib/types/inmobiliaria';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Un mes con movimiento de verdad. */
function mesConCobros(sobre: Partial<CobroSummary> = {}): CobroSummary {
  return {
    month: '2026-09',
    totalExpected: 10_000_000,
    totalCollected: 3_000_000,
    totalPending: 7_000_000,
    totalLate: 0,
    collectionRate: 30,
    cobrosPaid: 3,
    cobrosPending: 7,
    cobrosLate: 0,
    tasaDeRecaudo: null,
    ...sobre,
  };
}

/** Inmobiliaria nueva: ni un cobro emitido, así que no hay tasa que medir. */
function mesSinCobros(): CobroSummary {
  return {
    month: '2026-09',
    totalExpected: 0,
    totalCollected: 0,
    totalPending: 0,
    totalLate: 0,
    collectionRate: null,
    cobrosPaid: 0,
    cobrosPending: 0,
    cobrosLate: 0,
    tasaDeRecaudo: null,
  };
}

let root: Root | null = null;

async function montar(nodo: React.ReactNode) {
  const contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  await act(async () => {
    root!.render(nodo);
  });
}

/** El bloque de la tasa: número + etiqueta + flecha viven acá adentro. */
function bloqueDeTasa(testid = 'cobros-tasa'): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[data-testid="${testid}"]`);
  if (!el) throw new Error(`No se pintó [data-testid="${testid}"]`);
  return el;
}

beforeEach(() => {
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

describe('CobroResumen — un mes sin un solo cobro', () => {
  it('pinta una raya, NUNCA «0.0%»', async () => {
    await montar(<CobroResumen summary={mesSinCobros()} />);
    const tasa = bloqueDeTasa();
    expect(tasa.textContent).toContain('—');
    expect(tasa.textContent).not.toContain('%');
    expect(tasa.textContent).not.toContain('0.0');
  });

  it('sin medición no hay veredicto: ni «Bajo», ni «Aceptable», ni «Excelente»', async () => {
    await montar(<CobroResumen summary={mesSinCobros()} />);
    const tasa = bloqueDeTasa().textContent ?? '';
    // Es la afirmación más grave del bug: calificar lo que no se midió.
    expect(tasa).not.toMatch(/Bajo|Aceptable|Excelente/i);
  });

  it('sin medición no hay flecha de tendencia', async () => {
    await montar(<CobroResumen summary={mesSinCobros()} />);
    // Phosphor pinta cada ícono como un <svg>; la flecha es el único que hay
    // dentro del bloque de la tasa.
    expect(bloqueDeTasa().querySelectorAll('svg').length).toBe(0);
  });

});

describe('CobroResumen — un mes que sí se midió', () => {
  it('un 30% medido sigue diciendo 30.0%, con su etiqueta y su flecha', async () => {
    await montar(<CobroResumen summary={mesConCobros()} />);
    const tasa = bloqueDeTasa();
    expect(tasa.textContent).toContain('30.0%');
    expect(tasa.textContent).toMatch(/Bajo/i);
    expect(tasa.querySelectorAll('svg').length).toBe(1);
  });

  it('un CERO MEDIDO no es una raya: cobraste $0 de $10M y eso es un hecho', async () => {
    // La distinción entera del arreglo: 0 ≠ null. Si esto se pintara como
    // raya, el arreglo estaría escondiendo una mora del 100%.
    await montar(
      <CobroResumen summary={mesConCobros({ totalCollected: 0, collectionRate: 0 })} />,
    );
    const tasa = bloqueDeTasa();
    expect(tasa.textContent).toContain('0.0%');
    expect(tasa.textContent).toMatch(/Bajo/i);
  });
});

describe('CobroResumen — la tasa dice con qué fórmula se midió', () => {
  /*
   * 🔴 Para la agencia de QA esta tarjeta decía 43,6 % y el Resumen 2,2 %, las
   * dos «Tasa de recaudo». Ahora la tasa es la de la inmobiliaria, medida en el
   * back, y el rótulo y las dos cifras dicen cuál es.
   */
  it('sobre lo causado (por defecto): rótulo y cifras de las cuotas, no de los cobros', async () => {
    await montar(
      <CobroResumen
        summary={mesConCobros({
          totalExpected: 18_800_000,
          totalCollected: 8_200_000,
          collectionRate: 2.2478,
          tasaDeRecaudo: {
            base: 'CAUSADO',
            porDefecto: true,
            rotulo: 'Recaudo sobre lo causado',
            definicion: '',
            numeradorCop: 8_200_000,
            denominadorCop: 364_795_650,
            pct: 2.2478,
          },
        })}
      />,
    );
    expect(bloqueDeTasa('cobros-rotulo-de-la-tasa').textContent).toBe('Recaudo sobre lo causado');
    expect(bloqueDeTasa().textContent).toContain('2.2%');
    expect(bloqueDeTasa('cobros-cifras-de-la-tasa').textContent).toBe('8200000 abonados de 364795650 causados');
  });

  it('sobre lo emitido: el otro rótulo, y el 43,6 % de siempre', async () => {
    await montar(
      <CobroResumen
        summary={mesConCobros({
          totalExpected: 18_800_000,
          totalCollected: 8_200_000,
          collectionRate: 43.617,
          tasaDeRecaudo: {
            base: 'EMITIDO',
            porDefecto: false,
            rotulo: 'Pagado de lo emitido',
            definicion: '',
            numeradorCop: 8_200_000,
            denominadorCop: 18_800_000,
            pct: 43.617,
          },
        })}
      />,
    );
    expect(bloqueDeTasa('cobros-rotulo-de-la-tasa').textContent).toBe('Pagado de lo emitido');
    expect(bloqueDeTasa().textContent).toContain('43.6%');
    expect(bloqueDeTasa('cobros-cifras-de-la-tasa').textContent).toBe('8200000 pagados de 18800000 emitidos');
  });
});

describe('CobroResumenCompact — la variante chica', () => {
  it('sin cobros: raya y sin flecha', async () => {
    await montar(<CobroResumenCompact summary={mesSinCobros()} />);
    const tasa = bloqueDeTasa('cobros-tasa-compacta');
    expect(tasa.textContent).toContain('—');
    expect(tasa.textContent).not.toContain('%');
    expect(tasa.querySelectorAll('svg').length).toBe(0);
  });

  it('con cobros: el porcentaje redondeado y su flecha', async () => {
    await montar(<CobroResumenCompact summary={mesConCobros()} />);
    const tasa = bloqueDeTasa('cobros-tasa-compacta');
    expect(tasa.textContent).toContain('30%');
    expect(tasa.querySelectorAll('svg').length).toBe(1);
  });
});
