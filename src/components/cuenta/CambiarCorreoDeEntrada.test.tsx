import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({ estado: vi.fn(), pedir: vi.fn(), reenviar: vi.fn(), cancelar: vi.fn() }));
vi.mock('@/lib/api/cambio-de-correo.service', () => ({
  cambioDeCorreoApi: { estado: h.estado, pedir: h.pedir, reenviar: h.reenviar, cancelar: h.cancelar },
}));
vi.mock('@/lib/i18n', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useI18n: () => ({ locale: 'es', t: (k: string) => k }),
}));
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

import { ApiError } from '@/lib/api/client';
import { CambiarCorreoDeEntrada, conPuntoFinal } from './CambiarCorreoDeEntrada';

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  Object.values(h).forEach((f) => f.mockReset());
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = '';
});

async function montar() {
  await act(async () => {
    root.render(<CambiarCorreoDeEntrada correo="ana@personal.com" />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}
const $ = (sel: string) => document.querySelector<HTMLElement>(sel);
function escribir(sel: string, valor: string) {
  const el = $(sel) as HTMLInputElement;
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    set.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('CambiarCorreoDeEntrada', () => {
  it('sin cambio pendiente: el correo y «Cambiar»; pedir manda correo y contraseña', async () => {
    h.estado.mockResolvedValue({ correo: 'ana@personal.com', entraConContrasena: true, pendiente: null });
    h.pedir.mockResolvedValue({ correoNuevo: 'ana@empresa.co', vence: '2026-10-22T20:00:00Z', correoEnviado: true });
    await montar();
    expect(host.textContent).toContain('ana@personal.com');
    await act(async () => $('[data-testid="cambiar-correo"]')!.click());
    escribir('[data-testid="correo-nuevo"]', 'ana@empresa.co');
    escribir('[data-testid="contrasena-actual"]', 'secreta');
    await act(async () => $('[data-testid="pedir-cambio-correo"]')!.click());
    expect(h.pedir).toHaveBeenCalledWith('ana@empresa.co', 'secreta');
  });

  it('la contraseña mala se dice bajo su campo', async () => {
    h.estado.mockResolvedValue({ correo: 'ana@personal.com', entraConContrasena: true, pendiente: null });
    h.pedir.mockRejectedValue(
      new ApiError(401, 'La contraseña no es la de tu cuenta.', 'CONTRASENA_INCORRECTA', {
        statusCode: 401,
        code: 'CONTRASENA_INCORRECTA',
        message: 'La contraseña no es la de tu cuenta.',
        campos: [{ campo: 'contrasenaActual', regla: 'servidor', mensaje: 'La contraseña no es la de tu cuenta.' }],
      } as never),
    );
    await montar();
    await act(async () => $('[data-testid="cambiar-correo"]')!.click());
    escribir('[data-testid="correo-nuevo"]', 'ana@empresa.co');
    escribir('[data-testid="contrasena-actual"]', 'mala');
    await act(async () => $('[data-testid="pedir-cambio-correo"]')!.click());
    expect(document.body.textContent).toContain('La contraseña no es la de tu cuenta.');
  });

  it('con un cambio pendiente: lo dice, sin «Cambiar», con «Reenviar» y «Cancelar el cambio»', async () => {
    h.estado.mockResolvedValue({
      correo: 'ana@personal.com',
      entraConContrasena: true,
      pendiente: { correo: 'ana@empresa.co', vence: '2026-10-22T20:00:00Z', pedidoEl: '2026-10-21T20:00:00Z' },
    });
    h.cancelar.mockResolvedValue({ cancelado: true });
    await montar();
    expect($('[data-testid="cambio-pendiente"]')!.textContent).toContain('ana@empresa.co');
    // Lab 21-10: «vence el 22 de octubre a las 7:41 p. m..» — la hora ya trae su punto.
    expect($('[data-testid="cambio-pendiente"]')!.textContent).not.toMatch(/\.\./);
    expect($('[data-testid="cambiar-correo"]')).toBeNull();
    await act(async () => $('[data-testid="cancelar-cambio-correo"]')!.click());
    expect(h.cancelar).toHaveBeenCalled();
  });

  it('el correo se ve entero (baja de renglón), nunca cortado con «…»', async () => {
    h.estado.mockResolvedValue({ correo: 'asesor@inmobiliaria-lab.example.test', entraConContrasena: true, pendiente: null });
    await montar();
    const correo = $('[data-testid="correo-actual"]')!;
    expect(correo.textContent).toBe('asesor@inmobiliaria-lab.example.test');
    expect(correo.className).not.toContain('truncate');
    expect(correo.className).toContain('break-words');
    // Se parte después de la «@» y antes de los puntos, nunca letra por letra.
    expect(correo.querySelectorAll('wbr').length).toBe(3);
  });

  it('conPuntoFinal no repite el punto de «p. m.»', () => {
    expect(conPuntoFinal('22 de octubre a las 7:41 p. m.')).toBe('22 de octubre a las 7:41 p. m.');
    expect(conPuntoFinal('October 22 at 7:41 PM')).toBe('October 22 at 7:41 PM.');
  });

  it('quien entra con Google no ve «Cambiar»', async () => {
    h.estado.mockResolvedValue({ correo: 'ana@gmail.com', entraConContrasena: false, pendiente: null });
    await montar();
    expect($('[data-testid="cambiar-correo"]')).toBeNull();
    expect(host.textContent).toContain('Entras con Google');
  });
});
