/**
 * Publicar del propietario — cada paso pinta el error bajo SU campo
 * (sistema de errores, 02-10-2026).
 *
 * `PublishContext` junta en `erroresDelServidor` lo que rechazó el back
 * (`campos[]`) y los topes del cliente, y lleva a la persona al paso del primer
 * campo. Antes los pasos no lo pintaban: el aviso del pie lo decía todo junto y
 * la persona tenía que adivinar qué casilla era. Acá se fija, campo por campo,
 * que el mensaje sale debajo de su control, que el control lleva
 * `aria-invalid` y `aria-describedby` apuntando a ese mensaje, y que sin error
 * no se marca nada.
 */

import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { initialPropertyDraft, type PropertyDraft } from '@/lib/types/publish';
import type { CampoDePublicar, ErroresDePublicar } from '../campos-con-error';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { estado } = vi.hoisted(() => ({
  estado: { errores: {} as Record<string, string> },
}));

const BORRADOR: PropertyDraft = {
  ...initialPropertyDraft,
  type: 'apartment',
  city: 'Medellín',
  neighborhood: 'Laureles',
  address: 'Cra 80 # 33-10',
  monthlyRent: 1_800_000,
  // Con valor, los campos de administración y depósito se ven al montar.
  adminFee: 350_000,
  deposit: 1_800_000,
  title: 'Apartamento en Laureles',
  description: 'Luminoso y bien ubicado.',
  amenities: ['Gimnasio'],
};

vi.mock('@/lib/context/PublishContext', () => ({
  usePublish: () => ({
    draft: BORRADOR,
    updateDraft: vi.fn(),
    erroresDelServidor: estado.errores,
    fotosQueNoSubieron: [],
    addPhotoFiles: vi.fn(() => []),
    removePhotoFile: vi.fn(),
    reorderPhotoFiles: vi.fn(),
  }),
}));

// El campo de la dirección trae el mapa (maplibre); acá basta su input con el id.
vi.mock('@/components/publicar/PropertyLocationField', () => ({
  PropertyLocationField: ({ id, address }: { id?: string; address: string }) => (
    <input id={id} value={address} readOnly />
  ),
}));

import { StepType, StepLocation, StepDetails, StepAmenities, StepPricing, StepDescription } from './index';

/** En qué paso vive cada campo que el back puede rechazar, y cómo se elige. */
const CAMPOS: Array<[CampoDePublicar, () => React.ReactElement, 'control' | 'grupo']> = [
  ['type', StepType, 'grupo'],
  ['city', StepLocation, 'grupo'],
  ['neighborhood', StepLocation, 'control'],
  ['address', StepLocation, 'control'],
  ['bedrooms', StepDetails, 'control'],
  ['bathrooms', StepDetails, 'control'],
  ['area', StepDetails, 'control'],
  ['floor', StepDetails, 'control'],
  ['parkingSpaces', StepDetails, 'control'],
  ['stratum', StepDetails, 'control'],
  ['yearBuilt', StepDetails, 'control'],
  ['amenities', StepAmenities, 'grupo'],
  ['monthlyRent', StepPricing, 'control'],
  ['adminFee', StepPricing, 'control'],
  ['deposit', StepPricing, 'control'],
  ['title', StepDescription, 'control'],
  ['description', StepDescription, 'control'],
];

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function pintar(Paso: () => React.ReactElement, errores: ErroresDePublicar) {
  estado.errores = errores as Record<string, string>;
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container!);
    root.render(<Paso />);
  });
  return container;
}

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  estado.errores = {};
});

describe('los pasos de publicar pintan el error en su campo', () => {
  it.each(CAMPOS)(
    '🔴 %s: el mensaje sale bajo su campo, con aria-invalid y aria-describedby',
    (campo, Paso, tipo) => {
      const mensaje = `El ${campo} no sirve así. Revísalo.`;
      const c = pintar(Paso, { [campo]: mensaje });

      const error = document.getElementById(`publicar-${campo}-error`);
      expect(error, `falta el mensaje de ${campo}`).not.toBeNull();
      expect(error!.textContent).toBe(mensaje);
      expect(error!.getAttribute('role')).toBe('alert');

      const marcado =
        tipo === 'control'
          ? document.getElementById(`publicar-${campo}`)
          : error!.parentElement!.querySelector('[role="group"]');
      expect(marcado, `falta el control de ${campo}`).not.toBeNull();
      expect(marcado!.getAttribute('aria-invalid')).toBe('true');
      expect(marcado!.getAttribute('aria-describedby')).toBe(`publicar-${campo}-error`);
      // Un solo campo marcado: el error no se riega en los vecinos.
      expect(c.querySelectorAll('[aria-invalid="true"]')).toHaveLength(1);
    },
  );

  it.each(CAMPOS)('%s: sin error no marca nada ni pinta mensaje', (campo, Paso) => {
    const c = pintar(Paso, {});
    expect(document.getElementById(`publicar-${campo}-error`)).toBeNull();
    expect(c.querySelector('[aria-invalid="true"]')).toBeNull();
    expect(c.querySelector('[aria-describedby$="-error"]')).toBeNull();
  });

  it('la etiqueta de cada control lo nombra (el id del error es el del campo)', () => {
    pintar(StepPricing, { monthlyRent: 'x' });
    const etiqueta = document.querySelector('label[for="publicar-monthlyRent"]');
    expect(etiqueta?.textContent).toContain('Canon de arrendamiento mensual');
  });
});
