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

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));

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
    estadoDeLote: vi.fn(),
    lotesAbiertos: vi.fn(),
  },
}));
vi.mock('@/lib/api/inmuebles-importacion.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/inmuebles-importacion.service')>(
    '@/lib/api/inmuebles-importacion.service',
  );
  return { ...actual, inmueblesImportacionApi: inmueblesImportacionApiMock };
});

const { inmobiliariaApiMock } = vi.hoisted(() => ({
  inmobiliariaApiMock: {
    getSinConsignacion: vi.fn(),
    propietariosGetAll: vi.fn(),
    agentesGetAll: vi.fn(),
  },
}));
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  inmueblesApi: { getSinConsignacion: (...a: unknown[]) => inmobiliariaApiMock.getSinConsignacion(...a) },
  propietariosApi: { getAll: (...a: unknown[]) => inmobiliariaApiMock.propietariosGetAll(...a) },
  agentesApi: { getAll: (...a: unknown[]) => inmobiliariaApiMock.agentesGetAll(...a) },
}));

// El diálogo real necesita AuthProvider; acá sólo importa SI se abre.
const { dialogoPropsMock } = vi.hoisted(() => ({ dialogoPropsMock: vi.fn() }));
vi.mock('../CompletarMandatosLoteDialog', () => ({
  CompletarMandatosLoteDialog: (props: { abierto?: boolean; inmuebles: unknown[] }) => {
    dialogoPropsMock(props);
    // El diálogo real ya no se saca del árbol para cerrarlo —así no había qué
    // animar al salir—: vive montado y `abierto` decide, con la lista vacía
    // como cerrado. El mock respeta lo mismo; si no, el test mediría el mock.
    const abierto = props.abierto !== false && props.inmuebles.length > 0;
    return abierto ? React.createElement('div', { 'data-testid': 'dialogo-propietario' }) : null;
  },
}));

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
  Object.values(toastMock).forEach((fn) => fn.mockClear());
  searchParamsState.lote = null;
  estadoLoteState.estado = null;
  estadoLoteState.agotado = false;
  geocodeImportRowMock.mockReset().mockResolvedValue({ lat: 4.6, lng: -74.1, source: 'geocoded' });
  Object.values(inmueblesImportacionApiMock).forEach((fn) => fn.mockReset());
  inmobiliariaApiMock.getSinConsignacion.mockReset().mockResolvedValue([]);
  inmobiliariaApiMock.propietariosGetAll.mockReset().mockResolvedValue([]);
  inmobiliariaApiMock.agentesGetAll.mockReset().mockResolvedValue([]);
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

