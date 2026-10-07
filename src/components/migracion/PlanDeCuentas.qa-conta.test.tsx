/**
 * Plan de cuentas → «Nueva cuenta», QA de Contabilidad (CB-27, 03-10-2026). El
 * armado es el de `PlanDeCuentas.test.tsx`.
 *
 *   · la naturaleza se propone por la clase del código (1/5/6/7 débito;
 *     2/3/4 crédito) y se avisa si se cambia;
 *   · guardar dice que quedó;
 *   · las casillas tienen nombre accesible.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { CuentaEnArbol } from '@/lib/api/contabilidad.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...resto }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...resto}>
      {children}
    </a>
  ),
}));

const { pucMock } = vi.hoisted(() => ({
  pucMock: {
    arbol: vi.fn(),
    semillaPendientes: vi.fn(),
    sembrar: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    listar: vi.fn(),
    eliminar: vi.fn(),
  },
}));

/*
 * El mapeo contable se monta adentro del paso (2026-09-02); es un componente
 * con su propia carga y sus propios tests. Acá importa que esté Y lo que le
 * reporta al paso: desde el 2026-09-12 el pie del paso 5 depende de eso —
 * tener cuentas no lo termina, falta que cada asiento automático tenga la suya.
 */
const { estadoDelMapeo } = vi.hoisted(() => ({
  estadoDelMapeo: { actual: null as null | { completo: boolean; faltan: number; total: number } },
}));
vi.mock('@/components/contabilidad/mapeo/MapeoContable', () => ({
  MapeoContable: ({
    onEstado,
  }: {
    onEstado?: (e: { completo: boolean; faltan: number; total: number }) => void;
  }) => {
    React.useEffect(() => {
      if (estadoDelMapeo.actual) onEstado?.(estadoDelMapeo.actual);
    }, [onEstado]);
    return <div data-testid="mapeo-contable-embebido" />;
  },
}));

vi.mock('@/lib/api/contabilidad.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contabilidad.service')>(
    '@/lib/api/contabilidad.service',
  );
  return { ...actual, contabilidadApi: { ...actual.contabilidadApi, puc: pucMock } };
});

import { PlanDeCuentas } from './PlanDeCuentas';

function cuenta(
  codigo: string,
  nombre: string,
  extra: Partial<CuentaEnArbol> = {},
  hijas: CuentaEnArbol[] = [],
): CuentaEnArbol {
  return {
    id: `id-${codigo}`,
    agencyId: 'ag-1',
    codigo,
    nombre,
    naturaleza: 'DEBITO',
    padreId: null,
    imputable: hijas.length === 0,
    activa: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    hijas,
    ...extra,
  };
}

/** Lo que devuelve `GET /puc/arbol` después de sembrar (recortado). */
const ARBOL_SEMBRADO: CuentaEnArbol[] = [
  cuenta('1', 'Activo', {}, [
    cuenta('11', 'Disponible', {}, [cuenta('1105', 'Caja', {}, [cuenta('110505', 'Caja general')])]),
  ]),
  cuenta('5', 'Gastos', {}, [
    cuenta('51', 'Operacionales de administración', {}, [
      cuenta('5115', 'Impuestos', {}, [cuenta('511580', 'Gravamen a los movimientos financieros')]),
    ]),
  ]),
];

const PENDIENTES = {
  total: 1,
  cuentas: [
    {
      codigo: '511580',
      nombre: 'Gravamen a los movimientos financieros',
      naturaleza: 'DEBITO' as const,
      imputable: true,
      fuente: 'PENDIENTE_DE_CONFIRMAR' as const,
      nota: 'El 4x1000. Confirma con tu contador si lo lleva en 511580 o en otra subcuenta.',
    },
  ],
};

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar(sinPaso5 = false) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<PlanDeCuentas sinPaso5={sinPaso5} />);
  });
  await act(async () => {});
}

function q(testid: string) {
  return container.querySelector(`[data-testid="${testid}"]`);
}

async function click(testid: string) {
  const el = q(testid);
  if (!el) throw new Error(`no hay ${testid}`);
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await act(async () => {});
}

beforeEach(() => {
  pucMock.arbol.mockReset();
  pucMock.semillaPendientes.mockReset();
  pucMock.sembrar.mockReset();
  pucMock.semillaPendientes.mockResolvedValue(PENDIENTES);
  // Por defecto el mapeo está completo: es la condición en la que el paso 5
  // de verdad terminó, y la que el resto de las pruebas da por supuesta.
  estadoDelMapeo.actual = { completo: true, faltan: 0, total: 9 };
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container.remove();
});


describe('PlanDeCuentas · CB-27', () => {
  function escribirEn(testid: string, valor: string) {
    const el = q(testid) as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  async function abrir(codigo: string) {
    pucMock.arbol.mockResolvedValue(ARBOL_SEMBRADO);
    pucMock.semillaPendientes.mockResolvedValue({ total: 0, cuentas: [] });
    pucMock.crear.mockResolvedValue(cuenta(codigo, 'Nueva'));
    await pintar();
    await click('puc-nueva-cuenta');
    await act(async () => {
      escribirEn('puc-codigo', codigo);
      escribirEn('puc-nombre', 'Comisiones por cobrar a terceros');
    });
  }

  it('🔴 un código de la clase 2 propone CRÉDITO y así viaja', async () => {
    await abrir('28150599');
    expect(q('puc-naturaleza')!.textContent).toContain('Crédito');
    await click('puc-guardar');
    expect(pucMock.crear).toHaveBeenCalledWith(expect.objectContaining({ codigo: '28150599', naturaleza: 'CREDITO' }));
  });

  it('🔴 guardar dice que quedó', async () => {
    const { toast } = await import('@/components/ui/toast');
    await abrir('110510');
    await click('puc-guardar');
    expect(vi.mocked(toast.success).mock.calls.at(-1)![0]).toContain('Cuenta 110510');
  });

  it('🔴 «Recibe movimientos» tiene nombre accesible', async () => {
    await abrir('110510');
    const casilla = q('puc-imputable')!;
    const rotulo = document.getElementById(casilla.getAttribute('aria-labelledby')!);
    expect(rotulo?.textContent).toBe('Recibe movimientos');
  });
});
