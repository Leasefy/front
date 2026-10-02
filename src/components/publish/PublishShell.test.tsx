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
