/**
 * «Este movimiento son N recibos» — la tarjeta en la fila del extracto y el
 * cajón para corregirla, con el API mockeado (02-10-2026).
 *
 * Se monta la pantalla entera (`ExtractoBancario`) para probar también lo que
 * pasa DESPUÉS de conciliar: la fila se va y los números de arriba se
 * refrescan, igual que al conciliar una fila contra una cuota.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type {
  MovimientoBancario,
  PropuestaMuchosAUno,
  ReciboDeLaPropuesta,
  RespuestaRecibosQueSuman,
  ResumenDeConciliacion,
} from '@/lib/api/conciliacion-bancaria.types';
import { ApiError } from '@/lib/api/client';
import { plata } from './formato';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, toastMock, permisos, movimientoReducido } = vi.hoisted(() => ({
  api: {
    listar: vi.fn(),
    resumen: vi.fn(),
    conciliar: vi.fn(),
    ignorar: vi.fn(),
    reabrir: vi.fn(),
    conciliarSeguros: vi.fn(),
    cargarExtracto: vi.fn(),
    loteActual: vi.fn(),
    armarLote: vi.fn(),
    aprobarLote: vi.fn(),
    reversarLote: vi.fn(),
    recibosQueSuman: vi.fn(),
    conciliarConRecibos: vi.fn(),
  },
  toastMock: { success: vi.fn(), error: vi.fn() },
  permisos: {
    canAccess: vi.fn((_modulo: string, _accion: string) => true),
    isLoading: false,
    isAdmin: true,
    agencyRole: 'ADMIN' as string | null,
  },
  movimientoReducido: { valor: false },
}));

vi.mock('@/lib/api/conciliacion-bancaria.service', () => ({ conciliacionBancariaApi: api }));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => permisos }));
vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: ({ error }: { error: unknown }) => (
    <div data-testid="fallo-de-carga">{error instanceof Error ? error.message : String(error)}</div>
  ),
}));
vi.mock('@/components/inmobiliaria/import/lib/parseFile', () => ({ parseSpreadsheetFile: vi.fn() }));
vi.mock('@/components/inmobiliaria/ReciboPorCliente', () => ({ ElegirCliente: () => null }));
// El cajón como DOM plano (sin Radix ni portal): lo que se prueba es su contenido.
vi.mock('@/components/ui/sheet', async () => ({
  ...(await import('@/components/ui/sheet-test-stub')),
  SheetContent: ({ children, ...resto }: Record<string, unknown> & { children?: React.ReactNode }) => (
    <div data-testid={resto['data-testid'] as string | undefined}>{children}</div>
  ),
}));
// Movimiento reducido a voluntad: el resto de framer-motion es el de verdad.
vi.mock('framer-motion', async (original) => ({
  ...(await original<typeof import('framer-motion')>()),
  useReducedMotion: () => movimientoReducido.valor,
}));

import { ExtractoBancario } from './ExtractoBancario';

// ── Datos ───────────────────────────────────────────────────────────────────

const BOLIVAR = { nombre: 'Seguros Bolívar', nit: '860002503', siniestroReferencia: null };

function recibo(id: string, numero: number, valorCop: number, sobre: Partial<ReciboDeLaPropuesta> = {}) {
  return {
    id,
    numero,
    valorCop,
    fecha: '2026-09-28T00:00:00.000Z',
    medio: 'transferencia',
    tenantName: `Inquilino ${numero}`,
    propertyTitle: `Apto ${numero}`,
    pagador: BOLIVAR,
    ...sobre,
  } satisfies ReciboDeLaPropuesta;
}

const SEIS = [
  recibo('r-1', 101, 2_080_000, { tenantName: 'Laura Pérez Gómez', propertyTitle: 'Apto 301' }),
  recibo('r-2', 102, 2_080_000),
  recibo('r-3', 103, 2_080_000),
  recibo('r-4', 104, 2_080_000),
  recibo('r-5', 105, 2_080_000),
  recibo('r-6', 106, 2_080_000),
];

function propuesta(recibos: ReciboDeLaPropuesta[], sobre: Partial<PropuestaMuchosAUno> = {}): PropuestaMuchosAUno {
  return {
    reciboIds: recibos.map((r) => r.id),
    recibos,
    sumaCop: recibos.reduce((s, r) => s + r.valorCop, 0),
    diferencia: null,
    confianza: 0.98,
    nivel: 'alta',
    deCadaDiez: 10,
    unica: true,
    porQue: [
      'Los 6 recibos de Seguros Bolívar (NIT 860002503) suman exacto $12.480.000.',
      'El NIT del pagador viene en la descripción del banco.',
    ],
    ...sobre,
  };
}

const ALTA = propuesta(SEIS);

function movimiento(sobre: Partial<MovimientoBancario> = {}): MovimientoBancario {
  return {
    id: 'm-1',
    agencyId: 'a-1',
    fecha: '2026-09-30T00:00:00.000Z',
    valorCop: 12_480_000,
    descripcion: 'ABONO INTERBANCARIO NIT 860002503 SEGUROS BOLIVAR',
    referencia: null,
    extractoNombre: 'sep.csv',
    estado: 'PENDIENTE',
    cobroId: null,
    reciboId: null,
    motivoIgnorado: null,
    conciliadoPorUserId: null,
    conciliadoAt: null,
    cargadoPorUserId: 'u-1',
    createdAt: '2026-10-01T00:00:00.000Z',
    candidatos: [],
    recibo: null,
    muchosAUno: { mejor: ALTA, ambigua: false, total: 1, parcial: null },
    ...sobre,
  };
}

// Ambigua: dos parejas distintas suman lo mismo ($1.800.000).
const A = recibo('r-a', 201, 1_000_000, { pagador: null, tenantName: 'Ana Ríos' });
const B = recibo('r-b', 202, 800_000, { pagador: null, tenantName: 'Beatriz Gómez' });
const C = recibo('r-c', 203, 1_000_000, { pagador: null, tenantName: 'Carlos Ruiz' });
const D = recibo('r-d', 204, 800_000, { pagador: null, tenantName: 'Diana López' });
const OPCION_1 = propuesta([A, B], {
  confianza: 0.55,
  nivel: 'media',
  unica: false,
  porQue: ['Hay otra combinación que suma lo mismo: no elijo a ciegas.'],
});
const OPCION_2 = propuesta([C, D], { confianza: 0.55, nivel: 'media', unica: false, porQue: [] });

function ambigua(): MovimientoBancario {
  return movimiento({
    id: 'm-2',
    valorCop: 1_800_000,
    descripcion: 'CONSIGNACION NACIONAL',
    muchosAUno: { mejor: OPCION_1, ambigua: true, total: 2, parcial: null },
  });
}

const RESPUESTA_AMBIGUA: RespuestaRecibosQueSuman = {
  propuestas: [OPCION_1, OPCION_2],
  ambigua: true,
  agotada: false,
  parcial: null,
  movimiento: {
    id: 'm-2',
    fecha: '2026-09-30',
    valorCop: 1_800_000,
    descripcion: 'CONSIGNACION NACIONAL',
    referencia: null,
    estado: 'PENDIENTE',
    extractoNombre: 'extracto.csv',
  },
  sePuedeAplicar: true,
};

// GMF: el banco trae la suma menos el 4×1000.
const GMF = propuesta([recibo('r-g1', 301, 3_000_000), recibo('r-g2', 302, 2_000_000)], {
  confianza: 0.81,
  nivel: 'media',
  deCadaDiez: 5,
  diferencia: {
    tipo: 'GMF_4X1000',
    valorCop: 20_000,
    regla: 'El banco descontó el 4×1000 (GMF) de la suma de los recibos.',
  },
  porQue: ['Los 2 recibos suman $5.000.000 y el banco trae $4.980.000: la diferencia es el 4×1000.'],
});

const RESUMEN: ResumenDeConciliacion = {
  pendientes: 3,
  ignorados: 0,
  conciliadosEsteMes: 1,
  ultimoExtracto: { nombre: 'sep.csv', cargadoAt: '2026-10-01T10:00:00.000Z' },
};

// ── Montaje ─────────────────────────────────────────────────────────────────

let root: Root | null = null;
let contenedor: HTMLDivElement | null = null;

async function esperar(ms = 0) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

async function montar(filas: MovimientoBancario[]) {
  api.listar.mockResolvedValue({ data: filas, total: filas.length, limite: 50, desplazamiento: 0 });
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  await act(async () => {
    root!.render(<ExtractoBancario />);
  });
  await esperar();
  await esperar();
}

function $(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`No se encontró ${selector}`);
  return el;
}

function boton(testId: string): HTMLButtonElement {
  return $(`[data-testid="${testId}"]`) as HTMLButtonElement;
}

async function clic(el: HTMLElement) {
  await act(async () => {
    el.click();
  });
  await esperar();
  await esperar();
}

/** Hasta que la condición se cumpla (las animaciones de salida corren con rAF). */
async function hastaQue(condicion: () => boolean, maximoMs = 2000) {
  const inicio = Date.now();
  while (!condicion()) {
    if (Date.now() - inicio > maximoMs) throw new Error('La condición no se cumplió a tiempo');
    await esperar(20);
  }
}

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  permisos.canAccess.mockReset();
  permisos.canAccess.mockReturnValue(true);
  movimientoReducido.valor = false;
  api.resumen.mockResolvedValue(RESUMEN);
  api.loteActual.mockResolvedValue({ disponible: true, propuesto: null, recientes: [] });
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root!.unmount();
    });
  }
  root = null;
  document.body.innerHTML = '';
});