function render(state: ImportWizardState, props: { onSalir?: () => void } = {}) {
  act(() => {
    root.render(
      React.createElement(
        RanuraDelPie.Provider,
        { value: null },
        React.createElement(StepConfirmImport, { state, updateState, ...props }),
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

    expect(container.textContent).toContain('Puedes cerrar esta pestaña');
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

  it('una activación cortada a mitad dice cuántas pasaron y que reintentar NO duplica', async () => {
    inmueblesImportacionApiMock.resumen.mockResolvedValue({
      lote: 'lote-1', total: 700, pendientes: 0, listos: 700, activados: 0, descartados: 0,
    });
    inmueblesImportacionApiMock.activar
      .mockResolvedValueOnce({ lote: 'lote-1', activados: 500, omitidas: [], restantes: 200 })
      .mockRejectedValueOnce(new Error('se cayó la red'));

    render(baseState());
    await act(async () => { await Promise.resolve(); });

    const activarBtn = findButtonByText('Activar')!;
    await act(async () => {
      activarBtn.click();
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    });

    // Ni «completada» ni un error mudo: el progreso y la salida, juntos.
    expect(container.textContent).not.toContain('¡Importación completada!');
    expect(container.textContent).toContain('500');
    expect(container.textContent).toContain('sigue donde quedó');
    // El resumen se refresca: las tandas que sí pasaron cuentan en las tarjetas.
    expect(inmueblesImportacionApiMock.resumen.mock.calls.length).toBeGreaterThanOrEqual(2);
    // Y el botón de Activar sigue ahí para reintentar.
    expect(findButtonByText('Activar')).toBeTruthy();
  });

  it('el techo del loop de activación NUNCA se reporta como «completada»', async () => {
    inmueblesImportacionApiMock.resumen.mockResolvedValue({
      lote: 'lote-1', total: 200, pendientes: 0, listos: 200, activados: 0, descartados: 0,
    });
    // Un back roto que siempre reporta restantes > 0: el loop corta en 100.
    inmueblesImportacionApiMock.activar.mockResolvedValue({
      lote: 'lote-1', activados: 1, omitidas: [], restantes: 1,
    });

    render(baseState());
    await act(async () => { await Promise.resolve(); });

    const activarBtn = findButtonByText('Activar')!;
    await act(async () => {
      activarBtn.click();
      for (let i = 0; i < 110; i++) await Promise.resolve();
    });

    expect(container.textContent).not.toContain('¡Importación completada!');
    expect(container.textContent).toContain('quedaron más por activar');
  });

  it('un 409 FILA_YA_ACTIVADA refresca la lista — la fila fantasma se va sola', async () => {
    inmueblesImportacionApiMock.filas.mockResolvedValue({
      filas: [
        {
          id: 'fila-1', lote: 'lote-1', fila: 1, estado: 'PENDIENTE',
          faltantes: ['posible_duplicado'], overrides: [],
          candidatos: [{ id: 'p1', code: 7, title: 'Casa 7', address: 'Calle 1', city: 'Bogotá' }],
          propertyId: null, datos: { title: 'Casa dup' },
        },
      ],
      total: 1, pagina: 1, porPagina: 25,
    });
    inmueblesImportacionApiMock.resolver.mockRejectedValue(
      new ApiError(409, 'ya activada', 'FILA_YA_ACTIVADA'),
    );

    render(baseState());
    await act(async () => { await Promise.resolve(); });

    const llamadasAntes = inmueblesImportacionApiMock.filas.mock.calls.length;
    const usarBtn = findButtonByText('Usar de todos modos')!;
    await act(async () => {
      usarBtn.click();
      await Promise.resolve(); await Promise.resolve();
    });

    expect(toastMock.error).toHaveBeenCalled();
    expect(inmueblesImportacionApiMock.filas.mock.calls.length).toBeGreaterThan(llamadasAntes);
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

describe('<StepConfirmImport> — recuperación de fallos del lote', () => {
  it('🔴 un lote FALLIDO tiene salida: preparar de nuevo, sin re-subir el archivo', async () => {
    searchParamsState.lote = 'lote-muerto';
    estadoLoteState.estado = {
      lote: 'lote-muerto', estado: 'FALLIDO', total: 1, procesadas: 0,
      pendientes: 0, listos: 0, activados: 0, descartados: 0, jobId: null,
      error: 'El proceso falló en el servidor.', creadoEn: '2026-09-01T00:00:00.000Z',
    };
    render(baseState());

    // El motivo del back se ve, y hay botón.
    expect(container.textContent).toContain('El proceso falló en el servidor.');
    const retry = container.querySelector('[data-testid="preparar-de-nuevo"]') as HTMLButtonElement;
    expect(retry).toBeTruthy();

    await act(async () => { retry.click(); });

    // Volvió al resumen con los datos vivos: el botón de importar está ahí.
    expect(findButtonByText('inmobiliaria.import.confirm.importButton')).toBeTruthy();
    // Y el lote muerto se soltó también del estado del wizard.
    expect(updateState).toHaveBeenCalledWith(expect.objectContaining({ loteRetomado: null }));
  });

  it('reintentar un preparar() caído reusa la MISMA clave de idempotencia', async () => {
    inmueblesImportacionApiMock.preparar
      .mockRejectedValueOnce(new ApiError(0, 'No pudimos conectarnos al servidor.'))
      .mockResolvedValueOnce({
        lote: 'lote-2', estado: 'ENCOLADO', total: 1, procesadas: 0, pendientes: 0,
        listos: 0, activados: 0, descartados: 0, jobId: 'j', error: null, creadoEn: '2026-09-01T00:00:00.000Z',
      });
    render(baseState());

    const btn = findButtonByText('inmobiliaria.import.confirm.importButton')!;
    await act(async () => { btn.click(); });
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(container.textContent).toContain('No pudimos conectarnos');

    await act(async () => { findButtonByText('inmobiliaria.import.confirm.importButton')!.click(); });
    await act(async () => { await vi.runAllTimersAsync(); });

    const claves = inmueblesImportacionApiMock.preparar.mock.calls.map((c) => c[1]);
    expect(claves).toHaveLength(2);
    // La clave identifica al INTENTO: dos clics del mismo intento no pueden
    // encolar dos lotes distintos con las mismas filas.
    expect(claves[0]).toBe(claves[1]);
  });

  it('el lote preparado se guarda en el estado del wizard: sobrevive a «Anterior»', async () => {
    inmueblesImportacionApiMock.preparar.mockResolvedValue({
      lote: 'lote-9', estado: 'ENCOLADO', total: 1, procesadas: 0, pendientes: 0,
      listos: 0, activados: 0, descartados: 0, jobId: 'j', error: null, creadoEn: '2026-09-01T00:00:00.000Z',
    });
    render(baseState());
    await act(async () => { findButtonByText('inmobiliaria.import.confirm.importButton')!.click(); });
    await act(async () => { await vi.runAllTimersAsync(); });

    expect(updateState).toHaveBeenCalledWith(expect.objectContaining({ loteRetomado: 'lote-9' }));
  });

  it('al montar sin ?lote=, el lote guardado en el wizard retoma solo', async () => {
    estadoLoteState.estado = {
      lote: 'lote-guardado', estado: 'LISTO', total: 1, procesadas: 1,
      pendientes: 0, listos: 1, activados: 0, descartados: 0, jobId: null, error: null,
      creadoEn: '2026-09-01T00:00:00.000Z',
    };
    inmueblesImportacionApiMock.resumen.mockResolvedValue({
      lote: 'lote-guardado', total: 1, pendientes: 0, listos: 1, activados: 0, descartados: 0,
    });
    inmueblesImportacionApiMock.filas.mockResolvedValue({ filas: [], total: 0, pagina: 1, porPagina: 25 });

    render(baseState({ loteRetomado: 'lote-guardado' }));
    await act(async () => { await Promise.resolve(); });

    expect(inmueblesImportacionApiMock.resumen).toHaveBeenCalledWith('lote-guardado');
  });

  it('con el sondeo agotado, «consultar de nuevo» revisa el estado y avanza si ya terminó', async () => {
    searchParamsState.lote = 'lote-1';
    estadoLoteState.estado = {
      lote: 'lote-1', estado: 'PROCESANDO', total: 10, procesadas: 4,
      pendientes: 0, listos: 0, activados: 0, descartados: 0, jobId: 'j', error: null,
      creadoEn: '2026-09-01T00:00:00.000Z',
    };
    estadoLoteState.agotado = true;
    inmueblesImportacionApiMock.estadoDeLote.mockResolvedValue({
      lote: 'lote-1', estado: 'LISTO', total: 10, procesadas: 10,
      pendientes: 2, listos: 8, activados: 0, descartados: 0, jobId: 'j', error: null,
      creadoEn: '2026-09-01T00:00:00.000Z',
    });
    inmueblesImportacionApiMock.resumen.mockResolvedValue({
      lote: 'lote-1', total: 10, pendientes: 2, listos: 8, activados: 0, descartados: 0,
    });
    inmueblesImportacionApiMock.filas.mockResolvedValue({ filas: [], total: 0, pagina: 1, porPagina: 25 });

    render(baseState());
    const btn = container.querySelector('[data-testid="consultar-de-nuevo"]') as HTMLButtonElement;
    expect(btn).toBeTruthy();

    await act(async () => { btn.click(); await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });

    expect(inmueblesImportacionApiMock.estadoDeLote).toHaveBeenCalledWith('lote-1');
    // El LISTO de la consulta manual dispara la carga de la revisión.
    expect(inmueblesImportacionApiMock.resumen).toHaveBeenCalledWith('lote-1');
  });

  it('las direcciones que cayeron al centro de la ciudad se avisan, no se callan', async () => {
    geocodeImportRowMock.mockResolvedValue({ lat: 4.6, lng: -74.1, source: 'city' });
    inmueblesImportacionApiMock.preparar.mockResolvedValue({
      lote: 'lote-1', estado: 'ENCOLADO', total: 1, procesadas: 0, pendientes: 0,
      listos: 0, activados: 0, descartados: 0, jobId: 'j', error: null, creadoEn: '2026-09-01T00:00:00.000Z',
    });
    render(baseState());
    await act(async () => { findButtonByText('inmobiliaria.import.confirm.importButton')!.click(); });
    await act(async () => { await vi.runAllTimersAsync(); });

    expect(toastMock.info).toHaveBeenCalledWith(
      'Direcciones sin ubicar',
      expect.objectContaining({ description: expect.stringContaining('1 de 1') }),
    );
  });
});

describe('<StepConfirmImport> — el dueño de cada inmueble después de activar', () => {
  const inmueble = (propertyId: string, propertyTitle: string) => ({
    propertyId, propertyTitle, propertyAddress: 'Carrera 28',
    propertyCity: 'Zipaquirá', propertyZone: '', propertyType: 'apartment', propertyThumbnail: null,
    monthlyRent: null, adminFee: null, status: 'draft', createdAt: '2026-09-01',
  });
  // Lo que devuelve el back: TODOS los inmuebles sin propietario de la
  // agencia, no sólo los de este lote.
  const sinConsignacion = [
    inmueble('p1', 'Apartamento en Venta en Zipaquirá'),
    inmueble('viejo-1', 'Apartamento en Provenza'),
    inmueble('viejo-2', 'Casa en Pance'),
  ];

  beforeEach(() => {
    searchParamsState.lote = 'lote-1';
    estadoLoteState.estado = {
      lote: 'lote-1', estado: 'LISTO', total: 1, procesadas: 1,
      pendientes: 0, listos: 1, activados: 0, descartados: 0,
    };
    inmueblesImportacionApiMock.resumen.mockResolvedValue({
      lote: 'lote-1', total: 1, pendientes: 0, listos: 1, activados: 0, descartados: 0,
    });
    // Las filas del lote: una sola, ya ACTIVADA, con su Property.
    inmueblesImportacionApiMock.filas.mockImplementation(async (_lote: string, opciones?: { estado?: string }) =>
      opciones?.estado === 'ACTIVADO'
        ? {
            filas: [{ id: 'f1', lote: 'lote-1', fila: 1, estado: 'ACTIVADO', faltantes: [], overrides: [], candidatos: [], propertyId: 'p1', datos: {} }],
            total: 1, pagina: 1, porPagina: 200,
          }
        : { filas: [], total: 0, pagina: 1, porPagina: 25 },
    );
    inmueblesImportacionApiMock.activar.mockResolvedValue({ lote: 'lote-1', activados: 1, omitidas: [], restantes: 0 });
    inmobiliariaApiMock.getSinConsignacion.mockResolvedValue(sinConsignacion);
    dialogoPropsMock.mockClear();
  });

  async function activar(props: { onSalir?: () => void } = {}) {
    render(baseState({ importedCount: 1 }), props);
    await act(async () => {
      await Promise.resolve();
    });
    const activarBtn = findButtonByText('Activar')!;
    await act(async () => {
      activarBtn.click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('ADENTRO del muro no abre el diálogo de «mandato», y NO manda a rehacer lo que la importación ya hizo', async () => {
    // Ese diálogo pone UN propietario a todos los inmuebles del lote y habla
    // de «mandato», una palabra que la inmobiliaria no usa (Nico, 2026-09-01).
    // 🔴 Y el texto que quedaba decía «el propietario y la comisión los asociás
    // en el paso Contratos» sobre una importación que ACABA de asociarlos desde
    // el archivo (auditoría 2026-09-05): mandaba a repetir trabajo hecho.
    await activar({ onSalir: () => {} });

    expect(inmobiliariaApiMock.getSinConsignacion).not.toHaveBeenCalled();
    const aviso = container.querySelector('[data-testid="aviso-propietario-en-contratos"]');
    expect(aviso?.textContent).toContain('salieron del archivo');
    expect(aviso?.textContent).not.toContain('paso Contratos');
    expect(aviso?.textContent).not.toContain('contrato por contrato');
    expect(container.querySelector('[data-testid="aviso-sin-mandato"]')).toBeNull();
    expect(container.querySelector('[data-testid="dialogo-propietario"]')).toBeNull();
    expect(document.body.textContent).not.toContain('mandato');
  });

  it('FUERA del muro sí pregunta por los que quedaron sin propietario, en esas palabras', async () => {
    await activar();

    expect(inmobiliariaApiMock.getSinConsignacion).toHaveBeenCalled();
    expect(container.querySelector('[data-testid="dialogo-propietario"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="aviso-propietario-en-contratos"]')).toBeNull();
  });

  it('el diálogo lista SÓLO los inmuebles que este lote creó, no los 113 sin propietario de la agencia', async () => {
    // Medido en la agencia de QA: después de importar UN inmueble, el diálogo
    // ofrecía «guardar para todos» sobre 113. El propietario elegido es para
    // lo que se acaba de traer.
    await activar();

    const props = dialogoPropsMock.mock.calls.at(-1)?.[0] as { inmuebles: { propertyId: string }[] };
    expect(props.inmuebles.map((i) => i.propertyId)).toEqual(['p1']);
  });
});
