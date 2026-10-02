/**
 * Publicar del propietario — el foco va al primer campo con error
 * (sistema de errores, 02-10-2026).
 *
 * Con el contexto de verdad (`PublishProvider`) y los servicios con dobles:
 * cuando publicar falla, el contexto lleva a la persona al paso del primer
 * campo y el marco le da el foco a ese campo. Sólo cuando llegan errores
 * NUEVOS: ni en cada render, ni cuando corrige un campo y otro sigue marcado,
 * ni al volver a un paso con un error viejo.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { PropertyDraft } from '@/lib/types/publish';
import { ApiError } from '@/lib/api/client';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { ubicarDireccion, crear, subirImagen, toastMock } = vi.hoisted(() => ({
  ubicarDireccion: vi.fn(),
  crear: vi.fn(),
  subirImagen: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock('@/lib/inmuebles/ubicar-direccion', () => ({ ubicarDireccion }));
vi.mock('@/lib/api/properties.service', () => ({
  propertiesApi: { create: crear, uploadImage: subirImagen },
}));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/components/publicar/PropertyLocationField', () => ({
  PropertyLocationField: ({ id, address }: { id?: string; address: string }) => (
    <input id={id} value={address} readOnly />
  ),
}));

import { PublishProvider, usePublish } from '@/lib/context/PublishContext';
import { PublishShell } from './PublishShell';
import { StepLocation, StepDetails, StepPricing, StepDescription } from './steps';

type Contexto = ReturnType<typeof usePublish>;
let ctx: Contexto | null = null;

/** El asistente como lo arma `app/publicar/page.tsx`, con los pasos que importan acá. */
function Asistente() {
  ctx = usePublish();
  const paso = (() => {
    switch (ctx.currentStep) {
      case 2:
        return <StepLocation />;
      case 3:
        return <StepDetails />;
      case 6:
        return <StepPricing />;
      case 7:
        return <StepDescription />;
      default:
        return <p>Paso {ctx.currentStep}</p>;
    }
  })();
  return <PublishShell>{paso}</PublishShell>;
}

const BORRADOR: Partial<PropertyDraft> = {
  title: 'Apartamento en Laureles',
  description: 'Luminoso y bien ubicado.',
  type: 'apartment',
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

let container: HTMLDivElement;
let root: Root | null = null;

async function montarCon(borrador: Partial<PropertyDraft>) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(
      <PublishProvider>
        <Asistente />
      </PublishProvider>,
    );
  });
  await act(async () => {
    ctx!.updateDraft(borrador);
  });
}

async function publicar() {
  await act(async () => {
    await ctx!.submitProperty();
  });
}