// ── La propuesta clara ──────────────────────────────────────────────────────

describe('muchos a uno — la propuesta clara (alta)', () => {
  it('muestra los recibos, la suma contra el banco, la confianza y el porqué', async () => {
    await montar([movimiento()]);
    const tarjeta = $('[data-testid="muchos-a-uno-m-1"]');
    expect(tarjeta.getAttribute('data-ambigua')).toBe('false');
    expect(tarjeta.textContent).toContain('Este movimiento son 6 recibos');

    // Los recibos: número, valor, inquilino, inmueble, medio y quién pagó.
    const primero = $('[data-testid="recibo-r-1"]').textContent ?? '';
    expect(primero).toContain('N.º 101');
    expect(primero).toContain(plata(2_080_000));
    expect(primero).toContain('Laura Pérez Gómez');
    expect(primero).toContain('Apto 301');
    expect(primero).toContain('Transferencia');
    expect(primero).toContain('Pagó Seguros Bolívar (NIT 860002503)');
    // Cinco a la vista y el sexto detrás de «Ver los otros…».
    expect(tarjeta.textContent).toContain('Ver los otros 1 recibos');

    // La suma cuenta hasta el valor exacto (lo lee el lector de pantalla).
    const suma = $('[data-testid="suma-m-1"]');
    expect(suma.querySelector('[data-valor]')?.getAttribute('data-valor')).toBe('12480000');
    expect(suma.textContent).toContain(`de ${plata(12_480_000)} del banco`);
    expect(suma.querySelector('.sr-only')?.textContent).toBe(plata(12_480_000));
    // ARREGLOS-5 (Nico Q6 a): «Calza exacto» es sólo el del lote; aquí, la suma.
    expect(tarjeta.querySelector('[data-testid="calza"]')?.textContent).toContain('Suma exacta');

    // 🔴 Nico (C1-MEDIR Q1): sólo el nivel y, si hay número, el MEDIDO.
    const confianza = $('[data-testid="confianza"]');
    expect(confianza.getAttribute('data-nivel')).toBe('alta');
    expect(confianza.textContent).toContain('Confianza alta');
    expect(confianza.textContent).not.toContain('%');
    expect($('[data-testid="confianza-medida"]').textContent).toBe('de cada 10 así, 10 son la correcta');
    expect(tarjeta.textContent).toContain('El NIT del pagador viene en la descripción del banco.');

    expect(boton('aprobar-recibos-m-1').disabled).toBe(false);
  });

  it('«Aprobar» manda los ids de la propuesta y la fila se va con los números refrescados', async () => {
    api.conciliarConRecibos.mockResolvedValue({
      movimiento: { ...movimiento(), estado: 'CONCILIADO' },
      recibos: SEIS.map((r) => ({ id: r.id, numero: r.numero, valorCop: r.valorCop })),
      vinculos: SEIS.map((r) => ({ reciboId: r.id, valorCop: r.valorCop })),
    });
    await montar([movimiento()]);
    expect(api.resumen).toHaveBeenCalledTimes(1);

    // Después de conciliar, el back ya no la trae y hay una pendiente menos.
    api.resumen.mockResolvedValue({ ...RESUMEN, pendientes: 2, conciliadosEsteMes: 2 });
    api.listar.mockResolvedValue({ data: [], total: 0, limite: 50, desplazamiento: 0 });

    await clic(boton('aprobar-recibos-m-1'));
    expect(api.conciliarConRecibos).toHaveBeenCalledWith('m-1', ['r-1', 'r-2', 'r-3', 'r-4', 'r-5', 'r-6']);
    expect(toastMock.success).toHaveBeenCalledWith(
      'Movimiento conciliado con 6 recibos (N.º 101, 102, 103, 104, 105 y 106).',
    );

    // La tarjeta sale y DESPUÉS se vuelve a leer: la fila y el número cambian.
    await hastaQue(() => api.resumen.mock.calls.length === 2);
    await esperar();
    expect(document.querySelector('[data-testid="movimiento-m-1"]')).toBeNull();
    expect($('[data-testid="pestana-PENDIENTE"]').textContent).toContain('(2)');
  });

  it('con una diferencia GMF la muestra con su regla y no dice «calza»', async () => {
    await montar([
      movimiento({ id: 'm-3', valorCop: 4_980_000, muchosAUno: { mejor: GMF, ambigua: false, total: 1, parcial: null } }),
    ]);
    const tarjeta = $('[data-testid="muchos-a-uno-m-3"]');
    const diferencia = $('[data-testid="diferencia-m-3"]').textContent ?? '';
    expect(diferencia).toContain(`Diferencia de ${plata(20_000)} por GMF (4×1000)`);
    expect(diferencia).toContain('El banco descontó el 4×1000 (GMF) de la suma de los recibos.');
    expect(diferencia).toContain('No se aplica sola: tú decides si la apruebas.');
    expect(tarjeta.querySelector('[data-testid="calza"]')).toBeNull();
    expect($('[data-testid="confianza"]').textContent).toBe('Confianza mediade cada 10 así, 5 son la correcta');
    // La persona la puede aprobar: la regla la explica.
    expect(boton('aprobar-recibos-m-3').disabled).toBe(false);
  });

  /**
   * 🔴 ARREGLOS-5 (Nico Q4 a): «recibo de más». Con recibos YA emitidos que
   * suman exacto la línea, la fila no ofrece las cuotas del 1:1 ni «Conciliar
   * con un cliente»: cualquiera de los dos emitiría otro recibo por la misma plata.
   */
  it('🔴 con recibos ya emitidos que suman exacto, la fila NO ofrece el 1:1 (otro recibo por la misma plata)', async () => {
    const candidato = {
      contractId: 'ct-9',
      tenantId: 't-9',
      tenantName: 'Laura Pérez Gómez',
      propertyTitle: 'Apto 301',
      meses: ['2026-09'],
      pendienteCop: 12_480_000,
      cuotaIds: ['q-9'],
      cobroId: null,
      adelanto: false,
      puntaje: 80,
      porQue: ['El valor es igual a lo pendiente de la cuota de septiembre de 2026.'],
      seguro: true,
    };
    await montar([
      movimiento({ candidatos: [candidato] }),
      movimiento({
        id: 'm-3',
        valorCop: 4_980_000,
        candidatos: [{ ...candidato, pendienteCop: 4_980_000 }],
        muchosAUno: { mejor: GMF, ambigua: false, total: 1, parcial: null },
      }),
    ]);
    // La que suma exacto: sin cuotas ni «Conciliar con un cliente», y dice por qué.
    expect(document.querySelector('[data-testid="candidato-m-1-ct-9"]')).toBeNull();
    expect(document.querySelector('[data-testid="conciliar-cliente-m-1"]')).toBeNull();
    expect($('[data-testid="sin-uno-a-uno-m-1"]').textContent).toContain('emitiría otro recibo por la misma plata');
    expect($('[data-testid="calza"]').textContent).toContain('Suma exacta');
    // Con una diferencia (no suma exacto), la persona sigue pudiendo elegir la cuota.
    expect(document.querySelector('[data-testid="candidato-m-3-ct-9"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="sin-uno-a-uno-m-3"]')).toBeNull();
  });

  it('un back viejo (sin `muchosAUno`) deja la fila como siempre', async () => {
    const viejo = movimiento();
    delete viejo.muchosAUno;
    await montar([viejo]);
    expect(document.querySelector('[data-testid="muchos-a-uno-m-1"]')).toBeNull();
  });
});

