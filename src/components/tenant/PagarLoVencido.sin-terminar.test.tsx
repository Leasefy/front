/**
 * QA-INQ-95 (04-10-2026) · Un intento que Wompi todavía no conoce (la persona
 * no terminó el pago o el checkout no cargó) se decía «Tu pago está en
 * verificación. Cuando tu banco lo confirme se aplica solo»: no había ningún
 * pago en el banco. Ahora dice que no sabemos si lo terminó y desde qué hora
 * puede volver a intentar.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | null = null;
let caja: HTMLDivElement | null = null;
afterEach(() => { if (root) act(() => root!.unmount()); caja?.remove(); root = null; });

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ formatCurrency: (n: number) => `$ ${Math.round(n).toLocaleString('es-CO')}`, locale: 'es', t: (k: string) => k }),
}));

import { PagarLoVencido } from './PagarLoVencido';
import type { LoQueSePuedePagar } from '@/lib/api/pago-en-linea.service';

const datos = (enVerificacion: LoQueSePuedePagar['enVerificacion']): LoQueSePuedePagar => ({
  aplica: true,
  cuotas: [{ id: 'q', cuotaId: 'q', mes: '2026-10', vence: '2026-10-01', vencida: true, valorCop: 1_817_112, interesCop: 0 }],
  totalVencidoCop: 1_817_112,
  enVerificacion,
  ultimoRechazo: null,
});

function pintar(d: LoQueSePuedePagar) {
  caja = document.createElement('div');
  document.body.appendChild(caja);
  root = createRoot(caja);
  act(() => root!.render(<PagarLoVencido leaseId="l-1" datos={d} />));
  return caja.textContent ?? '';
}

describe('intento que Wompi todavía no conoce', () => {
  it('no dice «en verificación»: dice que no sabemos si lo terminó y la hora para reintentar', () => {
    const texto = pintar(
      datos({ solicitudId: 's', valorCop: 1_000_000, desde: '2026-10-04T23:17:44Z', conTransaccion: false, puedesReintentarDesde: '2026-10-04T23:47:44Z' }),
    );
    expect(texto).toMatch(/todavía no nos dice si lo terminaste/);
    expect(texto).toMatch(/desde las 6:47/);
    expect(texto).not.toMatch(/está en verificación/);
    expect(texto).not.toMatch(/m\.\./);
  });

  it('con transacción sigue diciendo «en verificación»', () => {
    const texto = pintar(datos({ solicitudId: 's', valorCop: 1_000_000, desde: '2026-10-04T23:17:44Z', conTransaccion: true, puedesReintentarDesde: null }));
    expect(texto).toMatch(/está en verificación/);
  });
});
