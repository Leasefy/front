import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;

vi.mock('next/image', () => ({ default: (p: { src: string; alt: string }) => <img src={p.src} alt={p.alt} /> }));

import { CaracteristicasDelInmueble, frasesDeLoEspecial } from './PiezasDeLaFicha';
import { PROPERTY_AMENITIES, type Property } from '@/lib/types/property';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function inmueble(ids: string[], extra: Partial<Property> = {}): Property {
  return {
    id: 'p1',
    title: 'Apartamento en El Yerbal',
    amenities: ids.map((id) => PROPERTY_AMENITIES.find((a) => a.id === id)!),
    listingType: 'rent',
    ...extra,
  } as unknown as Property;
}

let contenedor: HTMLDivElement;
let raiz: Root;
beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
});
afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

describe('«Lo especial» y las características de la ficha (21-10-2026)', () => {
  it('🔴 con muchas características, el parqueadero, el piso y «Sin depósito» no se caen de «Lo especial»', () => {
    const p = inmueble(['pool', 'gym', 'elevator', 'security', 'balcony', 'closets', 'jacuzzi'], {
      floor: 7,
      parkingSpaces: 1,
      type: 'apartment',
    } as Partial<Property>);
    const { frases, caracteristicasMostradas } = frasesDeLoEspecial(p);
    expect(frases).toEqual(['Piscina', 'Gimnasio', 'Ascensor', 'Con parqueadero', 'Piso 7', 'Sin depósito']);
    expect(caracteristicasMostradas).toBe(3);
  });

  it('con pocas características, todas caben en «Lo especial» y la sección completa no se repite', () => {
    act(() => raiz.render(<CaracteristicasDelInmueble p={inmueble(['pool', 'gym'])} />));
    expect(contenedor.querySelector('[data-testid="caracteristicas-del-inmueble"]')).toBeNull();
  });

  it('sin características no pinta nada', () => {
    act(() => raiz.render(<CaracteristicasDelInmueble p={inmueble([])} />));
    expect(contenedor.innerHTML).toBe('');
  });

  it('con más de las que caben: todas, en sus grupos y con el total', () => {
    const ids = ['pool', 'gym', 'elevator', 'security', 'visitor_parking', 'balcony', 'closets', 'near_transport'];
    act(() => raiz.render(<CaracteristicasDelInmueble p={inmueble(ids)} />));
    const s = contenedor.querySelector('[data-testid="caracteristicas-del-inmueble"]')!;
    expect(s.querySelector('h2')!.textContent).toBe('Características 8');
    expect([...s.querySelectorAll('h3')].map((h) => h.textContent)).toEqual(['Del inmueble', 'Del edificio o conjunto', 'Del sector']);
    expect(s.querySelectorAll('li')).toHaveLength(8);
    expect(s.textContent).toContain('Cerca al transporte público');
  });
});
