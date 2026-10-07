/**
 * StepConfirmImport.test.tsx — los pasos 1→4 de la carga de inmuebles tal como
 * existen desde T-0130 (reanudable) y T-0131 (cuatro pasos, «Crear todas» en
 * el servidor).
 *
 * 🔴 Reescrita el 02-10-2026. Las 41 que fallaban describían el flujo VIEJO:
 * geocodificar en el navegador ANTES de mandar el lote, «Activar» como un
 * bucle de tandas en la pestaña, la barra «Activando… 30 de 100» con su
 * «Detener». Todo eso se retiró a propósito (`5409c377`, `a2b267c6`,
 * `6e202c45`): ahora el archivo sube por tandas, las direcciones se ubican
 * DESPUÉS con lo que el servidor guardó, y «Crear todas» es UN `POST` que el
 * servidor corre solo. Las pruebas cuya intención sigue viva (las filas con
 * error viajan, la clave de idempotencia se reusa, «Detener» de verdad, la
 * barra por la ranura viva, las otras cargas, el botón del final dentro del
 * muro, el diálogo de propietarios sólo con lo de este lote…) se pasaron al
 * flujo de hoy; las del bucle de activación se cambiaron por su equivalente:
 * un solo `crear`, el progreso que lee del servidor y las fallidas que sólo se
 * reintentan con `reintentar`.
 *
 * Y el sistema de errores (02-10-2026): «conexión» sólo sin respuesta, un 5xx
 * dice «de nuestro lado» con la referencia, un 400 con `campos` va al campo.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
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

/** La búsqueda de direcciones: el MISMO proveedor de siempre, acá sin red ni pausa. */
const { ubicarMock } = vi.hoisted(() => ({ ubicarMock: vi.fn() }));
vi.mock('@/lib/inmuebles/ubicar-direccion', () => ({
  ESPERA_ENTRE_BUSQUEDAS_MS: 0,
  ubicarDireccion: (...a: unknown[]) => ubicarMock(...a),
}));

/** Web Crypto resuelve fuera de los relojes falsos: la huella va fija. */
vi.mock('../lib/huellaDelArchivo', () => ({ huellaDelArchivo: async () => 'huella-1' }));

const { api } = vi.hoisted(() => ({
  api: {
    preparar: vi.fn(),
    porUbicar: vi.fn(),
    guardarUbicaciones: vi.fn(),
    reintentar: vi.fn(),
    lotesAbiertos: vi.fn(),
    estadoDeLote: vi.fn(),
    filas: vi.fn(),
    resumen: vi.fn(),
    resolver: vi.fn(),
    resolverMasivo: vi.fn(),
    resolverPorFiltro: vi.fn(),
    motivos: vi.fn(),
    descartarFila: vi.fn(),
    descartarLote: vi.fn(),
    crear: vi.fn(),
    revisarDeNuevo: vi.fn(),
  },
}));
vi.mock('@/lib/api/inmuebles-importacion.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/inmuebles-importacion.service')>(
    '@/lib/api/inmuebles-importacion.service',
  );
  return { ...actual, inmueblesImportacionApi: api };
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

// El diálogo real necesita AuthProvider; acá sólo importa SI se abre y con qué.
const { dialogoPropsMock } = vi.hoisted(() => ({ dialogoPropsMock: vi.fn() }));
vi.mock('../CompletarMandatosLoteDialog', () => ({
  CompletarMandatosLoteDialog: (props: { abierto?: boolean; inmuebles: unknown[] }) => {
    dialogoPropsMock(props);
    const abierto = props.abierto !== false && props.inmuebles.length > 0;
    return abierto ? React.createElement('div', { 'data-testid': 'dialogo-propietario' }) : null;
  },
}));

/** El sondeo del lote: lo que «el servidor» dice en cada prueba. */
const { estadoLoteState } = vi.hoisted(() => ({
  estadoLoteState: { estado: null as unknown, agotado: false },
}));
vi.mock('@/lib/hooks/use-estado-de-lote-inmuebles', () => ({
  useEstadoDeLoteInmuebles: () => estadoLoteState,
}));

import { StepConfirmImport, fraseDeLaComision } from './StepConfirmImport';
import { RanuraVivaContext } from '@/components/migracion/ranura-viva';
import { MigracionContext } from '@/components/migracion/migracion-context';
import { RanuraDelPie } from '../ImportWizard';
import { ApiError } from '@/lib/api/client';
import type { ImportProperty } from '../lib/importTypes';
import type {
  EstadoDeLoteInmuebles,
  FilaDeImportacion,
} from '@/lib/api/inmuebles-importacion.service';

// ── Datos ────────────────────────────────────────────────────────────────────

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

/** Un lote como lo manda el back de hoy (T-0130/T-0131). */
function lote(over: Partial<EstadoDeLoteInmuebles> = {}): EstadoDeLoteInmuebles {
  return {
    lote: 'lote-1',
    estado: 'LISTO',
    total: 2,
    procesadas: 2,
    pendientes: 1,
    listos: 1,
    activados: 0,
    descartados: 0,
    jobId: null,
    error: null,
    creadoEn: '2026-10-02T15:00:00.000Z',
    fase: 'LISTA',
    listas: 1,
    fallidas: 0,
    creacion: null,
    ...over,
  };
}

function fila(over: Partial<FilaDeImportacion> = {}): FilaDeImportacion {
  return {
    id: 'fila-1',
    lote: 'lote-1',
    fila: 1,
    estado: 'PENDIENTE',
    faltantes: ['titulo'],
    overrides: [],
    candidatos: [],
    propertyId: null,
    datos: { title: 'Casa sin título', address: 'Calle 2', city: 'Medellín' },
    ...over,
  };
}

/** Lo que `GET filas` devuelve según el `estado` que se pida. */
let filasPorEstado: Partial<Record<string, FilaDeImportacion[]>> = {};

const pagina = (filas: FilaDeImportacion[]) => ({ filas, total: filas.length, pagina: 1, porPagina: 25 });

const error500 = (referencia: string) =>
  new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
    statusCode: 500,
    code: 'ERROR_INTERNO',
    message: 'Error interno del servidor.',
    referencia,
  });

const sinRespuesta = () => new ApiError(0, 'No pudimos conectarnos al servidor. (Failed to fetch)');

// ── Montaje ─────────────────────────────────────────────────────────────────

