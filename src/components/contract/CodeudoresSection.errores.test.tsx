/**
 * 02-10-2026 · Sistema de errores — el formulario del codeudor.
 *
 * Antes todo rechazo salía en un toast «No se pudo guardar.» con el mensaje
 * del back abajo, y la persona tenía que adivinar cuál de los cinco campos
 * era. Ahora: un 400 con `campos` (o un `CELULAR_INVALIDO` /
 * `CODEUDOR_DUPLICADO`, por su `code`) sale bajo SU campo con el foco; un 5xx
 * dice que fue nuestro, con la referencia; sólo la red habla de conexión.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ApiError } from '@/lib/api/client';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { list, create, update, remove, toastError } = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/lib/api/pagare.service', () => ({
  codeudoresApi: { list, create, update, remove },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: toastError } }));

import { CodeudoresSection } from './CodeudoresSection';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  [list, create, update, remove, toastError].forEach((m) => m.mockReset());
  list.mockResolvedValue([]);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function abrirYGuardar() {
  await act(async () => {
    root.render(<CodeudoresSection contractId="c-1" puedeEditar />);
    await Promise.resolve();
    await Promise.resolve();
  });
  act(() => {
    (container.querySelector('[data-testid="agregar-codeudor"]') as HTMLButtonElement).click();
  });
  const set = (testid: string, value: string) => {
    const el = container.querySelector(`[data-testid="${testid}"]`) as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  act(() => {
    set('codeudor-nombre', 'Pedro Pérez');
    set('codeudor-documento', '123456');
    set('codeudor-email', 'pedro@x');
    set('codeudor-celular', '3001234567');
  });
  await act(async () => {
    (container.querySelector('[data-testid="guardar-codeudor"]') as HTMLButtonElement).click();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('<CodeudoresSection> — el error en su campo', () => {
  it('🔴 un 400 con campos pinta el error bajo el correo, lo marca y le da el foco', async () => {
    const msg = 'El correo no tiene forma de correo.';
    create.mockRejectedValue(
      new ApiError(400, [msg], 'DATOS_INVALIDOS', {
        code: 'DATOS_INVALIDOS',
        message: [msg],
        campos: [{ campo: 'email', regla: 'correo', mensaje: msg }],
      }),
    );
    await abrirYGuardar();

    const correo = container.querySelector<HTMLInputElement>('#codeudor-email')!;
    expect(container.querySelector('#codeudor-email-error')?.textContent).toBe(msg);
    expect(correo.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(correo);
    expect(toastError).not.toHaveBeenCalled();
  });

  it('🔴 CELULAR_INVALIDO (sin campos) va bajo el celular, por su code', async () => {
    const msg = 'El celular del codeudor no es un móvil colombiano válido.';
    create.mockRejectedValue(new ApiError(400, msg, 'CELULAR_INVALIDO', { code: 'CELULAR_INVALIDO', message: msg }));
    await abrirYGuardar();

    expect(container.querySelector('#codeudor-celular-error')?.textContent).toBe(msg);
    expect(document.activeElement).toBe(container.querySelector('#codeudor-celular'));
    expect(toastError).not.toHaveBeenCalled();
  });

  it('🔴 un 5xx dice que falló de nuestro lado, con la referencia', async () => {
    create.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', { referencia: '5e6f7a8b' }),
    );
    await abrirYGuardar();

    const [titulo, opciones] = toastError.mock.calls[0] as [string, { description: string }];
    expect(titulo).toBe('No se pudo guardar el codeudor.');
    expect(opciones.description).toContain('No pudimos guardar el codeudor: algo falló de nuestro lado.');
    expect(opciones.description).toContain('5e6f7a8b');
    expect(opciones.description).not.toContain('conexión');
  });

  it('🔴 sin respuesta (status 0) habla de la conexión', async () => {
    create.mockRejectedValue(new ApiError(0, 'Failed to fetch'));
    await abrirYGuardar();
    const [, opciones] = toastError.mock.calls[0] as [string, { description: string }];
    expect(opciones.description).toContain('conexión');
  });
});
