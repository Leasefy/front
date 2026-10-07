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
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/components/ui/toast', () => ({ toast: toasts }));

import { EstudioPagadoALaInmobiliaria } from './EstudioPagadoALaInmobiliaria';
import { ApiError } from '@/lib/api/client';

let contenedor: HTMLDivElement;
let raiz: Root;
beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  Object.values(api).forEach((f) => f.mockReset());
  toasts.success.mockReset();
  toasts.error.mockReset();
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

/**
 * 02-10-2026 · Sistema de errores: el valor con el tope del back antes de
 * mandar, lo rechazado bajo su campo, y lo demás por el traductor.
 */
describe('<EstudioPagadoALaInmobiliaria> — cuando algo no cabe o falla', () => {
  async function abrirYEscribir(texto: string) {
    permisos.valor = { canAccess: () => true };
    api.vigente.mockResolvedValue({ vigente: false, numeroRecibo: null, pagadoEl: null, vigenteHasta: null });
    await act(async () => {
      raiz.render(<EstudioPagadoALaInmobiliaria applicationId="app-1" />);
    });
    await act(async () => {
      (q('estudio-registrar') as HTMLButtonElement).click();
    });
    const valor = q('estudio-valor') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(valor, texto);
      valor.dispatchEvent(new Event('input', { bubbles: true }));
    });
    return valor;
  }

  async function confirmar() {
    await act(async () => {
      (q('estudio-confirmar') as HTMLButtonElement).click();
    });
  }

  const TOPE = 'El valor del estudio no puede pasar de $2.000.000.000. Revisa que no sobren ceros.';

  it('🔴 un valor con ceros de más se dice bajo el campo y no se manda', async () => {
    const valor = await abrirYEscribir('30.000.000.000');
    expect(document.getElementById('estudio-valor-error')?.textContent).toBe(TOPE);
    expect(valor.getAttribute('aria-invalid')).toBe('true');
    expect((q('estudio-confirmar') as HTMLButtonElement).disabled).toBe(true);
    expect(api.registrarPago).not.toHaveBeenCalled();
  });

  it('🔴 un 400 con campos va bajo su campo y le da el foco', async () => {
    api.registrarPago.mockRejectedValue(
      new ApiError(400, [TOPE], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [TOPE],
        campos: [{ campo: 'valorCop', regla: 'maximo', mensaje: TOPE }],
      }),
    );
    const valor = await abrirYEscribir('120.000');
    await confirmar();
    expect(document.getElementById('estudio-valor-error')?.textContent).toBe(TOPE);
    expect(document.activeElement).toBe(valor);
    expect(toasts.error).not.toHaveBeenCalled();
  });

  it('🔴 un 5xx dice que es nuestro, con la referencia', async () => {
    api.registrarPago.mockRejectedValue(
      new ApiError(500, 'Internal server error', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Internal server error',
        referencia: 'feedc0de',
      }),
    );
    await abrirYEscribir('120.000');
    await confirmar();
    const [titulo, opciones] = toasts.error.mock.calls[0] as [string, { description: string }];
    expect(titulo).toBe('No se pudo registrar el pago del estudio');
    expect(opciones.description).toContain('de nuestro lado');
    expect(opciones.description).toContain('feedc0de');
    expect(opciones.description).not.toContain('Internal server error');
  });

  it('🔴 sin respuesta (status 0), la conexión', async () => {
    api.registrarPago.mockRejectedValue(new ApiError(0, 'Failed to fetch'));
    await abrirYEscribir('120.000');
    await confirmar();
    const [, opciones] = toasts.error.mock.calls[0] as [string, { description: string }];
    expect(opciones.description.toLowerCase()).toContain('conexión');
  });
});
