/**
 * «Completar de golpe»: el error del campo «Valor» va debajo de él, y un
 * fallo del servidor dice la verdad (02-10-2026).
 *
 * Antes, «Escribe un número…» salía en el bloque de resultados de abajo, lejos
 * del input y sin marcarlo; un 5xx mostraba su `message` crudo; y un corte a
 * mitad se anunciaba como «Se cortó la conexión» aunque hubiera sido el
 * servidor.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api } = vi.hoisted(() => ({
  api: { motivos: vi.fn(), resolverPorFiltro: vi.fn() },
}));
vi.mock('@/lib/api/inmuebles-importacion.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/inmuebles-importacion.service')>(
    '@/lib/api/inmuebles-importacion.service',
  );
  return { ...actual, inmueblesImportacionApi: api };
});

import { LoteInmueblesMasivo } from './LoteInmueblesMasivo';
import { ApiError } from '@/lib/api/client';
import { MENSAJES_DE_LA_IMPORTACION as M } from './lib/limites-de-la-importacion';

let container: HTMLDivElement;
let root: Root;
const onCambio = vi.fn();

beforeEach(async () => {
  api.motivos.mockReset().mockResolvedValue({
    lote: 'lote-1',
    requierenAtencion: 5,
    listas: 0,
    sinCanon: 0,
    porMotivo: [],
  });
  api.resolverPorFiltro.mockReset();
  onCambio.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<LoteInmueblesMasivo lote="lote-1" onCambio={onCambio} />);
  });
  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-testid="masivo-inmuebles-seleccionar"]')!.click();
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const valor = () => container.querySelector<HTMLInputElement>('[data-testid="masivo-inmuebles-valor"]')!;
const errorDelValor = () => container.querySelector('#masivo-inmuebles-valor-error');

function escribir(texto: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(valor(), texto);
    valor().dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function aplicar() {
  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-testid="masivo-inmuebles-aplicar"]')!.click();
  });
  await act(async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
}

describe('LoteInmueblesMasivo — el error del valor y los del servidor', () => {
  it('🔴 un canon de once cifras se ataja con la frase del back, debajo del campo, sin mandar nada', async () => {
    escribir('30.000.000.000');
    await aplicar();

    expect(api.resolverPorFiltro).not.toHaveBeenCalled();
    expect(errorDelValor()?.textContent).toBe(M.canonMaximo);
    expect(valor().getAttribute('aria-invalid')).toBe('true');
    expect(valor().getAttribute('aria-describedby')).toBe('masivo-inmuebles-valor-error');
  });

  it('vacío: pide el número debajo del campo, no en el resultado de abajo', async () => {
    await aplicar();
    expect(errorDelValor()?.textContent).toBe('Escribe un número mayor que cero para «canon mensual».');
    expect(container.querySelector('[data-testid="masivo-inmuebles-resultado"]')).toBeNull();
  });

  it('escribir otra vez apaga el error del campo', async () => {
    await aplicar();
    escribir('1');
    expect(valor().getAttribute('aria-invalid')).toBeNull();
  });

  it('`CAMPO_INVALIDO` del back va al campo y en español (el back lo dice con el nombre en inglés)', async () => {
    api.resolverPorFiltro.mockRejectedValue(
      new ApiError(400, 'Valores que no sirven: monthlyRent.', 'CAMPO_INVALIDO'),
    );
    escribir('1');
    await aplicar();
    expect(errorDelValor()?.textContent).toBe(
      'Ese valor no sirve para «canon mensual». Revísalo y vuelve a aplicarlo.',
    );
  });

  it('🔴 un 5xx dice «de nuestro lado» con la referencia', async () => {
    api.resolverPorFiltro.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor.',
        referencia: 'feed4321',
      }),
    );
    escribir('1');
    await aplicar();

    const aviso = container.querySelector('[role="alert"]')?.textContent ?? '';
    expect(aviso).toContain('No pudimos aplicar el cambio: algo falló de nuestro lado');
    expect(aviso).toContain('feed4321');
    expect(aviso).not.toMatch(/conexi[oó]n/);
  });

  it('sin respuesta (status 0): ahí sí la conexión', async () => {
    api.resolverPorFiltro.mockRejectedValue(new ApiError(0, 'Failed to fetch'));
    escribir('1');
    await aplicar();
    expect(container.querySelector('[role="alert"]')?.textContent).toMatch(/conexión/);
  });
});
