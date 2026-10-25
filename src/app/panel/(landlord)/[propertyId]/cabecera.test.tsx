/**
 * GLOW UP (21-10-2026): el inmueble del propietario independiente abre con el
 * encabezado común (la foto al lado), no con una portada de vidrio esmerilado
 * que además repetía las cifras de candidatos de las tarjetas y las pestañas.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, Suspense } from 'react';

const { datos } = vi.hoisted(() => ({
  datos: { contratos: [] as Array<Record<string, unknown>> },
}));

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/panel/p1',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/hooks/useSubscription', () => ({ useMySubscription: () => ({ subscription: null }) }));
vi.mock('@/lib/hooks/useLandlord', () => ({
  useLandlordProperty: () => ({
    property: {
      id: 'p1',
      title: 'Apartamento en Laureles',
      neighborhood: 'Laureles',
      city: 'Medellín',
      monthlyRent: 2_350_000,
      thumbnail: null,
      images: [],
    },
    isLoading: false,
    errorCrudo: null,
    refetch: vi.fn(),
  }),
  useCandidates: () => ({ candidates: [], isLoading: false, errorCrudo: null, refetch: vi.fn() }),
  useCandidate: () => ({ candidate: null, isLoading: false }),
  useCandidateDecision: () => ({ decide: vi.fn() }),
  mensajeDelFalloAlDecidir: () => '',
}));
vi.mock('@/lib/hooks/useDocuments', () => ({ useCandidateDocuments: () => ({ documents: [], isLoading: false }) }));
vi.mock('@/lib/hooks/useVisits', () => ({ useVisits: () => ({ getForProperty: () => [] }) }));
vi.mock('@/lib/hooks/useContracts', () => ({ useContracts: () => ({ getForProperty: () => datos.contratos }) }));
vi.mock('@/components/panel/AvailabilityScheduleEditor', () => ({ AvailabilityScheduleEditor: () => null }));

import PropertyCandidatesPage from './page';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

async function montar() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  const params = Promise.resolve({ propertyId: 'p1' });
  await act(async () => {
    root!.render(
      <Suspense fallback={null}>
        <PropertyCandidatesPage params={params} />
      </Suspense>,
    );
  });
  await act(async () => {
    await params;
  });
}

const $ = (testid: string) => document.querySelector(`[data-testid="${testid}"]`);

beforeEach(() => {
  datos.contratos = [];
  document.body.innerHTML = '';
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  document.body.innerHTML = '';
});

describe('El inmueble del propietario independiente — la cabecera', () => {
  it('el encabezado común: título, barrio y canon, sin vidrio esmerilado', async () => {
    await montar();
    const cabecera = $('cabecera-del-inmueble');
    expect(cabecera?.querySelector('h1')?.textContent).toBe('Apartamento en Laureles');
    expect(cabecera?.textContent).toContain('Laureles');
    expect($('canon-del-inmueble')?.textContent).toContain('/mes');
    expect(cabecera?.innerHTML).not.toContain('backdrop-blur');
  });

  it('arrendado lo dice al lado del título', async () => {
    datos.contratos = [{ id: 'k1', status: 'active', startDate: '2026-01-10', endDate: '2027-01-09', tenantName: 'Ana Pérez', tenantEmail: 'ana@correo.co' }];
    await montar();
    expect($('inmueble-arrendado')?.textContent).toBe('Arrendado');
  });

  it('libre, no inventa un estado', async () => {
    await montar();
    expect($('inmueble-arrendado')).toBeNull();
  });
});
