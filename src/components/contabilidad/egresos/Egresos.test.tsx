/**
 * Egresos y sus lotes.
 *
 * 🔴 El test central de este archivo es el de la DOBLE FIRMA. Un lote aprobado
 * se vuelve un archivo que alguien sube al banco, y el banco gira: la aprobación
 * es la segunda firma sobre esa plata. Se prueba en las dos direcciones — el
 * botón deshabilitado cuando la pantalla sabe que soy quien lo armó, y el 409
 * del back mostrado en palabras cuando la pantalla NO podía saberlo.
 *
 * Los otros dos que no se pueden aflojar:
 *
 * 🔴 «Marcar pagado» está apagado en APROBADO. Asentaría una salida de banco que
 *    no ocurrió, porque nadie subió el archivo todavía.
 *
 * 🔴 Marcar pagado anuncia CUÁNTOS comprobantes quedaron, no «el asiento N.º X».
 *    Hay un asiento por egreso — nombrar uno de nueve como si fuera el del lote
 *    sería mentir sobre lo que se puede anular después.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { Egreso, LoteDeEgreso } from '@/lib/api/gastos.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { gastos, escrituraMock, toastMock } = vi.hoisted(() => ({
  gastos: {
    egresos: {
      listar: vi.fn(),
      registrar: vi.fn(),
      anular: vi.fn(),
      conciliar: vi.fn(),
      comprobante: vi.fn(),
    },
    lotes: {
      listar: vi.fn(),
      crear: vi.fn(),
      aprobar: vi.fn(),
      archivo: vi.fn(),
      pagado: vi.fn(),
      anular: vi.fn(),
    },
  },
  escrituraMock: { puede: true, motivo: null as string | null, usuarioId: 'u-yo' },
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/api/gastos.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/gastos.service')>(
    '@/lib/api/gastos.service',
  );
  return { ...actual, gastosApi: gastos };
});
vi.mock('../use-puede-escribir', async () => {
  const actual = await vi.importActual<typeof import('../use-puede-escribir')>(
    '../use-puede-escribir',
  );
  return { ...actual, usePuedeEscribir: () => escrituraMock };
});
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}` }),
}));

import { Egresos, parteDeEgresos } from './Egresos';
import { ApiError } from '@/lib/api/client';

const egreso = (extra: Partial<Egreso> = {}): Egreso => ({
  id: 'e1',
  numero: null,
  estado: 'PENDIENTE',
  beneficiarioTipo: 'PROVEEDOR',
  beneficiarioId: null,
  beneficiarioNombre: 'Ferretería El Tornillo SAS',
  beneficiarioTipoDocumento: 'NIT',
  beneficiarioDocumento: '900123456',
  banco: 'Bancolombia',
  tipoDeCuenta: 'AHORROS',
  numeroDeCuenta: '123456789',
  facturaId: 'f1',
  concepto: 'FE-4521 Cerraduras',
  valorCop: 476_000,
  retefuenteCop: 10_000,
  reteivaCop: 0,
  reteicaCop: 3_040,
  netoCop: 462_960,
  rubro: 'oficina',
  sedeId: null,
  loteId: null,
  fechaDelEgreso: null,
  asientoId: null,
  asientoNumero: null,
  movimientoBancarioId: null,
  motivoDeLaAnulacion: null,
  ...extra,
});

const lote = (extra: Partial<LoteDeEgreso> = {}): LoteDeEgreso => ({
  id: 'l1',
  concepto: 'Proveedores segunda quincena',
  estado: 'BORRADOR',
  totalCop: 462_960,
  cantidad: 1,
  creadoPorUserId: 'u-otro',
  aprobadoPorUserId: null,
  aprobadoAt: null,
  formatoArchivo: 'BANCOLOMBIA_PAB',
  archivoGeneradoAt: null,
  archivoHash: null,
  pagadoAt: null,
  referenciaBanco: null,
  anuladoAt: null,
  motivoDeLaAnulacion: null,
  egresos: [egreso({ estado: 'EN_LOTE', loteId: 'l1' })],
  ...extra,
});

let container: HTMLDivElement;
let root: Root | null = null;
const q = (t: string) => document.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

beforeEach(() => {
  gastos.egresos.listar
    .mockReset()
    .mockResolvedValue({ disponible: true, motivo: null, total: 1, egresos: [egreso()] });
  gastos.lotes.listar
    .mockReset()
    .mockResolvedValue({ disponible: true, motivo: null, total: 1, lotes: [lote()] });
  gastos.lotes.aprobar.mockReset().mockResolvedValue(lote({ estado: 'APROBADO' }));
  gastos.lotes.crear.mockReset().mockResolvedValue(lote());
  gastos.lotes.pagado.mockReset();
  escrituraMock.puede = true;
  escrituraMock.motivo = null;
  escrituraMock.usuarioId = 'u-yo';
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

async function pintar(inicial: 'egresos' | 'lotes' = 'egresos') {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<Egresos inicial={inicial} />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('parteDeEgresos', () => {
  it('acepta las dos pestañas y cae a «egresos» con cualquier otra cosa', () => {
    expect(parteDeEgresos('lotes')).toBe('lotes');
    expect(parteDeEgresos('egresos')).toBe('egresos');
    expect(parteDeEgresos('lo-que-sea')).toBe('egresos');
    expect(parteDeEgresos(null)).toBe('egresos');
  });
});

describe('<Egresos>', () => {
  it('🔴 sin la migración 51 explica qué falta y qué se hace mientras tanto', async () => {
    gastos.egresos.listar.mockResolvedValue({
      disponible: false,
      motivo: 'Falta la migración 20260918102000_lotes_de_egreso_y_egresos.',
      total: 0,
      egresos: [],
    });

    await pintar();

    expect(q('egresos-sin-migracion')!.textContent).toContain('lotes_de_egreso');
    expect(q('egresos-sin-migracion')!.textContent).toContain('sigue siendo manual');
    expect(q('egresos')).toBeNull();
  });

  it('dice, en el encabezado, que esto NO es el giro al propietario', async () => {
    await pintar();
    expect(q('egresos')!.textContent).toContain('No es el giro al propietario');
  });

  it('un egreso pendiente se puede marcar para el lote', async () => {
    await pintar();
    expect(q('marcar-e1')).not.toBeNull();
  });

  it('armar el lote pide concepto: es lo que se lee en el banco y en el libro', async () => {
    await pintar();
    const boton = q('crear-lote') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(q('crear-lote-motivo')!.textContent).toContain('Marca al menos un egreso');
  });

  /*
   * 🔴 19-09 · «Armar un lote» era una tarjeta ENCIMA de la tabla, con su
   * propio conteo y su propio campo: se marcaba en la fila 30 y el botón que
   * arma el lote quedaba fuera de la pantalla. Ahora es la barra de acciones
   * masivas de la casa, al pie, y el concepto vive dentro de ella.
   */
  describe('🔴 la barra de acciones masivas', () => {
    it('se ve sin nada marcado y dice qué hay que hacer', async () => {
      await pintar();
      const resumen = q('armar-lote-resumen')!;
      expect(resumen.textContent).toContain('Marca los egresos pendientes');
      // El botón queda A LA VISTA y apagado, con el motivo.
      expect((q('crear-lote') as HTMLButtonElement).disabled).toBe(true);
      // Sin nada marcado no hay nada que quitar.
      expect(q('armar-lote-quitar')).toBeNull();
    });

    it('marcar un egreso lo dice en palabras y con su plata, y ofrece la salida', async () => {
      await pintar();
      await act(async () => {
        (q('marcar-e1') as HTMLElement).click();
      });
      const resumen = q('armar-lote-resumen')!;
      expect(resumen.textContent).toContain('Marcaste 1 egreso');
      expect(q('armar-lote-quitar')).not.toBeNull();

      await act(async () => {
        (q('armar-lote-quitar') as HTMLElement).click();
      });
      expect(q('armar-lote-resumen')!.textContent).toContain('Marca los egresos pendientes');
    });

    it('🔴 el concepto del lote vive DENTRO de la barra: es parte de la acción', async () => {
      await pintar();
      const barra = q('armar-lote')!;
      expect(barra.querySelector('[data-testid="concepto-del-lote"]')).not.toBeNull();
      expect(barra.querySelector('[data-testid="crear-lote"]')).not.toBeNull();
      // Pegada al borde de abajo mientras se recorren los egresos.
      expect(barra.className).toContain('sticky');
      expect(barra.className).toContain('bottom-0');
    });

    it('🔴 y la barra vive DENTRO de la tabla, como su último renglón', async () => {
      /*
       * Nico, 19-09: «cuando hay acciones masivas deben quedar también en la
       * tabla». Una caja con borde debajo de otra caja con borde son dos
       * objetos; el que actúa sobre las casillas tiene que ser el mismo
       * objeto que las casillas.
       */
      await pintar();
      const barra = q('armar-lote')!;
      const tabla = barra.closest('section')!;
      expect(tabla.querySelector('table')).not.toBeNull();
      expect(barra.className).not.toContain('rounded-lg');
      expect(barra.className).toContain('border-t');
      // 🔴 Y la tarjeta no recorta con `overflow-hidden`: mataría lo pegajoso.
      expect(tabla.className).not.toContain('overflow-hidden');
      expect(tabla.className).toContain('overflow-x-clip');
    });
  });

  it('avisa de los pendientes a los que el banco les falta un dato', async () => {
    gastos.egresos.listar.mockResolvedValue({
      disponible: true,
      motivo: null,
      total: 1,
      egresos: [egreso({ banco: null, numeroDeCuenta: null })],
    });

    await pintar();

    expect(q('falta-e1')!.textContent).toContain('el banco');
    expect(q('pendientes-sin-datos')!.textContent).toContain('el archivo saldría corto');
  });
});

