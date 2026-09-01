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

import { lotesDeDispersionApi } from '@/lib/api/lotes-de-dispersion.service';
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
});

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
    expect(container.textContent).toContain('Vos armaste este lote');
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

  it('sólo Bancolombia PAB se puede elegir; SAP y OnePay dicen por qué no', async () => {
    await render(vista(lote({ estado: 'APROBADO' })));
    await clic('Generar archivo');

    const pab = document.body.querySelector('[data-testid="formato-BANCOLOMBIA_PAB"]') as HTMLButtonElement;
    const sap = document.body.querySelector('[data-testid="formato-BANCOLOMBIA_SAP"]') as HTMLButtonElement;
    const onepay = document.body.querySelector('[data-testid="formato-ONEPAY"]') as HTMLButtonElement;
    expect(pab.disabled).toBe(false);
    expect(pab.getAttribute('aria-checked')).toBe('true');
    expect(sap.disabled).toBe(true);
    expect(onepay.disabled).toBe(true);
    expect(sap.textContent).toContain('Pendiente del archivo de ejemplo del banco.');
  });

  it('🔴 generar muestra el aviso SIN-VERIFICAR, los excluidos y qué falta confirmar ANTES de guardar', async () => {
    await render(vista(lote({ estado: 'APROBADO' })));
    vi.mocked(lotesDeDispersionApi.generarArchivo).mockResolvedValue(ARCHIVO_SIN_VERIFICAR);
    const blob = new Blob([ARCHIVO_SIN_VERIFICAR.contenido]);
    vi.mocked(lotesDeDispersionApi.descargarArchivo).mockResolvedValue(blob);

    await clic('Generar archivo');
    await clicEnDialogo('dialogo-archivo', 'Generar');

    expect(lotesDeDispersionApi.generarArchivo).toHaveBeenCalledWith(ID, 'BANCOLOMBIA_PAB');
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

  it('descargar desde ARCHIVO_GENERADO pide el mismo archivo (reenvío) sin elegir formato', async () => {
    await render(vista(lote({ estado: 'ARCHIVO_GENERADO', formatoArchivo: 'BANCOLOMBIA_PAB', archivoHash: 'deadbeef' })));
    vi.mocked(lotesDeDispersionApi.generarArchivo).mockResolvedValue({ ...ARCHIVO_SIN_VERIFICAR, reenvio: true });

    await clic('Descargar archivo');

    expect(lotesDeDispersionApi.generarArchivo).toHaveBeenCalledWith(ID, undefined);
    expect(document.body.querySelector('[data-testid="formato-BANCOLOMBIA_PAB"]')).toBeNull();
    expect(cuerpo()).toContain('no se verificó contra un archivo real del banco');
  });

  it('con el layout verificado NO aparece el aviso', async () => {
    await render(vista(lote({ estado: 'ARCHIVO_GENERADO', formatoArchivo: 'BANCOLOMBIA_PAB', archivoHash: 'ok' })));
    vi.mocked(lotesDeDispersionApi.generarArchivo).mockResolvedValue({
      ...ARCHIVO_SIN_VERIFICAR,
      nombreArchivo: `lote-2026-08-bancolombia_pab-${ID.slice(0, 8)}.txt`,
      layoutVerificado: true,
      pendienteDeConfirmar: [],
      reenvio: true,
    });

    await clic('Descargar archivo');

    expect(cuerpo()).not.toContain('no se verificó contra un archivo real del banco');
    expect(cuerpo()).toContain('Layout verificado contra un archivo real del banco');
  });

  it('el error del back al generar llega tal cual', async () => {
    await render(vista(lote({ estado: 'APROBADO' })));
    vi.mocked(lotesDeDispersionApi.generarArchivo).mockRejectedValue(
      new Error('Ninguno de los 3 pagos del lote puede ir en el archivo. Revisá los motivos de exclusión.'),
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

    expect(lotesDeDispersionApi.marcarPagado).toHaveBeenCalledWith(ID, 'BC-20260907-00123');
    expect(container.querySelector('[data-testid="estado-del-lote"]')?.textContent).toBe('Pagado');
    expect(container.querySelector('[data-testid="acciones-del-lote"]')).toBeNull();
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
