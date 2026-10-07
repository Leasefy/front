/**
 * PublishContext — los errores al publicar (sistema de errores, 02-10-2026).
 *
 *  · Una foto que fallaba sólo iba a la consola: el inmueble salía publicado
 *    con menos fotos y nadie se enteraba. Ahora se avisa, con su motivo.
 *  · Un 400 con `campos` lleva al paso del campo; los topes del DTO se atajan
 *    antes de mandar; un 5xx dice «de nuestro lado» con la referencia; sólo
 *    sin respuesta se habla de la conexión.
 *  · El aviso del pie (`submissionError`) lleva SÓLO lo que no tiene campo: lo
 *    que tiene campo se pinta bajo él y no se repite (Nico, 02-10-2026).
 *  · `ordenDeLosErrores` va en el orden de la pantalla, no en el del servidor:
 *    la persona llega al paso del primero de ESE orden.
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
    // Se lee bajo el campo del canon: el pie no lo repite.
    expect(ctx!.submissionError).toBeNull();
  });

  it('un 400 con campos lleva al paso del campo y lo pone en su campo, no en el pie; editarlo lo borra', async () => {
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
    expect(ctx!.submissionError).toBeNull();

    await act(async () => {
      ctx!.updateDraft({ area: 61 });
    });
    expect(ctx!.erroresDelServidor.area).toBeUndefined();
  });

  it('🔴 al pie va SÓLO el campo del sobre que ningún paso pinta; el que tiene campo va a su campo', async () => {
    const delArea = 'El área debe ser un número entero de metros cuadrados.';
    const delPunto = 'La latitud tiene que estar entre -90 y 90.';
    crear.mockRejectedValueOnce(
      new ApiError(400, [delArea, delPunto], 'DATOS_INVALIDOS', {
        code: 'DATOS_INVALIDOS',
        campos: [
          { campo: 'area', regla: 'entero', mensaje: delArea },
          { campo: 'latitude', regla: 'rango', mensaje: delPunto },
        ],
      }),
    );
    await publicarCon(BORRADOR);
    expect(ctx!.erroresDelServidor).toEqual({ area: delArea });
    expect(ctx!.submissionError).toBe(delPunto);
    expect(ctx!.currentStep).toBe(3);
  });

  it('un campo del sobre con un nombre que el asistente no tiene va al pie, y no cambia de paso', async () => {
    const frase = 'El código del portal no existe.';
    crear.mockRejectedValueOnce(
      new ApiError(400, [frase], 'DATOS_INVALIDOS', {
        code: 'DATOS_INVALIDOS',
        campos: [{ campo: 'portalCode', regla: 'existe', mensaje: frase }],
      }),
    );
    await publicarCon(BORRADOR);
    expect(ctx!.erroresDelServidor).toEqual({});
    expect(ctx!.submissionError).toBe(frase);
    expect(ctx!.currentStep).toBe(1);
    expect(ctx!.ordenDeLosErrores).toEqual([]);
  });

  it('un 409 sin campos dice su mensaje en el pie', async () => {
    crear.mockRejectedValueOnce(
      new ApiError(409, 'Ya publicaste un inmueble con esta dirección.', 'INMUEBLE_REPETIDO'),
    );
    await publicarCon(BORRADOR);
    expect(ctx!.erroresDelServidor).toEqual({});
    expect(ctx!.submissionError).toBe('Ya publicaste un inmueble con esta dirección.');
  });

  it('🔴 ordenDeLosErrores va en el orden de la pantalla, no en el que los mandó el servidor', async () => {
    crear.mockRejectedValueOnce(
      new ApiError(400, ['x'], 'DATOS_INVALIDOS', {
        code: 'DATOS_INVALIDOS',
        campos: [
          { campo: 'title', regla: 'largo', mensaje: 'El título es muy largo.' },
          { campo: 'monthlyRent', regla: 'tope', mensaje: 'El canon es muy alto.' },
          { campo: 'stratum', regla: 'rango', mensaje: 'El estrato va de 1 a 6.' },
          { campo: 'bedrooms', regla: 'rango', mensaje: 'Las habitaciones van de 1 a 20.' },
        ],
      }),
    );
    await publicarCon(BORRADOR);
    // La persona llega al paso del primero de ESE orden (características), no al del título.
    expect(ctx!.currentStep).toBe(3);
    expect(ctx!.ordenDeLosErrores).toEqual(['bedrooms', 'stratum', 'monthlyRent', 'title']);

    // Corregir uno lo saca del orden; los demás siguen en el suyo.
    await act(async () => {
      ctx!.updateDraft({ bedrooms: 3 });
    });
    expect(ctx!.ordenDeLosErrores).toEqual(['stratum', 'monthlyRent', 'title']);
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
