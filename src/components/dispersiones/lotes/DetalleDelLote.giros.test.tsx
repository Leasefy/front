/**
 * DetalleDelLote — la columna del giro en un lote PAGADO (PRUEBAS-PAGOS,
 * 03-10-2026, hallado en el laboratorio): a los pagos que NO entraron al
 * archivo (sin cuenta) se les ofrecía «Marcar devuelto», y el back respondía
 * 409 GIRO_NO_SALIO. Sólo lo que salió del banco puede volver.
 *
 * (Mocks y fixtures copiados de `DetalleDelLote.test.tsx`; éste además simula
 * la lectura de giros devueltos.)
 *
 * Original: DetalleDelLote — qué botón aparece en cada estado, y que el back habla
 * tal cual.
 *
 * Son giros de cientos de millones. Lo que estos tests fijan:
 * - en cada estado se ofrecen SÓLO las acciones que el back acepta;
 * - quien armó el lote no puede aprobarlo, y se le dice antes del clic;
 * - el mensaje del back («Código incorrecto. 3 intentos…») llega sin retocar;
 * - el aviso SIN-VERIFICAR se ve ANTES de guardar el archivo, y no se ve
 *   cuando el layout sí está verificado;
 * - los cuerpos que salen (código, referencia, motivo) son los que escribió
 *   la persona.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { LoteDeDispersion, VistaDelLote } from '@/lib/api/lotes-de-dispersion.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/lib/api/finanzas.service', () => ({
  codigoSinMigrar: () => null,
  finanzasApi: {
    girosDevueltos: vi.fn().mockResolvedValue({ disponible: true, motivo: null, giros: [] }),
  },
}));

let usuarioActual = 'u-otro';
vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ user: { id: usuarioActual, email: 'x@x.co' } }),
}));

let soyAdmin = false;
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: () => true, isAdmin: soyAdmin, isLoading: false, agencyRole: 'admin' }),
}));

vi.mock('@/lib/api/inmobiliaria.service', () => ({
  agentesApi: {
    getAll: vi.fn().mockResolvedValue([
      { id: 'm-1', userId: 'u-creador', name: 'Ana Ruiz', email: 'ana@portofino.co' },
      { id: 'm-2', userId: 'u-otro', name: 'Beto Gil', email: 'beto@portofino.co' },
    ]),
  },
}));

vi.mock('@/lib/api/lotes-de-dispersion.service', () => ({
  BASE_DE_LOTES: '/inmobiliaria/lotes-de-dispersion',
  RECURSO_DE_LOTES: 'lotes-de-dispersion',
  lotesDeDispersionApi: {
    ver: vi.fn(),
    solicitarAprobacion: vi.fn(),
    aprobar: vi.fn(),
    generarArchivo: vi.fn(),
    descargarArchivo: vi.fn(),
    marcarPagado: vi.fn(),
    anular: vi.fn(),
  },
}));

// El centro de procesos (22-09): el archivo del lote se lee de ahí.
vi.mock('@/lib/api/procesos.service', () => ({
  RECURSO_DE_PROCESOS: 'procesos',
  RECURSO_LOTE: 'LOTE_DE_DISPERSION',
  anunciarProceso: vi.fn(),
  procesosApi: {
    listar: vi.fn(),
    descarga: vi.fn(),
    cancelar: vi.fn(),
  },
}));

vi.mock('@/components/procesos/descargar-archivo-del-proceso', () => ({
  descargarArchivoDelProceso: vi.fn(async () => 'archivo.txt'),
}));

import { lotesDeDispersionApi } from '@/lib/api/lotes-de-dispersion.service';
import { descargarArchivoDelProceso } from '@/components/procesos/descargar-archivo-del-proceso';
import { procesosApi } from '@/lib/api/procesos.service';
import type { Proceso } from '@/lib/api/procesos.types';
import { DetalleDelLote } from './DetalleDelLote';
import { ApiError } from '@/lib/api/client';

const ID = '6b0f2e2c-1d4a-4a2b-9c3e-0f1a2b3c4d5e';

function lote(extra: Partial<LoteDeDispersion> = {}): LoteDeDispersion {
  return {
    id: ID,
    month: '2026-08',
    estado: 'BORRADOR',
    totalCop: 34_000_000,
    cantidad: 2,
    creadoPorUserId: 'u-creador',
    aprobadoPorUserId: null,
    aprobadoAt: null,
    formatoArchivo: null,
    archivoGeneradoAt: null,
    archivoHash: null,
    pagadoAt: null,
    referenciaBanco: null,
    anuladoAt: null,
    motivoDeLaAnulacion: null,
    createdAt: '2026-09-01T14:00:00.000Z',
    codigoHash: null,
    codigoExpiraAt: null,
    codigoIntentos: 0,
    items: [
      {
        id: 'i-1',
        loteId: ID,
        dispersionId: 'd-1',
        propietarioId: 'p-1',
        nombreTitular: 'Carlos Pérez',
        documento: '79123456',
        tipoDocumento: 'CC',
        banco: 'Bancolombia',
        tipoDeCuenta: 'AHORROS',
        numeroDeCuenta: '12345678901',
        valorCop: 20_000_000,
        motivoDeExclusion: null,
      },
      {
        id: 'i-2',
        loteId: ID,
        dispersionId: 'd-2',
        propietarioId: 'p-2',
        nombreTitular: 'Diana López',
        documento: '52987654',
        tipoDocumento: 'CC',
        banco: 'Davivienda',
        tipoDeCuenta: 'CORRIENTE',
        numeroDeCuenta: '99887766',
        valorCop: 14_000_000,
        motivoDeExclusion: null,
      },
      {
        id: 'i-3',
        loteId: ID,
        dispersionId: 'd-3',
        propietarioId: 'p-3',
        nombreTitular: 'Sin Cuenta S.A.S.',
        documento: '900123456',
        tipoDocumento: 'NIT',
        banco: '',
        tipoDeCuenta: '',
        numeroDeCuenta: '',
        valorCop: 5_000_000,
        motivoDeExclusion: 'Falta el número de cuenta.',
      },
    ],
    ...extra,
  };
}

function vista(l: LoteDeDispersion, extra: Partial<VistaDelLote> = {}): VistaDelLote {
  return {
    lote: l,
    excluidos: l.items
      .filter((i) => i.motivoDeExclusion !== null)
      .map((i) => ({
        propietarioId: i.propietarioId,
        nombre: i.nombreTitular,
        valorCop: i.valorCop,
        motivo: i.motivoDeExclusion as string,
      })),
    intentosRestantes: 5,
    bloqueado: false,
    ...extra,
  };
}

let container: HTMLDivElement;
let root: Root;
const guardar = vi.fn();

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  usuarioActual = 'u-otro';
  soyAdmin = false;
  guardar.mockReset();
  vi.mocked(procesosApi.listar).mockResolvedValue({
    disponible: true,
    motivo: null,
    procesos: [],
    activos: 0,
    veTodos: false,
  });
});

/** El proceso del centro que dejó el archivo del lote. */
function procesoDelArchivo(extra: Partial<Proceso> = {}): Proceso {
  return {
    id: 'proc-lote',
    tipo: 'ARCHIVO_DEL_LOTE',
    titulo: 'Archivo del lote de Agosto de 2026 · Bancolombia',
    estado: 'TERMINADO',
    hechos: 1,
    total: 1,
    porcentaje: 100,
    mensaje: '3 pagos en el archivo.',
    lanzadoPor: { id: 'u-creador', nombre: 'Ana Ruiz', rol: 'ADMIN' },
    esMio: false,
    recurso: { tipo: 'LOTE_DE_DISPERSION', id: ID },
    archivo: {
      nombre: `lote-2026-08-bancolombia_pab-${ID.slice(0, 8)}-SIN-VERIFICAR.txt`,
      tipo: 'text/plain',
      bytes: 420,
      venceAt: '2026-09-29T00:00:00.000Z',
      vencido: false,
    },
    sePuedeCancelar: false,
    cancelacionPedida: false,
    interrumpido: false,
    createdAt: '2026-09-22T15:00:00.000Z',
    iniciadoAt: '2026-09-22T15:00:00.000Z',
    terminadoAt: '2026-09-22T15:00:01.000Z',
    actualizadoAt: '2026-09-22T15:00:01.000Z',
    ...extra,
  };
}

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function render(v: VistaDelLote) {
  vi.mocked(lotesDeDispersionApi.ver).mockResolvedValue(v);
  act(() => root.render(<DetalleDelLote id={ID} guardar={guardar} />));
  await esperar();
}