let container: HTMLDivElement;
let root: Root;
let updateState: Mock<(partial: Partial<ImportWizardState>) => void>;

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-10-02T12:00:00-05:00') });
  localStorage.clear();
  pushMock.mockClear();
  Object.values(toastMock).forEach((fn) => fn.mockClear());
  searchParamsState.lote = null;
  estadoLoteState.estado = null;
  estadoLoteState.agotado = false;
  filasPorEstado = {};
  ubicarMock.mockReset().mockResolvedValue({ lat: 4.6, lng: -74.1, precision: 'direccion' });
  Object.values(api).forEach((fn) => fn.mockReset());
  // Lo neutro: cada lectura responde algo con forma (un `undefined` no tiene `.catch`).
  api.estadoDeLote.mockImplementation(async () => estadoLoteState.estado);
  api.filas.mockImplementation(async (_l: string, o?: { estado?: string }) =>
    pagina(filasPorEstado[o?.estado ?? 'PENDIENTE'] ?? []),
  );
  api.motivos.mockResolvedValue({ lote: 'lote-1', requierenAtencion: 0, listas: 0, sinCanon: 0, porMotivo: [] });
  api.lotesAbiertos.mockResolvedValue([]);
  inmobiliariaApiMock.getSinConsignacion.mockReset().mockResolvedValue([]);
  inmobiliariaApiMock.propietariosGetAll.mockReset().mockResolvedValue([]);
  inmobiliariaApiMock.agentesGetAll.mockReset().mockResolvedValue([]);
  dialogoPropsMock.mockClear();
  updateState = vi.fn<(partial: Partial<ImportWizardState>) => void>();
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

function render(
  state: ImportWizardState,
  props: {
    onSalir?: () => void;
    onContinuar?: () => void;
    onOcupado?: (ocupado: boolean, cancelar?: () => void) => void;
    /** El nodo que el muro dibuja FUERA del `inert`. `null` = sin muro. */
    ranuraViva?: HTMLElement | null;
    /** El pie del asistente, a la derecha de «Anterior». */
    ranuraDelPie?: HTMLElement | null;
    /** IN-18 (QA-MIGRACION-95): el contexto del muro, cuando la carga corre dentro de él. */
    migracion?: { recargar: () => Promise<void> } | null;
  } = {},
) {
  const { ranuraViva = null, ranuraDelPie = null, migracion = null, ...delPaso } = props;
  act(() => {
    root.render(
      React.createElement(
        RanuraDelPie.Provider,
        { value: ranuraDelPie },
        React.createElement(
          RanuraVivaContext.Provider,
          { value: ranuraViva },
          React.createElement(
            MigracionContext.Provider,
            { value: migracion as never },
            React.createElement(StepConfirmImport, { state, updateState, ...delPaso }),
          ),
        ),
      ),
    );
  });
}

/** Deja correr las promesas pendientes (sin adelantar relojes). */
async function asentar(vueltas = 10) {
  await act(async () => {
    for (let i = 0; i < vueltas; i++) await Promise.resolve();
  });
}

/** Adelanta los relojes falsos (las esperas entre reintentos, el sondeo de «crear»). */
async function adelantar(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function boton(texto: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes(texto));
}

const porTestId = (id: string, en: ParentNode = container) =>
  en.querySelector<HTMLElement>(`[data-testid="${id}"]`);

async function clic(el: HTMLElement | null | undefined) {
  expect(el).toBeTruthy();
  await act(async () => {
    el!.click();
  });
  await asentar();
}

const BOTON_SUBIR_UNO = 'Subir 1 inmueble y ubicar direcciones';

// ── Paso 1: el resumen antes de subir ───────────────────────────────────────

describe('<StepConfirmImport> — antes de subir', () => {
  it('dice cuántos inmuebles van y ofrece subirlos, habilitado', () => {
    render(baseState());
    expect(container.textContent).toContain('Inmuebles del archivo');
    const b = boton(BOTON_SUBIR_UNO);
    expect(b).toBeTruthy();
    expect(b!.disabled).toBe(false);
  });
});

// ── Paso 1→2: subir el archivo por tandas ───────────────────────────────────

describe('<StepConfirmImport> — subir el archivo (preparar por tandas, T-0130)', () => {
  const recibido = () =>
    api.preparar.mockResolvedValue(
      lote({ estado: 'ENCOLADO', fase: 'REVISANDO', total: 1, procesadas: 0, listos: 0, pendientes: 0, listas: 0 }),
    );

  it('manda las filas al servidor con UNA clave, el total del archivo y `desde` — sin geocodificar antes ni POST /properties', async () => {
    recibido();
    render(baseState());
    await clic(boton(BOTON_SUBIR_UNO));

    expect(api.preparar).toHaveBeenCalledTimes(1);
    const [dtos, clave, tanda] = api.preparar.mock.calls[0];
    expect(typeof clave).toBe('string');
    expect(tanda).toEqual({ totalDelArchivo: 1, desde: 0, huellaDelArchivo: 'huella-1' });
    // Las claves del wire son las del back (`type`, nunca `propertyType`).
    expect(dtos[0]).toMatchObject({ title: 'Depto Chicó', type: 'APARTMENT', address: 'Cra 11 #94-45' });
    expect('propertyType' in dtos[0]).toBe(false);
    // Las direcciones se buscan DESPUÉS, con lo que el servidor guardó.
    expect(ubicarMock).not.toHaveBeenCalled();
  });

  it('🔴 QA 22-09: las filas con error (sin precio) que la revisión dejó desmarcadas VIAJAN igual — antes 14 de 145 desaparecían', async () => {
    recibido();
    render(
      baseState({
        properties: [
          makeProperty({ _rowIndex: 0 }),
          // Así la deja la revisión: con error, deseleccionada y sin casilla.
          makeProperty({
            _rowIndex: 1,
            propertyAddress: 'Cra 11 #94-46',
            listingType: 'Venta',
            monthlyRent: undefined,
            salePrice: undefined,
            selected: false,
            hasErrors: true,
            errorMessages: ['Falta precio de venta.'],
          }),
          // Ésta sí la desmarcó la persona: es la única excluida.
          makeProperty({ _rowIndex: 2, propertyAddress: 'Cra 11 #94-47', selected: false }),
        ],
      }),
    );
    await clic(boton('Subir 2 inmuebles y ubicar direcciones'));

    const [dtos] = api.preparar.mock.calls[0];
    expect(dtos.map((d: { address?: string }) => d.address)).toEqual(['Cra 11 #94-45', 'Cra 11 #94-46']);
  });

  it('mientras el servidor revisa, dice que se puede cerrar la pestaña y nunca «completada»', async () => {
    recibido();
    render(baseState());
    await clic(boton(BOTON_SUBIR_UNO));

    expect(porTestId('lote-inmuebles-progreso')).toBeTruthy();
    expect(container.textContent).toContain('Puedes cerrar esta pestaña');
    expect(container.textContent).not.toContain('¡Importación completada!');
  });

  it('el lote del servidor se guarda en el estado del asistente: sobrevive a «Anterior»', async () => {
    api.preparar.mockResolvedValue(lote({ lote: 'lote-9', estado: 'ENCOLADO', fase: 'REVISANDO', total: 1 }));
    render(baseState());
    await clic(boton(BOTON_SUBIR_UNO));
    expect(updateState).toHaveBeenCalledWith(expect.objectContaining({ loteRetomado: 'lote-9' }));
  });

  it('un 400 dice qué está mal y no se reintenta solo', async () => {
    api.preparar.mockRejectedValue(new ApiError(400, 'Lote inválido'));
    render(baseState());
    await clic(boton(BOTON_SUBIR_UNO));
    await adelantar(10_000);

    expect(api.preparar).toHaveBeenCalledTimes(1);
    expect(porTestId('import-error')?.textContent).toContain('Lote inválido');
  });

  it('🔴 un 5xx se reintenta dos veces y luego dice «de nuestro lado» con la referencia, sin culpar a la conexión', async () => {
    api.preparar.mockRejectedValue(error500('ab12cd34'));
    render(baseState());
    await clic(boton(BOTON_SUBIR_UNO));
    await adelantar(5_000);

    expect(api.preparar).toHaveBeenCalledTimes(3);
    const texto = porTestId('import-error')?.textContent ?? '';
    expect(texto).toContain('No pudimos subir el archivo: algo falló de nuestro lado');
    expect(texto).toContain('ab12cd34');
    expect(texto).not.toMatch(/conexi[oó]n/);
  });

  it('sin respuesta (status 0): ahí sí se habla de la conexión', async () => {
    api.preparar.mockRejectedValue(sinRespuesta());
    render(baseState());
    await clic(boton(BOTON_SUBIR_UNO));
    await adelantar(5_000);
    expect(porTestId('import-error')?.textContent).toMatch(/conexión/);
  });

  it('volver a tocar tras un corte reusa la MISMA clave de idempotencia (no abre otro lote)', async () => {
    api.preparar
      .mockRejectedValueOnce(sinRespuesta())
      .mockRejectedValueOnce(sinRespuesta())
      .mockRejectedValueOnce(sinRespuesta())
      .mockResolvedValueOnce(lote({ lote: 'lote-2', estado: 'ENCOLADO', fase: 'REVISANDO', total: 1 }));
    render(baseState());
    await clic(boton(BOTON_SUBIR_UNO));
    await adelantar(5_000);
    await clic(boton(BOTON_SUBIR_UNO));

    const claves = api.preparar.mock.calls.map((c) => c[1]);
    expect(claves).toHaveLength(4);
    expect(new Set(claves).size).toBe(1);
  });
});

