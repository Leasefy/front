/**
 * «Pendiente» y «En mora» no cuentan la misma plata dos veces.
 *
 * QA en navegador, 2026-09-14 (septiembre de la agencia de pruebas): el
 * resumen decía «Pendiente $10.631.082 · 0 cobros» y «En mora $10.631.082 ·
 * 5 cobros». El back manda en `totalPending` todo lo que falta cobrar, mora
 * incluida; el conteo de Pendiente, en cambio, sólo lleva los que no están en
 * mora. La tarjeta tiene que decir lo mismo que su conteo.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

import { CobroResumen } from './CobroResumen';
import type { CobroSummary } from '@/lib/types/inmobiliaria';
import es from '@/lib/i18n/locales/es.json';

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
    root!.render(<CobroResumen summary={summary} />);
  });
  // AnimatedNumber llega a su valor con requestAnimationFrame.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 1200));
  });
}

/** El rótulo que pinta el stub de i18n: el valor REAL de es.json. */
const enEspanol = (clave: string): string =>
  clave.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], es) as string;

/** El texto de la tarjeta cuyo rótulo es la clave `clave`. */
function tarjeta(clave: string): string {
  const rotulo = enEspanol(clave);
  const etiqueta = Array.from(contenedor!.querySelectorAll('span')).find(
    (s) => s.textContent?.trim() === rotulo,
  );
  expect(etiqueta, `no está la tarjeta «${rotulo}»`).toBeTruthy();
  return etiqueta!.closest('div.p-3')!.textContent ?? '';
}

const digitos = (s: string) => s.replace(/\D/g, '');

describe('<CobroResumen> — Pendiente sin la mora adentro', () => {
  it('todo lo que falta está en mora: Pendiente es $0, no el mismo monto de la mora', async () => {
    await montar({
      month: '2026-09',
      totalExpected: 18_800_000,
      totalCollected: 8_200_000,
      totalPending: 10_631_082,
      totalLate: 10_631_082,
      collectionRate: 43.6,
      cobrosPaid: 4,
      cobrosPending: 0,
      cobrosLate: 5,
      tasaDeRecaudo: null,
    });
    expect(digitos(tarjeta('inmobiliaria.cobros.resumen.pendingLabel'))).toMatch(/^0/);
    expect(digitos(tarjeta('inmobiliaria.cobros.resumen.lateLabel'))).toContain('10631082');
  }, 10_000);

  it('con cobros al día y en mora, Pendiente es sólo lo que no está en mora', async () => {
    await montar({
      month: '2026-09',
      totalExpected: 10_000_000,
      totalCollected: 2_000_000,
      totalPending: 8_000_000,
      totalLate: 3_000_000,
      collectionRate: 20,
      cobrosPaid: 1,
      cobrosPending: 2,
      cobrosLate: 1,
      tasaDeRecaudo: null,
    });
    expect(digitos(tarjeta('inmobiliaria.cobros.resumen.pendingLabel'))).toContain('5000000');
    expect(digitos(tarjeta('inmobiliaria.cobros.resumen.lateLabel'))).toContain('3000000');
  }, 10_000);
});
