/**
 * DetalleDelLote — qué botón aparece en cada estado, y que el back habla
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

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

let usuarioActual = 'u-otro';
vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ user: { id: usuarioActual, email: 'x@x.co' } }),
}));

vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: () => true, isAdmin: false, isLoading: false, agencyRole: 'admin' }),
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

describe('<DetalleDelLote> — qué se ofrece en cada estado', () => {
  it('BORRADOR: pedir aprobación y anular; los excluidos se ven con su motivo', async () => {
    await render(vista(lote()));

    expect(container.querySelector('[data-testid="estado-del-lote"]')?.textContent).toBe('Borrador');
    expect(acciones()).toEqual(['Pedir aprobación', 'Anular']);
    expect(container.querySelector('[data-testid="excluidos-del-lote"]')?.textContent).toContain(
      'Falta el número de cuenta.',
    );
    // El nombre del que lo armó, no el uuid.
    expect(container.textContent).toContain('Armado por Ana Ruiz');
  });

  it('APROBADO: generar archivo y anular', async () => {
    await render(vista(lote({ estado: 'APROBADO', aprobadoPorUserId: 'u-otro', aprobadoAt: '2026-09-01T15:00:00.000Z' })));
    expect(acciones()).toEqual(['Generar archivo', 'Anular']);
  });

  it('ARCHIVO_GENERADO: descargar, marcar pagado y anular', async () => {
    await render(
      vista(lote({ estado: 'ARCHIVO_GENERADO', formatoArchivo: 'BANCOLOMBIA_PAB', archivoHash: 'abc123' })),
    );
    expect(acciones()).toEqual(['Descargar archivo', 'Marcar pagado', 'Anular']);
    expect(container.textContent).toContain('abc123');
  });

  it('🔴 PAGADO no ofrece nada: la plata salió', async () => {
    await render(vista(lote({ estado: 'PAGADO', pagadoAt: '2026-09-02T10:00:00.000Z', referenciaBanco: 'BC-1' })));
    expect(container.querySelector('[data-testid="acciones-del-lote"]')).toBeNull();
    expect(container.textContent).toContain('BC-1');
  });

  it('ANULADO: sin acciones, con el motivo a la vista', async () => {
    await render(
      vista(lote({ estado: 'ANULADO', anuladoAt: '2026-09-02T10:00:00.000Z', motivoDeLaAnulacion: 'Cambió una cuenta' })),
    );
    expect(container.querySelector('[data-testid="acciones-del-lote"]')).toBeNull();
    expect(container.textContent).toContain('Cambió una cuenta');
  });
});

describe('<DetalleDelLote> — aprobación', () => {
  it('🔴 quien armó el lote ve «Aprobar» apagado y el aviso, antes de gastar un clic', async () => {
    usuarioActual = 'u-creador';
    await render(vista(lote({ estado: 'ESPERANDO_APROBACION', codigoHash: 'hash', codigoExpiraAt: '2026-09-01T15:10:00.000Z' })));

    expect(boton('Aprobar').disabled).toBe(true);
    expect(container.textContent).toContain('Tú armaste este lote');
  });

  it('otra persona aprueba con el código, y el cuerpo lleva lo que escribió', async () => {
    await render(vista(lote({ estado: 'ESPERANDO_APROBACION', codigoHash: 'hash', codigoExpiraAt: '2026-09-01T15:10:00.000Z' })));
    vi.mocked(lotesDeDispersionApi.aprobar).mockResolvedValue(
      lote({ estado: 'APROBADO', aprobadoPorUserId: 'u-otro', aprobadoAt: '2026-09-01T15:05:00.000Z' }),
    );

    await clic('Aprobar');
    expect(document.body.querySelector('[data-testid="dialogo-aprobar"]')).toBeTruthy();
    expect(cuerpo()).toContain('5 intentos');

    await escribir('codigo-de-aprobacion', '048213');
    // El «Aprobar» del pie del diálogo, no el de la página.
    const aprobarDelDialogo = botones('Aprobar').find((b) => b.closest('[data-testid="dialogo-aprobar"]'));
    await act(async () => {
      aprobarDelDialogo?.click();
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(lotesDeDispersionApi.aprobar).toHaveBeenCalledWith(ID, '048213');
    expect(container.querySelector('[data-testid="estado-del-lote"]')?.textContent).toBe('Aprobado');
  });

  it('🔴 el error del back se muestra tal cual y se vuelve a leer cuántos intentos quedan', async () => {
    await render(vista(lote({ estado: 'ESPERANDO_APROBACION', codigoHash: 'hash', codigoExpiraAt: '2026-09-01T15:10:00.000Z' })));
    vi.mocked(lotesDeDispersionApi.aprobar).mockRejectedValue(
      new Error('Código incorrecto. 4 intentos antes de que el lote se bloquee.'),
    );
    vi.mocked(lotesDeDispersionApi.ver).mockResolvedValue(
      vista(lote({ estado: 'ESPERANDO_APROBACION', codigoHash: 'hash', codigoExpiraAt: '2026-09-01T15:10:00.000Z', codigoIntentos: 1 }), {
        intentosRestantes: 4,
      }),
    );

    await clic('Aprobar');
    await escribir('codigo-de-aprobacion', '111111');
    const aprobarDelDialogo = botones('Aprobar').find((b) => b.closest('[data-testid="dialogo-aprobar"]'));
    await act(async () => {
      aprobarDelDialogo?.click();
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(cuerpo()).toContain('Código incorrecto. 4 intentos antes de que el lote se bloquee.');
    // Un intento gastado: la vista se vuelve a pedir.
    expect(lotesDeDispersionApi.ver).toHaveBeenCalledTimes(2);
  });

  it('un lote sin código no pide código, pero sí pide al segundo aprobador', async () => {
    await render(vista(lote({ estado: 'ESPERANDO_APROBACION' })));
    vi.mocked(lotesDeDispersionApi.aprobar).mockResolvedValue(lote({ estado: 'APROBADO', aprobadoPorUserId: 'u-otro' }));

    await clic('Aprobar');
    expect(document.body.querySelector('[data-testid="codigo-de-aprobacion"]')).toBeNull();
    expect(cuerpo()).toContain('no exige código');

    const aprobarDelDialogo = botones('Aprobar').find((b) => b.closest('[data-testid="dialogo-aprobar"]'));
    await act(async () => {
      aprobarDelDialogo?.click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(lotesDeDispersionApi.aprobar).toHaveBeenCalledWith(ID, undefined);
  });

  it('pedir aprobación muestra a qué correos tapados fue el código y hasta cuándo vale', async () => {
    await render(vista(lote()));
    vi.mocked(lotesDeDispersionApi.solicitarAprobacion).mockResolvedValue({
      lote: lote({ estado: 'ESPERANDO_APROBACION', codigoExpiraAt: '2026-09-01T15:10:00.000Z' }),
      exigeCodigo: true,
      motivoDelCodigo: 'La inmobiliaria tiene prendido el PIN para todos los lotes.',
      expiraAt: '2026-09-01T15:10:00.000Z',
      enviadoA: ['con***@portofino.co', 'ger***@portofino.co'],
    });

    await clic('Pedir aprobación');
    await clic('Mandar a aprobación');

    expect(lotesDeDispersionApi.solicitarAprobacion).toHaveBeenCalledWith(ID);
    const resultado = document.body.querySelector('[data-testid="resultado-de-aprobacion"]')?.textContent ?? '';
    expect(resultado).toContain('con***@portofino.co');
    expect(resultado).toContain('ger***@portofino.co');
    expect(resultado).toContain('PIN para todos los lotes');
    expect(resultado).toContain('Vale hasta');
    expect(container.querySelector('[data-testid="estado-del-lote"]')?.textContent).toBe('Esperando aprobación');
  });
});

describe('<DetalleDelLote> — el archivo', () => {
  const ARCHIVO_SIN_VERIFICAR = {
    nombreArchivo: `lote-2026-08-bancolombia_pab-SIN-VERIFICAR-${ID.slice(0, 8)}.txt`,
    contenido: 'LINEA1\nLINEA2\n',
    hash: 'deadbeef',
    formato: 'BANCOLOMBIA_PAB' as const,
    cantidad: 2,
    totalCop: 34_000_000,
    excluidos: [{ propietarioId: 'p-3', nombre: 'Sin Cuenta S.A.S.', valorCop: 5_000_000, motivo: 'Falta el número de cuenta.' }],
    advertencias: ['El nombre «Sin Cuenta S.A.S.» se recorta a 30 caracteres.'],
    layoutVerificado: false,
    pendienteDeConfirmar: ['Si el monto lleva dos decimales implícitos.'],
    reenvio: false,
  };

  const DESDE_BOGOTA = {
    banco: 'BANCO_BOGOTA',
    nombreDelBanco: 'Banco de Bogotá',
    formato: 'BANCO_DE_BOGOTA' as const,
    tipoDeCuenta: 'AHORROS' as const,
    cuenta: '•••• 6789',
  };

  it('🔴 el formato NO se elige al final: sale el del banco elegido al armar, y lo dice', async () => {
    await render(vista(lote({ estado: 'APROBADO' }), { origen: DESDE_BOGOTA }));
    await clic('Generar archivo');

    // Ya no hay selector de formato.
    expect(document.body.querySelector('[role="radiogroup"][aria-label="Formato del archivo"]')).toBeNull();
    const texto = document.body.querySelector('[data-testid="archivo-del-banco"]')?.textContent ?? '';
    expect(texto).toContain('Banco de Bogotá');
    expect(texto).toContain('•••• 6789');
  });

  it('un lote armado sin banco no ofrece generar: dice qué hacer', async () => {
    await render(vista(lote({ estado: 'APROBADO' }), { origen: null }));
    await clic('Generar archivo');

    expect(cuerpo()).toContain('Este lote no dice desde qué banco sale la plata');
    const generar = botones('Generar').find((b) => b.closest('[data-testid="dialogo-archivo"]'));
    expect(generar?.disabled).toBe(true);
  });

  it('🔴 generar muestra el aviso SIN-VERIFICAR, los excluidos y qué falta confirmar ANTES de guardar', async () => {
    await render(vista(lote({ estado: 'APROBADO' })));
    vi.mocked(lotesDeDispersionApi.generarArchivo).mockResolvedValue(ARCHIVO_SIN_VERIFICAR);
    const blob = new Blob([ARCHIVO_SIN_VERIFICAR.contenido]);
    vi.mocked(lotesDeDispersionApi.descargarArchivo).mockResolvedValue(blob);

    await clic('Generar archivo');
    await clicEnDialogo('dialogo-archivo', 'Generar');

    // Sin formato: el back usa el del banco elegido al armar.
    expect(lotesDeDispersionApi.generarArchivo).toHaveBeenCalledWith(ID);
    const listo = document.body.querySelector('[data-testid="archivo-listo"]')?.textContent ?? '';
    expect(listo).toContain('no se verificó contra un archivo real del banco');
    expect(listo).toContain('Si el monto lleva dos decimales implícitos.');
    expect(listo).toContain('Sin Cuenta S.A.S.');
    expect(listo).toContain('se recorta a 30 caracteres');
    expect(document.body.querySelector('[data-testid="nombre-del-archivo"]')?.textContent).toContain('SIN-VERIFICAR');
    // Todavía no se guardó nada: el aviso va primero.
    expect(guardar).not.toHaveBeenCalled();

    await clic('Guardar archivo');

    expect(lotesDeDispersionApi.descargarArchivo).toHaveBeenCalledWith(ID);
    expect(guardar).toHaveBeenCalledWith(blob, ARCHIVO_SIN_VERIFICAR.nombreArchivo);
  });

  it('🔴 «Descargar archivo» con la copia en el centro de procesos la baja de ahí: sin diálogo, sin spinner, sin volver a pedirla', async () => {
    vi.mocked(procesosApi.listar).mockResolvedValue({
      disponible: true,
      motivo: null,
      procesos: [procesoDelArchivo()],
      activos: 0,
      veTodos: false,
    });
    await render(vista(lote({ estado: 'ARCHIVO_GENERADO', formatoArchivo: 'BANCOLOMBIA_PAB', archivoHash: 'deadbeef' })));

    // El estado del archivo lo pinta el componente del centro, con su fila.
    const seccion = document.body.querySelector('[data-testid="archivo-del-lote"]');
    expect(seccion?.querySelector('[data-testid="fila-de-proceso"]')).not.toBeNull();
    expect(seccion?.textContent).toContain('Ana Ruiz');
    // 🔴 El aviso SIN-VERIFICAR sigue antes de bajar nada.
    expect(seccion?.textContent).toContain('no se verificó contra un archivo real del banco');
    expect(procesosApi.listar).toHaveBeenCalledWith({
      recursoTipo: 'LOTE_DE_DISPERSION',
      recursoId: ID,
      limite: 1,
    });

    await clic('Descargar archivo');

    expect(descargarArchivoDelProceso).toHaveBeenCalledWith('proc-lote', undefined);
    expect(lotesDeDispersionApi.generarArchivo).not.toHaveBeenCalled();
    expect(document.body.querySelector('[data-testid="dialogo-archivo"]')).toBeNull();
    expect(cuerpo()).not.toContain('Pidiendo el archivo');
  });

  it('sin copia en el centro (lote de antes, o venció) lo vuelve a preparar —cotejando el hash— y, sin centro en el back, lo baja por el GET del lote', async () => {
    await render(vista(lote({ estado: 'ARCHIVO_GENERADO', formatoArchivo: 'BANCOLOMBIA_PAB', archivoHash: 'deadbeef' })));
    expect(document.body.querySelector('[data-testid="archivo-sin-proceso"]')?.textContent).toContain(
      'antes del centro de procesos',
    );
    vi.mocked(lotesDeDispersionApi.generarArchivo).mockResolvedValue({ ...ARCHIVO_SIN_VERIFICAR, reenvio: true });
    const blob = new Blob([ARCHIVO_SIN_VERIFICAR.contenido]);
    vi.mocked(lotesDeDispersionApi.descargarArchivo).mockResolvedValue(blob);

    await clic('Descargar archivo');

    expect(lotesDeDispersionApi.generarArchivo).toHaveBeenCalledWith(ID);
    expect(guardar).toHaveBeenCalledWith(blob, ARCHIVO_SIN_VERIFICAR.nombreArchivo);
    expect(document.body.querySelector('[data-testid="archivo-del-lote"]')?.textContent).toContain(
      'no se verificó contra un archivo real del banco',
    );
  });

  it('si el back lo dejó en el centro, el archivo re-preparado se baja del centro', async () => {
    await render(vista(lote({ estado: 'ARCHIVO_GENERADO', formatoArchivo: 'BANCOLOMBIA_PAB', archivoHash: 'ok' })));
    vi.mocked(lotesDeDispersionApi.generarArchivo).mockResolvedValue({
      ...ARCHIVO_SIN_VERIFICAR,
      nombreArchivo: `lote-2026-08-bancolombia_pab-${ID.slice(0, 8)}.txt`,
      layoutVerificado: true,
      pendienteDeConfirmar: [],
      reenvio: true,
      procesoId: 'proc-nuevo',
    });

    await clic('Descargar archivo');

    expect(descargarArchivoDelProceso).toHaveBeenCalledWith('proc-nuevo', undefined);
    expect(lotesDeDispersionApi.descargarArchivo).not.toHaveBeenCalled();
    // Con el layout verificado NO aparece el aviso.
    expect(cuerpo()).not.toContain('no se verificó contra un archivo real del banco');
  });

  it('🔴 la PLANILLA no se presenta como archivo del banco: ni «verificado» ni «SIN-VERIFICAR»', async () => {
    const DESDE_DAVIVIENDA = {
      banco: 'DAVIVIENDA',
      nombreDelBanco: 'Davivienda',
      formato: 'PLANILLA_MANUAL' as const,
      tipoDeCuenta: 'AHORROS' as const,
      cuenta: '•••• 3456',
    };
    await render(vista(lote({ estado: 'APROBADO' }), { origen: DESDE_DAVIVIENDA }));
    await clic('Generar archivo');

    expect(document.body.querySelector('[data-testid="archivo-del-banco"]')?.textContent).toContain(
      'planilla para cargar a mano',
    );

    vi.mocked(lotesDeDispersionApi.generarArchivo).mockResolvedValue({
      ...ARCHIVO_SIN_VERIFICAR,
      nombreArchivo: `lote-2026-08-planilla-para-cargar-a-mano-davivienda-${ID.slice(0, 8)}.csv`,
      formato: 'PLANILLA_MANUAL',
      entrega: 'PLANILLA',
      fuente: null,
      layoutVerificado: true,
      pendienteDeConfirmar: ['Esta planilla NO se sube al banco.'],
    });
    await clicEnDialogo('dialogo-archivo', 'Generar');

    const aviso = document.body.querySelector('[data-testid="es-planilla"]')?.textContent ?? '';
    expect(aviso).toContain('Es una planilla para cargar a mano, no el archivo del banco');
    expect(aviso).toContain('Esta planilla NO se sube al banco.');
    expect(cuerpo()).not.toContain('Layout verificado contra un archivo real del banco');
    expect(cuerpo()).not.toContain('no se verificó contra un archivo real del banco');
  });

  it('un archivo de TERCERO dice de dónde salió y pide subir primero uno de prueba', async () => {
    await render(vista(lote({ estado: 'APROBADO' })));
    vi.mocked(lotesDeDispersionApi.generarArchivo).mockResolvedValue({
      ...ARCHIVO_SIN_VERIFICAR,
      entrega: 'ARCHIVO_DE_TERCERO',
      fuente: {
        url: 'https://ejemplo.co/estructura.pdf',
        documento: 'Manual de pagos de un software contable',
        version: '2025',
        consultado: '2026-09-22',
      },
    });

    await clic('Generar archivo');
    await clicEnDialogo('dialogo-archivo', 'Generar');

    const listo = document.body.querySelector('[data-testid="archivo-listo"]')?.textContent ?? '';
    expect(listo).toContain('Formato tomado de');
    expect(listo).toContain('Manual de pagos de un software contable');
    expect(listo).toContain('Sube primero un archivo de prueba al portal');
  });

  it('el error del back al generar llega tal cual', async () => {
    await render(vista(lote({ estado: 'APROBADO' })));
    vi.mocked(lotesDeDispersionApi.generarArchivo).mockRejectedValue(
      new Error('Ninguno de los 3 pagos del lote puede ir en el archivo. Revisa los motivos de exclusión.'),
    );

    await clic('Generar archivo');
    await clicEnDialogo('dialogo-archivo', 'Generar');

    expect(cuerpo()).toContain('Ninguno de los 3 pagos del lote puede ir en el archivo.');
    expect(guardar).not.toHaveBeenCalled();
  });
});

describe('<DetalleDelLote> — cierre', () => {
  it('marcar pagado manda la referencia que se escribió', async () => {
    await render(vista(lote({ estado: 'ARCHIVO_GENERADO', formatoArchivo: 'BANCOLOMBIA_PAB', archivoHash: 'x' })));
    vi.mocked(lotesDeDispersionApi.marcarPagado).mockResolvedValue(
      lote({ estado: 'PAGADO', pagadoAt: '2026-09-02T10:00:00.000Z', referenciaBanco: 'BC-20260907-00123' }),
    );

    await clic('Marcar pagado');
    await escribir('referencia-del-banco', 'BC-20260907-00123');
    const confirmar = botones('Marcar pagado').find((b) => b.closest('[data-testid="dialogo-pagado"]'));
    await act(async () => {
      confirmar?.click();
      await new Promise((r) => setTimeout(r, 0));
    });

    // `false` = «se factura después», que es lo que queda sin tildar la
    // casilla. Viaja explícito: es una decisión del CEO que se REGISTRA, y un
    // `undefined` no distingue «después» de «nadie decidió».
    expect(lotesDeDispersionApi.marcarPagado).toHaveBeenCalledWith(
      ID,
      'BC-20260907-00123',
      false,
    );
    expect(container.querySelector('[data-testid="estado-del-lote"]')?.textContent).toBe('Pagado');
    expect(container.querySelector('[data-testid="acciones-del-lote"]')).toBeNull();
  });

  /**
   * 🔴 «Factura ahora o después», y qué pasó con ella.
   *
   * El CEO (2026-09-15): «archivo plano por banco, egreso, factura ahora o
   * después, correo al propietario». Hasta la segunda vuelta la casilla
   * guardaba un booleano y no emitía nada. Lo que estos tests fijan:
   *
   *  · que tildar la casilla mande `true` y que el resultado se VEA;
   *  · que un fallo de facturación NO se lea como «el lote no se pagó»: la
   *    plata ya salió del banco;
   *  · que «ya estaban» no se pinte como error.
   */
  const listoParaPagar = () =>
    vista(
      lote({
        estado: 'ARCHIVO_GENERADO',
        formatoArchivo: 'BANCOLOMBIA_PAB',
        archivoHash: 'x',
      }),
    );

  const pagadoCon = (facturacion: LoteDeDispersion['facturacion']) =>
    lote({
      estado: 'PAGADO',
      pagadoAt: '2026-09-02T10:00:00.000Z',
      referenciaBanco: 'BC-1',
      facturacion,
    });

  async function pagar(conFactura: boolean) {
    await clic('Marcar pagado');
    await escribir('referencia-del-banco', 'BC-1');
    if (conFactura) {
      await act(async () => {
        (
          document.querySelector(
            '[data-testid="facturar-ahora"]',
          ) as HTMLElement | null
        )?.click();
        await new Promise((r) => setTimeout(r, 0));
      });
    }
    const confirmar = botones('Marcar pagado').find((b) =>
      b.closest('[data-testid="dialogo-pagado"]'),
    );
    await act(async () => {
      confirmar?.click();
      await new Promise((r) => setTimeout(r, 0));
    });
  }

  it('🔴 tildar «facturar ahora» manda `true` y muestra cuántas se emitieron', async () => {
    await render(listoParaPagar());
    vi.mocked(lotesDeDispersionApi.marcarPagado).mockResolvedValue(
      pagadoCon({
        pedida: true,
        candidatas: 2,
        emitidas: 2,
        yaEstaban: 0,
        sinNumero: 0,
        totalCop: 360_000,
        numeros: ['FE-1042', 'FE-1043'],
        fallas: [],
      }),
    );

    await pagar(true);

    expect(lotesDeDispersionApi.marcarPagado).toHaveBeenCalledWith(ID, 'BC-1', true);
    const bloque = container.querySelector('[data-testid="facturacion-del-lote"]');
    expect(bloque?.textContent).toContain('2 facturas emitidas');
    expect(bloque?.textContent).toContain('360.000');
    expect(bloque?.textContent).toContain('FE-1042');
  });

  it('🔴 si la facturación falla, se dice que el lote quedó PAGADO igual', async () => {
    await render(listoParaPagar());
    vi.mocked(lotesDeDispersionApi.marcarPagado).mockResolvedValue(
      pagadoCon({
        pedida: true,
        candidatas: 2,
        emitidas: 0,
        yaEstaban: 0,
        sinNumero: 0,
        totalCop: 0,
        numeros: [],
        fallas: [
          {
            mes: '2026-08',
            motivo: 'La resolución 18764003394379 venció el 15/01/2028.',
          },
        ],
      }),
    );

    await pagar(true);

    // La plata salió: el lote está pagado y no se ofrece nada más.
    expect(
      container.querySelector('[data-testid="estado-del-lote"]')?.textContent,
    ).toBe('Pagado');
    const falla = container.querySelector('[data-testid="falla-2026-08"]');
    expect(falla?.textContent).toContain('venció el 15/01/2028');
    expect(
      container.querySelector('[data-testid="facturacion-del-lote"]')?.textContent,
    ).toContain('La plata ya salió del banco');
  });

  it('«ya estaban» se cuenta, no se pinta como error', async () => {
    await render(listoParaPagar());
    vi.mocked(lotesDeDispersionApi.marcarPagado).mockResolvedValue(
      pagadoCon({
        pedida: true,
        candidatas: 1,
        emitidas: 0,
        yaEstaban: 1,
        sinNumero: 0,
        totalCop: 0,
        numeros: [],
        fallas: [],
      }),
    );

    await pagar(true);

    const bloque = container.querySelector('[data-testid="facturacion-del-lote"]');
    expect(bloque?.textContent).toContain('1 ya estaba emitida');
    expect(container.querySelector('[data-testid="falla-2026-08"]')).toBeNull();
  });

  it('sin tildar, dice cuántas prefacturas quedan esperando en Facturación', async () => {
    await render(listoParaPagar());
    vi.mocked(lotesDeDispersionApi.marcarPagado).mockResolvedValue(
      pagadoCon({
        pedida: false,
        candidatas: 3,
        emitidas: 0,
        yaEstaban: 0,
        sinNumero: 0,
        totalCop: 0,
        numeros: [],
        fallas: [],
      }),
    );

    await pagar(false);

    expect(lotesDeDispersionApi.marcarPagado).toHaveBeenCalledWith(ID, 'BC-1', false);
    expect(
      container.querySelector('[data-testid="facturacion-del-lote-despues"]')
        ?.textContent,
    ).toContain('3 prefacturas quedan');
  });

  it('🔴 a los que quedaron en $0 les sale su extracto, y si a uno no, se dice a quién y por qué', async () => {
    await render(listoParaPagar());
    vi.mocked(lotesDeDispersionApi.marcarPagado).mockResolvedValue({
      ...pagadoCon(undefined),
      extractosDeCompensados: {
        compensados: 2,
        enviados: 1,
        fallas: [
          {
            propietarioId: 'p-4',
            nombre: 'Elena Mora',
            motivo: 'El propietario no tiene correo registrado',
          },
        ],
      },
    });

    await pagar(false);

    const bloque = container.querySelector('[data-testid="extractos-de-compensados"]');
    expect(bloque?.textContent).toContain('1 de 2 extractos enviados');
    expect(
      container.querySelector('[data-testid="extracto-fallido-p-4"]')?.textContent,
    ).toContain('Elena Mora: El propietario no tiene correo registrado');
    expect(bloque?.textContent).toContain('El lote quedó PAGADO igual');
  });

  it('sin compensados en el lote no aparece el bloque de extractos', async () => {
    await render(listoParaPagar());
    vi.mocked(lotesDeDispersionApi.marcarPagado).mockResolvedValue({
      ...pagadoCon(undefined),
      extractosDeCompensados: { compensados: 0, enviados: 0, fallas: [] },
    });

    await pagar(false);

    expect(container.querySelector('[data-testid="extractos-de-compensados"]')).toBeNull();
  });

  it('un back anterior sin `facturacion` no pinta ningún bloque', async () => {
    await render(listoParaPagar());
    vi.mocked(lotesDeDispersionApi.marcarPagado).mockResolvedValue(
      pagadoCon(undefined),
    );

    await pagar(false);

    expect(container.querySelector('[data-testid="facturacion-del-lote"]')).toBeNull();
    expect(
      container.querySelector('[data-testid="facturacion-del-lote-despues"]'),
    ).toBeNull();
  });

  it('anular exige motivo (5 a 300) antes de pegarle al back, y después manda el motivo', async () => {
    await render(vista(lote()));
    vi.mocked(lotesDeDispersionApi.anular).mockResolvedValue(
      lote({ estado: 'ANULADO', anuladoAt: '2026-09-02T10:00:00.000Z', motivoDeLaAnulacion: 'Cambió una cuenta' }),
    );

    await clic('Anular');
    await escribir('motivo-de-anulacion', 'abc');
    await clic('Anular lote');
    expect(lotesDeDispersionApi.anular).not.toHaveBeenCalled();
    expect(cuerpo()).toContain('en 5 a 300 caracteres');

    await escribir('motivo-de-anulacion', 'Cambió una cuenta');
    await clic('Anular lote');

    expect(lotesDeDispersionApi.anular).toHaveBeenCalledWith(ID, 'Cambió una cuenta');
    expect(container.querySelector('[data-testid="estado-del-lote"]')?.textContent).toBe('Anulado');
  });

  it('un lote bloqueado por intentos lo dice y apaga la aprobación', async () => {
    await render(
      vista(lote({ estado: 'ESPERANDO_APROBACION', codigoHash: 'hash', codigoIntentos: 5 }), {
        intentosRestantes: 0,
        bloqueado: true,
      }),
    );

    expect(container.textContent).toContain('Lote bloqueado');
    expect(boton('Aprobar').disabled).toBe(true);
  });
});