function enfocado() {
  return (document.activeElement as HTMLElement | null)?.id ?? null;
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

describe('PublishShell — el foco tras un fallo al publicar', () => {
  it('🔴 el foco va al primer campo con error del paso al que lleva el contexto (orden de la pantalla)', async () => {
    // Dos topes en el paso del precio: canon y administración. El canon va primero en pantalla.
    await montarCon({ ...BORRADOR, monthlyRent: 30_000_000_000, adminFee: 200_000_000 });
    await publicar();

    expect(crear).not.toHaveBeenCalled();
    expect(ctx!.currentStep).toBe(6);
    expect(enfocado()).toBe('publicar-monthlyRent');
    // Y los dos quedan marcados, cada uno con su mensaje debajo.
    expect(document.getElementById('publicar-monthlyRent')!.getAttribute('aria-describedby')).toBe(
      'publicar-monthlyRent-error',
    );
    expect(document.getElementById('publicar-adminFee')!.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById('publicar-adminFee-error')!.textContent).toContain(
      'La administración no puede pasar de $100.000.000',
    );
  });

  it('🔴 el foco va al primero en el orden de la pantalla, no al primero que mandó el servidor', async () => {
    // El servidor nombra primero el canon (paso 6) y después el área (paso 3).
    crear.mockRejectedValueOnce(
      new ApiError(400, ['x'], 'DATOS_INVALIDOS', {
        code: 'DATOS_INVALIDOS',
        campos: [
          { campo: 'monthlyRent', regla: 'tope', mensaje: 'El canon es muy alto.' },
          { campo: 'area', regla: 'entero', mensaje: 'El área debe ser un número entero de metros cuadrados.' },
        ],
      }),
    );
    await montarCon(BORRADOR);
    await publicar();

    expect(ctx!.currentStep).toBe(3);
    expect(enfocado()).toBe('publicar-area');
    expect(ctx!.ordenDeLosErrores).toEqual(['area', 'monthlyRent']);
  });

  it('🔴 un 400 del back con campos lleva el foco a su campo', async () => {
    const frase = 'El área debe ser un número entero de metros cuadrados.';
    crear.mockRejectedValueOnce(
      new ApiError(400, [frase], 'DATOS_INVALIDOS', {
        code: 'DATOS_INVALIDOS',
        campos: [{ campo: 'area', regla: 'entero', mensaje: frase }],
      }),
    );
    await montarCon(BORRADOR);
    await publicar();

    expect(ctx!.currentStep).toBe(3);
    expect(enfocado()).toBe('publicar-area');
    expect(document.getElementById('publicar-area-error')!.textContent).toBe(frase);
  });

  it('no roba el foco en cada render ni cuando la persona corrige un campo y otro sigue marcado', async () => {
    await montarCon({ ...BORRADOR, monthlyRent: 30_000_000_000, adminFee: 200_000_000 });
    await publicar();
    expect(enfocado()).toBe('publicar-monthlyRent');

    // La persona se va a corregir la administración.
    const administracion = document.getElementById('publicar-adminFee') as HTMLInputElement;
    act(() => administracion.focus());
    await act(async () => {
      ctx!.updateDraft({ adminFee: 300_000 });
    });
    expect(ctx!.erroresDelServidor.adminFee).toBeUndefined();
    expect(ctx!.erroresDelServidor.monthlyRent).toBeDefined();
    expect(enfocado()).toBe('publicar-adminFee');

    // Un render por otra cosa tampoco lo mueve.
    await act(async () => {
      ctx!.updateDraft({ description: 'Luminoso, bien ubicado y con balcón.' });
    });
    expect(enfocado()).toBe('publicar-adminFee');
  });

  it('volver a publicar y fallar igual vuelve a llevar el foco al campo', async () => {
    await montarCon({ ...BORRADOR, monthlyRent: 30_000_000_000 });
    await publicar();
    expect(enfocado()).toBe('publicar-monthlyRent');

    act(() => (document.activeElement as HTMLElement).blur());
    expect(enfocado()).not.toBe('publicar-monthlyRent');

    await publicar();
    expect(enfocado()).toBe('publicar-monthlyRent');
  });

  it('volver a un paso que tiene un error viejo no le roba el foco a nadie', async () => {
    await montarCon({ ...BORRADOR, area: 20_000 });
    await publicar();
    expect(ctx!.currentStep).toBe(3);
    expect(enfocado()).toBe('publicar-area');

    // Va al paso de la ubicación y vuelve: el error sigue, pero no es nuevo.
    await act(async () => ctx!.prevStep());
    expect(ctx!.currentStep).toBe(2);
    await act(async () => ctx!.nextStep());
    expect(ctx!.currentStep).toBe(3);
    expect(document.getElementById('publicar-area')!.getAttribute('aria-invalid')).toBe('true');
    expect(enfocado()).not.toBe('publicar-area');
  });
});

/**
 * El aviso del pie dice SÓLO lo que no tiene campo (Nico, 02-10-2026). Antes
 * repetía, todo junto, lo que ya se leía bajo cada campo.
 */
describe('PublishShell — el aviso del pie', () => {
  function avisoDelPie() {
    return container.querySelector<HTMLElement>('[data-testid="publicar-aviso-del-pie"]');
  }

  /** Cuántas veces sale el texto en la pantalla (en el campo y/o en el pie). */
  function vecesEnPantalla(texto: string) {
    return container.textContent!.split(texto).length - 1;
  }

  it('🔴 con errores que tienen campo, no hay aviso del pie: cada uno se lee una vez, bajo su campo', async () => {
    await montarCon({ ...BORRADOR, monthlyRent: 30_000_000_000, adminFee: 200_000_000 });
    await publicar();

    expect(document.getElementById('publicar-monthlyRent-error')!.textContent).toContain(
      'El canon no puede pasar de $100.000.000',
    );
    expect(avisoDelPie()).toBeNull();
    expect(vecesEnPantalla('El canon no puede pasar de $100.000.000')).toBe(1);
    expect(vecesEnPantalla('La administración no puede pasar de $100.000.000')).toBe(1);
  });

  it('🔴 el pie no repite el error que está bajo su campo, y sí dice el que no tiene campo', async () => {
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
    await montarCon(BORRADOR);
    await publicar();

    expect(document.getElementById('publicar-area-error')!.textContent).toBe(delArea);
    expect(vecesEnPantalla(delArea)).toBe(1);
    expect(vecesEnPantalla(delPunto)).toBe(1);
    const pie = avisoDelPie();
    expect(pie).not.toBeNull();
    expect(pie!.getAttribute('role')).toBe('alert');
    expect(pie!.textContent).toBe(delPunto);
    expect(pie!.textContent).not.toContain(delArea);
    // El foco sigue yendo al campo.
    expect(enfocado()).toBe('publicar-area');
  });

  it('un campo del sobre con un nombre que el asistente no tiene sale en el pie', async () => {
    const frase = 'El código del portal no existe.';
    crear.mockRejectedValueOnce(
      new ApiError(400, [frase], 'DATOS_INVALIDOS', {
        code: 'DATOS_INVALIDOS',
        campos: [{ campo: 'portalCode', regla: 'existe', mensaje: frase }],
      }),
    );
    await montarCon(BORRADOR);
    await publicar();

    expect(avisoDelPie()!.textContent).toBe(frase);
    expect(container.querySelector('[aria-invalid="true"]')).toBeNull();
  });

  it('🔴 un 5xx sale en el pie: «de nuestro lado» con la referencia', async () => {
    crear.mockRejectedValueOnce(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', { referencia: 'ab12cd34' }),
    );
    await montarCon(BORRADOR);
    await publicar();

    const pie = avisoDelPie();
    expect(pie!.textContent).toMatch(/^No pudimos publicar el inmueble: algo falló de nuestro lado/);
    expect(pie!.textContent).toContain('ab12cd34');
  });

  it('sin errores no hay aviso del pie', async () => {
    await montarCon(BORRADOR);
    expect(avisoDelPie()).toBeNull();
  });
});

/**
 * La barra de pasos marca los pasos con errores (Nico, 02-10-2026, opción
 * «c»): tras un fallo, la persona ve qué otros pasos tiene que corregir, y la
 * marca se va cuando el paso se queda sin errores.
 */
describe('PublishShell — la barra de pasos marca los pasos con errores', () => {
  const ERROR_EN_DOS_PASOS = () =>
    new ApiError(400, ['x'], 'DATOS_INVALIDOS', {
      code: 'DATOS_INVALIDOS',
      campos: [
        { campo: 'monthlyRent', regla: 'tope', mensaje: 'El canon es muy alto.' },
        { campo: 'area', regla: 'entero', mensaje: 'El área debe ser un número entero de metros cuadrados.' },
      ],
    });

  /** El botón del paso N en la barra lateral. */
  function botonDelPaso(paso: number) {
    return container.querySelectorAll<HTMLButtonElement>('nav button')[paso - 1];
  }
  function marca(paso: number) {
    return container.querySelector<HTMLElement>(`[data-testid="paso-${paso}-marca-de-error"]`);
  }
  function pasosMarcados() {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((p) => botonDelPaso(p).dataset.conErrores === 'true');
  }
  function lineaDelCelular() {
    return container.querySelector<HTMLElement>('[data-testid="publicar-pasos-por-corregir"]');
  }

  it('🔴 marca los pasos con error y ningún otro', async () => {
    crear.mockRejectedValueOnce(ERROR_EN_DOS_PASOS());
    await montarCon(BORRADOR);
    await publicar();

    expect(pasosMarcados()).toEqual([3, 6]);
    expect(marca(3)).not.toBeNull();
    expect(marca(6)).not.toBeNull();
    for (const p of [1, 2, 4, 5, 7, 8, 9, 10]) expect(marca(p), `paso ${p}`).toBeNull();
    // La marca es la × del estado de error del Stepper de Cadence, decorativa.
    expect(marca(3)!.getAttribute('aria-hidden')).toBe('true');
    expect(marca(3)!.querySelector('svg')).not.toBeNull();
    // 🔴 Encima del círculo (`relative z-10`): sin un `z` mayor, el círculo la
    // tapaba y no se veía (captura a 1280 px del 02-10-2026).
    expect(marca(3)!.className).toMatch(/\bz-20\b/);
    expect(marca(3)!.parentElement!.firstElementChild!.className).toMatch(/\bz-10\b/);
  });

  it('🔴 el paso marcado lo dice para el lector de pantalla; los demás no', async () => {
    crear.mockRejectedValueOnce(ERROR_EN_DOS_PASOS());
    await montarCon(BORRADOR);
    await publicar();

    expect(botonDelPaso(3).textContent).toContain('Detalles, tiene errores');
    expect(botonDelPaso(6).textContent).toContain('Precios, tiene errores');
    expect(botonDelPaso(3).querySelector('.sr-only')!.textContent).toBe(', tiene errores');
    expect(botonDelPaso(2).textContent).not.toContain('tiene errores');
    expect(botonDelPaso(7).textContent).not.toContain('tiene errores');
  });

  it('🔴 en el celular (sin barra de pasos) una línea dice qué pasos quedan por corregir', async () => {
    crear.mockRejectedValueOnce(ERROR_EN_DOS_PASOS());
    await montarCon(BORRADOR);
    await publicar();

    expect(lineaDelCelular()!.textContent).toBe('Por corregir: paso 3 (Detalles) y paso 6 (Precios)');
    expect(lineaDelCelular()!.className).toContain('text-caption');
  });

  it('🔴 la marca se quita al corregir el último error del paso', async () => {
    crear.mockRejectedValueOnce(ERROR_EN_DOS_PASOS());
    await montarCon(BORRADOR);
    await publicar();

    await act(async () => {
      ctx!.updateDraft({ area: 61 });
    });
    expect(pasosMarcados()).toEqual([6]);
    expect(botonDelPaso(3).textContent).not.toContain('tiene errores');
    expect(lineaDelCelular()!.textContent).toBe('Por corregir: paso 6 (Precios)');
    // La × sale con su animación y después se desmonta.
    await vi.waitFor(() => expect(marca(3)).toBeNull());
    expect(marca(6)).not.toBeNull();

    await act(async () => {
      ctx!.updateDraft({ monthlyRent: 1_900_000 });
    });
    expect(pasosMarcados()).toEqual([]);
    await vi.waitFor(() => {
      expect(marca(6)).toBeNull();
      expect(lineaDelCelular()).toBeNull();
    });
  });

  it('los topes del cliente marcan su paso (dos errores en el mismo paso, una marca)', async () => {
    await montarCon({ ...BORRADOR, monthlyRent: 30_000_000_000, adminFee: 200_000_000 });
    await publicar();

    expect(pasosMarcados()).toEqual([6]);
    expect(lineaDelCelular()!.textContent).toBe('Por corregir: paso 6 (Precios)');

    // Corregir uno de los dos no quita la marca: el paso sigue con un error.
    await act(async () => {
      ctx!.updateDraft({ adminFee: 300_000 });
    });
    expect(pasosMarcados()).toEqual([6]);
  });

  it('un error sin campo (5xx) no marca ningún paso', async () => {
    crear.mockRejectedValueOnce(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', { referencia: 'ab12cd34' }),
    );
    await montarCon(BORRADOR);
    await publicar();

    expect(pasosMarcados()).toEqual([]);
    expect(container.querySelector('[data-testid$="-marca-de-error"]')).toBeNull();
    expect(lineaDelCelular()).toBeNull();
  });
});
