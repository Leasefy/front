/**
 * 🔴 N-22 (QA-PAGOS-95, 05-10-2026, CR-31): con la inmobiliaria SIN plazo
 * fijado, Cobros emitidos decía «En mora $ 72.947.000 · 23 cobros · Ver
 * morosos», mientras Cartera, Deuda del mes y Tablero dicen que sin plazo lo
 * vencido no es mora. Con `plazoSinFijar` del back la tarjeta dice «Vencido…
 * sin plazo fijado: no corre mora» y el atajo «Ver vencidos».
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

import { CobroResumen } from './CobroResumen';
import type { CobroSummary } from '@/lib/types/inmobiliaria';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let contenedor: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  contenedor?.remove();
  root = null;
  contenedor = null;
});

async function montar(summary: CobroSummary) {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  await act(async () => {
    root!.render(<CobroResumen summary={summary} onViewLate={() => {}} onViewPending={() => {}} />);
  });
}

const resumen = (extra: Partial<CobroSummary> = {}): CobroSummary => ({
  month: '2026-10',
  totalExpected: 75_000_000,
  totalCollected: 0,
  totalPending: 77_947_000,
  totalLate: 72_947_000,
  collectionRate: 0,
  cobrosPaid: 0,
  cobrosPending: 2,
  cobrosLate: 23,
  tasaDeRecaudo: null,
  ...extra,
});

describe('N-22 · sin plazo fijado lo vencido no es mora', () => {
  it('🔴 «Vencido… sin plazo fijado: no corre mora» y «Ver vencidos», nunca «En mora» ni «Ver morosos»', async () => {
    await montar(resumen({ plazoSinFijar: true }));
    const t = contenedor!.textContent ?? '';
    expect(contenedor!.querySelector('[data-testid="vencido-sin-plazo"]')?.textContent).toContain('sin plazo fijado: no corre mora');
    expect(t).toContain('Ver vencidos');
    expect(t).not.toContain('Ver morosos');
    expect(contenedor!.querySelector('[data-testid="cobros-resumen-vencido"]')?.textContent).toContain('Vencido');
    expect(contenedor!.querySelector('[data-testid="cobros-resumen-vencido"]')?.textContent).not.toContain('En mora');
  });

  it('con el plazo fijado (o un back anterior) sigue siendo mora', async () => {
    await montar(resumen());
    const t = contenedor!.textContent ?? '';
    expect(t).toContain('En mora');
    expect(t).toContain('Ver morosos');
    expect(contenedor!.querySelector('[data-testid="vencido-sin-plazo"]')).toBeNull();
  });
});
