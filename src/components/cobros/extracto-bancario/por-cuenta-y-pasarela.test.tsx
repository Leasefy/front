/**
 * 🔴 Fase 1 de la conciliación en la pantalla (02-10-2026).
 *
 *   · Por cuenta (Nico, P3): una pastilla por cuenta (más «Sin cuenta» y
 *     «Pasarela»); elegir una filtra la tabla y los números; la ficha dice el
 *     porcentaje conciliado, si el saldo del banco cuadra con los movimientos y
 *     los días sin extracto. Sin la migración del back, se dice por qué no hay
 *     filtro.
 *   · La pasarela (Nico, P4): «Puede ser un pago en línea…» va ARRIBA de los
 *     cruces, y «Es este pago en línea» la deja por fuera con ese recibo (sin
 *     emitir nada). El pago en línea que no calzó con el canon se ve en la cola
 *     con lo que hay que hacer.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type {
  CuentasDeLaConciliacion,
  MovimientoBancario,
  ResumenDeConciliacion,
} from '@/lib/api/conciliacion-bancaria.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, toastMock, permisos } = vi.hoisted(() => ({
  api: {
    listar: vi.fn(),
    resumen: vi.fn(),
    cuentas: vi.fn(),
    esDeLaPasarela: vi.fn(),
    loteActual: vi.fn(),
    cargarExtracto: vi.fn(),
  },
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  permisos: {
    canAccess: vi.fn((_m: string, _a: string) => true),
    isLoading: false,
    isAdmin: true,
    agencyRole: 'ADMIN' as string | null,
  },
}));

vi.mock('@/lib/api/conciliacion-bancaria.service', () => ({ conciliacionBancariaApi: api }));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => permisos }));
vi.mock('@/components/inmobiliaria/import/lib/parseFile', () => ({
  parseSpreadsheetFile: vi.fn(),
  leerPrimerasFilas: vi.fn(),
}));
vi.mock('@/components/inmobiliaria/ReciboPorCliente', () => ({ ElegirCliente: () => null }));

import { ExtractoBancario } from './ExtractoBancario';

const RESUMEN: ResumenDeConciliacion = {
  pendientes: 2,
  ignorados: 0,
  conciliadosEsteMes: 1,
  ultimoExtracto: null,
};

const indicadores = (sobre: Record<string, unknown> = {}) => ({
  pendientes: 2,
  conciliados: 8,
  ignorados: 0,
  salidasPendientes: 1,
  pendienteCop: 3_600_000,
  conciliadoCop: 14_400_000,
  porcentajePorNumero: 80,
  porcentajePorValor: 80,
  ...sobre,
});

const CUENTAS: CuentasDeLaConciliacion = {
  disponible: true,
  motivo: null,
  cuentas: [
    {
      id: 'cta-1',
      nombre: 'Ahorros Bancolombia',
      tipo: 'TRANSFERENCIA',
      banco: 'Bancolombia',
      tipoDeCuenta: 'AHORROS',
      numeroEnmascarado: '•••• 6789',
      activa: true,
      via: 'SIN_DEFINIR',
      convenio: null,
      indicadores: indicadores(),
      ultimaCarga: {
        id: 'carga-1',
        nombreArchivo: 'sep.csv',
        desde: '2026-09-01',
        hasta: '2026-09-15',
        saldoInicialCop: 10_000_000,
        saldoFinalCop: 12_000_000,
        saldosDe: 'ARCHIVO',
        cuadra: true,
        diferenciaCop: 0,
        lineas: 10,
        nuevas: 10,
        cargadaAt: '2026-09-16T10:00:00.000Z',
      },
      cuadre: {
        saldoSegunElBancoCop: 12_000_000,
        saldoSegunLosMovimientosCop: 11_755_000,
        diferenciaCop: -245_000,
        cuadra: false,
        desde: '2026-09-01',
        hasta: '2026-09-15',
      },
      huecos: [{ desde: '2026-08-10', hasta: '2026-08-31', diasHabiles: 15 }],
    },
  ],
  sinCuenta: indicadores({ pendientes: 4 }),
  pasarela: indicadores({ pendientes: 1 }),
};

function movimiento(sobre: Partial<MovimientoBancario> = {}): MovimientoBancario {
  return {
    id: 'm-1',
    agencyId: 'a-1',
    fecha: '2026-09-03T00:00:00.000Z',
    valorCop: 1_800_000,
    descripcion: 'CONSIGNACION CORRESPONSAL',
    referencia: null,
    extractoNombre: 'sep.csv',
    estado: 'PENDIENTE',
    cobroId: null,
    reciboId: null,
    motivoIgnorado: null,
    conciliadoPorUserId: null,
    conciliadoAt: null,
    cargadoPorUserId: 'u-1',
    createdAt: '2026-09-04T00:00:00.000Z',
    candidatos: [],
    recibo: null,
    cuenta: { id: 'cta-1', nombre: 'Ahorros Bancolombia', numeroEnmascarado: '•••• 6789' },
    deLaPasarela: false,
    pasarela: null,
    ...sobre,
  };
}

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

async function clic(selector: string) {
  await act(async () => {
    $(selector).click();
  });
  await esperar();
  await esperar();
}

beforeEach(() => {
  for (const f of Object.values(api)) f.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  api.resumen.mockResolvedValue(RESUMEN);
  api.cuentas.mockResolvedValue(CUENTAS);
  api.loteActual.mockResolvedValue({ propuesto: null, recientes: [] });
  api.listar.mockResolvedValue({ data: [movimiento()], total: 1, limite: 50, desplazamiento: 0 });
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

describe('🔴 la conciliación por cuenta (Nico, P3)', () => {
  it('una pastilla por cuenta, más «Sin cuenta» y «Pasarela», con sus pendientes', async () => {
    await montar();
    const texto = $('[data-testid="por-cuenta"]').textContent ?? '';
    expect(texto).toContain('Todas');
    expect(texto).toContain('Ahorros Bancolombia •••• 6789');
    expect(texto).toContain('Sin cuenta');
    expect(texto).toContain('Pasarela de pagos');
    // La línea dice de qué cuenta es.
    expect($('[data-testid="cuenta-de-m-1"]').textContent).toBe('Ahorros Bancolombia •••• 6789');
  });

  it('elegir una cuenta filtra la tabla y los números, y muestra su ficha (porcentaje, cuadre, huecos)', async () => {
    await montar();
    await clic('[data-testid="cuenta-cta-1"]');
    expect(api.listar).toHaveBeenLastCalledWith(expect.objectContaining({ cuenta: 'cta-1' }));
    expect(api.resumen).toHaveBeenLastCalledWith('cta-1');
    const ficha = $('[data-testid="ficha-de-la-cuenta"]').textContent ?? '';
    expect(ficha).toContain('80 % por número · 80 % por valor');
    expect($('[data-testid="cuadre-de-la-cuenta"]').textContent).toContain('no cuadra por');
    expect($('[data-testid="huecos-de-la-cuenta"]').textContent).toContain('Falta el extracto de');

    await clic('[data-testid="cuenta-sin-cuenta"]');
    expect(api.listar).toHaveBeenLastCalledWith(expect.objectContaining({ cuenta: 'sin-cuenta' }));
    expect($('[data-testid="ficha-de-la-cuenta"]').textContent).toContain('antes de que la cuenta fuera obligatoria');

    await clic('[data-testid="cuenta-todas"]');
    expect(api.listar).toHaveBeenLastCalledWith(expect.objectContaining({ cuenta: undefined }));
  });

  it('sin la migración del back: no hay filtro y se dice por qué', async () => {
    api.cuentas.mockResolvedValue({ ...CUENTAS, disponible: false, motivo: 'Falta una actualización de la base.' });
    await montar();
    expect($('[data-testid="por-cuenta-no-disponible"]').textContent).toContain('Falta una actualización');
    expect(document.querySelector('[data-testid="cuenta-cta-1"]')).toBeNull();
  });

  it('un back sin la ruta de las cuentas: la pantalla sigue como antes', async () => {
    api.cuentas.mockRejectedValue(new Error('404'));
    await montar();
    expect(document.querySelector('[data-testid="por-cuenta"]')).toBeNull();
    expect($('[data-testid="movimientos"]').textContent).toContain('CONSIGNACION CORRESPONSAL');
  });
});

describe('🔴 la pasarela en la cola (Nico, P4)', () => {
  const propuesta = {
    pagoEnLineaId: 'p-1',
    reciboId: 'r-7',
    reciboNumero: 7,
    fecha: '2026-09-02',
    valorCop: 1_800_000,
    referencia: 'tx',
    tenantName: 'Laura Pérez',
    conElId: false,
    diferenciaCop: 0,
    porQue: ['Mismo valor que el pago en línea de Laura Pérez (recibo #7), 1 día después.'],
  };

  it('«Puede ser un pago en línea…» y «Es este pago en línea» la deja por fuera con ese recibo', async () => {
    api.listar.mockResolvedValue({
      data: [movimiento({ pasarela: { propuestas: [propuesta] } })],
      total: 1,
      limite: 50,
      desplazamiento: 0,
    });
    api.esDeLaPasarela.mockResolvedValue(movimiento({ estado: 'IGNORADO' }));
    await montar();
    expect($('[data-testid="pasarela-m-1"]').textContent).toContain('Laura Pérez');
    await clic('[data-testid="es-de-la-pasarela-m-1"]');
    expect(api.esDeLaPasarela).toHaveBeenCalledWith('m-1', 'p-1');
    expect(String(toastMock.success.mock.calls[0]![0])).toContain('No se emitió nada');
  });

  it('con otro valor se ve, pero no se ofrece marcarla: no es la misma plata', async () => {
    api.listar.mockResolvedValue({
      data: [movimiento({ pasarela: { propuestas: [{ ...propuesta, conElId: true, diferenciaCop: -50_000 }] } })],
      total: 1,
      limite: 50,
      desplazamiento: 0,
    });
    await montar();
    expect($('[data-testid="pasarela-m-1"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="es-de-la-pasarela-m-1"]')).toBeNull();
  });

  it('el pago en línea que no calzó con el canon dice qué hacer, y nunca se concilia solo', async () => {
    api.listar.mockResolvedValue({
      data: [movimiento({ deLaPasarela: true, cuenta: null, extractoNombre: 'Pasarela de pagos' })],
      total: 1,
      limite: 50,
      desplazamiento: 0,
    });
    await montar();
    expect($('[data-testid="no-calzo-m-1"]').textContent).toContain('no calzó con el canon');
    expect($('[data-testid="movimiento-m-1"]').textContent).toContain('Pago en línea');
  });
});
