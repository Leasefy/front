/**
 * Cargar el extracto — los errores en palabras (tanda 2 del sistema de
 * errores, 02-10-2026).
 *
 * Antes la pantalla decía el `error.message` crudo de lo que fuera: un 5xx
 * salía como «Error interno del servidor» sin referencia, y una celda con
 * ceros de más tumbaba el extracto ENTERO con un 500 de Postgres. Ahora:
 *
 *   · la línea con ceros de más (±$1.000.000.000.000) se descarta AL LEER,
 *     con la misma frase del back, y no viaja; un archivo de más de 20.000
 *     líneas no se manda (Nico, 02-10, tarde);
 *   · una línea de más de $2.000.000.000 SÍ viaja (columna más grande): si el
 *     back todavía no la puede guardar, lo dice en `avisos` y en
 *     `descartadasPorValor`, y la pantalla lo muestra;
 *   · un 400 dice lo que mandó el back; un 5xx, «de nuestro lado» con la
 *     referencia; sólo la falta de respuesta habla de la conexión.
 *
 * La lectura del archivo (xlsx) se reemplaza: lo que se prueba acá es lo que
 * la persona ve y lo que viaja.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { ApiError } from '@/lib/api/client';
import { MENSAJES_DEL_EXTRACTO } from '@/lib/cobros/limites-del-extracto';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, toastMock, archivo } = vi.hoisted(() => ({
  api: { cargarExtracto: vi.fn(), cuentas: vi.fn() },
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  archivo: {
    encabezados: ['Fecha', 'Descripción', 'Valor'] as string[],
    filas: [] as Record<string, unknown>[],
  },
}));

vi.mock('@/lib/api/conciliacion-bancaria.service', () => ({ conciliacionBancariaApi: api }));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/components/inmobiliaria/import/lib/parseFile', () => ({
  leerPrimerasFilas: vi.fn(async () => [archivo.encabezados]),
  parseSpreadsheetFile: vi.fn(async () => ({
    headers: archivo.encabezados,
    rows: archivo.filas,
  })),
}));

/** Una cuenta de la inmobiliaria (su medio de pago), como la manda `GET …/cuentas`. */
function cuentaDe(id: string, nombre: string, sobre: Record<string, unknown> = {}) {
  return {
    id,
    nombre,
    tipo: 'TRANSFERENCIA',
    banco: 'Bancolombia',
    tipoDeCuenta: 'AHORROS',
    numeroEnmascarado: '•••• 6789',
    activa: true,
    via: 'SIN_DEFINIR',
    convenio: null,
    indicadores: {},
    ultimaCarga: null,
    cuadre: {},
    huecos: [],
    ...sobre,
  };
}
const CUENTA = cuentaDe('cta-1', 'Ahorros Bancolombia');
const conCuentas = (...cuentas: unknown[]) =>
  api.cuentas.mockResolvedValue({ disponible: true, motivo: null, cuentas, sinCuenta: null, pasarela: null });

import { CargarExtracto } from './CargarExtracto';

const REFERENCIA = 'ab12cd34';

let root: Root | null = null;
let host: HTMLDivElement | null = null;

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(<CargarExtracto onCargado={vi.fn()} />);
  });
  await esperar();
}

function $(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`No se encontró ${selector}`);
  return el;
}

/** Elegir el archivo: el `<input type=file>` y su `change`. */
async function elegirArchivo() {
  const input = $('[data-testid="archivo-de-extracto"]') as HTMLInputElement;
  const f = new File(['x'], 'extracto-sep.csv', { type: 'text/csv' });
  Object.defineProperty(input, 'files', { value: [f], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await esperar();
  await esperar();
}

async function cargar() {
  await act(async () => {
    $('[data-testid="cargar"]').click();
  });
  await esperar();
  await esperar();
}

const fila = (valor: string, detalle = 'TRANSFERENCIA PEREZ GOMEZ') => ({
  Fecha: '03/09/2026',
  Descripción: detalle,
  Valor: valor,
});

beforeEach(() => {
  api.cargarExtracto.mockReset();
  api.cuentas.mockReset();
  conCuentas(CUENTA);
  archivo.encabezados = ['Fecha', 'Descripción', 'Valor'];
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  toastMock.info.mockReset();
  archivo.filas = [fila('$ 1.800.000'), fila('-45.000', 'CUOTA DE MANEJO')];
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root!.unmount();
    });
  }
  root = null;
  host?.remove();
  host = null;
  document.body.innerHTML = '';
});

