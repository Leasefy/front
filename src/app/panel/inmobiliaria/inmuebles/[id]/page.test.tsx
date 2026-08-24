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

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'consig-1' }),
  useRouter: () => ({ push: vi.fn() }),
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
  agenteId: 'agent-1',
  propertyTitle: 'Apto Chapinero',
  propertyAddress: 'Cra 1 # 2-3',
  propertyCity: 'Bogotá',
  propertyZone: 'Chapinero',
  propertyType: 'apartment',
  monthlyRent: 2000000,
  commissionPercent: 10,
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