// ── Ambigua ────────────────────────────────────────────────────────────────

describe('muchos a uno — ambigua: nunca un «Aprobar» de un clic', () => {
  it('se ve distinto, no tiene «Aprobar» y obliga a elegir en el cajón', async () => {
    api.recibosQueSuman.mockResolvedValue(RESPUESTA_AMBIGUA);
    api.conciliarConRecibos.mockResolvedValue({ movimiento: ambigua(), recibos: [], vinculos: [] });
    await montar([ambigua()]);

    const tarjeta = $('[data-testid="muchos-a-uno-m-2"]');
    expect(tarjeta.getAttribute('data-ambigua')).toBe('true');
    expect(tarjeta.textContent).toContain('Hay dos combinaciones que suman lo mismo');
    expect(tarjeta.textContent).toContain('elige la correcta');
    expect(document.querySelector('[data-testid="aprobar-recibos-m-2"]')).toBeNull();

    await clic(boton('elegir-recibos-m-2'));
    expect(api.recibosQueSuman).toHaveBeenCalledWith('m-2');
    const cajon = $('[data-testid="corregir-m-2"]');
    expect(cajon.textContent).toContain('Hay dos combinaciones que suman lo mismo: elige la correcta.');

    // Nada viene marcado: no se puede conciliar sin elegir.
    expect(boton('confirmar-recibos-m-2').disabled).toBe(true);
    expect($('[data-testid="suma-en-vivo"]').getAttribute('data-estado')).toBe('vacia');

    await clic(boton('combinacion-1'));
    expect($('[data-testid="combinacion-1"]').getAttribute('aria-checked')).toBe('true');
    expect($('[data-testid="suma-en-vivo"]').getAttribute('data-estado')).toBe('calza');
    expect(boton('confirmar-recibos-m-2').disabled).toBe(false);

    await clic(boton('confirmar-recibos-m-2'));
    expect(api.conciliarConRecibos).toHaveBeenCalledWith('m-2', ['r-c', 'r-d']);
  });
});

