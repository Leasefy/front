/**
 * StepConfirmImport.test.tsx — T-0038 WU-6, wu-4-report.md §6.
 *
 * The core behavior change: this step used to fan out client-side to
 * `POST /properties`, one call per row (`EN_PARALELO = 6`) — closing the
 * tab mid-import lost the whole batch. It now stages the batch durably
 * (`preparar`), polls a bounded convenience while LISTO is pending, and
 * lets the agency review/activate whenever they choose.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { ImportWizardState } from '../lib/importTypes';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, params?: Record<string, unknown>) => (params ? `${k}::${JSON.stringify(params)}` : k),
    locale: 'es',
  }),
}));

const { pushMock, searchParamsState } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  searchParamsState: { lote: null as string | null },
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: (k: string) => (k === 'lote' ? searchParamsState.lote : null) }),
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const { geocodeImportRowMock } = vi.hoisted(() => ({ geocodeImportRowMock: vi.fn() }));
vi.mock('../lib/geocodeImportRow', () => ({
  GEOCODE_ROW_DELAY_MS: 1,
  geocodeImportRow: (...args: unknown[]) => geocodeImportRowMock(...args),
}));

const { inmueblesImportacionApiMock } = vi.hoisted(() => ({
  inmueblesImportacionApiMock: {
    preparar: vi.fn(),
    filas: vi.fn(),
    resumen: vi.fn(),
    resolver: vi.fn(),
    resolverMasivo: vi.fn(),
    descartarFila: vi.fn(),
    descartarLote: vi.fn(),
    activar: vi.fn(),
  },
}));
vi.mock('@/lib/api/inmuebles-importacion.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/inmuebles-importacion.service')>(
    '@/lib/api/inmuebles-importacion.service',
  );
  return { ...actual, inmueblesImportacionApi: inmueblesImportacionApiMock };
});

const { estadoLoteState } = vi.hoisted(() => ({
  estadoLoteState: { estado: null as unknown, agotado: false },
}));
vi.mock('@/lib/hooks/use-estado-de-lote-inmuebles', () => ({
  useEstadoDeLoteInmuebles: () => estadoLoteState,
}));

import { StepConfirmImport } from './StepConfirmImport';
import { RanuraDelPie } from '../ImportWizard';
import { ApiError } from '@/lib/api/client';
import type { ImportProperty } from '../lib/importTypes';

function makeProperty(overrides: Partial<ImportProperty> = {}): ImportProperty {
  return {
    _rowIndex: 0,
    propertyTitle: 'Depto Chicó',
    propertyAddress: 'Cra 11 #94-45',
    propertyCity: 'Bogotá',
    propertyZone: 'Chicó',
    propertyType: 'apartment',
    monthlyRent: 2_500_000,
    bathrooms: 1,
    bedrooms: 2,
    propertyArea: 40,
    suggestions: [],
    selected: true,
    hasErrors: false,
    errorMessages: [],
    ...overrides,
  };
}

function baseState(overrides: Partial<ImportWizardState> = {}): ImportWizardState {
  return {
    method: 'excel',
    file: null,
    fileName: 'inmuebles.xlsx',
    enlacesPegados: '',
    rawRows: [],
    headers: [],
    sheetNames: [],
    selectedSheet: '',
    columnMappings: [],
    properties: [makeProperty()],
    aiAnalyzed: true,
    importProgress: 0,
    importedCount: 0,
    ...overrides,
  };
}

let container: HTMLDivElement;
let root: Root;
let updateState: (partial: Partial<ImportWizardState>) => void;

beforeEach(() => {
  vi.useFakeTimers();
  pushMock.mockClear();
  searchParamsState.lote = null;
  estadoLoteState.estado = null;
  estadoLoteState.agotado = false;
  geocodeImportRowMock.mockReset().mockResolvedValue({ lat: 4.6, lng: -74.1, source: 'geocoded' });
  Object.values(inmueblesImportacionApiMock).forEach((fn) => fn.mockReset());
  updateState = vi.fn();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function render(state: ImportWizardState) {
  act(() => {
    root.render(
      React.createElement(
        RanuraDelPie.Provider,
        { value: null },
        React.createElement(StepConfirmImport, { state, updateState }),
      ),
    );
  });
}

function findButtonByText(text: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes(text));
}

describe('<StepConfirmImport> — pre-import summary (no lote yet)', () => {
  it('shows the property count and an enabled import button', () => {
    render(baseState());
    expect(container.textContent).toContain('1');
    const btn = findButtonByText('inmobiliaria.import.confirm.importButton');
    expect(btn).toBeTruthy();
    expect(btn?.disabled).toBe(false);
  });
});

describe('<StepConfirmImport> — preparar() replaces the client-side POST /properties fan-out', () => {
  async function clickImportar() {
    const btn = findButtonByText('inmobiliaria.import.confirm.importButton')!;
    await act(async () => {
      btn.click();
    });
    // Drain the geocode delay + microtasks.
    await act(async () => {
      await vi.runAllTimersAsync();
    });
  }

  it('geocodes every importable row, then calls preparar() with the resulting DTOs — never POST /properties per row', async () => {
    inmueblesImportacionApiMock.preparar.mockResolvedValue({
      lote: 'lote-1', estado: 'ENCOLADO', total: 1, procesadas: 0, pendientes: 0,
      listos: 0, activados: 0, descartados: 0, jobId: 'job-1', error: null, creadoEn: '2026-08-29T00:00:00.000Z',
    });
    render(baseState());
    await clickImportar();

    expect(geocodeImportRowMock).toHaveBeenCalledTimes(1);
    expect(inmueblesImportacionApiMock.preparar).toHaveBeenCalledTimes(1);
    const [dtos] = inmueblesImportacionApiMock.preparar.mock.calls[0];
    expect(dtos).toHaveLength(1);
    // The wire names and casing are frozen (contract-addendum-3.md §3.1.1,
    // §3.4). This assertion is deliberately about the KEYS, not just the
    // values: the previous version checked only `title` and the coordinates,
    // so it stayed green while the payload carried `propertyType` and every
    // `preparar()` returned 400. It still is not proof on its own — the
    // client is mocked here — the proof is `back`'s
    // `importacion-contrato-wire.spec.ts`.
    expect(dtos[0]).toMatchObject({
      title: 'Depto Chicó',
      type: 'APARTMENT',
      latitude: 4.6,
      longitude: -74.1,
    });
    expect('propertyType' in dtos[0]).toBe(false);
  });

  it('shows the "still processing" screen while ENCOLADO/PROCESANDO, never claims completion', async () => {
    inmueblesImportacionApiMock.preparar.mockResolvedValue({
      lote: 'lote-1', estado: 'ENCOLADO', total: 1, procesadas: 0, pendientes: 0,
      listos: 0, activados: 0, descartados: 0, jobId: 'job-1', error: null, creadoEn: '2026-08-29T00:00:00.000Z',
    });
    estadoLoteState.estado = { estado: 'PROCESANDO', total: 1, procesadas: 0 };
    render(baseState());
    await clickImportar();

    expect(container.textContent).toContain('Podés cerrar esta pestaña');
    expect(container.textContent).not.toContain('¡Importación completada!');
  });

  it('surfaces a preparar() failure without silently retrying', async () => {
    inmueblesImportacionApiMock.preparar.mockRejectedValue(new ApiError(400, 'Lote inválido'));
    render(baseState());
    await clickImportar();

    expect(container.textContent).toContain('Lote inválido');
  });
});

describe('<StepConfirmImport> — the review screen once LISTO', () => {
  beforeEach(() => {
    searchParamsState.lote = 'lote-1';
    estadoLoteState.estado = {
      lote: 'lote-1', estado: 'LISTO', total: 2, procesadas: 2,
      pendientes: 1, listos: 1, activados: 0, descartados: 0,
    };
    inmueblesImportacionApiMock.resumen.mockResolvedValue({
      lote: 'lote-1', total: 2, pendientes: 1, listos: 1, activados: 0, descartados: 0,
    });
    inmueblesImportacionApiMock.filas.mockResolvedValue({
      filas: [
        {
          id: 'fila-1', lote: 'lote-1', fila: 1, estado: 'PENDIENTE',
          faltantes: ['canon', 'tipo_de_negocio'], overrides: [], candidatos: [],
          propertyId: null, datos: { title: 'Casa sin canon', address: 'Calle 2', city: 'Medellín' },
        },
      ],
      total: 1, pagina: 1, porPagina: 25,
    });
  });

  it('resumes from the ?lote= URL param (the PROPERTY_IMPORT_COMPLETED notification actionUrl)', async () => {
    render(baseState());
    await act(async () => {
      await Promise.resolve();
    });
    expect(inmueblesImportacionApiMock.resumen).toHaveBeenCalledWith('lote-1');
    expect(container.textContent).toContain('Casa sin canon');
  });

  it('surfaces the faltantes vocabulary as readable labels, including an unrecognised one as a generic message', async () => {
    inmueblesImportacionApiMock.filas.mockResolvedValue({
      filas: [
        {
          id: 'fila-1', lote: 'lote-1', fila: 1, estado: 'PENDIENTE',
          faltantes: ['canon', 'algo_nuevo_del_back'], overrides: [], candidatos: [],
          propertyId: null, datos: { title: 'Casa X' },
        },
      ],
      total: 1, pagina: 1, porPagina: 25,
    });
    render(baseState());
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toContain('canon mensual');
    expect(container.textContent).toContain('falta un dato');
  });

  it('discarding a row calls descartarFila and refreshes the list', async () => {
    render(baseState());
    await act(async () => {
      await Promise.resolve();
    });
    inmueblesImportacionApiMock.descartarFila.mockResolvedValue({});
    inmueblesImportacionApiMock.filas.mockResolvedValueOnce({ filas: [], total: 0, pagina: 1, porPagina: 25 });

    const descartarBtn = container.querySelector('[aria-label="Descartar fila"]') as HTMLButtonElement;
    expect(descartarBtn).toBeTruthy();
    await act(async () => {
      descartarBtn.click();
      await Promise.resolve();
    });
    expect(inmueblesImportacionApiMock.descartarFila).toHaveBeenCalledWith('fila-1');
  });

  it('the Activar button is disabled when there are zero listos rows', async () => {
    inmueblesImportacionApiMock.resumen.mockResolvedValue({
      lote: 'lote-1', total: 1, pendientes: 1, listos: 0, activados: 0, descartados: 0,
    });
    render(baseState());
    await act(async () => {
      await Promise.resolve();
    });
    const activarBtn = findButtonByText('Activar');
    expect(activarBtn?.disabled).toBe(true);
  });

  it('Activar loops the resumable activation call and shows a partial-success summary when rows are omitted', async () => {
    inmueblesImportacionApiMock.resumen.mockResolvedValue({
      lote: 'lote-1', total: 2, pendientes: 0, listos: 2, activados: 0, descartados: 0,
    });
    inmueblesImportacionApiMock.activar
      .mockResolvedValueOnce({ lote: 'lote-1', activados: 1, omitidas: [{ id: 'f2', fila: 2, faltantes: ['canon'] }], restantes: 1 })
      .mockResolvedValueOnce({ lote: 'lote-1', activados: 0, omitidas: [], restantes: 0 });

    render(baseState());
    await act(async () => {
      await Promise.resolve();
    });

    const activarBtn = findButtonByText('Activar')!;
    await act(async () => {
      activarBtn.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(inmueblesImportacionApiMock.activar).toHaveBeenCalledTimes(2);
    expect(updateState).toHaveBeenCalledWith(expect.objectContaining({ importedCount: 1 }));
  });

  it('descartar lote surfaces 409 LOTE_EN_PROCESO as "wait", never retries silently or navigates away', async () => {
    inmueblesImportacionApiMock.descartarLote.mockRejectedValue(
      new ApiError(409, 'El lote todavía se está procesando.', 'LOTE_EN_PROCESO'),
    );
    render(baseState());
    await act(async () => {
      await Promise.resolve();
    });

    const descartarLoteBtn = findButtonByText('Descartar lote completo')!;
    await act(async () => {
      descartarLoteBtn.click();
      await Promise.resolve();
    });

    expect(inmueblesImportacionApiMock.descartarLote).toHaveBeenCalledTimes(1);
    expect(pushMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain('esperá a que termine');
  });
});
