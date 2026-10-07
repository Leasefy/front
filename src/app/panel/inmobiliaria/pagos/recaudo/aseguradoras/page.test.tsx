/**
 * Aseguradoras — los errores en palabras (tanda 2 del sistema de errores,
 * 02-10-2026).
 *
 * Antes la pantalla pintaba el `error.message` crudo como descripción: un 5xx
 * salía como «Error interno del servidor» sin referencia, y el NIT repetido
 * quedaba en un aviso que se iba. Ahora el NIT repetido (y cualquier 400 con
 * `campos`) va DEBAJO de su campo con el foco, un 5xx dice «de nuestro lado»
 * con la referencia, y sólo sin respuesta se habla de la conexión.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { ApiError } from '@/lib/api/client';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, toastMock } = vi.hoisted(() => ({
  api: { listar: vi.fn(), crear: vi.fn(), actualizar: vi.fn() },
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/api/aseguradoras.service', () => ({ aseguradorasApi: api }));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: () => true, isLoading: false }),
}));
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

import AseguradorasPage from './page';

const BOLIVAR = { id: 'as-1', nombre: 'Seguros Bolívar S.A.', nit: '860002503', activa: true };
const REFERENCIA = 'ab12cd34';
const cincoXX = () =>
  new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
    statusCode: 500,
    code: 'ERROR_INTERNO',
    message: 'Error interno del servidor',
    referencia: REFERENCIA,
  });

let host: HTMLDivElement;
let root: Root;

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<AseguradorasPage />);
  });
  await esperar();
}

function $(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`No se encontró ${selector}`);
  return el;
}

async function escribir(selector: string, valor: string) {
  const input = $(selector) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function clic(selector: string) {
  await act(async () => {
    $(selector).click();
  });
  await esperar();
}

async function registrar() {
  await escribir('#aseguradora-nombre', 'Seguros Bolívar S.A.');
  await escribir('#aseguradora-nit', '860.002.503-2');
  await clic('[data-testid="registrar-aseguradora"]');
}

beforeEach(() => {
  api.listar.mockReset().mockResolvedValue([BOLIVAR]);
  api.crear.mockReset();
  api.actualizar.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = '';
});

describe('Aseguradoras — registrar', () => {
  it('🔴 el NIT repetido va DEBAJO del NIT, con el foco', async () => {
    const motivo = 'Ya tienes registrada una aseguradora con el NIT 860002503.';
    api.crear.mockRejectedValue(
      new ApiError(409, motivo, 'ASEGURADORA_YA_EXISTE', {
        statusCode: 409,
        code: 'ASEGURADORA_YA_EXISTE',
        message: motivo,
      }),
    );
    await montar();
    await registrar();
    expect($('#aseguradora-nit-error').textContent).toBe(motivo);
    expect(document.activeElement?.id).toBe('aseguradora-nit');
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it('un 400 con campos va a SU campo', async () => {
    const frase = 'El nombre no puede tener más de 200 caracteres.';
    api.crear.mockRejectedValue(
      new ApiError(400, [frase], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [frase],
        campos: [{ campo: 'nombre', regla: 'longitud_maxima', mensaje: frase }],
      }),
    );
    await montar();
    await registrar();
    expect($('#aseguradora-nombre-error').textContent).toBe(frase);
    expect(document.activeElement?.id).toBe('aseguradora-nombre');
  });

  it('🔴 un 5xx dice «de nuestro lado» con la referencia', async () => {
    api.crear.mockRejectedValue(cincoXX());
    await montar();
    await registrar();
    const descripcion = String(toastMock.error.mock.calls[0]![1]?.description);
    expect(descripcion).toContain('No pudimos registrar la aseguradora: algo falló de nuestro lado');
    expect(descripcion).toContain(REFERENCIA);
  });

  it('sin respuesta (la red): ahí sí se habla de la conexión', async () => {
    api.crear.mockRejectedValue(new ApiError(0, 'Failed to fetch'));
    await montar();
    await registrar();
    expect(String(toastMock.error.mock.calls[0]![1]?.description)).toMatch(/conexión/);
  });
});

describe('Aseguradoras — activar y desactivar', () => {
  it('🔴 un 5xx al desactivar dice «de nuestro lado» con la referencia', async () => {
    api.actualizar.mockRejectedValue(cincoXX());
    await montar();
    const boton = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === 'Desactivar',
    )!;
    await act(async () => {
      boton.click();
    });
    await esperar();
    const descripcion = String(toastMock.error.mock.calls[0]![1]?.description);
    expect(descripcion).toContain('No pudimos desactivar la aseguradora: algo falló de nuestro lado');
    expect(descripcion).toContain(REFERENCIA);
  });
});
