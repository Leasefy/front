/**
 * El pipeline con sus cuatro estados, los dos vacíos y los permisos.
 *
 * El bug (P1, P0): `usePipelineItems` con el back caído devolvía `[]` y la
 * página lo pintaba como un tablero sin leads —seis columnas «Arrastra aquí»—
 * con los KPIs en 0. «No sé» no es cero.
 * P2/P3: sin leads no había cómo empezar, y filtrar a cero se veía igual.
 * P6: al borrar el último lead quedaba de fantasma.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { PipelineItem, PipelineStage } from '@/lib/types/inmobiliaria';
import type { PipelineFiltersState } from '@/components/inmobiliaria';
import { ApiError } from '@/lib/api/client';

const { datos, permisos } = vi.hoisted(() => ({
  datos: {
    items: [] as PipelineItem[],
    isLoading: false,
    errorCrudo: null as unknown,
    refetch: (() => Promise.resolve(null)) as () => Promise<unknown>,
  },
  permisos: { edit: true, create: true },
}));

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}));
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({
    isLoading: false,
    canAccess: (modulo: string, accion: string) =>
      modulo === 'pipeline' && (accion === 'edit' ? permisos.edit : accion === 'create' ? permisos.create : true),
  }),
}));
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  usePipelineItems: () => ({
    pipelineItems: datos.items,
    isLoading: datos.isLoading,
    errorCrudo: datos.errorCrudo,
    refetch: datos.refetch,
  }),
  useAgentes: () => ({ agentes: [] }),
  useConsignaciones: () => ({ consignaciones: [] }),
  pipelineApi: { moveStage: vi.fn(async () => undefined) },
}));
vi.mock('@/components/inmobiliaria/NuevoLeadDialog', () => ({
  NuevoLeadDialog: ({ abierto }: { abierto: boolean }) =>
    abierto ? <div data-testid="nuevo-lead-dialog" /> : null,
}));
vi.mock('@/components/inmobiliaria', () => ({
  PipelineBoard: ({ items, puedeMover }: { items: PipelineItem[]; puedeMover?: boolean }) => (
    <div data-testid="board" data-items={items.length} data-puede-mover={String(puedeMover)} />
  ),
  PipelineFilters: ({ onFilterChange }: { onFilterChange: (f: PipelineFiltersState) => void }) => (
    <button type="button" data-testid="poner-filtro" onClick={() => onFilterChange({ search: 'nadie-se-llama-asi' })} />
  ),
  PipelineDetail: ({ puedeEditar }: { puedeEditar?: boolean }) => (
    <div data-testid="detail" data-puede-editar={String(puedeEditar)} />
  ),
}));

import PipelinePage from './page';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function lead(id: string, stage: PipelineStage = 'lead'): PipelineItem {
  return {
    id,
    consignacionId: 'c-1',
    propertyId: 'p-1',
    candidateId: `cand-${id}`,
    agenteId: 'a-1',
    propertyTitle: 'Apto 402',
    propertyAddress: 'Calle 1 #2-3',
    monthlyRent: 2_500_000,
    candidateName: `Candidato ${id}`,
    candidateEmail: `${id}@ejemplo.co`,
    candidatePhone: '3000000000',
    stage,
    enteredStageAt: '2026-09-01T10:00:00.000Z',
    daysInStage: 1,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
  };
}

let root: Root | null = null;
let contenedor: HTMLDivElement;

async function pintar() {
  await act(async () => {
    root!.render(<PipelinePage />);
  });
}

const $ = (sel: string) => contenedor.querySelector(sel);
const estadosDeLosTiles = () =>
  Array.from(contenedor.querySelectorAll('[data-testid="kpi-valor"]')).map((el) => el.getAttribute('data-estado'));

beforeEach(() => {
  datos.items = [];
  datos.isLoading = false;
  datos.errorCrudo = null;
  datos.refetch = vi.fn(() => Promise.resolve(null));
  permisos.edit = true;
  permisos.create = true;
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
});

afterEach(async () => {
  await act(async () => {
    root!.unmount();
  });
  root = null;
  contenedor.remove();
});

describe('Pipeline — fallo de carga (P1)', () => {
  it('con el back caído dice que no se pudo cargar, NUNCA un tablero vacío con KPIs en 0', async () => {
    datos.errorCrudo = new ApiError(500, 'Internal server error');
    await pintar();

    expect($('[data-testid="fallo-de-carga"]')).not.toBeNull();
    expect($('[data-testid="board"]')).toBeNull();
    expect($('[data-testid="sin-datos"]')).toBeNull();
    const tiles = estadosDeLosTiles();
    expect(tiles).toHaveLength(4);
    expect(tiles.every((e) => e === 'fallo')).toBe(true);
    // Ni el contador «0 de 0 leads».
    expect(contenedor.textContent).not.toMatch(/0 de 0/);
  });

  it('un 500 se puede reintentar, y el reintento vuelve a pedir', async () => {
    datos.errorCrudo = new ApiError(500, 'Internal server error');
    await pintar();

    const reintentar = $('[data-testid="reintentar"]') as HTMLButtonElement | null;
    expect(reintentar).not.toBeNull();
    await act(async () => {
      reintentar!.click();
    });
    expect(datos.refetch).toHaveBeenCalled();
  });

  it('un 403 no ofrece reintentar: no se va a arreglar solo', async () => {
    datos.errorCrudo = new ApiError(403, 'Forbidden');
    await pintar();

    expect($('[data-testid="fallo-de-carga"]')).not.toBeNull();
    expect($('[data-testid="reintentar"]')).toBeNull();
  });

  it('mientras carga, los tiles son un hueco (no un 0) y no hay tablero ni vacío', async () => {
    datos.isLoading = true;
    await pintar();

    expect(estadosDeLosTiles().every((e) => e === 'cargando')).toBe(true);
    expect($('[data-testid="board"]')).toBeNull();
    expect($('[data-testid="sin-datos"]')).toBeNull();
  });

  it('un refresco que falla DESPUÉS de mostrar el tablero no lo borra', async () => {
    datos.items = [lead('1')];
    await pintar();
    expect($('[data-testid="board"]')).not.toBeNull();

    datos.errorCrudo = new ApiError(500, 'Internal server error');
    await pintar();

    expect($('[data-testid="board"]')).not.toBeNull();
    expect($('[data-testid="fallo-de-carga"]')).toBeNull();
    expect(estadosDeLosTiles().every((e) => e === 'ok')).toBe(true);
  });
});

describe('Pipeline — los dos vacíos (P2/P3)', () => {
  it('sin leads invita a cargar el primero, y el botón abre el diálogo', async () => {
    await pintar();

    const vacio = $('[data-testid="sin-datos"]');
    expect(vacio?.getAttribute('data-caso')).toBe('vacio');
    const crear = Array.from(vacio!.querySelectorAll('button')).find((b) => b.textContent?.includes('Nuevo lead'));
    expect(crear).toBeDefined();

    await act(async () => {
      crear!.click();
    });
    expect($('[data-testid="nuevo-lead-dialog"]')).not.toBeNull();
  });

  it('filtrar a cero NO es «no hay leads»: ofrece quitar los filtros y vuelve a mostrar todo', async () => {
    datos.items = [lead('1')];
    await pintar();
    expect($('[data-testid="board"]')).not.toBeNull();

    await act(async () => {
      ($('[data-testid="poner-filtro"]') as HTMLButtonElement).click();
    });

    const vacio = $('[data-testid="sin-datos"]');
    expect(vacio?.getAttribute('data-caso')).toBe('filtros');
    const quitar = vacio!.querySelector('button') as HTMLButtonElement;
    expect(quitar).not.toBeNull();

    await act(async () => {
      quitar.click();
    });
    expect($('[data-testid="board"]')?.getAttribute('data-items')).toBe('1');
  });
});

describe('Pipeline — el último lead borrado no queda de fantasma (P6)', () => {
  it('si el back pasa de 1 lead a ninguno, el tablero lo refleja', async () => {
    datos.items = [lead('1')];
    await pintar();
    expect($('[data-testid="board"]')?.getAttribute('data-items')).toBe('1');

    datos.items = [];
    await pintar();

    expect($('[data-testid="board"]')).toBeNull();
    expect($('[data-testid="sin-datos"]')?.getAttribute('data-caso')).toBe('vacio');
  });
});

describe('Pipeline — «cerrados este mes» (P7)', () => {
  it('cuenta por cuándo ENTRÓ a Cerrado, no por la última edición', async () => {
    const haceDosMeses = new Date();
    haceDosMeses.setMonth(haceDosMeses.getMonth() - 2);
    const cerradoViejoConNotaDeHoy: PipelineItem = {
      ...lead('1', 'completed'),
      enteredStageAt: haceDosMeses.toISOString(),
      updatedAt: new Date().toISOString(),
    };
    datos.items = [cerradoViejoConNotaDeHoy];
    await pintar();

    const rotulo = Array.from(contenedor.querySelectorAll<HTMLElement>('div')).find(
      (el) => el.textContent?.trim() === 'Cerrados este mes',
    );
    expect(rotulo?.nextElementSibling?.textContent?.trim()).toBe('0');
  });
});

describe('Pipeline — permisos', () => {
  it('sin `pipeline:create` no hay «Nuevo lead» en la cabecera ni en el vacío', async () => {
    permisos.create = false;
    await pintar();

    expect($('[data-testid="pipeline-nuevo-lead"]')).toBeNull();
    const vacio = $('[data-testid="sin-datos"]');
    expect(vacio).not.toBeNull();
    expect(vacio!.querySelector('button')).toBeNull();
  });

  it('con `pipeline:create` la cabecera ofrece «Nuevo lead»', async () => {
    datos.items = [lead('1')];
    await pintar();
    expect($('[data-testid="pipeline-nuevo-lead"]')).not.toBeNull();
  });

  it('sin `pipeline:edit` el tablero no arrastra y el cajón no mueve', async () => {
    permisos.edit = false;
    datos.items = [lead('1')];
    await pintar();

    expect($('[data-testid="board"]')?.getAttribute('data-puede-mover')).toBe('false');
    expect($('[data-testid="detail"]')?.getAttribute('data-puede-editar')).toBe('false');
  });
});
