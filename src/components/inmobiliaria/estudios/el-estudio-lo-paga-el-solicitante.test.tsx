/**
 * 17-09-2026: el estudio lo paga el solicitante a la inmobiliaria (recibo +
 * factura), no se devuelve y, vigente, no se le vuelve a cobrar.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const api = vi.hoisted(() => ({ vigente: vi.fn(), registrarPago: vi.fn(), listar: vi.fn(), anular: vi.fn() }));
const permisos = vi.hoisted(() => ({ valor: null as null | { canAccess: (m: string, a: string) => boolean } }));
vi.mock('@/lib/api/estudios.service', () => ({ estudiosApi: api }));
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => permisos.valor,
}));
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { EstudioPagadoALaInmobiliaria } from './EstudioPagadoALaInmobiliaria';

let contenedor: HTMLDivElement;
let raiz: Root;
beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  Object.values(api).forEach((f) => f.mockReset());
});
afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});
const q = (id: string) => document.body.querySelector(`[data-testid="${id}"]`);

describe('<EstudioPagadoALaInmobiliaria>', () => {
  it('fuera del panel de la inmobiliaria no se dibuja ni pregunta nada', async () => {
    permisos.valor = null;
    await act(async () => {
      raiz.render(<EstudioPagadoALaInmobiliaria applicationId="app-1" />);
    });
    expect(q('estudio-pagado')).toBeNull();
    expect(api.vigente).not.toHaveBeenCalled();
  });

  it('con un estudio vigente dice el recibo y que no se le vuelve a cobrar (y no ofrece cobrarlo)', async () => {
    permisos.valor = { canAccess: () => true };
    api.vigente.mockResolvedValue({
      vigente: true,
      numeroRecibo: 42,
      pagadoEl: '2026-09-17',
      vigenteHasta: '2026-10-17T00:00:00.000Z',
    });
    await act(async () => {
      raiz.render(<EstudioPagadoALaInmobiliaria applicationId="app-1" />);
    });
    expect(q('estudio-vigente')?.textContent).toContain('recibo #42');
    expect(q('estudio-vigente')?.textContent).toContain('no se le vuelve a cobrar');
    expect(q('estudio-registrar')).toBeNull();
  });

  it('sin estudio vigente, quien hace caja registra el pago: recibo y factura', async () => {
    permisos.valor = { canAccess: () => true };
    api.vigente.mockResolvedValue({ vigente: false, numeroRecibo: null, pagadoEl: null, vigenteHasta: null });
    api.registrarPago.mockResolvedValue({
      numeroRecibo: 43,
      vigenteHasta: '2026-09-19T00:00:00.000Z',
      factura: { totalCop: 120_000 },
    });
    await act(async () => {
      raiz.render(<EstudioPagadoALaInmobiliaria applicationId="app-1" />);
    });
    await act(async () => {
      (q('estudio-registrar') as HTMLButtonElement).click();
    });
    const valor = q('estudio-valor') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(valor, '120.000');
      valor.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      (q('estudio-confirmar') as HTMLButtonElement).click();
    });
    expect(api.registrarPago).toHaveBeenCalledWith({
      applicationId: 'app-1',
      valorCop: 120_000,
      medio: 'transferencia',
      referencia: undefined,
    });
  });

  it('el asesor (sin cobros) ve si pagó, pero no registra plata', async () => {
    permisos.valor = { canAccess: (m) => m !== 'cobros' };
    api.vigente.mockResolvedValue({ vigente: false, numeroRecibo: null, pagadoEl: null, vigenteHasta: null });
    await act(async () => {
      raiz.render(<EstudioPagadoALaInmobiliaria applicationId="app-1" />);
    });
    expect(q('estudio-sin-pago')).not.toBeNull();
    expect(q('estudio-registrar')).toBeNull();
  });

  it('🔴 el estudio vale 60 días (Nico, 17-09): la pantalla lo dice', async () => {
    permisos.valor = { canAccess: () => true };
    api.vigente.mockResolvedValue({
      vigente: false,
      numeroRecibo: null,
      pagadoEl: null,
      vigenteHasta: null,
      vigenciaDias: 60,
    });
    await act(async () => {
      raiz.render(<EstudioPagadoALaInmobiliaria applicationId="app-1" />);
    });
    expect(q('estudio-sin-pago')?.textContent).toContain('60 días');
  });

  it('si la inmobiliaria le puso otra vigencia, la pantalla dice la suya', async () => {
    permisos.valor = { canAccess: () => true };
    api.vigente.mockResolvedValue({
      vigente: false,
      numeroRecibo: null,
      pagadoEl: null,
      vigenteHasta: null,
      vigenciaDias: 90,
    });
    await act(async () => {
      raiz.render(<EstudioPagadoALaInmobiliaria applicationId="app-1" />);
    });
    expect(q('estudio-sin-pago')?.textContent).toContain('90 días');
  });
});
