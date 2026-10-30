/**
 * @vitest-environment happy-dom
 *
 * Portal del inquilino → Servicios públicos (Portofino, 29-10-2026): cada factura dice su corte y lo que trae y no es
 * del inquilino (se le descuenta al propietario).
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/agentes/OrbeDeAgente', () => ({ OrbeDeAgente: () => <span /> }));
vi.mock('@/components/tenant/SinArriendoTodavia', () => ({ SinArriendoTodavia: () => <p>Sin arriendo</p> }));
vi.mock('@/lib/api/servicios-publicos.service', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/servicios-publicos.service')>()),
  serviciosPublicosApi: { delPortal: vi.fn(), subirDelPortal: vi.fn(), soporteDelPortal: vi.fn() },
}));

import { serviciosPublicosApi } from '@/lib/api/servicios-publicos.service';
import ServiciosPublicosDelInquilino from './page';

const api = serviciosPublicosApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

let root: Root;
let caja: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  caja = document.createElement('div');
  document.body.appendChild(caja);
  root = createRoot(caja);
});
afterEach(async () => {
  await act(async () => root.unmount());
  caja.remove();
});

describe('Portal del inquilino → Servicios públicos', () => {
  it('🔴 cada factura dice su corte y lo que no es del inquilino', async () => {
    api.delPortal.mockResolvedValue({
      disponible: true,
      contratos: [
        {
          contractId: 'c1',
          contrato: '515',
          inmueble: 'CL 131 CR 51',
          vigente: true,
          facturas: [
            {
              id: 'f1',
              contractId: 'c1',
              servicio: 'ENERGIA',
              nombreDelServicio: 'Energía',
              empresa: 'EPM',
              periodoDesde: '2026-08-15',
              periodoHasta: '2026-09-15',
              corte: { desde: '2026-08-15', hasta: '2026-09-15', dias: 32 },
              mesFacturado: '2026-10',
              mesFacturadoSegun: 'FACTURA',
              conceptosDelPropietario: [
                { tipo: 'ACUERDO_DE_PAGO', concepto: 'Cuota 3 de 12', valorCop: 25_000 },
                { tipo: 'REVISION_PERIODICA', concepto: 'RTR', valorCop: 40_500 },
              ],
              valorCop: 140_260,
              tipo: 'MENSUAL',
              pagadaPor: 'INQUILINO',
              estado: 'POR_REVISAR',
              tieneSoporte: true,
              soporteNombre: 'epm.pdf',
              subidaPor: 'INQUILINO',
              liquidacion: null,
              nota: null,
              motivoDeLaRevision: null,
              creadaAt: '2026-10-05T10:00:00.000Z',
            },
          ],
        },
      ],
    });
    await act(async () => root.render(<ServiciosPublicosDelInquilino />));
    await act(async () => {});
    expect(document.querySelector('[data-testid="corte-f1"]')!.textContent).toBe('Consumo del 15 ago al 15 sep · 32 días · facturada en octubre');
    expect(document.querySelector('[data-testid="no-es-tuyo-f1"]')!.textContent).toBe(
      'Trae $ 65.500 que no son tuyos (acuerdo de pago, revisión periódica del gas): se le descuentan al propietario.',
    );
  });
});