describe('CargarExtracto — el espejo del tope del back', () => {
  it('🔴 la línea con ceros de más NO viaja: se descarta con la frase del back y el resto se carga', async () => {
    archivo.filas = [fila('$ 1.800.000'), fila('18.000.000.000.000', 'SALDO LEIDO COMO VALOR')];
    api.cargarExtracto.mockResolvedValue({
      nuevas: 1,
      repetidas: 0,
      salidas: 0,
      descartadas: 0,
      yaPagadasPorPasarela: 0,
      pendientes: 1,
      seguras: 0,
      avisos: [],
    });
    await montar();
    await elegirArchivo();

    const previa = $('[data-testid="vista-previa"]').textContent ?? '';
    expect(previa).toContain('1 descartadas');
    expect(previa).toContain(MENSAJES_DEL_EXTRACTO.valorMaximo.replace(/\.$/, ''));

    await cargar();
    expect(api.cargarExtracto).toHaveBeenCalledTimes(1);
    const filas = api.cargarExtracto.mock.calls[0]![1] as { valorCop: number }[];
    expect(filas.map((f) => f.valorCop)).toEqual([1_800_000]);
  });

  it('🔴 una línea de $3.000.000.000 viaja; si el back todavía no la puede guardar, la pantalla lo dice', async () => {
    archivo.filas = [fila('$ 1.800.000'), fila('$ 3.000.000.000', 'VENTA APTO 1201')];
    const aviso =
      'Un movimiento de más de $2.000.000.000 no se cargó: todavía no podemos guardar valores tan grandes. Revisa que no sobren ceros; el resto del extracto sí entró.';
    api.cargarExtracto.mockResolvedValue({
      nuevas: 1,
      repetidas: 0,
      salidas: 0,
      descartadas: 1,
      descartadasPorValor: 1,
      yaPagadasPorPasarela: 0,
      pendientes: 1,
      seguras: 0,
      avisos: [aviso],
    });
    await montar();
    await elegirArchivo();
    await cargar();

    const filas = api.cargarExtracto.mock.calls[0]![1] as { valorCop: number }[];
    expect(filas.map((f) => f.valorCop)).toEqual([1_800_000, 3_000_000_000]);
    expect(toastMock.info).toHaveBeenCalledWith(aviso);
    const banner = document.body.textContent ?? '';
    expect(banner).toContain('1 sin cargar por su valor');
    expect(banner).not.toContain('descartadas por ilegibles');
  });

  it('🔴 más de 20.000 líneas no se mandan: se dice antes cómo dividirlo', async () => {
    archivo.filas = Array.from({ length: 20_001 }, () => fila('$ 10.000'));
    await montar();
    await elegirArchivo();

    expect($('[data-testid="extracto-muy-largo"]').textContent).toContain(MENSAJES_DEL_EXTRACTO.filasMaximas);
    expect(($('[data-testid="cargar"]') as HTMLButtonElement).disabled).toBe(true);
    await cargar();
    expect(api.cargarExtracto).not.toHaveBeenCalled();
  });
});

describe('CargarExtracto — los errores del back en palabras', () => {
  it('un 400 con campos dice lo que mandó el back (no hay un campo donde ponerlo)', async () => {
    const frase = MENSAJES_DEL_EXTRACTO.valorMaximo;
    api.cargarExtracto.mockRejectedValue(
      new ApiError(400, [frase], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [frase],
        campos: [{ campo: 'filas.0.valorCop', regla: 'maximo', mensaje: frase }],
      }),
    );
    await montar();
    await elegirArchivo();
    await cargar();
    expect(toastMock.error).toHaveBeenCalledWith(frase);
  });

  it('el 409 de la cuenta que recauda por archivo dice su motivo', async () => {
    const motivo =
      'La cuenta 00123456789 recauda por el archivo del convenio «Recaudo de arriendos»: su extracto no se carga.';
    api.cargarExtracto.mockRejectedValue(
      new ApiError(409, motivo, 'LA_CUENTA_ENTRA_POR_ARCHIVO', {
        statusCode: 409,
        code: 'LA_CUENTA_ENTRA_POR_ARCHIVO',
        message: motivo,
      }),
    );
    await montar();
    await elegirArchivo();
    await cargar();
    expect(toastMock.error).toHaveBeenCalledWith(motivo);
  });

  it('🔴 un 5xx dice «de nuestro lado» con la referencia, y no culpa a la conexión', async () => {
    api.cargarExtracto.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
        referencia: REFERENCIA,
      }),
    );
    await montar();
    await elegirArchivo();
    await cargar();
    const dicho = String(toastMock.error.mock.calls[0]![0]);
    expect(dicho).toContain('No pudimos cargar el extracto: algo falló de nuestro lado');
    expect(dicho).toContain(REFERENCIA);
    expect(dicho).not.toMatch(/conexi[oó]n/);
  });

  it('sin respuesta (la red): ahí sí se habla de la conexión', async () => {
    api.cargarExtracto.mockRejectedValue(new ApiError(0, 'Failed to fetch'));
    await montar();
    await elegirArchivo();
    await cargar();
    expect(String(toastMock.error.mock.calls[0]![0])).toMatch(/conexión/);
  });
});