// ── Corregir a mano ────────────────────────────────────────────────────────

describe('muchos a uno — corregir: armar el conjunto a mano', () => {
  it('la suma va en vivo y sólo se deja enviar cuando calza exacto', async () => {
    api.recibosQueSuman.mockResolvedValue(RESPUESTA_AMBIGUA);
    api.conciliarConRecibos.mockResolvedValue({ movimiento: ambigua(), recibos: [], vinculos: [] });
    await montar([ambigua()]);
    await clic(boton('elegir-recibos-m-2'));

    const estado = () => $('[data-testid="suma-en-vivo"]').getAttribute('data-estado');
    const sumaMarcada = () => $('[data-testid="suma-marcada"]').getAttribute('data-valor');
    const enviar = () => boton('confirmar-recibos-m-2');

    await clic(boton('casilla-r-a'));
    expect(sumaMarcada()).toBe('1000000');
    expect(estado()).toBe('falta');
    expect($('[data-testid="suma-en-vivo"]').textContent).toContain(`Faltan ${plata(800_000)}`);
    expect(enviar().disabled).toBe(true);

    await clic(boton('casilla-r-d'));
    expect(sumaMarcada()).toBe('1800000');
    expect(estado()).toBe('calza');
    expect(enviar().disabled).toBe(false);

    await clic(boton('casilla-r-b'));
    expect(estado()).toBe('sobra');
    expect(enviar().disabled).toBe(true);

    await clic(boton('casilla-r-b'));
    expect(estado()).toBe('calza');
    // Una mezcla de las dos opciones también vale si calza: el servidor re-verifica.
    await clic(enviar());
    expect(api.conciliarConRecibos).toHaveBeenCalledWith('m-2', ['r-a', 'r-d']);
  });

  it('400 LA_SUMA_NO_CALZA: dice la suma, el valor del banco y la diferencia', async () => {
    api.recibosQueSuman.mockResolvedValue(RESPUESTA_AMBIGUA);
    api.conciliarConRecibos.mockRejectedValue(
      new ApiError(400, 'Los recibos suman $1.850.000 y el banco trae $1.800.000.', 'LA_SUMA_NO_CALZA', {
        statusCode: 400,
        code: 'LA_SUMA_NO_CALZA',
        message: 'Los recibos suman $1.850.000 y el banco trae $1.800.000.',
        sumaCop: 1_850_000,
        valorCop: 1_800_000,
        diferenciaCop: 50_000,
      }),
    );
    await montar([ambigua()]);
    await clic(boton('elegir-recibos-m-2'));
    await clic(boton('combinacion-0'));
    await clic(boton('confirmar-recibos-m-2'));

    const rechazo = $('[data-testid="corregir-m-2"] [data-testid="rechazo"]');
    expect(rechazo.getAttribute('data-tipo')).toBe('sumaNoCalza');
    expect(rechazo.textContent).toContain('Los recibos suman $1.850.000 y el banco trae $1.800.000.');
    const cifras = $('[data-testid="cifras-del-rechazo"]').textContent ?? '';
    expect(cifras).toContain(plata(1_850_000));
    expect(cifras).toContain(plata(1_800_000));
    expect(cifras).toContain(plata(50_000));
    // El cajón sigue abierto para corregir.
    expect(document.querySelector('[data-testid="corregir-m-2"]')).not.toBeNull();
  });
});

