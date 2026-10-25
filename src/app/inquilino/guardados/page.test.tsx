/**
 * Guardados del inquilino (glow up 22-10): mientras llegan, el esqueleto con la forma de las tarjetas (antes una
 * rueda); con guardados, una sola salida al marketplace (en otra pestaña) y la línea dice qué se hace aquí (antes,
 * la tarjeta «Agregar más» y un resumen azul repetían la cuenta y la salida).
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const estado = vi.hoisted(() => ({
  wishlist: [] as string[],
  properties: [] as Array<Record<string, unknown>>,
  isLoading: false,
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es', formatCurrency: (n: number) => `$ ${n}` }),
}));
vi.mock('@/lib/hooks/use-onboarding-status', () => ({
  useOnboardingStatus: () => ({ isComplete: true, isLoading: false }),
}));
vi.mock('@/lib/stores/wishlist', () => ({
  useWishlist: () => ({ wishlist: estado.wishlist, removeFromWishlist: vi.fn() }),
}));
vi.mock('@/lib/hooks/useProperties', () => ({
  useWishlistedProperties: () => ({
    properties: estado.properties,
    isLoading: estado.isLoading,
    errorCrudo: null,
    yaNoDisponibles: 0,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/components/tenant/PropertyDetailSheet', () => ({ PropertyDetailSheet: () => null }));
vi.mock('@/components/property/PortadaDelInmueble', () => ({ PortadaDelInmueble: () => <div /> }));
vi.mock('@/components/tenant/CompleteProfileFirst', () => ({ CompleteProfileFirst: () => null }));

import GuardadosPage from './page';

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  estado.wishlist = [];
  estado.properties = [];
  estado.isLoading = false;
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const inmueble = (id: string) => ({
  id,
  title: `Apartamento ${id}`,
  monthlyRent: 2_000_000,
  neighborhood: 'Laureles',
  city: 'Medellín',
  bedrooms: 2,
  bathrooms: 1,
  area: 60,
  status: 'available',
});

describe('Guardados del inquilino', () => {
  it('mientras llegan: el esqueleto con la forma de las tarjetas', () => {
    estado.wishlist = ['a', 'b'];
    estado.isLoading = true;
    act(() => root.render(<GuardadosPage />));
    const cargando = host.querySelector('[data-testid="guardados-cargando"]');
    expect(cargando).not.toBeNull();
    expect(cargando?.children.length).toBe(2);
  });

  it('con guardados: una sola salida al marketplace, en otra pestaña, y la línea dice qué se hace', () => {
    estado.wishlist = ['a', 'b'];
    estado.properties = [inmueble('a'), inmueble('b')];
    act(() => root.render(<GuardadosPage />));
    expect(host.textContent).toContain('2 inmuebles guardados: abre uno para ver la ficha y postularte.');
    const salidas = host.querySelectorAll('a[href="/propiedades"]');
    expect(salidas.length).toBe(1);
    expect(salidas[0].getAttribute('target')).toBe('_blank');
    expect(salidas[0].getAttribute('rel')).toBe('noopener noreferrer');
    expect(host.textContent).not.toContain('Agregar más');
    expect(host.textContent).not.toContain('¿Listo para postularte a alguna?');
  });

  it('sin guardados: el vacío lleva a los inmuebles para mí', () => {
    act(() => root.render(<GuardadosPage />));
    expect(host.textContent).toContain('No tienes inmuebles guardados');
    expect(host.querySelector('a[href="/inquilino/para-ti"]')?.textContent).toContain('Ver inmuebles para mí');
  });
});
