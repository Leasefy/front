/**
 * Corregir UNA fila de la carga: el error va a SU campo (02-10-2026).
 *
 * Antes la fila no tenía dónde decir qué estaba mal: un 400 del back salía en
 * un toast crudo («monthlyRent must not be greater than…») y el formulario se
 * cerraba igual, perdiendo lo escrito. Ahora:
 *   · los topes del back se atajan en el cliente, con la misma frase;
 *   · un 400 con `campos` pinta cada mensaje debajo de su input y le da el foco;
 *   · lo que no tiene campo en la fila sale en un aviso;
 *   · el formulario no se cierra hasta que se guarda de verdad.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));

import { FilaImportacionRow } from './FilaImportacionRow';
import { ApiError } from '@/lib/api/client';
import { MENSAJES_DE_LA_IMPORTACION as M } from './lib/limites-de-la-importacion';
import type { FilaDeImportacion } from '@/lib/api/inmuebles-importacion.service';

let container: HTMLDivElement;
let root: Root;
const onResolver = vi.fn();
const onDescartar = vi.fn();

const FILA: FilaDeImportacion = {
  id: 'f1',
  lote: 'lote-1',
  fila: 12,
  estado: 'PENDIENTE',
  faltantes: ['titulo'],
  overrides: [],
  candidatos: [],
  propertyId: null,
  datos: { address: 'Calle 2 # 3-4', city: 'Medellín', listingType: 'RENT', monthlyRent: 1_500_000 },
};

beforeEach(() => {
  onResolver.mockReset();
  onDescartar.mockReset();
  Object.values(toastMock).forEach((f) => f.mockClear());
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <FilaImportacionRow fila={FILA} onResolver={onResolver} onDescartar={onDescartar} isBusy={false} />,
    );
  });
  act(() => {
    container.querySelector<HTMLButtonElement>('[aria-label="Editar fila"]')!.click();
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const input = (campo: string) =>
  container.querySelector<HTMLInputElement>(`#fila-f1-${campo}`)!;

function escribir(el: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function guardar() {
  const boton = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Guardar')!;
  await act(async () => {
    boton.click();
  });
  // El foco tras un error del servidor va en el siguiente turno (el input ya pintado).
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

const errorDe = (campo: string) => container.querySelector(`#fila-f1-${campo}-error`);

describe('FilaImportacionRow — los errores de la corrección', () => {
  it('🔴 un canon de once cifras se ataja en el cliente, con la frase del back, sin mandar nada', async () => {
    escribir(input('monthlyRent'), '30000000000');
    await guardar();

    expect(onResolver).not.toHaveBeenCalled();
    expect(errorDe('monthlyRent')?.textContent).toBe(M.canonMaximo);
    expect(input('monthlyRent').getAttribute('aria-invalid')).toBe('true');
    expect(input('monthlyRent').getAttribute('aria-describedby')).toBe('fila-f1-monthlyRent-error');
    expect(document.activeElement).toBe(input('monthlyRent'));
  });

  it('corregir el campo borra su error', async () => {
    escribir(input('monthlyRent'), '30000000000');
    await guardar();
    escribir(input('monthlyRent'), '1900000');
    // El `<p>` sale con su animación diciendo lo último que dijo (Cadence); lo
    // que cuenta es que el campo ya no está inválido ni apunta a un error.
    expect(input('monthlyRent').getAttribute('aria-invalid')).toBeNull();
    expect(input('monthlyRent').getAttribute('aria-describedby')).toBeNull();
  });

  it('un 400 con `campos` pinta el mensaje del back en su campo y le da el foco; no hay toast', async () => {
    onResolver.mockRejectedValue(
      new ApiError(400, ['El área no puede pasar de 1.000.000 m².'], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: ['El área no puede pasar de 1.000.000 m².'],
        campos: [{ campo: 'area', regla: 'maximo', mensaje: 'El área no puede pasar de 1.000.000 m².' }],
      }),
    );
    escribir(input('title'), 'Apto 302');
    await guardar();

    expect(onResolver).toHaveBeenCalledWith('f1', expect.objectContaining({ title: 'Apto 302' }));
    expect(errorDe('area')?.textContent).toBe('El área no puede pasar de 1.000.000 m².');
    expect(document.activeElement).toBe(input('area'));
    expect(toastMock.error).not.toHaveBeenCalled();
    // El formulario sigue abierto con lo escrito: no se pierde nada.
    expect(input('title').value).toBe('Apto 302');
  });

  it('`type` del back es «Tipo de inmueble» en la fila', async () => {
    onResolver.mockRejectedValue(
      new ApiError(400, ['Elige un tipo de inmueble.'], 'DATOS_INVALIDOS', {
        campos: [{ campo: 'type', regla: 'formato', mensaje: 'Elige un tipo de inmueble.' }],
      }),
    );
    escribir(input('title'), 'Apto 302');
    await guardar();
    expect(errorDe('propertyType')?.textContent).toBe('Elige un tipo de inmueble.');
  });

  it('lo que no tiene campo en la fila sale en un aviso', async () => {
    onResolver.mockRejectedValue(
      new ApiError(400, ['La fecha de consignación no es válida.'], 'DATOS_INVALIDOS', {
        campos: [{ campo: 'consignedAt', regla: 'formato', mensaje: 'La fecha de consignación no es válida.' }],
      }),
    );
    escribir(input('title'), 'Apto 302');
    await guardar();
    expect(toastMock.error).toHaveBeenCalledWith('La fecha de consignación no es válida.');
  });

  it('guardado de verdad: se cierra la edición', async () => {
    onResolver.mockResolvedValue(undefined);
    escribir(input('title'), 'Apto 302');
    await guardar();
    expect(container.querySelector('#fila-f1-title')).toBeNull();
  });
});
