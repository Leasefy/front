/**
 * page.test.tsx — consignacion detail page wires the property's real photo
 * and opens the public ficha from "Ver en Portal".
 *
 * T-0022 WU-1: the page used to read `consignacion.propertyThumbnail` (never
 * populated by the back) and fire a "coming soon" toast on "Ver en Portal".
 * It now fetches the Property via `useProperty(consignacion.propertyId)` and
 * routes to `/propiedades/:propertyId` in a new tab. `ConsignacionHeader` is
 * mocked here — its own thumbnail/disabled-state contract is covered by
 * ConsignacionHeader.test.tsx; this file only checks the wiring between the
 * page and that contract.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Consignacion } from '@/lib/types/inmobiliaria';
import type { Property } from '@/lib/types/property';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { useConsignacionMock, usePropietarioMock, useAgenteMock, usePropertyMock } = vi.hoisted(() => ({
  useConsignacionMock: vi.fn(),
  usePropietarioMock: vi.fn(),
  useAgenteMock: vi.fn(),
  usePropertyMock: vi.fn(),
}));

// `?editar=1` (el «Editar» del kebab de la lista) abre el formulario: el test
// controla la query con `queryDePrueba`.
const queryDePrueba = { editar: null as string | null };
const routerReplaceMock = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'consig-1' }),
  useRouter: () => ({ push: vi.fn(), replace: routerReplaceMock }),
  useSearchParams: () => ({ get: (k: string) => (k === 'editar' ? queryDePrueba.editar : null) }),
}));

// El formulario de edición tiene su propio test; acá sólo importa que el modal
// se abra. (Usa `formatCurrency` del i18n, que este mock no trae.)
vi.mock('@/components/inmobiliaria/ConsignacionEditForm', () => ({
  ConsignacionEditForm: () => <div data-testid="edit-form-stub" />,
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, formatDate: (d: string) => d }),
}));

vi.mock('sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_target, tag: string) =>
        ({ children, initial, animate, exit, transition, ...rest }: Record<string, unknown> & { children?: React.ReactNode }) =>
          React.createElement(tag, rest, children),
    },
  ),
}));

vi.mock('@/components/providers/SmoothScroll', () => ({
  useLenis: () => ({ stop: vi.fn(), start: vi.fn() }),
}));

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}));

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useConsignacion: (...args: unknown[]) => useConsignacionMock(...args),
  usePropietario: (...args: unknown[]) => usePropietarioMock(...args),
  useAgente: (...args: unknown[]) => useAgenteMock(...args),
  // La página resuelve el agente del mandato con este hook (busca por
  // userId O por id de miembro); acá no se prueba eso, pero sin el export
  // el mock del módulo tumba el render entero.
  useAgenteDeConsignacion: () => ({ agente: undefined, isLoading: false, error: null }),
  // <AsignarAgente> pide la lista para el selector; vacía basta acá.
  useAgentes: () => ({ agentes: [], isLoading: false, error: null, errorCrudo: null, refetch: async () => {} }),
}));

vi.mock('@/lib/hooks/useProperties', () => ({
  useProperty: (...args: unknown[]) => usePropertyMock(...args),
}));

vi.mock('@/components/inmobiliaria/ConsignacionHeader', () => ({
  ConsignacionHeader: ({
    propertyThumbnailUrl,
    onViewPortal,
  }: {
    propertyThumbnailUrl?: string;
    onViewPortal?: () => void;
  }) =>
    React.createElement('button', {
      'data-testid': 'view-portal-stub',
      'data-thumbnail': propertyThumbnailUrl ?? '',
      onClick: onViewPortal,
    }),
}));

vi.mock('@/components/inmobiliaria/ConsignacionDetailSections', () => ({
  PropertyInfoSection: () => null,
  PropietarioSection: () => null,
  AgenteSection: () => null,
  CurrentLeaseSection: () => null,
  DocumentsSection: () => null,
}));

vi.mock('@/components/inmobiliaria/ActaEntregaView', () => ({
  ActaEntregaView: () => null,
}));

vi.mock('@/components/inmobiliaria/ConsignacionTimeline', () => ({
  ConsignacionTimeline: () => null,
}));

vi.mock('@/components/inmobiliaria/agenda/PedirCitaModal', () => ({
  PedirCitaModal: () => null,
}));

import ConsignacionDetailPage from './page';

const BASE_CONSIGNACION: Consignacion = {
  id: 'consig-1',
  propertyId: 'prop-1',
  propietarioId: 'own-1',
  // Un solo dueño al 100 % — la forma que dejó el backfill de la migración.
  copropietarios: [{ propietarioId: 'own-1', participacionBps: 10000 }],
  agenteId: 'agent-1',
  propertyTitle: 'Apto Chapinero',
  propertyAddress: 'Cra 1 # 2-3',
  propertyCity: 'Bogotá',
  propertyZone: 'Chapinero',
  propertyType: 'apartment',
  monthlyRent: 2000000,
  commissionPercent: 10,
  listingType: 'rent',
  saleCommissionPercent: null,
  propertyCode: null,
  contractDate: '2026-01-01',
  status: 'active',
  availability: 'available',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const BASE_PROPERTY = { thumbnailUrl: 'https://cdn.test/foto.jpg' } as unknown as Property;

let container: HTMLDivElement;
let root: Root;
let openSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  usePropietarioMock.mockReturnValue({ propietario: undefined });
  useAgenteMock.mockReturnValue({ agente: undefined });
  usePropertyMock.mockReturnValue({ property: BASE_PROPERTY, isLoading: false, error: null, errorCrudo: null });
  openSpy = vi.fn();
  vi.stubGlobal('open', openSpy);
});

afterEach(() => {
  act(() => { root.unmount(); });
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderPage() {
  act(() => { root.render(<ConsignacionDetailPage />); });
}

describe('<ConsignacionDetailPage> — property photo wiring', () => {
  it('fetches the property by consignacion.propertyId and forwards its thumbnail to the header', () => {
    useConsignacionMock.mockReturnValue({ consignacion: BASE_CONSIGNACION });
    renderPage();

    expect(usePropertyMock).toHaveBeenCalledWith('prop-1');
    const stub = container.querySelector('[data-testid="view-portal-stub"]');
    expect(stub?.getAttribute('data-thumbnail')).toBe('https://cdn.test/foto.jpg');
  });
});

describe('<ConsignacionDetailPage> — Ver en Portal', () => {
  it('opens the public ficha for the property in a new tab', () => {
    useConsignacionMock.mockReturnValue({ consignacion: BASE_CONSIGNACION });
    renderPage();

    const stub = container.querySelector('[data-testid="view-portal-stub"]') as HTMLButtonElement;
    act(() => { stub.click(); });

    expect(openSpy).toHaveBeenCalledWith('/propiedades/prop-1', '_blank', 'noopener,noreferrer');
  });

  it('does not navigate when the consignacion has no propertyId', () => {
    useConsignacionMock.mockReturnValue({ consignacion: { ...BASE_CONSIGNACION, propertyId: '' } });
    renderPage();

    const stub = container.querySelector('[data-testid="view-portal-stub"]') as HTMLButtonElement;
    act(() => { stub.click(); });

    expect(openSpy).not.toHaveBeenCalled();
  });
});

describe('<ConsignacionDetailPage> — ?editar=1 abre el formulario (Nico, 2026-09-03)', () => {
  // «Le doy en editar en el kebab y me lleva es a ver el detalle y no me abre
  // el modal»: la lista ahora navega con `?editar=1` y la ficha lo abre sola.
  afterEach(() => {
    queryDePrueba.editar = null;
    routerReplaceMock.mockReset();
  });

  it('con ?editar=1 y datos cargados, el modal de edición ya está abierto y la URL se limpia', () => {
    queryDePrueba.editar = '1';
    useConsignacionMock.mockReturnValue({ consignacion: BASE_CONSIGNACION });
    renderPage();

    expect(document.body.querySelector('[data-testid="modal-ficha"]')).not.toBeNull();
    expect(document.body.querySelector('[data-testid="edit-form-stub"]')).not.toBeNull();
    expect(routerReplaceMock).toHaveBeenCalledWith('/panel/inmobiliaria/inmuebles/consig-1', { scroll: false });
  });

  it('sin la query el modal no aparece solo', () => {
    useConsignacionMock.mockReturnValue({ consignacion: BASE_CONSIGNACION });
    renderPage();
    expect(document.body.querySelector('[data-testid="modal-ficha"]')).toBeNull();
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });
});

describe('<ConsignacionDetailPage> — mientras carga', () => {
  // Nico (2026-09-02): «cuando uno le da clic a un inmueble primero sale
  // "Consignación no encontrada" y luego carga, muy raro». La página no
  // miraba `isLoading`: sin dato = no encontrada, aunque todavía no hubiera
  // llegado la respuesta.
  it('muestra un esqueleto y NO «no encontrada» mientras la consignación se pide', () => {
    useConsignacionMock.mockReturnValue({ consignacion: null, isLoading: true });
    renderPage();

    expect(container.querySelector('[data-testid="ficha-cargando"]')).not.toBeNull();
    expect(container.textContent).not.toContain('inmobiliaria.portafolio.detail.notFound');
  });

  it('«no encontrada» sólo cuando ya respondió y no hay consignación', () => {
    useConsignacionMock.mockReturnValue({ consignacion: null, isLoading: false });
    renderPage();

    expect(container.querySelector('[data-testid="ficha-cargando"]')).toBeNull();
    expect(container.textContent).toContain('inmobiliaria.portafolio.detail.notFound');
  });
});
