/**
 * Las facturas de proveedor: qué se puede hacer con cada estado y qué se dice
 * después de causar.
 *
 * Los cuatro casos que este archivo protege:
 *
 * 🔴 1. Una factura PAGADA no se anula, y el motivo manda al egreso. La plata ya
 *       salió del banco: anular la factura sin reversar el pago dejaría el libro
 *       diciendo que el proveedor cobró algo que no se le debía.
 *
 * 🔴 2. Después de causar se MUESTRA el asiento. Es la única forma de que quien
 *       registró la factura vea a qué cuentas fue, y de que un mapeo mal hecho se
 *       descubra en la primera factura y no en el cierre del mes.
 *
 * 🔴 3. Sin la migración 50 no se dibuja nada editable: se explica qué falta.
 *
 * 🔴 4. Anular pide motivo, en el diálogo del sistema de diseño — nunca un
 *       `confirm()` del navegador (ver `ui/sin-dialogos-del-navegador.test.ts`).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type {
  FacturaDeProveedor,
  PaginaDeFacturas,
} from '@/lib/api/gastos.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { gastos, contabilidad, facturacion, finanzas, escrituraMock, toastMock } = vi.hoisted(
  () => ({
    gastos: {
      facturas: {
        listar: vi.fn(),
        registrar: vi.fn(),
        causar: vi.fn(),
        anular: vi.fn(),
        previsualizar: vi.fn(),
      },
    },
    contabilidad: {
      puc: { listar: vi.fn() },
      asientos: { detalle: vi.fn() },
    },
    facturacion: { proveedores: vi.fn() },
    finanzas: { rubros: vi.fn(), sedes: vi.fn() },
    escrituraMock: { puede: true, motivo: null as string | null, usuarioId: 'u-1' },
    toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
  }),
);

vi.mock('@/lib/api/gastos.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/gastos.service')>(
    '@/lib/api/gastos.service',
  );
  return { ...actual, gastosApi: gastos };
});
vi.mock('@/lib/api/contabilidad.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contabilidad.service')>(
    '@/lib/api/contabilidad.service',
  );
  return { ...actual, contabilidadApi: contabilidad };
});
vi.mock('@/lib/api/facturacion-electronica.service', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/facturacion-electronica.service')
  >('@/lib/api/facturacion-electronica.service');
  return { ...actual, facturacionElectronicaService: facturacion };
});
vi.mock('@/lib/api/finanzas.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/finanzas.service')>(
    '@/lib/api/finanzas.service',
  );
  return { ...actual, finanzasApi: finanzas };
});
vi.mock('../use-puede-escribir', async () => {
  const actual = await vi.importActual<typeof import('../use-puede-escribir')>(
    '../use-puede-escribir',
  );
  return { ...actual, usePuedeEscribir: () => escrituraMock };
});
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
// `Monto` lee `useI18n`, que lanza sin su provider. Mismo mock que sus vecinos
// (`HubDeContabilidad.test.tsx`, `BalanceDePrueba.test.tsx`).
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}` }),
}));

import { FacturasDeProveedor, estadoDe } from './FacturasDeProveedor';

const factura = (extra: Partial<FacturaDeProveedor> = {}): FacturaDeProveedor => ({
  id: 'f1',
  tipo: 'FACTURA',
  estado: 'BORRADOR',
  proveedorId: null,
  proveedorNombre: 'Ferretería El Tornillo SAS',
  proveedorTipoDocumento: 'NIT',
  proveedorDocumento: '900123456',
  proveedorCiudad: 'Medellín',
  proveedorDireccion: null,
  prefijoDelProveedor: 'FE',
  numeroDelProveedor: '4521',
  fecha: '2026-09-05',
  fechaDeVencimiento: null,
  concepto: 'Cerraduras para la oficina',
  rubro: 'oficina',
  sedeId: null,
  lineas: [],
  subtotalCop: 400_000,
  ivaCop: 76_000,
  ivaDescontableCop: 76_000,
  retefuenteCop: 10_000,
  reteivaCop: 0,
  reteicaCop: 3_040,
  totalCop: 476_000,
  netoCop: 462_960,
  asientoId: null,
  asientoNumero: null,
  egresoId: null,
  motivoDeLaAnulacion: null,
  registradoPorUserId: 'u-1',
  createdAt: '2026-09-05T00:00:00.000Z',
  updatedAt: '2026-09-05T00:00:00.000Z',
  ...extra,
});

const pagina = (
  facturas: FacturaDeProveedor[],
  extra: Partial<PaginaDeFacturas> = {},
): PaginaDeFacturas => ({
  disponible: true,
  motivo: null,
  total: facturas.length,
  limite: 50,
  desplazamiento: 0,
  totales: {
    subtotalCop: 400_000,
    ivaCop: 76_000,
    retencionesCop: 13_040,
    totalCop: 476_000,
    netoCop: 462_960,
  },
  facturas,
  ...extra,
});

let container: HTMLDivElement;
let root: Root | null = null;
const q = (t: string) => document.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

beforeEach(() => {
  gastos.facturas.listar.mockReset().mockResolvedValue(pagina([factura()]));
  gastos.facturas.causar.mockReset();
  gastos.facturas.anular.mockReset().mockResolvedValue(factura({ estado: 'ANULADA' }));
  contabilidad.puc.listar.mockReset().mockResolvedValue([]);
  contabilidad.asientos.detalle.mockReset();
  facturacion.proveedores.mockReset().mockResolvedValue({ proveedores: [] });
  finanzas.rubros.mockReset().mockResolvedValue({ rubros: [] });
  finanzas.sedes.mockReset().mockResolvedValue({ sedes: [] });
  escrituraMock.puede = true;
  escrituraMock.motivo = null;
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

async function pintar(estadoInicial: '' | 'BORRADOR' = '') {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<FacturasDeProveedor estadoInicial={estadoInicial} />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('estadoDe', () => {
  it('acepta los cuatro estados tal como viajan en la URL', () => {
    expect(estadoDe('BORRADOR')).toBe('BORRADOR');
    expect(estadoDe('CAUSADA')).toBe('CAUSADA');
    expect(estadoDe('PAGADA')).toBe('PAGADA');
    expect(estadoDe('ANULADA')).toBe('ANULADA');
  });

  it('lo que no existe no filtra nada, en vez de una lista vacía sin explicación', () => {
    expect(estadoDe('lo-que-sea')).toBe('');
    expect(estadoDe(null)).toBe('');
    expect(estadoDe(undefined)).toBe('');
  });
});

describe('<FacturasDeProveedor>', () => {
  it('🔴 sin la migración 50 explica qué falta y no dibuja la lista', async () => {
    gastos.facturas.listar.mockResolvedValue(
      pagina([], {
        disponible: false,
        motivo: 'Falta la migración 20260918101000_facturas_de_proveedor.',
      }),
    );

    await pintar();

    expect(q('facturas-sin-migracion')!.textContent).toContain('facturas_de_proveedor');
    expect(q('facturas-sin-migracion')!.textContent).toContain('sin los gastos propios');
    expect(q('facturas-de-proveedor')).toBeNull();
  });

  it('dibuja la lista con sus totales', async () => {
    await pintar();
    expect(q('factura-f1')).not.toBeNull();
    expect(q('totales-de-facturas')!.textContent).toContain('462.960');
  });

  it('`?estado=BORRADOR` sale filtrado desde la primera consulta', async () => {
    await pintar('BORRADOR');
    expect(gastos.facturas.listar).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'BORRADOR' }),
    );
  });

  it('dice que un borrador no está en el libro, con el número', async () => {
    await pintar();
    const nota = q('nota-sin-causar')!.textContent!;
    expect(nota).toContain('1 factura en borrador');
    expect(nota).toContain('no aparece en el P&G ni en la exógena');
  });

  it('un borrador se puede causar y anular', async () => {
    await pintar();
    expect((q('causar-f1') as HTMLButtonElement).disabled).toBe(false);
    expect((q('anular-f1') as HTMLButtonElement).disabled).toBe(false);
  });

  it('una CAUSADA no se vuelve a causar, y el motivo nombra su asiento', async () => {
    gastos.facturas.listar.mockResolvedValue(
      pagina([factura({ estado: 'CAUSADA', asientoId: 'a1', asientoNumero: 412 })]),
    );

    await pintar();

    expect((q('causar-f1') as HTMLButtonElement).disabled).toBe(true);
    expect(q('causar-f1-motivo')!.textContent).toContain('412');
    expect((q('anular-f1') as HTMLButtonElement).disabled).toBe(false);
  });

  it('🔴 una PAGADA no se anula: el motivo manda a anular el egreso', async () => {
    gastos.facturas.listar.mockResolvedValue(pagina([factura({ estado: 'PAGADA' })]));

    await pintar();

    const boton = q('anular-f1') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    const motivo = q('anular-f1-motivo')!.textContent!;
    expect(motivo).toContain('la plata salió del banco');
    expect(motivo).toContain('egreso');
  });

  it('una ANULADA no admite nada', async () => {
    gastos.facturas.listar.mockResolvedValue(pagina([factura({ estado: 'ANULADA' })]));

    await pintar();

    expect((q('causar-f1') as HTMLButtonElement).disabled).toBe(true);
    expect((q('anular-f1') as HTMLButtonElement).disabled).toBe(true);
  });

  it('🔴 después de causar muestra EL ASIENTO que quedó, con sus líneas', async () => {
    gastos.facturas.causar.mockResolvedValue(
      factura({ estado: 'CAUSADA', asientoId: 'a1', asientoNumero: 412 }),
    );
    contabilidad.asientos.detalle.mockResolvedValue({
      id: 'a1',
      numero: 412,
      fecha: '2026-09-05',
      descripcion: 'FE-4521 Cerraduras',
      origen: 'MANUAL',
      origenId: 'f1',
      cerrado: false,
      agencyId: 'ag',
      creadoPorUserId: 'u-1',
      createdAt: '2026-09-05T00:00:00.000Z',
      movimientos: [
        {
          id: 'm1',
          asientoId: 'a1',
          cuentaId: 'c1',
          debitoCop: 400_000,
          creditoCop: 0,
          terceroTipo: 'PROVEEDOR',
          terceroId: null,
          descripcion: 'Cerradura',
          orden: 0,
          cuenta: { codigo: '519595', nombre: 'Otros' },
        },
        {
          id: 'm2',
          asientoId: 'a1',
          cuentaId: 'c2',
          debitoCop: 0,
          creditoCop: 462_960,
          terceroTipo: 'PROVEEDOR',
          terceroId: null,
          descripcion: null,
          orden: 1,
          cuenta: { codigo: '233595', nombre: 'Cuentas por pagar' },
        },
      ],
    });

    await pintar();

    await act(async () => {
      (q('causar-f1') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const asiento = q('asiento-de-la-factura')!;
    expect(asiento.textContent).toContain('Asiento N.º 412');
    expect(asiento.textContent).toContain('519595');
    expect(asiento.textContent).toContain('233595');
    // Y dice qué hacer si una cuenta no es la esperada.
    expect(asiento.textContent).toContain('un asiento no se edita');
  });

  it('si el asiento no se puede leer, causar NO se anuncia como un fallo', async () => {
    gastos.facturas.causar.mockResolvedValue(
      factura({ estado: 'CAUSADA', asientoId: 'a1', asientoNumero: 412 }),
    );
    contabilidad.asientos.detalle.mockRejectedValue(new Error('sin red'));

    await pintar();
    await act(async () => {
      (q('causar-f1') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(toastMock.success).toHaveBeenCalled();
    expect(toastMock.error).not.toHaveBeenCalled();
    expect(q('asiento-de-la-factura')).toBeNull();
  });

  it('🔴 anular pide motivo en el diálogo del sistema de diseño, y no deja mandar vacío', async () => {
    await pintar();

    await act(async () => {
      (q('anular-f1') as HTMLButtonElement).click();
      await Promise.resolve();
    });

    expect(q('dialogo-de-anulacion')).not.toBeNull();
    expect(q('motivo-de-anulacion')).not.toBeNull();
    expect((q('confirmar-anulacion') as HTMLButtonElement).disabled).toBe(true);
    expect(gastos.facturas.anular).not.toHaveBeenCalled();
  });

  it('sin permiso de escritura no se registra, ni se causa, ni se anula', async () => {
    escrituraMock.puede = false;
    escrituraMock.motivo =
      'Sólo el administrador o el contador de la inmobiliaria pueden mover la contabilidad.';

    await pintar();

    expect((q('abrir-formulario-de-factura') as HTMLButtonElement).disabled).toBe(true);
    expect(q('abrir-formulario-de-factura-motivo')!.textContent).toContain('el contador');
    expect((q('causar-f1') as HTMLButtonElement).disabled).toBe(true);
    expect((q('anular-f1') as HTMLButtonElement).disabled).toBe(true);
  });

  it('una lista vacía dice qué hacer, no se queda en blanco', async () => {
    gastos.facturas.listar.mockResolvedValue(pagina([]));

    await pintar();

    expect(q('facturas-de-proveedor')!.textContent).toContain('Registra la primera');
  });

  it('un proveedor escrito a mano se marca como tal', async () => {
    await pintar();
    expect(q('factura-f1')!.textContent).toContain('escrito a mano');
  });

  it('que los proveedores no carguen no rompe la lista: el camino a mano sigue abierto', async () => {
    facturacion.proveedores.mockRejectedValue(new Error('sin red'));

    await pintar();

    expect(q('factura-f1')).not.toBeNull();
  });
});