describe('🔴 CargarExtracto — la cuenta OBLIGATORIA (Nico, P3, 02-10-2026)', () => {
  const ok = {
    nuevas: 2,
    repetidas: 0,
    salidas: 1,
    descartadas: 0,
    yaPagadasPorPasarela: 0,
    pendientes: 1,
    seguras: 0,
    avisos: [],
  };

  it('con UNA cuenta se elige sola y viaja su id', async () => {
    api.cargarExtracto.mockResolvedValue(ok);
    await montar();
    await elegirArchivo();
    expect(($('[data-testid="elegir-cuenta-del-extracto"]') as HTMLSelectElement).value).toBe('cta-1');
    await cargar();
    expect(api.cargarExtracto.mock.calls[0]![2]).toEqual(expect.objectContaining({ cuentaId: 'cta-1' }));
  });

  it('con varias, nada se elige solo: el botón no se aprieta hasta elegir', async () => {
    conCuentas(CUENTA, cuentaDe('cta-2', 'Corriente Davivienda'));
    await montar();
    await elegirArchivo();
    expect(($('[data-testid="cargar"]') as HTMLButtonElement).disabled).toBe(true);
    expect($('[data-testid="falta-la-cuenta"]').textContent).toContain('Elige arriba la cuenta');
  });

  it('sin ninguna cuenta registrada: dice dónde registrarla y no deja cargar', async () => {
    conCuentas();
    await montar();
    await elegirArchivo();
    const aviso = $('[data-testid="sin-cuentas"]');
    expect(aviso.textContent).toContain('Configuración → Medios de pago');
    expect(aviso.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/configuracion/medios-de-pago');
    expect(($('[data-testid="cargar"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('🔴 el archivo parece de OTRA cuenta (409): se pregunta, y al confirmar se reenvía con la confirmación', async () => {
    const mensaje = '2 de las 2 líneas de este archivo ya están cargadas en Corriente Davivienda •••• 1234. ¿Elegiste bien la cuenta?';
    api.cargarExtracto
      .mockRejectedValueOnce(
        new ApiError(409, mensaje, 'EXTRACTO_DE_OTRA_CUENTA', { statusCode: 409, code: 'EXTRACTO_DE_OTRA_CUENTA', message: mensaje }),
      )
      .mockResolvedValueOnce(ok);
    await montar();
    await elegirArchivo();
    await cargar();
    expect(toastMock.error).not.toHaveBeenCalled();
    expect($('[data-testid="de-otra-cuenta"]').textContent).toContain('ya están cargadas en Corriente Davivienda');
    await act(async () => {
      $('[data-testid="confirmar-de-esta-cuenta"]').click();
    });
    await esperar();
    await esperar();
    expect(api.cargarExtracto).toHaveBeenCalledTimes(2);
    expect(api.cargarExtracto.mock.calls[1]![2]).toEqual(
      expect.objectContaining({ cuentaId: 'cta-1', aceptarIgualesDeOtraCuenta: true }),
    );
  });
});

describe('🔴 CargarExtracto — los saldos y el período (Fase 1)', () => {
  async function escribir(testid: string, valor: string) {
    const el = $(`[data-testid="${testid}"]`) as HTMLInputElement;
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      set.call(el, valor);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  it('con los dos saldos escritos dice EN VIVO si cuadra, y los manda', async () => {
    api.cargarExtracto.mockResolvedValue({
      nuevas: 2,
      repetidas: 0,
      salidas: 1,
      descartadas: 0,
      yaPagadasPorPasarela: 0,
      pendientes: 1,
      seguras: 0,
      avisos: [],
    });
    await montar();
    await elegirArchivo();
    await escribir('saldo-inicial', '$ 10.000.000');
    await escribir('saldo-final', '11.755.000');
    expect($('[data-testid="cuadre-en-vivo"]').textContent).toContain('Cuadra');
    await escribir('saldo-final', '12.000.000');
    expect($('[data-testid="cuadre-en-vivo"]').textContent).toContain('No cuadra por');
    await cargar();
    expect(api.cargarExtracto.mock.calls[0]![2]).toEqual(
      expect.objectContaining({ saldoInicialCop: 10_000_000, saldoFinalCop: 12_000_000 }),
    );
    // El período que salió de las líneas no viaja: el back lo saca de las mismas líneas.
    expect(api.cargarExtracto.mock.calls[0]![2]).not.toHaveProperty('desde', expect.any(String));
  });

  it('la columna «Saldo» del archivo se lee y viaja con cada línea', async () => {
    archivo.encabezados = ['Fecha', 'Descripción', 'Valor', 'Saldo'];
    archivo.filas = [
      { ...fila('$ 1.800.000'), Saldo: '$ 11.800.000' },
      { ...fila('-45.000', 'CUOTA DE MANEJO'), Saldo: '11.755.000' },
    ];
    api.cargarExtracto.mockResolvedValue({
      nuevas: 2,
      repetidas: 0,
      salidas: 1,
      descartadas: 0,
      yaPagadasPorPasarela: 0,
      pendientes: 1,
      seguras: 0,
      avisos: [],
    });
    await montar();
    await elegirArchivo();
    expect($('[data-testid="ayuda-de-los-saldos"]').textContent).toContain('columna «Saldo»');
    await cargar();
    const filas = api.cargarExtracto.mock.calls[0]![1] as { saldoCop?: number }[];
    expect(filas.map((f) => f.saldoCop)).toEqual([11_800_000, 11_755_000]);
  });
});