describe('<DetalleDelLote> — liquidaciones que se cierran en $0', () => {
  const MOTIVO =
    'No se gira: sus deducciones cubren el neto de este mes. Se liquida en $0 al pagar el lote y lo que falte pasa a su siguiente liquidación.';

  function conCompensada(): VistaDelLote {
    const base = lote();
    const l: LoteDeDispersion = {
      ...base,
      items: [
        ...base.items,
        {
          id: 'i-4',
          loteId: ID,
          dispersionId: 'd-4',
          propietarioId: 'p-4',
          nombreTitular: 'Elena Mora',
          documento: '43111222',
          tipoDocumento: 'CC',
          banco: 'Bancolombia',
          tipoDeCuenta: 'AHORROS',
          numeroDeCuenta: '55566677',
          valorCop: -250_000,
          motivoDeExclusion: MOTIVO,
        },
      ],
    };
    // El back no la cuenta como excluida: la manda aparte.
    return vista(l, {
      excluidos: vista(base).excluidos,
      compensados: [
        { propietarioId: 'p-4', nombre: 'Elena Mora', dispersionId: 'd-4', netoCop: -250_000, saldoEnContraCop: 250_000 },
      ],
    });
  }

  it('🔴 se ve aparte de los excluidos: $0 girado y cuánto pasa al mes siguiente', async () => {
    await render(conCompensada());

    const seccion = container.querySelector('[data-testid="compensados-del-lote"]');
    expect(seccion?.textContent).toContain('1 propietario se cierra en $0');
    expect(seccion?.textContent).toContain('Elena Mora');
    expect(seccion?.textContent).toContain('$250.000');
    expect(container.querySelector('[data-testid="excluidos-del-lote"]')?.textContent).not.toContain('Elena Mora');
    expect(container.textContent).toContain('Se cierra en $0');
  });

  it('sin compensados no aparece la sección', async () => {
    await render(vista(lote()));
    expect(container.querySelector('[data-testid="compensados-del-lote"]')).toBeNull();
  });
});
