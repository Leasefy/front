/**
 * @vitest-environment happy-dom
 *
 * La aprobación que cobra la inmobiliaria, en la postulación del inquilino (Nico, 28-10-2026). Lo que sostiene:
 *   1. dice cuánto cuesta y a qué cuenta (número completo, para transferir) y deja subir el comprobante;
 *   2. rechazado, dice el motivo y deja subir otro; aceptado, que la están revisando;
 *   3. aprobada, «Estás aprobado por Sura» con el tope aprobado;
 *   4. nunca dice «estudio» (docs/VOCABULARIO.md); sin nada que pedir, no se pinta.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AprobacionDeLaInmobiliaria as Datos } from '@/lib/api/asegurabilidad-manual.service';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const api = vi.hoisted(() => ({ ver: vi.fn(), subirComprobante: vi.fn() }));
vi.mock('@/lib/api/asegurabilidad-manual.service', () => ({ aprobacionDeLaInmobiliariaApi: api }));
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { AprobacionDeLaInmobiliaria } from './AprobacionDeLaInmobiliaria';

const datos = (o: Partial<Datos> = {}): Datos => ({
  pide: true,
  inmobiliaria: 'Inmobiliaria Sabaneta',
  precioCop: 85_000,
  formas: ['COMPROBANTE'],
  cuenta: {
    tipoLegible: 'Transferencia bancaria',
    nombre: 'Cuenta de ahorros',
    banco: 'Bancolombia',
    tipoDeCuenta: 'AHORROS',
    numero: '12345678901',
    titular: 'Inmobiliaria Sabaneta SAS',
    instrucciones: 'Pon tu cédula en la referencia.',
    enlace: null,
  },
  pagadaHasta: null,
  comprobante: null,
  aprobacion: null,
  aprobadaPor: [],
  topeAprobadoCop: null,
  ...o,
});

let raiz: Root | null = null;
async function montar() {
  const caja = document.createElement('div');
  document.body.appendChild(caja);
  raiz = createRoot(caja);
  await act(async () => raiz!.render(<AprobacionDeLaInmobiliaria applicationId="app-1" />));
  for (let i = 0; i < 3; i++) await act(async () => {});
}
const texto = () => document.body.textContent ?? '';

beforeEach(() => api.ver.mockResolvedValue(datos()));
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

describe('AprobacionDeLaInmobiliaria', () => {
  it('cuánto cuesta, a qué cuenta y subir el comprobante', async () => {
    api.subirComprobante.mockResolvedValue(datos({ comprobante: { estado: 'POR_REVISAR', subidoAt: '2026-10-28T20:00:00.000Z', motivo: null } }));
    await montar();
    expect(texto()).toContain('Tu aprobación con Inmobiliaria Sabaneta');
    expect(texto()).toMatch(/\$\s?85\.000/);
    expect(document.querySelector('[data-testid="cuenta-de-la-aprobacion"]')?.textContent).toContain('12345678901');
    expect(texto().toLowerCase()).not.toContain('estudio');
    const input = document.querySelector<HTMLInputElement>('[data-testid="archivo-del-comprobante"]')!;
    const archivo = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'pago.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { configurable: true, value: [archivo] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
    for (let i = 0; i < 3; i++) await act(async () => {});
    expect(api.subirComprobante).toHaveBeenCalledWith('app-1', archivo);
    expect(document.querySelector('[data-testid="comprobante-por-revisar"]')?.textContent).toContain('lo está revisando');
  });

  it('rechazado: el motivo y subir otro; aceptado: la están revisando', async () => {
    api.ver.mockResolvedValue(datos({ comprobante: { estado: 'RECHAZADO', subidoAt: null, motivo: 'No se ve el valor.' } }));
    await montar();
    expect(document.querySelector('[data-testid="comprobante-rechazado"]')?.textContent).toContain('No se ve el valor.');
    expect(document.querySelector('[data-testid="subir-comprobante"]')?.textContent).toContain('Subir otro comprobante');
    act(() => raiz?.unmount());
    document.body.innerHTML = '';
    api.ver.mockResolvedValue(datos({ comprobante: { estado: 'ACEPTADO', subidoAt: null, motivo: null }, aprobacion: 'EN_REVISION' }));
    await montar();
    expect(document.querySelector('[data-testid="aprobacion-en-revision"]')?.textContent).toContain('recibió tu pago');
    expect(document.querySelector('[data-testid="subir-comprobante"]')).toBeNull();
  });

  it('aprobada: «Estás aprobado por Sura» con el tope aprobado', async () => {
    api.ver.mockResolvedValue(datos({ aprobacion: 'APROBADA', aprobadaPor: ['Sura'], topeAprobadoCop: 3_000_000 }));
    await montar();
    const caja = document.querySelector('[data-testid="aprobacion-aprobada"]')?.textContent ?? '';
    expect(caja).toContain('Estás aprobado por Sura');
    expect(caja).toMatch(/Tope aprobado: \$\s?3\.000\.000/);
  });

  it('con el QR del banco de la cuenta, lo muestra para escanear (Nico 29-10-2026)', async () => {
    api.ver.mockResolvedValue(datos({ cuenta: { ...datos().cuenta!, qrUrl: 'https://almacen.example/qr.png?firmada' } }));
    await montar();
    expect(document.querySelector('[data-testid="qr-para-pagar"] img')?.getAttribute('src')).toContain('firmada');
    expect(texto().toLowerCase()).not.toContain('estudio');
  });

  it('sin nada que pedir ni resultado, no se pinta', async () => {
    api.ver.mockResolvedValue(datos({ pide: false }));
    await montar();
    expect(document.querySelector('[data-testid="aprobacion-de-la-inmobiliaria"]')).toBeNull();
  });
});
