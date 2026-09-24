/**
 * La exógena.
 *
 * Los tres casos que este archivo protege, y ninguno es cosmético:
 *
 * 🔴 1. El aviso del Prevalidador está ARRIBA y dice que Leasefy NO transmite.
 *       Una pantalla que deja creer que la exógena ya se presentó produce una
 *       sanción, y la sanción por no presentarla se calcula sobre el patrimonio.
 *
 * 🔴 2. Un formato con bloqueos NO se puede aprobar, y no hay «aprobar igual».
 *       El motivo del botón apagado es el bloqueo TEXTUAL del back, que trae el
 *       número de movimientos y la plata.
 *
 * 🔴 3. Bloqueo y aviso se dibujan distinto. Pintarlos iguales hace que el
 *       contador que ve seis renglones amarillos deje de leerlos.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { ResumenDeExogena, ResumenDeFormato } from '@/lib/api/exogena.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, escrituraMock, exportarMock, toastMock } = vi.hoisted(() => ({
  api: {
    resumen: vi.fn(),
    formato: vi.fn(),
    archivo: vi.fn(),
    conceptos: vi.fn(),
    guardarConceptos: vi.fn(),
    aprobar: vi.fn(),
    anular: vi.fn(),
  },
  escrituraMock: { puede: true, motivo: null as string | null, usuarioId: 'u-1' },
  exportarMock: { puede: true, motivo: null as string | null, usuarioId: 'u-1' },
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/api/exogena.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/exogena.service')>(
    '@/lib/api/exogena.service',
  );
  return { ...actual, exogenaApi: api };
});
vi.mock('../use-puede-escribir', async () => {
  const actual = await vi.importActual<typeof import('../use-puede-escribir')>(
    '../use-puede-escribir',
  );
  return {
    ...actual,
    usePuedeEscribir: () => escrituraMock,
    usePuedeExportarContabilidad: () => exportarMock,
  };
});
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}` }),
}));

import { Exogena } from './Exogena';

const formato = (extra: Partial<ResumenDeFormato> = {}): ResumenDeFormato => ({
  formato: '1001',
  nombre: 'Pagos y abonos en cuenta y retenciones practicadas',
  filas: 128,
  totalCop: 740_000_000,
  estado: 'GENERADA',
  aprobadoPorUserId: null,
  aprobadoAt: null,
  observaciones: null,
  bloqueos: [],
  avisos: [],
  necesitaContador: true,
  ...extra,
});

const resumen = (
  formatos: ResumenDeFormato[] = [formato()],
  extra: Partial<ResumenDeExogena> = {},
): ResumenDeExogena => ({
  anio: 2026,
  formatos,
  disponible: true,
  cuantiasMenores: { activa: false, topeCop: 1_000_000, nit: '222222222', filas: 0 },
  ...extra,
});

const conceptos = () => ({
  anio: 2026,
  disponible: true,
  conceptos: [
    {
      cuentaId: 'c1',
      codigo: '513595',
      nombre: 'Otros servicios',
      formato: '1001' as const,
      concepto: '5008',
      fuente: 'PRESET' as const,
    },
  ],
  sinConcepto: [{ cuentaId: 'c2', codigo: '519595', movimientosCop: 3_400_000 }],
  avisoLegal: 'Los códigos de concepto los fija la resolución de la DIAN de cada año.',
});

let container: HTMLDivElement;
let root: Root | null = null;
const q = (t: string) => document.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

beforeEach(() => {
  api.resumen.mockReset().mockResolvedValue(resumen());
  api.conceptos.mockReset().mockResolvedValue(conceptos());
  api.formato.mockReset();
  api.archivo.mockReset().mockResolvedValue(new Blob(['x']));
  escrituraMock.puede = true;
  escrituraMock.motivo = null;
  exportarMock.puede = true;
  exportarMock.motivo = null;
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

async function pintar(anioInicial?: number) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<Exogena anioInicial={anioInicial} />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('🔴 el aviso del Prevalidador', () => {
  it('está arriba y dice que Leasefy NO transmite', async () => {
    await pintar();
    const aviso = q('aviso-del-prevalidador')!.textContent!;
    expect(aviso).toContain('plantilla del Prevalidador');
    expect(aviso).toContain('Leasefy NO transmite');
    expect(aviso).toContain('XML firmado');
  });

  it('va ANTES del primer botón de descarga en el documento', async () => {
    await pintar();
    const aviso = q('aviso-del-prevalidador')!;
    const descarga = q('descargar-1001')!;
    expect(aviso.compareDocumentPosition(descarga) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('<Exogena>', () => {
  it('lista los formatos con de dónde sale cada uno', async () => {
    await pintar();
    expect(q('formato-1001')!.textContent).toContain('retenciones practicadas');
    expect(q('formato-1001')!.textContent).toContain('Cuentas de gasto');
  });

  it('lista los cinco puntos que necesitan visto bueno del contador', async () => {
    await pintar();
    const puntos = q('pendientes-del-contador')!.textContent!;
    expect(puntos).toContain('resolución');
    expect(puntos).toContain('1647');
    expect(puntos).toContain('deducible');
  });

  it('🔴 `paraElContador` del formato se lista entero: es contenido, no un comentario', async () => {
    api.resumen.mockResolvedValue(
      resumen([
        formato({
          paraElContador: [
            '¿Los giros a propietarios van en el 1001 o sólo en el 1647? Por defecto sólo 1647.',
          ],
        }),
      ]),
    );

    await pintar();

    expect(q('para-el-contador-1001')!.textContent).toContain('sólo 1647');
  });

  it('🔴 un bloqueo sale en su cartel propio, con el texto del back', async () => {
    api.resumen.mockResolvedValue(
      resumen([
        formato({
          bloqueos: [
            '12 movimientos por $4.300.000 no tienen tercero: la exógena no se puede presentar así.',
          ],
        }),
      ]),
    );

    await pintar();

    const bloqueo = q('bloqueos-1001')!.textContent!;
    expect(bloqueo).toContain('12 movimientos por $4.300.000');
    expect(bloqueo).toContain('impide presentar');
  });

  it('🔴 y un aviso sale en OTRO cartel: no se pintan iguales', async () => {
    api.resumen.mockResolvedValue(
      resumen([formato({ avisos: ['3 cuentas no tienen concepto asignado para 2026.'] })]),
    );

    await pintar();

    expect(q('avisos-1001')!.textContent).toContain('3 cuentas');
    expect(q('bloqueos-1001')).toBeNull();
  });

  it('🔴 con bloqueos NO se puede aprobar, y el motivo es el bloqueo del back', async () => {
    const bloqueo = '12 movimientos por $4.300.000 no tienen tercero.';
    api.resumen.mockResolvedValue(resumen([formato({ bloqueos: [bloqueo] })]));

    await pintar();

    const boton = q('aprobar-1001') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(q('aprobar-1001-motivo')!.textContent).toContain('12 movimientos');
    // Y no hay ninguna forma de forzarlo.
    expect(container.textContent).not.toContain('Aprobar igual');
  });

  it('un formato limpio se puede aprobar', async () => {
    await pintar();
    expect((q('aprobar-1001') as HTMLButtonElement).disabled).toBe(false);
  });

  it('un formato vacío no se aprueba ni se descarga', async () => {
    api.resumen.mockResolvedValue(resumen([formato({ filas: 0, totalCop: 0 })]));

    await pintar();

    expect((q('aprobar-1001') as HTMLButtonElement).disabled).toBe(true);
    expect((q('descargar-1001') as HTMLButtonElement).disabled).toBe(true);
    expect(q('descargar-1001-motivo')!.textContent).toContain('archivo saldría vacío');
  });

  it('el ya aprobado no se vuelve a aprobar, y se le puede quitar el visto bueno', async () => {
    api.resumen.mockResolvedValue(
      resumen([formato({ estado: 'APROBADA', aprobadoAt: '2026-04-10' })]),
    );

    await pintar();

    expect((q('aprobar-1001') as HTMLButtonElement).disabled).toBe(true);
    expect((q('anular-1001') as HTMLButtonElement).disabled).toBe(false);
    expect(q('formato-1001')!.textContent).toContain('visto bueno el');
  });

  it('sin la migración 52 se calcula y se descarga, pero no se aprueba', async () => {
    api.resumen.mockResolvedValue(resumen([formato()], { disponible: false }));

    await pintar();

    expect(q('exogena-sin-migracion')!.textContent).toContain('se calculan y se descargan igual');
    const boton = q('aprobar-1001') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(q('aprobar-1001-motivo')!.textContent).toContain('se descarga igual');
    expect((q('descargar-1001') as HTMLButtonElement).disabled).toBe(false);
  });

  it('el diálogo del visto bueno aclara que esto NO presenta la exógena', async () => {
    await pintar();
    await act(async () => {
      (q('aprobar-1001') as HTMLButtonElement).click();
      await Promise.resolve();
    });

    const texto = q('dialogo-de-visto-bueno')!.textContent!;
    expect(texto).toContain('NO presenta la exógena');
    expect(texto).toContain('Prevalidador');
  });

  it('descargar avisa de qué hacer con el archivo', async () => {
    await pintar();
    await act(async () => {
      (q('descargar-1001') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    const anuncio = toastMock.success.mock.calls.at(-1)![0] as string;
    expect(anuncio).toContain('Prevalidador');
    expect(anuncio).toContain('no lo transmite');
  });

  it('las filas salen en el orden de columnas del CSV, con su tope', async () => {
    api.formato.mockResolvedValue({
      formato: '1001',
      anio: 2026,
      columnas: ['Concepto', 'Tipo documento', 'Número de identificación'],
      filas: Array.from({ length: 120 }, (_, i) => ({
        concepto: '5008',
        tipoDocumento: '31',
        numeroIdentificacion: `9001234${i}`,
      })),
      totales: {},
      bloqueos: [],
      avisos: [],
    });

    await pintar();
    await act(async () => {
      (q('ver-1001') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    const tabla = q('filas-del-formato')!;
    expect(tabla.textContent).toContain('Número de identificación');
    expect(q('tope-de-filas')!.textContent).toContain('El CSV lleva todas');
  });

  it('cuantías menores dice el tope, el NIT y quién lo fija', async () => {
    api.resumen.mockResolvedValue(
      resumen([formato()], {
        cuantiasMenores: { activa: true, topeCop: 1_000_000, nit: '222222222', filas: 43 },
      }),
    );

    await pintar();

    const frase = q('cuantias-menores')!.textContent!;
    expect(frase).toContain('43 filas');
    expect(frase).toContain('222222222');
    expect(frase).toContain('resolución de la DIAN');
  });

  it('sin permiso de escritura no se aprueba ni se anula', async () => {
    escrituraMock.puede = false;
    escrituraMock.motivo =
      'Sólo el administrador o el contador de la inmobiliaria pueden mover la contabilidad.';

    await pintar();

    expect((q('aprobar-1001') as HTMLButtonElement).disabled).toBe(true);
    expect(q('aprobar-1001-motivo')!.textContent).toContain('el contador');
    // Leer y descargar siguen abiertos: son lecturas.
    expect((q('descargar-1001') as HTMLButtonElement).disabled).toBe(false);
  });

  it('el año no ofrece el que viene: no tendría una sola fila', async () => {
    await pintar();
    const opciones = [...(q('selector-de-anio') as HTMLSelectElement).options].map((o) => o.value);
    const actual = new Date().getFullYear();
    expect(opciones[0]).toBe(String(actual));
    expect(opciones).not.toContain(String(actual + 1));
  });
});

describe('<ConceptosDeExogena> dentro de la pantalla', () => {
  it('🔴 marca fila por fila lo que propuso Leasefy, no con un asterisco', async () => {
    await pintar();
    expect(q('concepto-513595')!.textContent).toContain('Propuesto por Leasefy');
    expect(q('aviso-del-preset')!.textContent).toContain('resolución de la DIAN');
  });

  it('las cuentas sin concepto son un bloqueo, ordenadas por plata', async () => {
    await pintar();
    const cartel = q('cuentas-sin-concepto')!.textContent!;
    expect(cartel).toContain('519595');
    expect(cartel).toContain('no se puede aprobar');
    expect(cartel).toContain('la primera es la que más pesa');
  });

  /**
   * 🔴 20-09 · La tabla tenía 49 filas sin buscador ni paginador, en una
   * página de 8.186 px. El contador va a una cuenta en particular —«¿qué
   * concepto le pusieron a la 2408?»— y tenía que bajar con la rueda.
   */
  it('🔴 se puede buscar una cuenta por su código', async () => {
    await pintar();
    const buscador = q('buscar-concepto') as HTMLInputElement;
    expect(buscador).not.toBeNull();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )!.set!;
      setter.call(buscador, '513595');
      buscador.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(q('concepto-513595')).not.toBeNull();
    expect(q('concepto-519595')).toBeNull();
    expect(q('cuantos-conceptos')!.textContent).toContain(' de ');
  });

  it('buscar algo que no está lo dice dentro de la tabla, no con una tabla vacía', async () => {
    await pintar();
    const buscador = q('buscar-concepto') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )!.set!;
      setter.call(buscador, 'zzzz');
      buscador.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(document.body.textContent).toContain('Ninguna cuenta con ese código');
  });

  it('guardar está apagado hasta que haya cambios', async () => {
    await pintar();
    const boton = q('guardar-conceptos') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(q('guardar-conceptos-motivo')!.textContent).toContain('No hay cambios');
  });

  it('los conceptos se piden por AÑO', async () => {
    await pintar(2025);
    expect(api.conceptos).toHaveBeenCalledWith(2025);
    expect(api.resumen).toHaveBeenCalledWith(2025);
  });
});

describe('🔴 el CSV de la exógena pide el permiso de exportar (23-09, datos personales)', () => {
  it('sin `reportes:export` el botón se apaga con el porqué, y no se pide el archivo', async () => {
    exportarMock.puede = false;
    exportarMock.motivo = 'Tu rol puede ver la contabilidad en pantalla, pero no descargarla.';

    await pintar();

    const boton = q('descargar-1001') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(q('descargar-1001-motivo')!.textContent).toContain('no descargarla');
    await act(async () => {
      boton.click();
      await Promise.resolve();
    });
    expect(api.archivo).not.toHaveBeenCalled();
    // Mirar las filas en pantalla sigue abierto.
    expect((q('ver-1001') as HTMLButtonElement).disabled).toBe(false);
  });
});
