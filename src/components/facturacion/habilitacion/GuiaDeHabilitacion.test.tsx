/**
 * @vitest-environment happy-dom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { VistaDeLaHabilitacion } from '@/lib/api/habilitacion-de-facturacion.service';

const api = vi.hoisted(() => ({ vista: vi.fn(), contarDeLaInmobiliaria: vi.fn(), subirRut: vi.fn(), testSetId: vi.fn(), marcar: vi.fn(), cerrarTarjeta: vi.fn() }));
vi.mock('@/lib/api/habilitacion-de-facturacion.service', () => ({ habilitacionApi: api }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
const auth = vi.hoisted(() => ({ actual: { agencyRole: 'ADMIN', agency: { id: 'a1' } } as Record<string, unknown> }));
vi.mock('@/lib/auth/auth-context', async () => {
  const React = await import('react');
  return { AuthContext: React.createContext(auth.actual) };
});

import { GuiaDeHabilitacion } from './GuiaDeHabilitacion';
import { TarjetaDeFacturacionElectronica } from './TarjetaDeFacturacionElectronica';

const CLAVES = ['antes', 'rut', 'alta', 'registro', 'proveedor', 'pruebas', 'numeracion', 'resolucion', 'asociar'] as const;
const vista = (o: Partial<VistaDeLaHabilitacion> = {}): VistaDeLaHabilitacion => ({
  disponible: true,
  motivo: null,
  elegible: true,
  termino: false,
  pasos: CLAVES.map((clave, i) => ({
    clave,
    estado: i < 4 ? 'hecho' : i === 4 ? 'te-toca' : 'despues',
    quien: clave === 'alta' || clave === 'pruebas' ? 'feel' : 'tu',
    hechoAt: null,
    seMarca: ['antes', 'registro', 'pruebas', 'numeracion', 'asociar'].includes(clave),
  })),
  siguiente: 'proveedor',
  avance: { hechos: 4, total: 9 },
  yaFacturaConOtro: false,
  tipoDePersona: 'EMPRESA',
  rut: { subido: true, subidoAt: '2026-10-28T20:00:00Z', altaPedidaAt: '2026-10-28T20:00:00Z', avisoAFeel: 'ENVIADO' },
  testSetId: { valor: null, guardadoAt: null, avisoAFeel: null },
  prefijos: [
    { tipo: 'CANON_INQUILINO', nombre: 'Canon del inquilino', prefijo: 'CAN', desde: 1, hasta: 27000, yaLaTiene: false },
    { tipo: 'COMISION_PROPIETARIO', nombre: 'Comisión al propietario', prefijo: 'COM', desde: 1, hasta: 27000, yaLaTiene: true },
    { tipo: 'OTROS', nombre: 'Otros', prefijo: 'OTR', desde: 1, hasta: 27000, yaLaTiene: false },
  ],
  proveedor: { empresa: 'BPM CONSULTING S.A.S.', razonSocialCompleta: 'BUSINESS PROCESS MANAGEMENT CONSULTING SAS', nit: '900011395', software: 'FEEL' },
  enlaces: { habilitacion: 'https://catalogo-vpfe-hab.dian.gov.co/User/Login', facturando: 'https://catalogo-vpfe.dian.gov.co/User/Login', muisca: 'https://muisca.dian.gov.co', instructivo: 'https://x' },
  inmobiliaria: { nombre: 'Inmobiliaria Sabaneta', nit: '900123456' },
  tarjeta: { mostrar: true },
  ...o,
});

let raiz: Root | null = null;
let caja: HTMLDivElement | null = null;
async function montar(el: React.ReactElement) {
  caja = document.createElement('div');
  document.body.appendChild(caja);
  raiz = createRoot(caja);
  await act(async () => raiz!.render(el));
  for (let i = 0; i < 4; i++) await act(async () => {});
}
const id = (t: string) => document.querySelector<HTMLElement>(`[data-testid="${t}"]`);
const clic = async (el: Element | null) => {
  expect(el).toBeTruthy();
  await act(async () => (el as HTMLElement).click());
  for (let i = 0; i < 3; i++) await act(async () => {});
};

beforeEach(() => Object.values(api).forEach((f) => f.mockReset()));
afterEach(() => {
  act(() => raiz?.unmount());
  caja?.remove();
  document.body.innerHTML = '';
});

describe('Activa tu facturación — la guía', () => {
  it('abre en el paso que sigue, con el proveedor para copiar y el campo del código', async () => {
    api.vista.mockResolvedValue(vista());
    await montar(<GuiaDeHabilitacion />);
    expect(id('guia-avance')?.textContent).toBe('4 de 9');
    expect(id('guia-detalle-proveedor')?.textContent).toContain('BPM CONSULTING S.A.S.');
    expect(id('guia-detalle-proveedor')?.textContent).toContain('900011395');
    expect(id('guia-abrir-dian')?.getAttribute('href')).toContain('catalogo-vpfe-hab.dian.gov.co');
  });

  it('pegar el código del set lo manda a Feel', async () => {
    api.vista.mockResolvedValue(vista());
    api.testSetId.mockResolvedValue(vista({ siguiente: 'pruebas' }));
    await montar(<GuiaDeHabilitacion />);
    const input = id('guia-test-set-id') as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'a70562e0-631e-4ceb-aa65-36887b57dc17');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await clic(id('guia-guardar-test-set-id'));
    expect(api.testSetId).toHaveBeenCalledWith('a70562e0-631e-4ceb-aa65-36887b57dc17');
  });

  it('en la numeración muestra los prefijos que le toca pedir', async () => {
    api.vista.mockResolvedValue(vista());
    await montar(<GuiaDeHabilitacion />);
    await clic(id('guia-paso-numeracion'));
    const tabla = id('guia-prefijos');
    expect(tabla?.textContent).toContain('CAN');
    expect(tabla?.textContent).toContain('ya la tienes');
    expect(tabla?.textContent).toContain('27.000');
  });

  it('«Ya lo hice» marca el paso', async () => {
    api.vista.mockResolvedValue(vista());
    api.marcar.mockResolvedValue(vista());
    await montar(<GuiaDeHabilitacion />);
    await clic(id('guia-paso-pruebas'));
    await clic(id('guia-ya-lo-hice'));
    expect(api.marcar).toHaveBeenCalledWith('pruebas', true);
  });

  it('terminada: la celebración', async () => {
    api.vista.mockResolvedValue(vista({ termino: true, siguiente: null }));
    await montar(<GuiaDeHabilitacion />);
    expect(id('guia-lista')?.textContent).toContain('ya facturas electrónicamente');
  });
});

describe('Activa tu facturación — la tarjeta de la barra lateral', () => {
  it('sale con el avance y se cierra', async () => {
    api.vista.mockResolvedValue(vista());
    api.cerrarTarjeta.mockResolvedValue({ cerrada: true });
    await montar(<TarjetaDeFacturacionElectronica />);
    expect(id('sidebar-facturacion')?.textContent).toContain('Configura tu facturación electrónica');
    await clic(id('sidebar-facturacion-cerrar'));
    expect(api.cerrarTarjeta).toHaveBeenCalled();
    expect(id('sidebar-facturacion')).toBeNull();
  });

  it('no sale si el back dice que no', async () => {
    api.vista.mockResolvedValue(vista({ tarjeta: { mostrar: false } }));
    await montar(<TarjetaDeFacturacionElectronica />);
    expect(id('sidebar-facturacion')).toBeNull();
  });
});