// ── Paso 2: ubicar las direcciones ──────────────────────────────────────────

describe('<StepConfirmImport> — ubicar las direcciones (en el navegador, guardando en el servidor)', () => {
  const porUbicar = (n: number) => ({
    filas: Array.from({ length: n }, (_, i) => ({
      indice: i,
      direccion: `Cra 11 #94-4${i}`,
      ciudad: 'Bogotá',
      departamento: null,
    })),
    siguienteDesde: null,
    total: n,
    ubicadas: 0,
  });

  function ubicando(n: number) {
    searchParamsState.lote = 'lote-1';
    estadoLoteState.estado = lote({
      estado: 'ENCOLADO',
      fase: 'UBICANDO',
      total: n,
      ubicacion: { total: n, ubicadas: 0, siguienteDesde: 0 },
      puedeOmitirUbicacion: true,
    });
    api.porUbicar.mockResolvedValue(porUbicar(n));
    api.guardarUbicaciones.mockImplementation(async (_l: string, filas: unknown[]) => ({
      total: n,
      ubicadas: filas.length,
      siguienteDesde: null,
    }));
  }

  it('arranca sola, busca cada dirección y la guarda en el servidor; con todas exactas no avisa nada', async () => {
    ubicando(2);
    render(baseState());
    await adelantar(100);

    expect(ubicarMock).toHaveBeenCalledTimes(2);
    expect(api.guardarUbicaciones).toHaveBeenCalledWith('lote-1', [
      { indice: 0, lat: 4.6, lng: -74.1, precision: 'direccion' },
      { indice: 1, lat: 4.6, lng: -74.1, precision: 'direccion' },
    ]);
    expect(toastMock.info).not.toHaveBeenCalled();
  });

  it('las direcciones que cayeron al centro del municipio se avisan, no se callan', async () => {
    ubicando(2);
    ubicarMock
      .mockResolvedValueOnce({ lat: 4.6, lng: -74.1, precision: 'municipio' })
      .mockResolvedValueOnce({ lat: 4.6, lng: -74.1, precision: 'direccion' });
    render(baseState());
    await adelantar(100);

    expect(toastMock.info).toHaveBeenCalledWith(
      '1 de 2 sin dirección exacta',
      // QA-MIGRACION-95 (IN-06): una se dice en singular («1 queda»).
      expect.objectContaining({ description: expect.stringContaining('1 queda en el centro de su municipio') }),
    );
  });

  /*
   * 🔴 2026-09-12. Las dos suertes NO son la misma: «en el centro de su
   * ciudad» era falso para las que no quedaban en ningún lado (1.442 en el
   * portafolio real de Nico).
   */
  it('las que quedaron SIN punto se dicen aparte, no como «en el centro»', async () => {
    ubicando(1);
    ubicarMock.mockResolvedValue({ precision: 'ninguna' });
    render(baseState());
    await adelantar(100);

    const [, opciones] = toastMock.info.mock.calls[0];
    expect(opciones.description).toContain('1 queda sin punto en el mapa');
    expect(opciones.description).not.toContain('centro de su municipio');
  });

  /*
   * 2.883 filas a 550 ms son media hora larga (Nico, 2026-09-09: «le di
   * cancelar o anterior y no deja»). «Detener» para DE VERDAD: deja terminar la
   * fila en vuelo, guarda lo hecho y ofrece seguir.
   */
  it('sin muro: «Detener» vive en el paso, para la búsqueda, guarda lo hecho y ofrece seguir', async () => {
    ubicando(8);
    ubicarMock.mockImplementation(async () => {
      porTestId('ubicacion-detener')?.click();
      return { lat: 4.6, lng: -74.1, precision: 'direccion' };
    });
    render(baseState());
    await adelantar(100);

    expect(ubicarMock).toHaveBeenCalledTimes(1);
    expect(api.guardarUbicaciones).toHaveBeenCalledWith('lote-1', [
      expect.objectContaining({ indice: 0 }),
    ]);
    expect(toastMock.info).toHaveBeenCalledWith('Búsqueda detenida', expect.anything());
    expect(porTestId('continuar-ubicando')?.textContent).toContain('Continuar ubicando');
  });

  /*
   * 🔴 Con muro, la barra sale por la RANURA VIVA: el muro pone `inert` sobre
   * todo el paso mientras algo corre, y un «Detener» adentro se vería vivo y
   * estaría muerto (Nico, 2026-09-10: «está súper mal ubicado»).
   */
  it('con muro: la barra y su «Detener» salen por la ranura viva — y detienen de verdad', async () => {
    ubicando(8);
    const ranura = document.createElement('div');
    document.body.appendChild(ranura);
    let barraEnLaRanura = false;
    let barraEnElPaso = true;
    ubicarMock.mockImplementation(async () => {
      barraEnLaRanura = porTestId('ubicacion-progreso', ranura) !== null;
      barraEnElPaso = porTestId('ubicacion-progreso') !== null;
      porTestId('ubicacion-detener', ranura)?.click();
      return { lat: 4.6, lng: -74.1, precision: 'direccion' };
    });
    render(baseState(), { onOcupado: () => {}, ranuraViva: ranura });
    await adelantar(100);

    expect(barraEnLaRanura).toBe(true);
    expect(barraEnElPaso).toBe(false);
    expect(ubicarMock).toHaveBeenCalledTimes(1);
    ranura.remove();
  });

  it('sin ranura, el muro recibe CÓMO parar para su pie, y ese «cómo» detiene', async () => {
    ubicando(6);
    let parar: (() => void) | undefined;
    ubicarMock.mockImplementation(async () => {
      parar?.();
      return { lat: 4.6, lng: -74.1, precision: 'direccion' };
    });
    render(baseState(), {
      onOcupado: (ocupado, cancelar) => {
        if (ocupado && cancelar) parar = cancelar;
      },
      ranuraViva: null,
    });
    await adelantar(100);

    expect(parar).toBeTypeOf('function');
    expect(ubicarMock.mock.calls.length).toBeLessThan(6);
  });

  it('🔴 si guardar lo ubicado falla en el servidor: «de nuestro lado» con la referencia, y ofrece seguir', async () => {
    ubicando(2);
    api.guardarUbicaciones.mockRejectedValue(error500('cafe1234'));
    render(baseState());
    await adelantar(100);

    const texto = porTestId('import-error')?.textContent ?? '';
    expect(texto).toContain('No pudimos guardar las direcciones: algo falló de nuestro lado');
    expect(texto).toContain('cafe1234');
    expect(texto).toContain('Continuar ubicando');
    expect(texto).not.toMatch(/conexi[oó]n/);
  });
});

