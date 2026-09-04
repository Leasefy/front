/**
 * @vitest-environment happy-dom
 *
 * La sección «Ubicación» de la ficha: con coordenadas reales pinta el mapa y
 * los dos enlaces; sin coordenadas (null o el (0,0) que dejó el mapper viejo)
 * dice que no hay ubicación y ofrece ponerla sólo a quien puede editar.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Property } from '@/lib/types/property';

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

// MapLibre necesita WebGL: `next/dynamic` se reemplaza por un stub que
// resuelve el import de inmediato, y el mapa por un div con sus props.
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => (props: { latitude: number; longitude: number; titulo: string; direccion?: string }) => (
    <div
      data-testid="mapa-stub"
      data-lat={props.latitude}
      data-lng={props.longitude}
      data-direccion={props.direccion}
    >
      <a href={`https://www.google.com/maps?q=${props.latitude},${props.longitude}`}>Abrir en Google Maps</a>
      <a href={`https://www.google.com/maps/dir/?api=1&destination=${props.latitude},${props.longitude}`}>Cómo llegar</a>
    </div>
  ),
}));

vi.mock('./UbicarEnElMapaDialog', () => ({
  UbicarEnElMapaDialog: (props: { abierto: boolean }) =>
    props.abierto ? <div data-testid="dialogo-ubicar">diálogo</div> : null,
}));

const canAccess = vi.fn();
let permisosCargando = false;
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => ({
    isLoading: permisosCargando,
    canAccess: (...a: unknown[]) => canAccess(...a),
  }),
}));

import { UbicacionDelInmueble } from './UbicacionDelInmueble';

function inmueble(lat: number | null, lng: number | null): Property {
  return {
    id: 'prop-1',
    title: 'Apto en Chicó',
    description: '',
    type: 'apartment',
    status: 'available',
    city: 'Bogotá',
    neighborhood: 'Chicó',
    address: 'Calle 93 # 11-30',
    latitude: lat,
    longitude: lng,
    department: null,
    listingType: 'rent',
    salePrice: null,
    monthlyRent: 3_000_000,
    adminFee: 0,
    deposit: 0,
    bedrooms: 2,
    bathrooms: 2,
    area: 80,
    amenities: [],
    images: [],
    thumbnailUrl: '',
    landlordId: 'll-1',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
}

const consignacion = {
  propertyTitle: 'Apto en Chicó',
  propertyAddress: 'Calle 93 # 11-30',
  propertyZone: 'Chicó',
  propertyCity: 'Bogotá',
};

describe('<UbicacionDelInmueble>', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    canAccess.mockReset();
    canAccess.mockReturnValue(true);
    permisosCargando = false;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(property: Property | null, cargando = false) {
    act(() => {
      root.render(
        <UbicacionDelInmueble
          property={property}
          cargando={cargando}
          consignacion={consignacion}
          onActualizado={() => {}}
        />,
      );
    });
  }

  it('con coordenadas pinta el mapa con la dirección y los dos enlaces', () => {
    render(inmueble(4.6769, -74.0485));
    const mapa = container.querySelector('[data-testid="mapa-stub"]');
    expect(mapa).not.toBeNull();
    expect(mapa?.getAttribute('data-lat')).toBe('4.6769');
    expect(mapa?.getAttribute('data-lng')).toBe('-74.0485');
    expect(mapa?.getAttribute('data-direccion')).toBe('Calle 93 # 11-30, Chicó, Bogotá');
    const enlaces = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(enlaces).toContain('https://www.google.com/maps?q=4.6769,-74.0485');
    expect(enlaces).toContain('https://www.google.com/maps/dir/?api=1&destination=4.6769,-74.0485');
    expect(container.querySelector('[data-testid="ubicacion-vacia"]')).toBeNull();
  });

  it('sin coordenadas (null) pinta el vacío y el botón para quien puede editar', () => {
    render(inmueble(null, null));
    expect(container.querySelector('[data-testid="mapa-stub"]')).toBeNull();
    const vacio = container.querySelector('[data-testid="ubicacion-vacia"]');
    expect(vacio?.textContent).toContain('Este inmueble no tiene ubicación en el mapa');
    const boton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Ubicar en el mapa'),
    );
    expect(boton).toBeDefined();
    expect(canAccess).toHaveBeenCalledWith('portafolio', 'edit');

    act(() => boton!.click());
    expect(container.querySelector('[data-testid="dialogo-ubicar"]')).not.toBeNull();
  });

  it('(0,0) cuenta como sin ubicación', () => {
    render(inmueble(0, 0));
    expect(container.querySelector('[data-testid="mapa-stub"]')).toBeNull();
    expect(container.querySelector('[data-testid="ubicacion-vacia"]')).not.toBeNull();
  });

  it('sin permiso de edición no ofrece el botón', () => {
    canAccess.mockReturnValue(false);
    render(inmueble(null, null));
    expect(container.querySelector('[data-testid="ubicacion-vacia"]')).not.toBeNull();
    const boton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Ubicar en el mapa'),
    );
    expect(boton).toBeUndefined();
  });

  it('mientras los permisos resuelven no niega el botón', () => {
    canAccess.mockReturnValue(false);
    permisosCargando = true;
    render(inmueble(null, null));
    const boton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Ubicar en el mapa'),
    );
    expect(boton).toBeDefined();
  });

  it('mientras carga el inmueble muestra el esqueleto, no el vacío', () => {
    render(null, true);
    expect(container.querySelector('[data-testid="ubicacion-esqueleto"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="ubicacion-vacia"]')).toBeNull();
  });
});
