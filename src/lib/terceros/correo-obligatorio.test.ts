/**
 * SEGUIMIENTO-FRONT (03-10-2026): el «correo obligatorio» para quien NO tiene
 * `cobros:view` (el asesor, que crea inquilinos y propietarios) sale de
 * `exigeCorreoDelTercero` de `GET /inmobiliaria/agency`. Antes era `null` y el
 * asesor se enteraba al fallar.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { getMyAgency, tercerosSinCorreo } = vi.hoisted(() => ({
  getMyAgency: vi.fn(),
  tercerosSinCorreo: vi.fn(),
}));
vi.mock('@/lib/api/inmobiliaria.service', () => ({ agencyApi: { getMyAgency } }));
vi.mock('@/lib/api/facturacion-electronica.service', () => ({ facturacionElectronicaService: { tercerosSinCorreo } }));

import { leerCorreoObligatorio } from './correo-obligatorio';

beforeEach(() => vi.clearAllMocks());

describe('leerCorreoObligatorio', () => {
  it('🔴 sin `cobros:view`, la política de la agencia (la ven todos los roles)', async () => {
    getMyAgency.mockResolvedValue({ id: 'a', exigeCorreoDelTercero: true });
    expect(await leerCorreoObligatorio('INQUILINO', false)).toBe(true);
    expect(tercerosSinCorreo).not.toHaveBeenCalled();
  });

  it('sin `cobros:view` y un back anterior (sin el campo): no se sabe', async () => {
    getMyAgency.mockResolvedValue({ id: 'a' });
    expect(await leerCorreoObligatorio('PROPIETARIO', false)).toBeNull();
  });

  it('con `cobros:view`, de donde siempre (`terceros-sin-correo`)', async () => {
    tercerosSinCorreo.mockResolvedValue({ exigido: false });
    expect(await leerCorreoObligatorio('INQUILINO', true)).toBe(false);
    expect(getMyAgency).not.toHaveBeenCalled();
  });

  it('un fallo no inventa la política', async () => {
    getMyAgency.mockRejectedValue(new Error('caído'));
    expect(await leerCorreoObligatorio('INQUILINO', false)).toBeNull();
  });
});
