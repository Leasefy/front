/**
 * Tanda 2 del sistema de errores (02-10-2026): la tesorería dice POR QUÉ falló.
 *
 * Antes cada pantalla pintaba `error.message` crudo: un 5xx salía como «Error
 * interno del servidor» sin referencia, la red caída y un dato mal puesto se
 * leían igual, y el valor a devolver con ceros de más (o vacío, que viajaba
 * como «devolver todo») no se atajaba. Lo que estas pruebas cuidan:
 *
 *   · el espejo del tope del back: lo que el back rechaza se dice DEBAJO del
 *     campo, con la misma frase, y no viaja;
 *   · un 400 con `campos` va a su campo y le da el foco;
 *   · un 5xx dice «de nuestro lado» con la referencia; sólo sin respuesta se
 *     habla de la conexión.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 10-10-2026: las fechas son campos de Cadence (se eligen, no se escriben); en la
// prueba, un <input> con el mismo id y data-testid (`campos-de-fecha.doble-de-prueba`).
vi.mock('@/components/contabilidad/CampoDeDia', () => import('@/components/ui/campos-de-fecha.doble-de-prueba'));
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { ApiError } from '@/lib/api/client';
import type {
  CalendarioDelAnio,
  ListaDeAplicables,
  ListaDeConvenios,
  ListaDeTraslados,
  PropuestaDeTraslado,
} from '@/lib/api/tesoreria.types';
import { MENSAJES_DE_LA_DEVOLUCION, MENSAJES_DE_TESORERIA } from '@/lib/tesoreria/limites-de-tesoreria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  listarConvenios: vi.fn(),
  previa: vi.fn(),
  importar: vi.fn(),
  pendientes: vi.fn(),
  aplicarPendiente: vi.fn(),
  devolverPendiente: vi.fn(),
  listarTraslados: vi.fn(),
  propuestaDeTraslado: vi.fn(),
  proponerTraslado: vi.fn(),
  aprobarTraslado: vi.fn(),
  rechazarTraslado: vi.fn(),
  calendario: vi.fn(),
  corregirCalendario: vi.fn(),
  borrarCorreccion: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/lib/api/tesoreria.service', () => ({
  tesoreriaApi: {
    listarConvenios: h.listarConvenios,
    previa: h.previa,
    importar: h.importar,
    pendientes: h.pendientes,
    aplicarPendiente: h.aplicarPendiente,
    devolverPendiente: h.devolverPendiente,
    listarTraslados: h.listarTraslados,
    propuestaDeTraslado: h.propuestaDeTraslado,
    proponerTraslado: h.proponerTraslado,
    aprobarTraslado: h.aprobarTraslado,
    rechazarTraslado: h.rechazarTraslado,
    calendario: h.calendario,
    corregirCalendario: h.corregirCalendario,
    borrarCorreccion: h.borrarCorreccion,
  },
}));

vi.mock('@/components/ui/toast', () => ({
  toast: {
    success: vi.fn(),
    error: (...a: unknown[]) => h.toastError(...a),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

import { RecaudoBancarioPanel } from './RecaudoBancario';
import { PendientesDeAplicarPanel } from './PendientesDeAplicar';
import { TrasladoDeComisionPanel } from './TrasladoDeComision';
import { CalendarioDeFestivosPanel } from './CalendarioDeFestivos';

const REFERENCIA = 'ab12cd34';

const cincoXX = () =>
  new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
    statusCode: 500,
    code: 'ERROR_INTERNO',
    message: 'Error interno del servidor',
    referencia: REFERENCIA,
  });

const sinRed = () => new ApiError(0, 'Failed to fetch');

function cuatroCientos(campo: string, mensaje: string, regla = 'maximo') {
  return new ApiError(400, [mensaje], 'DATOS_INVALIDOS', {
    statusCode: 400,
    code: 'DATOS_INVALIDOS',
    message: [mensaje],
    campos: [{ campo, regla, mensaje }],
  });
}

let contenedor: HTMLDivElement;
let root: Root;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  vi.clearAllMocks();
});

afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
  document.body.innerHTML = '';
});

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function pintar(nodo: React.ReactElement) {
  await act(async () => {
    root.render(nodo);
  });
  await esperar();
}

function $(selector: string): HTMLElement {
  const el = document.body.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`No se encontró ${selector}`);
  return el;
}

async function clic(selector: string) {
  await act(async () => {
    $(selector).click();
  });
  await esperar();
}

/** React descarta un `.value` asignado a mano: hay que usar el setter nativo. */
async function escribir(selector: string, valor: string) {
  const el = $(selector) as HTMLInputElement | HTMLTextAreaElement;
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
  await act(async () => {
    setter.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

const dichoAlAviso = () => String(h.toastError.mock.calls[0]?.[0] ?? '');

// ── El recaudo por convenio ─────────────────────────────────────────────────

const UN_CONVENIO: ListaDeConvenios = {
  disponible: true,
  motivo: null,
  convenios: [
    {
      id: 'c-1',
      banco: 'Bancolombia',
      codigo: '90210',
      nombre: 'Recaudo de arriendos',
      activo: true,
      tipo: 'DELIMITADO',
      separador: ';',
      columnas: { referencia: { indice: 0 }, valor: { indice: 2 } },
      formatoDeFecha: 'DD/MM/YYYY',
      decimales: 0,
      lineasDeEncabezado: 0,
      lineasDePie: 0,
      marcaDeDetalle: null,
      marcaEn: null,
      referenciaLargo: 10,
      referenciaPrefijo: null,
      referenciaDv: 'MODULO_10',
      cuentaBancaria: '001-234567-89',
      viaDeEntrada: 'ARCHIVO',
      viaDeEntradaNombre: 'Archivo de recaudo del convenio',
      ejemploDeReferencia: '00000018507',
      avisos: [],
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
  ],
  tipos: [],
  formatosDeFecha: [],
  presets: [],
  viasDeEntrada: [],
};

async function elegirArchivoDeRecaudo() {
  const input = $('[data-testid="archivo-de-recaudo"]') as HTMLInputElement;
  const f = new File(['0000001850;18/09/2026;1200000'], 'recaudo.txt', { type: 'text/plain' });
  Object.defineProperty(input, 'files', { value: [f], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await esperar();
  await esperar();
}

describe('el recaudo bancario — la previa dice por qué falló', () => {
  beforeEach(() => {
    h.listarConvenios.mockResolvedValue(UN_CONVENIO);
  });

  it('un 400 del formato dice lo que mandó el back', async () => {
    const motivo = 'El formato de este convenio no se puede aplicar: la referencia y la fecha se pisan.';
    h.previa.mockRejectedValue(
      new ApiError(400, motivo, 'FORMATO_DEL_CONVENIO_INVALIDO', {
        statusCode: 400,
        code: 'FORMATO_DEL_CONVENIO_INVALIDO',
        message: motivo,
      }),
    );
    await pintar(<RecaudoBancarioPanel />);
    await elegirArchivoDeRecaudo();
    expect(h.toastError).toHaveBeenCalledWith(motivo);
  });

  it('🔴 un 5xx dice «de nuestro lado» con la referencia, y no culpa a la conexión', async () => {
    h.previa.mockRejectedValue(cincoXX());
    await pintar(<RecaudoBancarioPanel />);
    await elegirArchivoDeRecaudo();
    expect(dichoAlAviso()).toContain('No pudimos leer el archivo con el formato del convenio: algo falló de nuestro lado');
    expect(dichoAlAviso()).toContain(REFERENCIA);
    expect(dichoAlAviso()).not.toMatch(/conexi[oó]n/);
  });

  it('sin respuesta (la red): ahí sí se habla de la conexión', async () => {
    h.previa.mockRejectedValue(sinRed());
    await pintar(<RecaudoBancarioPanel />);
    await elegirArchivoDeRecaudo();
    expect(dichoAlAviso()).toMatch(/conexión/);
  });

  it('🔴 un 5xx al IMPORTAR también, con su acción y la referencia', async () => {
    h.previa.mockResolvedValue({
      convenio: { id: 'c-1', nombre: 'Recaudo de arriendos', banco: 'Bancolombia' },
      lineas: 1,
      validas: 1,
      omitidas: 0,
      totalCop: 1_200_000,
      rechazadas: [],
      muestra: [],
      avisos: [],
      yaImportado: null,
      puedeImportarse: true,
    });
    h.importar.mockRejectedValue(cincoXX());
    await pintar(<RecaudoBancarioPanel />);
    await elegirArchivoDeRecaudo();
    await clic('[data-testid="importar-recaudo"]');
    expect(dichoAlAviso()).toContain('No pudimos importar el archivo: algo falló de nuestro lado');
    expect(dichoAlAviso()).toContain(REFERENCIA);
  });
});

// ── La plata pendiente de aplicar ───────────────────────────────────────────

const PENDIENTES: ListaDeAplicables = {
  disponible: true,
  motivo: null,
  totalAplicableCop: 400_000,
  aplicables: [
    {
      pendiente: {
        id: 'p-1',
        contractId: 'k-1',
        tenantId: 't-1',
        nombre: 'Ana Pérez',
        origen: 'SINIESTRO',
        pagadorTipo: 'ASEGURADORA',
        aseguradoraId: 'a-1',
        pagadorNombre: 'Seguros Bolívar',
        siniestroReferencia: 'SIN-42',
        valorCop: 400_000,
        aplicadoCop: 0,
        devueltoCop: 0,
        saldoCop: 400_000,
        estado: 'PENDIENTE',
        fecha: '2026-09-16',
        medio: 'transferencia',
        referencia: null,
        notas: null,
        motivo: null,
        createdAt: '2026-09-16T00:00:00.000Z',
        movimientos: [],
      },
      vencidoCop: 1_000_000,
      aplicableCop: 400_000,
      porQue: 'Hay deuda vencida.',
    },
  ],
};

async function abrirLaDevolucion(valor: string, motivo = 'La aseguradora reclamó el excedente.') {
  await pintar(<PendientesDeAplicarPanel />);
  await clic('[data-testid="devolver-p-1"]');
  await escribir('#valor-a-devolver', valor);
  await escribir('#motivo-de-la-devolucion', motivo);
  await clic('[data-testid="confirmar-devolucion"]');
}

describe('la devolución de un pendiente — el espejo del tope', () => {
  beforeEach(() => {
    h.pendientes.mockResolvedValue(PENDIENTES);
  });

  it('🔴 un valor con ceros de más se ataja DEBAJO del campo, con la frase del back, y no viaja', async () => {
    await abrirLaDevolucion('15000000000');
    expect(h.devolverPendiente).not.toHaveBeenCalled();
    expect($('#valor-a-devolver-error').textContent).toBe(MENSAJES_DE_TESORERIA.valorMaximo);
    expect($('#valor-a-devolver').getAttribute('aria-describedby')).toBe('valor-a-devolver-error');
    expect(document.activeElement?.id).toBe('valor-a-devolver');
  });

  it('🔴 vacío ya no viaja como «devolver todo»: pide el valor', async () => {
    await abrirLaDevolucion('');
    expect(h.devolverPendiente).not.toHaveBeenCalled();
    expect($('#valor-a-devolver-error').textContent).toBe(MENSAJES_DE_LA_DEVOLUCION.valorFalta);
  });

  it('más de lo que queda pendiente se dice con el saldo, y no viaja', async () => {
    await abrirLaDevolucion('500000');
    expect(h.devolverPendiente).not.toHaveBeenCalled();
    expect($('#valor-a-devolver-error').textContent).toBe(MENSAJES_DE_LA_DEVOLUCION.masQueElSaldo(400_000));
  });

  it('un valor válido viaja como número, con el motivo', async () => {
    h.devolverPendiente.mockResolvedValue({ pendiente: {}, avisos: [] });
    await abrirLaDevolucion('300000');
    expect(h.devolverPendiente).toHaveBeenCalledWith('p-1', 'La aseguradora reclamó el excedente.', 300_000);
  });
});

describe('la devolución de un pendiente — los errores del back', () => {
  beforeEach(() => {
    h.pendientes.mockResolvedValue(PENDIENTES);
  });

  it('🔴 un 400 con campos va a SU campo (valorCop → «Cuánto») y le da el foco', async () => {
    h.devolverPendiente.mockRejectedValue(cuatroCientos('valorCop', MENSAJES_DE_TESORERIA.valorMaximo));
    await abrirLaDevolucion('300000');
    expect($('#valor-a-devolver-error').textContent).toBe(MENSAJES_DE_TESORERIA.valorMaximo);
    expect(document.activeElement?.id).toBe('valor-a-devolver');
    expect(h.toastError).not.toHaveBeenCalled();
  });

  it('🔴 un 5xx dice «de nuestro lado» con la referencia', async () => {
    h.devolverPendiente.mockRejectedValue(cincoXX());
    await abrirLaDevolucion('300000');
    expect(dichoAlAviso()).toContain('No pudimos registrar la devolución: algo falló de nuestro lado');
    expect(dichoAlAviso()).toContain(REFERENCIA);
  });

  it('sin respuesta (la red): ahí sí se habla de la conexión', async () => {
    h.devolverPendiente.mockRejectedValue(sinRed());
    await abrirLaDevolucion('300000');
    expect(dichoAlAviso()).toMatch(/conexión/);
  });

  it('aplicar con un 5xx también dice «de nuestro lado» con la referencia', async () => {
    h.aplicarPendiente.mockRejectedValue(cincoXX());
    await pintar(<PendientesDeAplicarPanel />);
    await clic('[data-testid="aplicar-p-1"]');
    expect(dichoAlAviso()).toContain('No pudimos aplicar la plata pendiente: algo falló de nuestro lado');
    expect(dichoAlAviso()).toContain(REFERENCIA);
  });
});

// ── El traslado de la comisión ──────────────────────────────────────────────

const PROPUESTA: PropuestaDeTraslado = {
  disponible: true,
  periodo: '2026-08',
  comisionCop: 4_000_000,
  ivaComisionCop: 760_000,
  retencionesComisionCop: 140_000,
  interesesCop: 300_000,
  gastosDeCobranzaCop: 0,
  totalCop: 0,
  yaTrasladadoCop: 4_920_000,
  hayQueTrasladar: false,
  renglones: [],
  avisos: [],
} as unknown as PropuestaDeTraslado;

const UN_PROPUESTO: ListaDeTraslados = {
  disponible: true,
  propuestos: [
    {
      id: 't-1',
      origen: 'MES',
      loteId: null,
      periodo: '2026-08',
      comisionCop: 4_000_000,
      ivaComisionCop: 760_000,
      retencionesComisionCop: 140_000,
      interesesCop: 300_000,
      gastosDeCobranzaCop: 0,
      totalCop: 4_920_000,
      estado: 'PROPUESTO',
      fecha: null,
      comprobanteNumero: null,
      asientoId: null,
      motivo: null,
      propuestoPorUserId: null,
      aprobadoPorUserId: null,
      aprobadoAt: null,
      createdAt: '2026-09-01T00:00:00.000Z',
    },
  ],
  recientes: [],
} as unknown as ListaDeTraslados;

describe('el traslado de la comisión — los errores del back', () => {
  beforeEach(() => {
    h.propuestaDeTraslado.mockResolvedValue(PROPUESTA);
    h.listarTraslados.mockResolvedValue(UN_PROPUESTO);
  });

  it('🔴 aprobar con un 5xx dice «de nuestro lado» con la referencia', async () => {
    h.aprobarTraslado.mockRejectedValue(cincoXX());
    await pintar(<TrasladoDeComisionPanel />);
    await clic('[data-testid="aprobar-t-1"]');
    expect(dichoAlAviso()).toContain('No pudimos aprobar el traslado: algo falló de nuestro lado');
    expect(dichoAlAviso()).toContain(REFERENCIA);
  });

  it('un 400 del motivo del rechazo va debajo del motivo, con el foco', async () => {
    h.rechazarTraslado.mockRejectedValue(
      cuatroCientos('motivo', MENSAJES_DE_TESORERIA.motivoLargo, 'longitud_maxima'),
    );
    await pintar(<TrasladoDeComisionPanel />);
    await clic('[data-testid="rechazar-t-1"]');
    await escribir('#motivo-del-rechazo', 'Se traslada junto con la de octubre.');
    await clic('[data-testid="confirmar-rechazo"]');
    expect($('#motivo-del-rechazo-error').textContent).toBe(MENSAJES_DE_TESORERIA.motivoLargo);
    expect(document.activeElement?.id).toBe('motivo-del-rechazo');
    expect(h.toastError).not.toHaveBeenCalled();
  });
});

// ── El calendario de festivos ───────────────────────────────────────────────

const CALENDARIO: CalendarioDelAnio = {
  anio: 2026,
  puedeCorregir: true,
  motivo: null,
  activos: 1,
  diasDistintos: 1,
  dias: [
    {
      fecha: '2026-12-25',
      nombre: 'Navidad',
      activo: true,
      origen: 'CORRECCION',
      trasladado: false,
      deLaInmobiliaria: true,
      correccionId: 'f-1',
    },
  ],
} as unknown as CalendarioDelAnio;

describe('el calendario de festivos — el espejo del tope y los errores', () => {
  beforeEach(() => {
    h.calendario.mockResolvedValue(CALENDARIO);
  });

  it('🔴 una fecha fuera de 2000–2100 se ataja debajo de la fecha, con la frase del back, y no viaja', async () => {
    await pintar(<CalendarioDeFestivosPanel />);
    await escribir('#fecha-del-festivo', '1999-12-31');
    await escribir('#nombre-del-festivo', 'Día de la familia');
    await clic('[data-testid="agregar-festivo"]');
    expect(h.corregirCalendario).not.toHaveBeenCalled();
    expect($('#fecha-del-festivo-error').textContent).toBe(MENSAJES_DE_TESORERIA.fechaDelFestivoFueraDeRango);
    expect(document.activeElement?.id).toBe('fecha-del-festivo');
  });

  it('🔴 un 400 con campos va a SU campo y le da el foco', async () => {
    h.corregirCalendario.mockRejectedValue(
      cuatroCientos('nombre', MENSAJES_DE_TESORERIA.nombreDelFestivoLargo, 'longitud_maxima'),
    );
    await pintar(<CalendarioDeFestivosPanel />);
    await escribir('#fecha-del-festivo', '2026-12-31');
    await escribir('#nombre-del-festivo', 'Día de la familia');
    await clic('[data-testid="agregar-festivo"]');
    expect($('#nombre-del-festivo-error').textContent).toBe(MENSAJES_DE_TESORERIA.nombreDelFestivoLargo);
    expect(document.activeElement?.id).toBe('nombre-del-festivo');
    expect(h.toastError).not.toHaveBeenCalled();
  });

  it('quitar una corrección con un 5xx dice «de nuestro lado» con la referencia', async () => {
    h.borrarCorreccion.mockRejectedValue(cincoXX());
    await pintar(<CalendarioDeFestivosPanel />);
    await clic('[data-testid="borrar-2026-12-25"]');
    expect(dichoAlAviso()).toContain('No pudimos borrar la corrección: algo falló de nuestro lado');
    expect(dichoAlAviso()).toContain(REFERENCIA);
  });
});
