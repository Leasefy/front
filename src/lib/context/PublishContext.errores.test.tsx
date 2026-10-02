/**
 * PublishContext — los errores al publicar (sistema de errores, 02-10-2026).
 *
 *  · Una foto que fallaba sólo iba a la consola: el inmueble salía publicado
 *    con menos fotos y nadie se enteraba. Ahora se avisa, con su motivo.
 *  · Un 400 con `campos` lleva al paso del campo; los topes del DTO se atajan
 *    antes de mandar; un 5xx dice «de nuestro lado» con la referencia; sólo
 *    sin respuesta se habla de la conexión.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ApiError } from '@/lib/api/client';
import type { PropertyDraft } from '@/lib/types/publish';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { ubicarDireccion, crear, subirImagen, toastMock } = vi.hoisted(() => ({
  ubicarDireccion: vi.fn(),
  crear: vi.fn(),
  subirImagen: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/inmuebles/ubicar-direccion', () => ({ ubicarDireccion }));
vi.mock('@/lib/api/properties.service', () => ({
  propertiesApi: { create: crear, uploadImage: subirImagen },
}));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));

import { PublishProvider, usePublish } from './PublishContext';

type Contexto = ReturnType<typeof usePublish>;
let ctx: Contexto | null = null;

function Sonda() {
  ctx = usePublish();
  return null;
}

let container: HTMLDivElement;
let root: Root | null = null;

const BORRADOR: Partial<PropertyDraft> = {
  title: 'Apartamento en Laureles',
  description: 'Luminoso y bien ubicado.',
  type: 'apartment' as PropertyDraft['type'],
  city: 'Medellín',
  neighborhood: 'Laureles',
  address: 'Cra 80 # 33-10',
  monthlyRent: 1_800_000,
  bedrooms: 2,
  bathrooms: 1,
  area: 60,
  latitude: 6.2442,
  longitude: -75.5812,
};

async function montar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(
      <PublishProvider>
        <Sonda />
      </PublishProvider>,
    );
  });
}

async function publicarCon(borrador: Partial<PropertyDraft>, fotos: File[] = []) {
  await montar();
  await act(async () => {
    ctx!.updateDraft(borrador);
    if (fotos.length) ctx!.addPhotoFiles(fotos);
  });
  await act(async () => {
    await ctx!.submitProperty();
  });
}

beforeEach(() => {
  ubicarDireccion.mockReset().mockResolvedValue({ lat: 6.2, lng: -75.5, precision: 'direccion' });
  crear.mockReset().mockResolvedValue({ id: 'prop-1' });
  subirImagen.mockReset().mockResolvedValue({});
  Object.values(toastMock).forEach((m) => m.mockReset());
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:x');
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  ctx = null;
});

describe('PublishContext — las fotos que no suben', () => {
  it('🔴 una foto que falla se avisa con su motivo; el inmueble sigue publicado', async () => {
    subirImagen
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new ApiError(400, 'La foto pesa más de 5 MB. Súbela más liviana.', 'FOTO_MUY_PESADA'));
    await publicarCon(BORRADOR, [new File(['a'], 'sala.jpg'), new File(['b'], 'cocina.jpg')]);

    expect(ctx!.isComplete).toBe(true);
    expect(ctx!.fotosQueNoSubieron).toEqual([
      { nombre: 'cocina.jpg', motivo: 'La foto pesa más de 5 MB. Súbela más liviana.' },
    ]);
    const [titulo, opciones] = toastMock.warning.mock.calls[0];
    expect(titulo).toContain('una foto no se subió');
    expect(opciones.description).toContain('La foto pesa más de 5 MB');
  });

  it('un 5xx al subir una foto dice «de nuestro lado» con la referencia', async () => {
    subirImagen.mockRejectedValueOnce(
      new ApiError(500, 'Error interno del servidor.', 'FOTO_NO_GUARDADA', { referencia: 'ab12cd34' }),
    );
    await publicarCon(BORRADOR, [new File(['a'], 'sala.jpg')]);
    expect(ctx!.fotosQueNoSubieron[0].motivo).toMatch(/^No pudimos subir «sala\.jpg»: algo falló de nuestro lado/);
    expect(ctx!.fotosQueNoSubieron[0].motivo).toContain('ab12cd34');
  });

  it('con todas subidas no se avisa nada', async () => {
    await publicarCon(BORRADOR, [new File(['a'], 'sala.jpg')]);
    expect(toastMock.warning).not.toHaveBeenCalled();
    expect(ctx!.fotosQueNoSubieron).toEqual([]);
  });
});

describe('PublishContext — los errores al crear el inmueble', () => {
  it('🔴 el tope se ataja antes de mandar y lleva al paso del precio', async () => {
    await publicarCon({ ...BORRADOR, monthlyRent: 30_000_000_000 });
    expect(crear).not.toHaveBeenCalled();
    expect(ctx!.currentStep).toBe(6);
    expect(ctx!.erroresDelServidor.monthlyRent).toBe(
      'El canon no puede pasar de $100.000.000 al mes. Revisa que no sobren ceros.',
    );
    expect(ctx!.submissionError).toContain('El canon no puede pasar de $100.000.000');
  });

  it('un 400 con campos lleva al paso del campo y lo dice; editarlo lo borra', async () => {
    const frase = 'El área debe ser un número entero de metros cuadrados.';
    crear.mockRejectedValueOnce(
      new ApiError(400, [frase], 'DATOS_INVALIDOS', {
        code: 'DATOS_INVALIDOS',
        campos: [{ campo: 'area', regla: 'entero', mensaje: frase }],
      }),
    );
    await publicarCon(BORRADOR);
    expect(ctx!.currentStep).toBe(3);
    expect(ctx!.erroresDelServidor.area).toBe(frase);
    expect(ctx!.submissionError).toBe(frase);

    await act(async () => {
      ctx!.updateDraft({ area: 61 });
    });
    expect(ctx!.erroresDelServidor.area).toBeUndefined();
  });

  it('🔴 un 5xx dice «de nuestro lado» con la referencia, sin culpar a la conexión', async () => {
    crear.mockRejectedValueOnce(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', { referencia: 'ab12cd34' }),
    );
    await publicarCon(BORRADOR);
    expect(ctx!.submissionError).toMatch(/^No pudimos publicar el inmueble: algo falló de nuestro lado/);
    expect(ctx!.submissionError).toContain('ab12cd34');
    expect(ctx!.submissionError).not.toMatch(/conexi[oó]n/);
  });

  it('sin respuesta: la conexión', async () => {
    crear.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await publicarCon(BORRADOR);
    expect(ctx!.submissionError).toMatch(/conexión/);
  });
});
