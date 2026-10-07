import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@leasefy/cadence', async (original) => ({
  ...(await original<typeof import('@leasefy/cadence')>()),
  Collapse: ({ children }: { children?: React.ReactNode }) => children,
}));
vi.mock('@/lib/hooks/use-medios-de-pago', () => ({
  useMediosDePagoParaInquilino: () => ({
    cargando: false,
    bloques: [
      {
        agencyId: 'ag',
        agencyName: 'Inmobiliaria Laboratorio',
        leaseIds: ['l1'],
        referencias: [{ contractId: 'c1', referencia: '7700123', inmueble: 'Calle 45' }],
        medios: [
          {
            id: 'm1',
            tipo: 'TRANSFERENCIA',
            tipoLegible: 'Transferencia bancaria',
            nombre: 'Bancolombia ahorros',
            banco: 'Bancolombia',
            tipoDeCuenta: 'AHORROS',
            numeroDeCuentaEnmascarado: '•••• 5678',
            titular: 'Inmobiliaria Laboratorio',
          },
        ],
      },
    ],
  }),
}));

import { MediosDePagoDeLaInmobiliaria } from './MediosDePagoDeLaInmobiliaria';

/**
 * 🔴 QA-INQ-95 (PI-11, 04-10-2026): «Paga con TU REFERENCIA DE RECAUDO» sin la
 * referencia en ningún lado, y «Copiar datos» copiaba la cuenta tapada sin ella.
 */
describe('Cómo pagar — la referencia de recaudo', () => {
  let cont: HTMLDivElement;
  let root: Root;
  const escribir = vi.fn().mockResolvedValue(undefined);
  beforeEach(() => {
    cont = document.createElement('div');
    document.body.appendChild(cont);
    root = createRoot(cont);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escribir }, configurable: true });
  });
  afterEach(() => {
    act(() => root.unmount());
    cont.remove();
  });

  it('se ve y viaja en «Copiar datos»', async () => {
    act(() => root.render(<MediosDePagoDeLaInmobiliaria />));
    expect(cont.querySelector('[data-testid="referencias-de-recaudo"]')?.textContent).toContain('7700123');
    const boton = [...cont.querySelectorAll('button')].find((b) => /Copiar datos/.test(b.textContent ?? ''));
    await act(async () => boton?.click());
    expect(escribir).toHaveBeenCalledWith(expect.stringContaining('Referencia: 7700123'));
  });
});
