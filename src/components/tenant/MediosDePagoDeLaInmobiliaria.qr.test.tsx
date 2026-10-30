import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
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
        medios: [
          {
            id: 'm1',
            tipo: 'BRE_B',
            tipoLegible: 'Llave Bre-B',
            nombre: 'Bre-B de la inmobiliaria',
            numeroDeCuentaEnmascarado: '@inmolab',
            qrUrl: 'https://almacen.example/qr.png?firmada',
          },
          {
            id: 'm2',
            tipo: 'EFECTIVO',
            tipoLegible: 'Efectivo',
            nombre: 'En la oficina',
            numeroDeCuentaEnmascarado: null,
            qrUrl: null,
          },
        ],
      },
    ],
  }),
}));

import { MediosDePagoDeLaInmobiliaria } from './MediosDePagoDeLaInmobiliaria';

/** «Cómo pagar» con el QR del banco (Nico 29-10-2026: «demos opción también con llave de Bre-B y QR»). */
describe('Cómo pagar — el QR del banco', () => {
  let raiz: Root;
  afterEach(() => {
    act(() => raiz.unmount());
    document.body.innerHTML = '';
  });

  it('el medio con QR lo muestra para escanear y abrir; el que no tiene, no', async () => {
    const caja = document.createElement('div');
    document.body.appendChild(caja);
    raiz = createRoot(caja);
    await act(async () => raiz.render(<MediosDePagoDeLaInmobiliaria />));
    const conQr = document.querySelector('[data-testid="medio-inquilino-m1"] [data-testid="qr-para-pagar"]');
    expect(conQr?.querySelector('img')?.getAttribute('src')).toContain('firmada');
    expect(conQr?.querySelector('a')?.getAttribute('href')).toContain('firmada');
    expect(conQr?.textContent).toContain('app de tu banco');
    expect(document.querySelector('[data-testid="medio-inquilino-m2"] [data-testid="qr-para-pagar"]')).toBeNull();
  });
});