function botones(texto: string): HTMLButtonElement[] {
  return Array.from(document.body.querySelectorAll('button')).filter((b) =>
    (b.textContent ?? '').includes(texto),
  );
}

function boton(texto: string): HTMLButtonElement {
  const b = botones(texto)[0];
  if (!b) throw new Error(`No hay botón «${texto}»`);
  return b;
}

async function clic(texto: string) {
  await act(async () => {
    boton(texto).click();
    await new Promise((r) => setTimeout(r, 0));
  });
}

/** Escribe como una persona: el setter nativo + evento `input` (React no ve un `.value =` pelado). */
async function escribir(testId: string, valor: string) {
  const el = document.body.querySelector(`[data-testid="${testId}"]`) as
    | HTMLInputElement
    | HTMLTextAreaElement
    | null;
  if (!el) throw new Error(`No hay campo ${testId}`);
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  await act(async () => {
    setter?.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
  });
}

/** El botón de un diálogo con ese texto EXACTO — «Generar» no es «Generar archivo». */
async function clicEnDialogo(testId: string, texto: string) {
  const dialogo = document.body.querySelector(`[data-testid="${testId}"]`);
  const b = Array.from(dialogo?.querySelectorAll('button') ?? []).find(
    (x) => (x.textContent ?? '').trim() === texto,
  );
  if (!b) throw new Error(`No hay botón «${texto}» en ${testId}`);
  await act(async () => {
    b.click();
    await new Promise((r) => setTimeout(r, 0));
  });
}

function acciones(): string[] {
  const zona = container.querySelector('[data-testid="acciones-del-lote"]');
  if (!zona) return [];
  return Array.from(zona.querySelectorAll('button')).map((b) => (b.textContent ?? '').trim());
}

function cuerpo(): string {
  return document.body.textContent ?? '';
}


describe('<DetalleDelLote> — el giro de un lote pagado', () => {
  it('🔴 sólo lo que entró al archivo se puede marcar devuelto', async () => {
    await render(vista(lote({ estado: 'PAGADO', pagadoAt: '2026-09-02T10:00:00.000Z', referenciaBanco: 'BC-1' })));
    // d-1 y d-2 salieron en el archivo; d-3 no (falta el número de cuenta).
    expect(container.querySelector('[data-testid="marcar-devuelto-d-1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="marcar-devuelto-d-2"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="marcar-devuelto-d-3"]')).toBeNull();
    expect(container.querySelector('[data-testid="sin-giro-d-3"]')).not.toBeNull();
  });
});