// ── Paso 3: revisar lo que falta ────────────────────────────────────────────

describe('<StepConfirmImport> — revisar lo que falta (fase LISTA)', () => {
  beforeEach(() => {
    searchParamsState.lote = 'lote-1';
    estadoLoteState.estado = lote();
    api.resumen.mockResolvedValue({ lote: 'lote-1', total: 2, pendientes: 1, listos: 1, activados: 0, descartados: 0 });
    filasPorEstado.PENDIENTE = [
      fila({ faltantes: ['titulo', 'tipo_de_negocio'], datos: { title: 'Casa en Laureles', address: 'Calle 2', city: 'Medellín' } }),
    ];
  });

  it('retoma desde el ?lote= de la notificación y muestra lo que hay por revisar', async () => {
    render(baseState());
    await asentar();
    expect(api.resumen).toHaveBeenCalledWith('lote-1');
    expect(container.textContent).toContain('Casa en Laureles');
    expect(porTestId('listas-para-crear')?.textContent).toContain('1 lista para crear');
  });

  it('el vocabulario de faltantes se lee, y uno desconocido sale como «falta un dato»', async () => {
    filasPorEstado.PENDIENTE = [fila({ faltantes: ['canon', 'algo_nuevo_del_back'] })];
    render(baseState());
    await asentar();
    expect(container.textContent).toContain('canon mensual');
    expect(container.textContent).toContain('falta un dato');
  });

  it('descartar una fila llama descartarFila y refresca la lista', async () => {
    api.descartarFila.mockResolvedValue({});
    render(baseState());
    await asentar();
    const antes = api.filas.mock.calls.length;
    await clic(container.querySelector<HTMLButtonElement>('[aria-label="Descartar fila"]'));
    expect(api.descartarFila).toHaveBeenCalledWith('fila-1');
    expect(api.filas.mock.calls.length).toBeGreaterThan(antes);
  });

  it('«Continuar» está apagado sin filas listas para crear', async () => {
    estadoLoteState.estado = lote({ listos: 0, listas: 0 });
    render(baseState());
    await asentar();
    expect(porTestId('continuar-a-crear')).toBeTruthy();
    expect((porTestId('continuar-a-crear') as HTMLButtonElement).disabled).toBe(true);
  });

  it('🔴 «Crear todas» es UN `POST` al servidor —nunca un bucle en la pestaña— y pasa a mirar cómo va', async () => {
    estadoLoteState.estado = lote({ listos: 2, listas: 2 });
    api.crear.mockResolvedValue({
      lote: 'lote-1',
      fase: 'CREANDO',
      creacion: { total: 2, creadas: 0, fallidas: 0, pendientes: 2 },
    });
    render(baseState());
    await asentar();

    await clic(porTestId('continuar-a-crear'));
    expect(porTestId('crear-todas-paso')?.textContent).toContain('Todo listo para crear');
    await clic(porTestId('crear-todas'));

    expect(api.crear).toHaveBeenCalledTimes(1);
    expect(api.crear).toHaveBeenCalledWith('lote-1');
    expect(porTestId('creacion-avance')?.textContent).toContain('0 de 2 creadas');
    expect(porTestId('creacion-puedes-cerrar')?.textContent).toContain('Puedes cerrar esta página');
    expect(updateState).toHaveBeenCalledWith(expect.objectContaining({ importedCount: 0 }));
  });

  it('409 NADA_PARA_CREAR: vuelve a la revisión y dice qué hacer', async () => {
    estadoLoteState.estado = lote({ listos: 2, listas: 2 });
    api.crear.mockRejectedValue(new ApiError(409, 'No hay filas LISTO', 'NADA_PARA_CREAR'));
    render(baseState());
    await asentar();
    await clic(porTestId('continuar-a-crear'));
    await clic(porTestId('crear-todas'));

    expect(porTestId('crear-todas-paso')).toBeNull();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'No hay inmuebles listos para crear.',
    );
  });

  it('🔴 un 5xx al empezar a crear dice «de nuestro lado» con la referencia', async () => {
    estadoLoteState.estado = lote({ listos: 2, listas: 2 });
    api.crear.mockRejectedValue(error500('beef5678'));
    render(baseState());
    await asentar();
    await clic(porTestId('continuar-a-crear'));
    await clic(porTestId('crear-todas'));

    const texto = porTestId('import-error')?.textContent ?? '';
    expect(texto).toContain('No pudimos empezar a crear los inmuebles: algo falló de nuestro lado');
    expect(texto).toContain('beef5678');
  });

  /*
   * 🔴 La barra de la re-revisión vivía en el `return` del resumen previo, al
   * que sólo se llega SIN lote — y revisar exige un lote. Código muerto.
   */
  it('la barra de la re-revisión se dibuja en la pantalla del lote, con su «Detener»', async () => {
    api.resumen.mockResolvedValue({ lote: 'lote-1', total: 10, pendientes: 10, listos: 0, activados: 0, descartados: 0 });
    let soltar: (() => void) | null = null;
    api.revisarDeNuevo.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          soltar = () =>
            resolve({ lote: 'lote-1', revisadas: 4, liberadas: 2, restantes: 8, ultimaFila: 4, terminado: true });
        }),
    );
    render(baseState());
    await asentar();
    await clic(porTestId('revisar-de-nuevo'));

    expect(porTestId('revision-progreso')).toBeTruthy();
    expect(porTestId('revision-detener')).toBeTruthy();
    await act(async () => {
      soltar!();
    });
    await asentar();
  });

  it('un 409 FILA_YA_ACTIVADA refresca la lista — la fila fantasma se va sola', async () => {
    filasPorEstado.PENDIENTE = [
      fila({
        faltantes: ['posible_duplicado'],
        candidatos: [{ id: 'p1', code: 7, title: 'Casa 7', address: 'Calle 1', city: 'Bogotá' }],
      }),
    ];
    api.resolver.mockRejectedValue(new ApiError(409, 'ya activada', 'FILA_YA_ACTIVADA'));
    render(baseState());
    await asentar();
    const antes = api.filas.mock.calls.length;
    await clic(boton('Usar de todos modos'));

    expect(toastMock.error).toHaveBeenCalledWith(expect.stringContaining('ya se activó'));
    expect(api.filas.mock.calls.length).toBeGreaterThan(antes);
  });

  it('🔴 corregir una fila: un 5xx sale en un aviso con la referencia, y la fila sigue ahí', async () => {
    filasPorEstado.PENDIENTE = [
      fila({
        faltantes: ['posible_duplicado'],
        candidatos: [{ id: 'p1', code: 7, title: 'Casa 7', address: 'Calle 1', city: 'Bogotá' }],
      }),
    ];
    api.resolver.mockRejectedValue(error500('dada0001'));
    render(baseState());
    await asentar();
    await clic(boton('Usar de todos modos'));

    const texto = String(toastMock.error.mock.calls[0]?.[0] ?? '');
    expect(texto).toContain('No pudimos guardar la fila: algo falló de nuestro lado');
    expect(texto).toContain('dada0001');
    expect(porTestId('fila-importacion-1')).toBeTruthy();
  });

  it('🔴 corregir una fila: un 400 con `campos` va al campo de la fila, con el foco, sin toast', async () => {
    api.resolver.mockRejectedValue(
      new ApiError(400, ['El área no puede pasar de 1.000.000 m².'], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: ['El área no puede pasar de 1.000.000 m².'],
        campos: [{ campo: 'area', regla: 'maximo', mensaje: 'El área no puede pasar de 1.000.000 m².' }],
      }),
    );
    render(baseState());
    await asentar();
    await clic(container.querySelector<HTMLButtonElement>('[aria-label="Editar fila"]'));

    const titulo = container.querySelector<HTMLInputElement>('#fila-fila-1-title')!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    act(() => {
      setter.call(titulo, 'Casa en Laureles 2');
      titulo.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await clic(boton('Guardar'));
    await adelantar(1);

    expect(api.resolver).toHaveBeenCalledWith('fila-1', expect.objectContaining({ title: 'Casa en Laureles 2' }));
    expect(container.querySelector('#fila-fila-1-area-error')?.textContent).toBe(
      'El área no puede pasar de 1.000.000 m².',
    );
    expect(document.activeElement).toBe(container.querySelector('#fila-fila-1-area'));
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  /*
   * 🔴 Nico, 2026-09-11: «le doy ahí a actualizar lista y no funciona». La
   * consulta salía, pero el cartel rojo no se bajaba nunca.
   */
  it('«Actualizar la lista» baja el aviso cuando la consulta vuelve bien', async () => {
    api.resumen
      .mockRejectedValueOnce(sinRespuesta())
      .mockResolvedValue({ lote: 'lote-1', total: 2, pendientes: 1, listos: 1, activados: 0, descartados: 0 });
    render(baseState());
    await asentar();
    expect(container.querySelector('[role="alert"]')?.textContent).toMatch(/conexión/);

    await clic(porTestId('revision-actualizar'));
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('si al actualizar el servidor sigue sin responder, el aviso se queda y lo dice', async () => {
    api.resumen.mockRejectedValue(sinRespuesta());
    render(baseState());
    await asentar();
    await clic(porTestId('revision-actualizar'));

    const aviso = container.querySelector('[role="alert"]');
    expect(aviso?.textContent).toContain('No pudimos comunicarnos con Leasefy');
  });

  it('descartar el lote con 409 LOTE_EN_PROCESO dice «espera», sin reintentar ni navegar', async () => {
    api.descartarLote.mockRejectedValue(
      new ApiError(409, 'El lote todavía se está procesando.', 'LOTE_EN_PROCESO'),
    );
    render(baseState());
    await asentar();
    await clic(boton('Descartar lote completo'));

    expect(api.descartarLote).toHaveBeenCalledTimes(1);
    expect(pushMock).not.toHaveBeenCalled();
    expect(container.textContent).toMatch(/espera a que termine/i);
  });

  it('volver a una carga que ya creó algunas y tiene más listas abre el paso 4: «Crear las N que faltan»', async () => {
    estadoLoteState.estado = lote({
      listos: 3,
      listas: 3,
      creacion: { total: 10, creadas: 7, fallidas: 0, pendientes: 3 },
    });
    render(baseState());
    await asentar();
    expect(porTestId('crear-todas')?.textContent).toBe('Crear las 3 que faltan');
  });
});

// ── Paso 4: el servidor crea ────────────────────────────────────────────────

describe('<StepConfirmImport> — mientras el servidor crea (T-0131)', () => {
  beforeEach(() => {
    searchParamsState.lote = 'lote-1';
  });

  /*
   * 🔴 Nico, 2026-09-11: «¿es normal que lleve activando más de 5 min?» y
   * «debemos mostrar acá el % en que va de avance». Una espera larga dice en
   * qué va, cuánto es, y que no hay que quedarse mirando.
   */
  it('dice en qué va, con el %, sale del servidor y nunca dice «completada»', async () => {
    estadoLoteState.estado = lote({
      estado: 'PROCESANDO',
      fase: 'CREANDO',
      total: 100,
      creacion: { total: 100, creadas: 30, fallidas: 0, pendientes: 70 },
    });
    render(baseState());
    await asentar();

    expect(porTestId('creacion-avance')?.textContent).toContain('30 de 100 creadas');
    expect(porTestId('creacion-porcentaje')?.textContent).toBe('30%');
    expect(container.textContent).not.toContain('¡Importación completada!');

    // Cada 4 s se le pregunta al servidor; lo que diga es la verdad.
    api.estadoDeLote.mockResolvedValue(
      lote({
        estado: 'PROCESANDO',
        fase: 'CREANDO',
        total: 100,
        creacion: { total: 100, creadas: 60, fallidas: 0, pendientes: 40 },
      }),
    );
    await adelantar(4_000);
    expect(porTestId('creacion-avance')?.textContent).toContain('60 de 100 creadas');
    expect(porTestId('creacion-porcentaje')?.textContent).toBe('60%');
  });

  /*
   * IN-18 (QA-MIGRACION-95, 06-10): dentro del muro, el final de la creación
   * (que corre en el servidor y no cuenta como «ocupado») no le llegaba al
   * muro: el paso seguía sin marcar tras «¡Importación completada!».
   */
  it('al terminar de crear en el servidor, el muro vuelve a preguntar su estado', async () => {
    const recargar = vi.fn().mockResolvedValue(undefined);
    api.resumen.mockResolvedValue({ lote: 'lote-1', total: 2, pendientes: 0, listos: 0, activados: 2, descartados: 0 });
    estadoLoteState.estado = lote({
      estado: 'PROCESANDO',
      fase: 'CREANDO',
      total: 2,
      creacion: { total: 2, creadas: 1, fallidas: 0, pendientes: 1 },
    });
    render(baseState(), { migracion: { recargar } });
    await asentar();
    expect(recargar).not.toHaveBeenCalled();
    api.estadoDeLote.mockResolvedValue(
      lote({ estado: 'LISTO', fase: 'TERMINADA', total: 2, creacion: { total: 2, creadas: 2, fallidas: 0, pendientes: 0 } }),
    );
    await adelantar(4_000);
    expect(recargar).toHaveBeenCalled();
  });

  it('una creación que se rindió en el servidor ofrece «Reintentar», que llama `reintentar` y NUNCA `crear` otra vez', async () => {
    estadoLoteState.estado = lote({
      estado: 'FALLIDO',
      fase: 'CREANDO',
      error: 'El proceso se detuvo tras 5 intentos.',
      puedeReintentar: true,
      creacion: { total: 10, creadas: 4, fallidas: 0, pendientes: 6 },
    });
    api.reintentar.mockResolvedValue({
      accion: 'JOB_ENCOLADO',
      filasLiberadas: 0,
      lote: lote({ estado: 'ENCOLADO', fase: 'CREANDO', creacion: { total: 10, creadas: 4, fallidas: 0, pendientes: 6 } }),
    });
    render(baseState());
    await asentar();

    expect(porTestId('creacion-detenida')?.textContent).toContain('El proceso se detuvo tras 5 intentos.');
    await clic(porTestId('reintentar-lote'));
    expect(api.reintentar).toHaveBeenCalledWith('lote-1', { omitirUbicacion: false });
    expect(api.crear).not.toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalledWith('Seguimos creando las que fallaron', expect.anything());
  });

  it('terminada con fallidas: dice cuáles y por qué, y «Reintentar las fallidas» usa `reintentar`', async () => {
    estadoLoteState.estado = lote({
      fase: 'TERMINADA',
      fallidas: 1,
      creacion: { total: 3, creadas: 2, fallidas: 1, pendientes: 0 },
    });
    api.resumen.mockResolvedValue({ lote: 'lote-1', total: 3, pendientes: 0, listos: 1, activados: 2, descartados: 0 });
    filasPorEstado.LISTO = [
      fila({
        id: 'fila-7',
        fila: 7,
        estado: 'LISTO',
        faltantes: [],
        datos: { title: 'Totales', address: 'x' },
        errorDeActivacion:
          'No se pudo crear el inmueble: La administración del archivo ($8.182.145.091) no es un valor posible. Corrige la celda en el archivo o descarta esta fila.',
      }),
    ];
    api.reintentar.mockResolvedValue({
      accion: 'JOB_ENCOLADO',
      filasLiberadas: 1,
      lote: lote({ estado: 'ENCOLADO', fase: 'CREANDO', creacion: { total: 3, creadas: 2, fallidas: 0, pendientes: 1 } }),
    });
    render(baseState());
    await asentar();

    expect(porTestId('fila-fallida-7')?.textContent).toContain('La administración del archivo ($8.182.145.091)');
    await clic(porTestId('reintentar-fallidas'));
    expect(api.reintentar).toHaveBeenCalledTimes(1);
    expect(api.crear).not.toHaveBeenCalled();
  });

  it('si la carga deja de existir mientras se crea, lo dice y vuelve al inicio', async () => {
    estadoLoteState.estado = lote({
      estado: 'PROCESANDO',
      fase: 'CREANDO',
      creacion: { total: 10, creadas: 1, fallidas: 0, pendientes: 9 },
    });
    api.estadoDeLote.mockRejectedValue(new ApiError(404, 'No existe', 'NO_ENCONTRADO'));
    const onSalir = vi.fn();
    render(baseState(), { onSalir });
    await adelantar(4_000);

    expect(toastMock.error).toHaveBeenCalledWith('Esta carga ya no existe', expect.anything());
    expect(updateState).toHaveBeenCalledWith(expect.objectContaining({ loteRetomado: null }));
    expect(onSalir).toHaveBeenCalled();
  });
});

// ── Al terminar ─────────────────────────────────────────────────────────────

describe('<StepConfirmImport> — al terminar (TERMINADA sin fallidas)', () => {
  function terminada(creadas: number, pendientes = 0) {
    searchParamsState.lote = 'lote-1';
    estadoLoteState.estado = lote({
      fase: 'TERMINADA',
      total: creadas + pendientes,
      listos: 0,
      listas: 0,
      activados: creadas,
      creacion: { total: creadas, creadas, fallidas: 0, pendientes: 0 },
    });
    api.resumen.mockResolvedValue({
      lote: 'lote-1',
      total: creadas + pendientes,
      pendientes,
      listos: 0,
      activados: creadas,
      descartados: 0,
    });
  }

  /*
   * 🔴 Nico, 2026-09-11: «¿por qué dices que se importaron 679 si le subí
   * 2800 y algo?». La cuenta es la del servidor, del lote ENTERO.
   */
  it('dice cuántas entraron EN TOTAL, con el número del servidor', async () => {
    terminada(2_824);
    render(baseState());
    await asentar();

    expect(container.textContent).toContain('¡Importación completada!');
    expect(porTestId('resumen-creadas')?.textContent).toContain('2.824 inmuebles');
    expect(updateState).toHaveBeenCalledWith(expect.objectContaining({ importedCount: 2_824, importProgress: 100 }));
  });

  /*
   * 🔴 Nico, 2026-09-11: «no aparece nada para continuar». Adentro del muro el
   * único botón navegaba a una ruta que el muro TAPA.
   */
  it('adentro del muro, el botón del final llama a onSalir — no navega a una ruta tapada', async () => {
    terminada(3);
    const onSalir = vi.fn();
    render(baseState(), { onSalir });
    await asentar();
    pushMock.mockClear();
    await clic(porTestId('importar-mas'));

    expect(onSalir).toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('FUERA del muro sigue navegando al asistente, como siempre', async () => {
    terminada(3);
    render(baseState());
    await asentar();
    pushMock.mockClear();
    await clic(porTestId('importar-mas'));
    expect(pushMock).toHaveBeenCalledWith('/panel/inmobiliaria/inmuebles/importar');
  });

  describe('el dueño de cada inmueble', () => {
    const inmueble = (propertyId: string, propertyTitle: string) => ({
      propertyId,
      propertyTitle,
      propertyAddress: 'Carrera 28',
      propertyCity: 'Zipaquirá',
      propertyZone: '',
      propertyType: 'apartment',
      propertyThumbnail: null,
      monthlyRent: null,
      adminFee: null,
      status: 'draft',
      createdAt: '2026-09-01',
    });

    beforeEach(() => {
      terminada(1);
      // Las filas del lote: una sola, ya ACTIVADA, con su Property.
      filasPorEstado.ACTIVADO = [fila({ id: 'f1', estado: 'ACTIVADO', faltantes: [], propertyId: 'p1' })];
      // Lo que devuelve el back: TODOS los inmuebles sin propietario de la agencia.
      inmobiliariaApiMock.getSinConsignacion.mockResolvedValue([
        inmueble('p1', 'Apartamento en Venta en Zipaquirá'),
        inmueble('viejo-1', 'Apartamento en Provenza'),
        inmueble('viejo-2', 'Casa en Pance'),
      ]);
    });

    it('ADENTRO del muro no abre el diálogo de «mandato» y NO manda a rehacer lo que la importación ya hizo', async () => {
      render(baseState({ importedCount: 1 }), { onSalir: () => {} });
      await asentar();

      expect(inmobiliariaApiMock.getSinConsignacion).not.toHaveBeenCalled();
      const aviso = porTestId('aviso-propietario-en-contratos');
      // El inmueble de la prueba NO trae comisión: la frase no puede decir que salió del archivo.
      expect(aviso?.textContent).toContain('El propietario salió del archivo');
      expect(aviso?.textContent).toContain('La comisión no venía en el archivo');
      expect(aviso?.textContent).not.toContain('paso Contratos');
      expect(porTestId('aviso-sin-mandato')).toBeNull();
      expect(porTestId('dialogo-propietario')).toBeNull();
      expect(document.body.textContent).not.toContain('mandato');
    });

    it('FUERA del muro sí pregunta por los que quedaron sin propietario', async () => {
      render(baseState({ importedCount: 1 }));
      await asentar();

      expect(inmobiliariaApiMock.getSinConsignacion).toHaveBeenCalled();
      expect(porTestId('dialogo-propietario')).not.toBeNull();
      expect(porTestId('aviso-propietario-en-contratos')).toBeNull();
    });

    it('el diálogo lista SÓLO los inmuebles que este lote creó, no los sin propietario de toda la agencia', async () => {
      render(baseState({ importedCount: 1 }));
      await asentar();

      const props = dialogoPropsMock.mock.calls.at(-1)?.[0] as { inmuebles: { propertyId: string }[] };
      expect(props.inmuebles.map((i) => i.propertyId)).toEqual(['p1']);
    });
  });

  /*
   * 🔴 Nico, 2026-09-11, con 2.864 total · 40 pendientes · 0 listas · 2.824
   * creadas: «no hay nada de cómo continuar, cómo pasar de ahí a contratos».
   * El paso del muro se queda «pendiente» mientras exista UNA fila lista en
   * CUALQUIER carga de la agencia. Desde la pantalla final, «Revisar las que
   * faltan» lleva a la lista, y ahí se dice cuál es el siguiente paso REAL.
   */
  describe('cuando la carga ya no tiene nada que crear y se vuelve a la lista', () => {
    async function abrirLaRevision(props: Parameters<typeof render>[1] = {}) {
      terminada(2_824, 40);
      render(baseState(), props);
      await asentar();
      await clic(porTestId('revisar-las-que-faltan'));
      await asentar();
    }

    /*
     * Nico, 2026-09-12: «que el seguir contrato quede donde está siempre el
     * siguiente, al lado de anterior, y el mensaje encima de esa zona gris
     * con posibilidad de cerrarlo».
     */
    it('la acción se va al PIE y el aviso se puede cerrar', async () => {
      const pie = document.createElement('div');
      document.body.appendChild(pie);
      await abrirLaRevision({ onSalir: () => {}, onContinuar: () => {}, ranuraDelPie: pie });

      expect(porTestId('seguir-con-contratos')).toBeNull();
      expect(porTestId('seguir-con-contratos', pie)).toBeTruthy();
      expect(porTestId('lote-terminado')).toBeTruthy();
      await clic(porTestId('cerrar-aviso-carga'));
      expect(porTestId('lote-terminado')).toBeNull();
      expect(porTestId('seguir-con-contratos', pie)).toBeTruthy();
      pie.remove();
    });

    it('sin nada pendiente en otras cargas, ofrece seguir con Contratos', async () => {
      api.lotesAbiertos.mockResolvedValue([lote({ listos: 0, listas: 0, activados: 2_824 })]);
      const onContinuar = vi.fn();
      await abrirLaRevision({ onSalir: () => {}, onContinuar });

      await clic(porTestId('seguir-con-contratos'));
      expect(onContinuar).toHaveBeenCalled();
    });

    /*
     * Nico, 2026-09-11: «me apareció el cta de seguir con contratos, y luego
     * pasó a decir eso de ver las otras cargas». Un botón que cambia de
     * identidad debajo del dedo no se puede usar.
     */
    it('no ofrece NINGUNA acción hasta saber qué hay en las otras cargas', async () => {
      let soltar: ((ls: unknown[]) => void) | null = null;
      api.lotesAbiertos.mockImplementation(
        () =>
          new Promise((resolve) => {
            soltar = resolve as (ls: unknown[]) => void;
          }),
      );
      await abrirLaRevision({ onSalir: () => {}, onContinuar: () => {} });

      expect(porTestId('seguir-con-contratos')).toBeNull();
      expect(porTestId('ir-a-otras-cargas')).toBeNull();
      expect(porTestId('mirando-otras-cargas')).toBeTruthy();

      await act(async () => {
        soltar!([lote({ lote: 'vieja', listos: 679, listas: 679 })]);
      });
      await asentar();
      expect(porTestId('ir-a-otras-cargas')).toBeTruthy();
      expect(porTestId('seguir-con-contratos')).toBeNull();
    });

    it('con filas listas en OTRAS cargas dice cuántas y manda a verlas, no a Contratos', async () => {
      api.lotesAbiertos.mockResolvedValue([
        lote({ listos: 0, listas: 0, activados: 2_824 }),
        lote({ lote: 'vieja-a', listos: 1_381, listas: 1_381 }),
        lote({ lote: 'vieja-b', listos: 1_210, listas: 1_210 }),
      ]);
      const onSalir = vi.fn();
      const onContinuar = vi.fn();
      await abrirLaRevision({ onSalir, onContinuar });

      const bloque = porTestId('lote-terminado')!;
      expect(bloque.textContent).toContain('2591');
      expect(bloque.textContent).toContain('2 cargas anteriores');
      expect(porTestId('seguir-con-contratos')).toBeNull();
      await clic(porTestId('ir-a-otras-cargas'));
      expect(onSalir).toHaveBeenCalled();
      expect(onContinuar).not.toHaveBeenCalled();
    });
  });

  it('con filas listas en ESTE lote todavía no aparece el aviso de carga terminada: hay trabajo acá', async () => {
    searchParamsState.lote = 'lote-1';
    estadoLoteState.estado = lote({ listos: 679, listas: 679, activados: 2_145 });
    api.resumen.mockResolvedValue({ lote: 'lote-1', total: 2_864, pendientes: 40, listos: 679, activados: 2_145, descartados: 0 });
    render(baseState(), { onSalir: () => {}, onContinuar: () => {} });
    await asentar();

    expect(porTestId('lote-terminado')).toBeNull();
    expect(api.lotesAbiertos).not.toHaveBeenCalled();
  });
});

// ── Un lote FALLIDO tiene salida ────────────────────────────────────────────

describe('<StepConfirmImport> — recuperación de un lote FALLIDO', () => {
  it('🔴 sin poder retomarse: «Preparar de nuevo» vuelve al resumen sin re-subir el archivo', async () => {
    searchParamsState.lote = 'lote-muerto';
    estadoLoteState.estado = lote({
      lote: 'lote-muerto',
      estado: 'FALLIDO',
      fase: 'REVISANDO',
      error: 'El proceso falló en el servidor.',
      puedeReintentar: false,
    });
    render(baseState());

    expect(container.textContent).toContain('El proceso falló en el servidor.');
    await clic(porTestId('preparar-de-nuevo'));

    expect(boton(BOTON_SUBIR_UNO)).toBeTruthy();
    expect(updateState).toHaveBeenCalledWith(expect.objectContaining({ loteRetomado: null }));
  });

  it('con `puedeReintentar`: «Reintentar» lo retoma donde quedó (no abre otro lote)', async () => {
    searchParamsState.lote = 'lote-1';
    estadoLoteState.estado = lote({ estado: 'FALLIDO', fase: 'REVISANDO', error: 'Se cortó.', puedeReintentar: true });
    api.reintentar.mockResolvedValue({
      accion: 'JOB_ENCOLADO',
      filasLiberadas: 0,
      lote: lote({ estado: 'ENCOLADO', fase: 'REVISANDO' }),
    });
    render(baseState());
    await clic(porTestId('reintentar-lote'));

    expect(api.reintentar).toHaveBeenCalledWith('lote-1', { omitirUbicacion: false });
    expect(api.preparar).not.toHaveBeenCalled();
  });

  it('al montar sin ?lote=, el lote guardado en el asistente retoma solo', async () => {
    estadoLoteState.estado = lote({ lote: 'lote-guardado' });
    api.resumen.mockResolvedValue({ lote: 'lote-guardado', total: 1, pendientes: 0, listos: 1, activados: 0, descartados: 0 });
    render(baseState({ loteRetomado: 'lote-guardado' }));
    await asentar();
    expect(api.resumen).toHaveBeenCalledWith('lote-guardado');
  });

  it('con el sondeo agotado, «consultar de nuevo» pregunta y avanza si ya terminó', async () => {
    searchParamsState.lote = 'lote-1';
    estadoLoteState.estado = lote({ estado: 'PROCESANDO', fase: 'REVISANDO', total: 10, procesadas: 4 });
    estadoLoteState.agotado = true;
    api.estadoDeLote.mockResolvedValue(lote({ total: 10, procesadas: 10, pendientes: 2, listos: 8, listas: 8 }));
    api.resumen.mockResolvedValue({ lote: 'lote-1', total: 10, pendientes: 2, listos: 8, activados: 0, descartados: 0 });
    render(baseState());

    await clic(porTestId('consultar-de-nuevo'));
    expect(api.estadoDeLote).toHaveBeenCalledWith('lote-1');
    expect(api.resumen).toHaveBeenCalledWith('lote-1');
  });

  it('🔴 si «consultar de nuevo» falla de nuestro lado, lo dice con la referencia (no «revisa tu conexión»)', async () => {
    searchParamsState.lote = 'lote-1';
    estadoLoteState.estado = lote({ estado: 'PROCESANDO', fase: 'REVISANDO', total: 10, procesadas: 4 });
    estadoLoteState.agotado = true;
    api.estadoDeLote.mockRejectedValue(error500('0badc0de'));
    render(baseState());

    await clic(porTestId('consultar-de-nuevo'));
    const texto = String(toastMock.error.mock.calls[0]?.[0] ?? '');
    expect(texto).toContain('algo falló de nuestro lado');
    expect(texto).toContain('0badc0de');
    expect(texto).not.toMatch(/conexi[oó]n/);
  });
});

describe('fraseDeLaComision — sólo afirma lo que el archivo traía (QA 22-09)', () => {
  it('todas con comisión: salieron del archivo', () => {
    expect(fraseDeLaComision([makeProperty({ commissionPercent: 8 })])).toBe(
      'El propietario y la comisión salieron del archivo, inmueble por inmueble.',
    );
  });

  it('ninguna con comisión: lo dice, y dice que queda vacía', () => {
    expect(fraseDeLaComision([makeProperty(), makeProperty()])).toContain(
      'La comisión no venía en el archivo: queda vacía',
    );
  });

  it('algunas sin comisión: las cuenta', () => {
    expect(
      fraseDeLaComision([makeProperty({ commissionPercent: 8 }), makeProperty(), makeProperty()]),
    ).toContain('salvo en 2 inmuebles que no la traían');
  });

  it('una venta no cuenta como comisión de arriendo que falte', () => {
    expect(
      fraseDeLaComision([
        makeProperty({ commissionPercent: 8 }),
        makeProperty({ listingType: 'Venta', monthlyRent: undefined, salePrice: 300_000_000 }),
      ]),
    ).toBe('El propietario y la comisión salieron del archivo, inmueble por inmueble.');
  });
});