// ── Errores ────────────────────────────────────────────────────────────────

describe('muchos a uno — lo que dice el servidor', () => {
  it('503 FALTA_UNA_MIGRACION: dice que falta un paso del equipo de Leasefy y apaga «Aprobar» en toda la tabla', async () => {
    api.conciliarConRecibos.mockRejectedValue(
      new ApiError(503, 'Falta la migración 20261002203000_recibos_del_movimiento.', 'FALTA_UNA_MIGRACION'),
    );
    const otra = movimiento({ id: 'm-9', muchosAUno: { mejor: ALTA, ambigua: false, total: 1, parcial: null } });
    await montar([movimiento(), otra]);

    await clic(boton('aprobar-recibos-m-1'));
    const aviso = $('[data-testid="muchos-a-uno-m-1"] [data-testid="aviso-sin-tabla"]').textContent ?? '';
    expect(aviso).toContain('falta un paso que el equipo de Leasefy está habilitando');
    // El nombre de la migración es para el equipo, no para la persona.
    expect(aviso).not.toContain('20261002203000');
    expect(boton('aprobar-recibos-m-1').disabled).toBe(true);
    expect(boton('aprobar-recibos-m-9').disabled).toBe(true);
  });

  it('sin la tabla (`sePuedeAplicar: false`) el cajón muestra las propuestas pero no deja conciliar', async () => {
    api.recibosQueSuman.mockResolvedValue({ ...RESPUESTA_AMBIGUA, sePuedeAplicar: false });
    await montar([ambigua()]);
    await clic(boton('elegir-recibos-m-2'));
    expect($('[data-testid="corregir-m-2"] [data-testid="aviso-sin-tabla"]')).toBeTruthy();
    await clic(boton('combinacion-0'));
    expect($('[data-testid="suma-en-vivo"]').getAttribute('data-estado')).toBe('calza');
    expect(boton('confirmar-recibos-m-2').disabled).toBe(true);
  });

  it('409 RECIBO_YA_CONCILIADO: dice cuál, con las palabras del back, en la tarjeta', async () => {
    api.conciliarConRecibos.mockRejectedValue(
      new ApiError(
        409,
        'El recibo N.º 103 ya respalda otro movimiento del banco.',
        'RECIBO_YA_CONCILIADO',
      ),
    );
    await montar([movimiento()]);
    await clic(boton('aprobar-recibos-m-1'));
    const rechazo = $('[data-testid="muchos-a-uno-m-1"] [data-testid="rechazo"]');
    expect(rechazo.getAttribute('data-tipo')).toBe('reciboYaConciliado');
    expect(rechazo.textContent).toContain('El recibo N.º 103 ya respalda otro movimiento del banco.');
    expect(rechazo.getAttribute('role')).toBe('alert');
  });

  it('409 MOVIMIENTO_YA_CONCILIADO: lo avisa y vuelve a leer la lista', async () => {
    api.conciliarConRecibos.mockRejectedValue(
      new ApiError(409, 'Este movimiento ya está conciliado.', 'MOVIMIENTO_YA_CONCILIADO'),
    );
    await montar([movimiento()]);
    expect(api.listar).toHaveBeenCalledTimes(1);
    await clic(boton('aprobar-recibos-m-1'));
    expect(toastMock.error).toHaveBeenCalledWith('Este movimiento ya está conciliado.');
    expect(api.listar).toHaveBeenCalledTimes(2);
  });
});

