/**
 * La ficha pública entera, de punta a punta (ronda 30, diseño nuevo).
 *
 * El rediseño de la ficha cambió cómo se ven casi todas sus piezas a la vez;
 * esta prueba la monta completa con los datos de un inmueble —sin red: los
 * hooks y servicios van simulados— y mira que cada sección salga con su
 * data-testid, que las tiras traigan sus flechas y que no vuelva lo que la
 * identidad saca (letra de 9–11 px, vidrio, sombras).
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

const { inmueble, otros } = vi.hoisted(() => {
  const base = {
    title: 'Apartamento en Palmas, Medellín',
    images: ['/f/a.jpg', '/f/b.jpg', '/f/c.jpg', '/f/d.jpg', '/f/e.jpg', '/f/f.jpg'],
    type: 'apartment',
    listingType: 'rent',
    status: 'available',
    monthlyRent: 5_000_000,
    adminFee: 0,
    city: 'Medellín',
    neighborhood: 'Palmas',
    bedrooms: 2,
    bathrooms: 2,
    area: 80,
    stratum: 4,
    amenities: [],
    description: 'Un apartamento con vista.',
    agencyId: 'ag-1',
    agencyName: 'Portofino Propiedad Raiz S.A.S.',
    latitude: null,
    longitude: null,
    visitTypes: ['presencial'],
  };
  return {
    inmueble: { ...base, id: 'p-1' },
    otros: [
      { ...base, id: 'p-2', title: 'Apartamento en Laureles' },
      { ...base, id: 'p-3', title: 'Casa en Itagüí' },
      { ...base, id: 'p-4', title: 'Apartamento en Envigado', agencyId: 'ag-2', agencyName: 'Otra' },
    ],
  };
});

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, hasActiveAgencyMembership: false }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/propiedades/p-1',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/api/visits.service', () => ({
  visitsApi: { getSlots: vi.fn().mockResolvedValue({ slots: [] }), create: vi.fn() },
}));
vi.mock('@/lib/api/messages.service', () => ({ messagesApi: { createPropertyInquiry: vi.fn() } }));
vi.mock('@/lib/hooks/useProperties', () => ({
  useProperty: () => ({ property: inmueble, isLoading: false, error: null }),
  // Como el back: con `agencyId`, sólo los de esa inmobiliaria.
  useProperties: (f: { agencyId?: string }) => ({
    properties: f?.agencyId ? otros.filter((o) => o.agencyId === f.agencyId) : otros,
    isLoading: false,
    error: null,
  }),
}));
vi.mock('@/lib/hooks/useWishlist', () => ({
  useWishlist: () => ({ isWishlisted: () => false, toggleWishlist: vi.fn() }),
}));
vi.mock('@/lib/hooks/use-aprobacion', () => ({
  useAprobacion: () => ({ aprobacion: null, vigente: false, cargando: false }),
}));
vi.mock('@/lib/marketplace/use-inmobiliarias', async (importOriginal) => {
  const real = await importOriginal<Record<string, unknown>>();
  return { ...real, useTarjetasDeInmobiliarias: () => new Map() };
});
vi.mock('@/lib/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/api/client')>();
  return {
    ...real,
    apiClient: {
      ...real.apiClient,
      get: vi.fn().mockResolvedValue({
        canonCop: 5_000_000,
        administracionCop: 0,
        servicios: { acueductoCop: 120_000, energiaCop: 150_000, gasCop: 25_000, internetCop: 85_000, supuestos: '' },
        totalCop: 5_380_000,
        fuente: 'ia',
        motivo: null,
      }),
    },
  };
});

import { PropertyDetailView } from './PropertyDetailView';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let contenedor: HTMLDivElement;
let root: Root;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
});

async function montar() {
  await act(async () => {
    root.render(<PropertyDetailView propertyId="p-1" />);
  });
  // La dona pide su costo al montar: dejar que la promesa resuelva.
  await act(async () => {
    await Promise.resolve();
  });
}

const hay = (testid: string) => contenedor.querySelector(`[data-testid="${testid}"]`);

describe('<PropertyDetailView> — la ficha con el diseño nuevo (ronda 30)', () => {
  it('pinta cada sección de la ficha con sus datos reales', async () => {
    await montar();
    expect(contenedor.querySelector('h1')?.textContent).toBe('Apartamento en Palmas, Medellín');
    for (const id of [
      'mosaico-de-fotos',
      'ver-todas-las-fotos',
      'total-al-mes',
      'datos-clave',
      'ofrecido-por',
      'te-podemos-arrendar',
      'lo-especial',
      'costos-del-arriendo',
      'pie-de-la-ficha',
      'mas-de-la-inmobiliaria',
      'similares-cerca',
      'cuanto-cuesta-vivir-aqui',
    ]) {
      expect(hay(id), id).not.toBeNull();
    }
    expect(hay('ver-todas-las-fotos')?.textContent).toContain('Ver las 6 fotos');
  });

  it('«Más de la inmobiliaria» trae sus flechas y su tira de tarjetas', async () => {
    await montar();
    const mas = hay('mas-de-la-inmobiliaria')!;
    expect(mas.querySelector('[aria-label="Ver los anteriores"]')).not.toBeNull();
    expect(mas.querySelector('[aria-label="Ver los siguientes"]')).not.toBeNull();
    // Sólo los de la misma inmobiliaria, sin el inmueble que se está viendo.
    expect(mas.textContent).toContain('Apartamento en Laureles');
    expect(mas.textContent).not.toContain('Apartamento en Envigado');
  });

  it('«¿Te podemos arrendar?» es el momento de medianoche: tokens oscuros adentro', async () => {
    await montar();
    const tpa = hay('te-podemos-arrendar')!;
    expect(tpa.className).toContain('dark');
    expect(tpa.className).not.toMatch(/\bshadow/);
  });

  it('no vuelve lo que la identidad saca: letra de 9 a 11 px, vidrio ni sombras', async () => {
    await montar();
    // Las tarjetas de las tiras son las del marketplace (PropertyCard, pieza
    // compartida): se miran en sus propias pruebas, no aquí.
    for (const id of ['mas-de-la-inmobiliaria', 'similares-cerca']) hay(id)?.remove();
    const html = contenedor.innerHTML;
    expect(html).not.toMatch(/text-\[(9|10|11)px\]/);
    expect(html).not.toMatch(/backdrop-blur/);
    expect(html).not.toMatch(/\bshadow-(sm|md|lg|xl)\b/);
  });
});
