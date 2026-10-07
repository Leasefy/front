/**
 * Gastos, QA de Contabilidad (CB-17, 03-10-2026). El armado es el de
 * `FacturasDeProveedor.test.tsx`.
 *
 *   · la explicación de la cabecera no se repite debajo de «Facturas de
 *     proveedor»;
 *   · los filtros son el selector de fecha y el `Select` del DS.
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
// CB-17 (03-10-2026): los selectores son el `Select` del DS (Radix), que no se
// abre en happy-dom. Este doble lo vuelve un `<select>` nativo con el MISMO
// `data-testid` del disparador, su valor y sus opciones: lo que estas pruebas
// miran no cambió.
vi.mock('@/components/ui/select', async () => {
  const React = await import('react');
  type Ctx = { value?: string; onValueChange?: (v: string) => void; trigger: Record<string, unknown> };
  const Contexto = React.createContext<Ctx>({ trigger: {} });
  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value?: string;
      onValueChange?: (v: string) => void;
      children?: React.ReactNode;
    }) => {
      const trigger = React.useRef<Record<string, unknown>>({}).current;
      return <Contexto.Provider value={{ value, onValueChange, trigger }}>{children}</Contexto.Provider>;
    },
    SelectTrigger: (props: Record<string, unknown>) => {
      Object.assign(React.useContext(Contexto).trigger, props);
      return null;
    },
    SelectValue: () => null,
    SelectContent: ({ children }: { children?: React.ReactNode }) => {
      const ctx = React.useContext(Contexto);
      return (
        <select
          data-testid={ctx.trigger['data-testid'] as string | undefined}
          aria-label={ctx.trigger['aria-label'] as string | undefined}
          disabled={Boolean(ctx.trigger.disabled)}
          value={ctx.value ?? ''}
          onChange={(e) => ctx.onValueChange?.(e.target.value)}
        >
          {children}
        </select>
      );
    },
    SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => (
      <option value={value}>{children}</option>
    ),
    SelectGroup: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    SelectLabel: () => null,
    SelectSeparator: () => null,
  };
});

// `Monto` lee `useI18n`, que lanza sin su provider. Mismo mock que sus vecinos
// (`HubDeContabilidad.test.tsx`, `BalanceDePrueba.test.tsx`).
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}` }),
}));

import { ApiError } from '@/lib/api/client';
import { FacturasDeProveedor } from './FacturasDeProveedor';

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


describe('<FacturasDeProveedor> · CB-17', () => {
  it('🔴 la explicación de la pantalla no se repite debajo del título del bloque', async () => {
    await pintar();
    expect(q('facturas-de-proveedor')!.textContent).not.toContain('gasta en sí misma');
  });

  it('🔴 sin campos de fecha del navegador; el estado y el rubro son el Select del DS', async () => {
    await pintar();
    expect(q('facturas-de-proveedor')!.querySelector('input[type="date"]')).toBeNull();
    // El doble del `Select` sólo pinta un <select> con el testid si la pantalla usa el del DS.
    expect(q('filtro-estado')!.tagName).toBe('SELECT');
    expect(q('filtro-rubro')!.tagName).toBe('SELECT');
    expect(q('filtro-desde')!.querySelector('button')).not.toBeNull();
  });
});