// ── Movimiento reducido ────────────────────────────────────────────────────

describe('muchos a uno — movimiento reducido', () => {
  it('la suma se pinta ya en su valor, sin conteo', async () => {
    movimientoReducido.valor = true;
    await montar([movimiento()]);
    const cifra = $('[data-testid="suma-m-1"] [data-valor]');
    // Sin el contador animado: el texto ES el valor, desde el primer cuadro.
    expect(cifra.textContent).toBe(plata(12_480_000));
    expect(cifra.querySelector('[aria-hidden="true"]')).toBeNull();
    expect(cifra.querySelector('.sr-only')).toBeNull();
  });

  it('sin movimiento reducido la suma cuenta (el contador va escondido del lector)', async () => {
    await montar([movimiento()]);
    const cifra = $('[data-testid="suma-m-1"] [data-valor]');
    expect(cifra.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});

// ── La confianza: el nivel y, si hay número, el medido (Nico, C1-MEDIR Q1) ──

describe('muchos a uno — la confianza que se ve', () => {
  it('textoDeLoMedido dice el número medido y nunca inventa uno', async () => {
    const { textoDeLoMedido, textoDeLaConfianza } = await import('./muchos-a-uno');
    expect(textoDeLaConfianza('media')).toBe('Confianza media');
    expect(textoDeLoMedido(5)).toBe('de cada 10 así, 5 son la correcta');
    expect(textoDeLoMedido(1)).toBe('de cada 10 así, 1 es la correcta');
    expect(textoDeLoMedido(10)).toBe('de cada 10 así, 10 son la correcta');
    expect(textoDeLoMedido(null)).toBeNull();
    expect(textoDeLoMedido(undefined)).toBeNull();
    expect(textoDeLoMedido(0.63)).toBeNull();
    expect(textoDeLoMedido(11)).toBeNull();
  });

  it('un back que no manda la medida: sólo el nivel, sin porcentaje y sin barra', async () => {
    const sinMedida = propuesta(SEIS, { deCadaDiez: undefined });
    await montar([movimiento({ muchosAUno: { mejor: sinMedida, ambigua: false, total: 1, parcial: null } })]);
    const confianza = $('[data-testid="confianza"]');
    expect(confianza.textContent).toBe('Confianza alta');
    expect(document.querySelector('[data-testid="confianza-medida"]')).toBeNull();
    expect(confianza.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});