describe('🔴 la doble firma del lote', () => {
  it('a quien armó el lote se le apaga el botón, con el motivo', async () => {
    gastos.lotes.listar.mockResolvedValue({
      disponible: true,
      motivo: null,
      total: 1,
      lotes: [lote({ creadoPorUserId: 'u-yo' })],
    });

    await pintar('lotes');

    const boton = q('aprobar-l1') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(q('aprobar-l1-motivo')!.textContent).toContain('otra persona');
  });

  it('a otra persona se le deja aprobar', async () => {
    await pintar('lotes');
    expect((q('aprobar-l1') as HTMLButtonElement).disabled).toBe(false);
  });

  it('🔴 el 409 del back se muestra en palabras, aunque la pantalla creyera que se podía', async () => {
    gastos.lotes.aprobar.mockRejectedValue(
      new ApiError(409, 'No podés aprobar tu propio lote', 'APROBADOR_ES_EL_MISMO'),
    );

    await pintar('lotes');
    await act(async () => {
      (q('aprobar-l1') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    const mensaje = toastMock.error.mock.calls.at(-1)![0] as string;
    expect(mensaje).toContain('segunda firma');
    expect(mensaje).toContain('CONTADOR');
  });
});

describe('🔴 el orden de los pasos del lote', () => {
  it('en BORRADOR no sale el archivo: primero hay que aprobar', async () => {
    await pintar('lotes');
    const boton = q('archivo-l1') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(q('archivo-l1-motivo')!.textContent).toContain('aprobar');
  });

  it('🔴 en APROBADO NO se marca pagado: asentaría una salida que no ocurrió', async () => {
    gastos.lotes.listar.mockResolvedValue({
      disponible: true,
      motivo: null,
      total: 1,
      lotes: [lote({ estado: 'APROBADO' })],
    });

    await pintar('lotes');

    const boton = q('pagado-l1') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(q('pagado-l1-motivo')!.textContent).toContain('salida que no ocurrió');
    // El archivo sí: ése es el paso que falta.
    expect((q('archivo-l1') as HTMLButtonElement).disabled).toBe(false);
  });

  it('con el archivo generado sí se marca pagado', async () => {
    gastos.lotes.listar.mockResolvedValue({
      disponible: true,
      motivo: null,
      total: 1,
      lotes: [lote({ estado: 'ARCHIVO_GENERADO' })],
    });

    await pintar('lotes');

    expect((q('pagado-l1') as HTMLButtonElement).disabled).toBe(false);
  });

  it('un lote PAGADO no se anula: el motivo manda a anular cada egreso', async () => {
    gastos.lotes.listar.mockResolvedValue({
      disponible: true,
      motivo: null,
      total: 1,
      lotes: [lote({ estado: 'PAGADO', pagadoAt: '2026-09-20' })],
    });

    await pintar('lotes');

    const boton = q('anular-lote-l1') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(q('anular-lote-l1-motivo')!.textContent).toContain('cada egreso');
  });
});

describe('🔴 marcar pagado', () => {
  it('el diálogo dice que es un asiento POR EGRESO', async () => {
    gastos.lotes.listar.mockResolvedValue({
      disponible: true,
      motivo: null,
      total: 1,
      lotes: [lote({ estado: 'ARCHIVO_GENERADO', cantidad: 9 })],
    });

    await pintar('lotes');
    await act(async () => {
      (q('pagado-l1') as HTMLButtonElement).click();
      await Promise.resolve();
    });

    const texto = q('dialogo-de-pago')!.textContent!;
    expect(texto).toContain('un asiento por egreso');
    expect(texto).toContain('anular uno no reverse el pago de los demás');
    expect(texto).toContain('después de haber subido el archivo');
  });

  it('🔴 anuncia cuántos comprobantes quedaron, no «el asiento N.º X»', async () => {
    gastos.lotes.listar.mockResolvedValue({
      disponible: true,
      motivo: null,
      total: 1,
      lotes: [lote({ estado: 'ARCHIVO_GENERADO', cantidad: 2 })],
    });
    gastos.lotes.pagado.mockResolvedValue({
      lote: lote({ estado: 'PAGADO' }),
      asientos: [
        { egresoId: 'e1', id: 'a1', numero: 415 },
        { egresoId: 'e2', id: 'a2', numero: 416 },
      ],
      comprobantes: 2,
    });

    await pintar('lotes');
    await act(async () => {
      (q('pagado-l1') as HTMLButtonElement).click();
      await Promise.resolve();
    });
    await act(async () => {
      (q('confirmar-pago') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const anuncio = toastMock.success.mock.calls.at(-1)![0] as string;
    expect(anuncio).toContain('2 comprobantes');
    expect(anuncio).toContain('cada uno con su asiento');
    expect(anuncio).not.toContain('415');
  });
});

describe('conciliación y comprobante', () => {
  it('sólo un egreso PAGADO se concilia, y el motivo lo explica', async () => {
    await pintar();
    const boton = q('conciliar-e1') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(q('conciliar-e1-motivo')!.textContent).toContain('no hay salida en el extracto');
  });

  it('un egreso pagado dice si quedó conciliado o no', async () => {
    gastos.egresos.listar.mockResolvedValue({
      disponible: true,
      motivo: null,
      total: 2,
      egresos: [
        egreso({ id: 'e1', estado: 'PAGADO', numero: 87, movimientoBancarioId: null }),
        egreso({ id: 'e2', estado: 'PAGADO', numero: 88, movimientoBancarioId: 'mb1' }),
      ],
    });

    await pintar();

    expect(q('conciliacion-e1')!.textContent).toContain('Sin conciliar');
    expect(q('conciliacion-e2')!.textContent).toContain('Conciliado');
  });

  it('el comprobante no se abre antes de que el lote se pague', async () => {
    await pintar();
    const boton = q('comprobante-e1') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(q('comprobante-e1-motivo')!.textContent).toContain('se numera cuando el lote');
  });

  it('un lote pagado avisa de los egresos que nadie concilió', async () => {
    gastos.lotes.listar.mockResolvedValue({
      disponible: true,
      motivo: null,
      total: 1,
      lotes: [
        lote({
          estado: 'PAGADO',
          pagadoAt: '2026-09-20',
          egresos: [egreso({ estado: 'PAGADO', numero: 87, movimientoBancarioId: null })],
        }),
      ],
    });

    await pintar('lotes');

    expect(q('sin-conciliar-l1')!.textContent).toContain('nadie verificó');
  });
});

describe('sin permiso de escritura', () => {
  it('no se arma, no se aprueba y no se anula', async () => {
    escrituraMock.puede = false;
    escrituraMock.motivo =
      'Sólo el administrador o el contador de la inmobiliaria pueden mover la contabilidad.';

    await pintar('lotes');

    expect((q('aprobar-l1') as HTMLButtonElement).disabled).toBe(true);
    expect(q('aprobar-l1-motivo')!.textContent).toContain('el contador');
    expect((q('anular-lote-l1') as HTMLButtonElement).disabled).toBe(true);
  });
});
