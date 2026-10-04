/**
 * Presupuesto, QA de Contabilidad (CB-09, 03-10-2026). El armado es el de
 * `Presupuesto.test.tsx`.
 *
 *   · rótulos: «Octubre de 2025» y no «2025-10»; un solo ícono en el aviso (sin
 *     🔴); la plata de la casa («−$ 119.100», no «$-119.100»);
 *   · Nico: la columna «Real» es la del LIBRO y la operación va al lado.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type {
  ComparacionDelPresupuesto,
  FilaDelPresupuesto,
  PresupuestoDelMes,
} from '@/lib/api/finanzas.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  comparacion: vi.fn(),
  presupuesto: vi.fn(),
  rubros: vi.fn(),
  guardar: vi.fn(),
  borrar: vi.fn(),
}));

vi.mock('@/lib/api/finanzas.service', () => ({
  finanzasApi: {
    comparacionDelPresupuesto: h.comparacion,
    presupuesto: h.presupuesto,
    rubros: h.rubros,
    guardarPresupuesto: h.guardar,
    borrarPresupuesto: h.borrar,
  },
  codigoSinMigrar: vi.fn(() => null),
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));
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
          {ctx.value ? null : <option value="" />}
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


import { PresupuestoPanel } from './Presupuesto';

function fila(extra: Partial<FilaDelPresupuesto> = {}): FilaDelPresupuesto {
  return {
    rubro: 'comisiones',
    nombre: 'Comisiones de administración',
    naturaleza: 'INGRESO',
    presupuestoCop: 100_000_000,
    realCop: 112_000_000,
    anioAnteriorCop: 95_000_000,
    contraPresupuestoCop: 12_000_000,
    variacionAnualPct: 17.9,
    motivoSinReal: null,
    ...extra,
  };
}

const SIN_REAL = fila({
  rubro: 'nomina',
  nombre: 'Nómina',
  naturaleza: 'COSTO',
  presupuestoCop: 40_000_000,
  realCop: null,
  anioAnteriorCop: null,
  contraPresupuestoCop: null,
  variacionAnualPct: null,
  motivoSinReal:
    'La nómina no se lleva en Leasefy: su real saldría de los asientos que cargue el contador.',
});

function comparacion(
  extra: Partial<ComparacionDelPresupuesto> = {},
): ComparacionDelPresupuesto {
  return {
    disponible: true,
    sedeId: null,
    mes: '2026-10',
    mesDelAnioAnterior: '2025-10',
    filas: [fila(), SIN_REAL],
    totales: {
      presupuestoCop: 140_000_000,
      realCop: 112_000_000,
      anioAnteriorCop: 95_000_000,
      rubrosSinReal: 1,
    },
    avisos: ['1 rubro(s) se presupuestan pero todavía no se pueden comparar: Nómina.'],
    ...extra,
  };
}

function cargado(extra: Partial<PresupuestoDelMes> = {}): PresupuestoDelMes {
  return {
    disponible: true,
    motivo: null,
    mes: '2026-10',
    filas: [
      {
        id: 'p-1',
        mes: '2026-10',
        rubro: 'comisiones',
        valorCop: 100_000_000,
        sedeId: null,
        notas: null,
      },
    ],
    ...extra,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  h.comparacion.mockReset().mockResolvedValue(comparacion());
  h.presupuesto.mockReset().mockResolvedValue(cargado());
  h.rubros.mockReset().mockResolvedValue({
    rubros: [
      {
        rubro: 'comisiones',
        nombre: 'Comisiones de administración',
        naturaleza: 'INGRESO',
        fuenteDelReal: 'COMISION_CAUSADA',
        motivoSinReal: null,
      },
      {
        rubro: 'nomina',
        nombre: 'Nómina',
        naturaleza: 'COSTO',
        fuenteDelReal: 'SIN_FUENTE',
        motivoSinReal: 'La nómina no se lleva en Leasefy.',
      },
    ],
  });
  h.guardar.mockReset().mockResolvedValue(cargado().filas[0]);
  h.borrar.mockReset().mockResolvedValue(undefined);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function pintar() {
  await act(async () => {
    root.render(<PresupuestoPanel />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

const testId = (id: string) => container.querySelector(`[data-testid="${id}"]`);


describe('Presupuesto · CB-09', () => {
  it('🔴 el mes del año pasado en palabras, no «2025-10»', async () => {
    await pintar();
    expect(container.textContent).not.toContain('2025-10');
    expect(container.textContent).toContain('Octubre de 2025');
    expect(container.textContent).toContain('Presupuesto vs. real vs. octubre de 2025');
  });

  it('🔴 Real = libro, la operación al lado; la plata de la casa y el aviso sin 🔴', async () => {
    h.comparacion.mockResolvedValue(
      comparacion({
        filas: [
          fila({
            presupuestoCop: null,
            realCop: 8_757_000,
            realDelLibroCop: 358_000,
            anioAnteriorCop: 0,
            contraPresupuestoCop: null,
            variacionAnualPct: null,
            difiereDelLibro: true,
          }),
          fila({
            rubro: 'costos_de_la_plata',
            nombre: 'Costos de la plata (4x1000 y pasarela)',
            naturaleza: 'COSTO',
            presupuestoCop: null,
            realCop: 0,
            realDelLibroCop: -119_100,
            anioAnteriorCop: 0,
            contraPresupuestoCop: null,
            variacionAnualPct: null,
          }),
        ],
        avisos: [
          '🔴 2 rubros dicen una cosa en la operación y otra en el libro: Comisiones de administración (operación $8.757.000 contra libro $358.000); Costos de la plata (4x1000 y pasarela) (operación $0 contra libro $-119.100).',
        ],
      }),
    );
    h.rubros.mockResolvedValue({
      rubros: [
        { rubro: 'comisiones', nombre: 'Comisiones de administración', naturaleza: 'INGRESO', fuenteDelReal: 'COMISION_CAUSADA', motivoSinReal: null },
        { rubro: 'costos_de_la_plata', nombre: 'Costos de la plata', naturaleza: 'COSTO', fuenteDelReal: 'COSTOS_DE_LA_PLATA', motivoSinReal: null },
      ],
    });
    await pintar();
    expect(testId('real-comisiones')?.textContent).toBe('$\u00a0358.000');
    expect(testId('operacion-comisiones')?.textContent).toBe('$\u00a08.757.000');
    expect(testId('real-costos_de_la_plata')?.textContent).toBe('−$\u00a0119.100');
    expect(container.textContent).toContain('En la operación');
    const aviso = testId('presupuesto-avisos')!.textContent ?? '';
    expect(aviso).not.toContain('🔴');
    expect(aviso).toContain('contra libro −$ 119.100');
    expect(aviso).not.toContain('$-119.100');
    expect(container.textContent).not.toMatch(/\$-/);
  });
});

describe('Presupuesto · CB-30, «Cargar un rubro»', () => {
  const enDoc = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  async function abrir() {
    await pintar();
    await act(async () => {
      (testId('cargar-presupuesto') as HTMLButtonElement).click();
    });
  }

  it('🔴 el botón no lleva la ↗ y el diálogo dice el mes en palabras', async () => {
    await pintar();
    // Sólo el «+»: sin la flecha ↗ automática del botón (no abre otra página).
    expect(testId('cargar-presupuesto')!.querySelectorAll('svg')).toHaveLength(1);
    await act(async () => {
      (testId('cargar-presupuesto') as HTMLButtonElement).click();
    });
    expect(document.body.textContent).toContain('Para octubre de 2026');
    expect(document.body.textContent).not.toContain('Para 2026-10');
  });

  it('🔴 el rubro se elige por su NOMBRE, con «Otro rubro…» que manda el nombre tal cual', async () => {
    h.guardar.mockResolvedValue({});
    await abrir();
    const rubro = enDoc('presupuesto-rubro') as HTMLSelectElement;
    const opciones = Array.from(rubro.options).map((o) => o.textContent);
    expect(opciones).toContain('Comisiones de administración');
    expect(opciones).toContain('Otro rubro…');
    expect(opciones).not.toContain('comisiones');
    await act(async () => {
      rubro.value = '__otro__';
      rubro.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const otro = enDoc('presupuesto-rubro-otro') as HTMLInputElement;
    const valor = enDoc('presupuesto-valor') as HTMLInputElement;
    expect(valor.getAttribute('type')).toBe('text');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(otro, 'Publicidad en portales');
      otro.dispatchEvent(new Event('input', { bubbles: true }));
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(valor, '1500000');
      valor.dispatchEvent(new Event('input', { bubbles: true }));
    });
    // El campo de plata de la casa agrupa mientras se escribe.
    expect((enDoc('presupuesto-valor') as HTMLInputElement).value).toBe('1.500.000');
    await act(async () => {
      (enDoc('guardar-presupuesto') as HTMLButtonElement).click();
      await Promise.resolve();
    });
    // Back 26beefbc: «Otro rubro…» viaja como `rubro: 'otro'` con su nombre tal cual.
    expect(h.guardar).toHaveBeenCalledWith(
      expect.objectContaining({ rubro: 'otro', nombre: 'Publicidad en portales', valorCop: 1_500_000, mes: '2026-10' }),
    );
  });
});

describe('Presupuesto · CB-30, errores del back en su campo', () => {
  it('🔴 RUBRO_OTRO_SIN_NOMBRE (en `nombre`) va bajo el rubro', async () => {
    const { ApiError } = await import('@/lib/api/client');
    h.guardar.mockRejectedValue(
      new ApiError(400, 'Escribe el nombre del rubro: es como se va a ver en el presupuesto.', 'RUBRO_OTRO_SIN_NOMBRE', {
        statusCode: 400,
        code: 'RUBRO_OTRO_SIN_NOMBRE',
        message: 'Escribe el nombre del rubro: es como se va a ver en el presupuesto.',
        campos: [{ campo: 'nombre', regla: 'obligatorio', mensaje: 'Escribe el nombre del rubro.' }],
      }),
    );
    await pintar();
    await act(async () => {
      (testId('cargar-presupuesto') as HTMLButtonElement).click();
    });
    const rubro = document.querySelector<HTMLSelectElement>('[data-testid="presupuesto-rubro"]')!;
    await act(async () => {
      rubro.value = 'comisiones';
      rubro.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const valor = document.querySelector<HTMLInputElement>('[data-testid="presupuesto-valor"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(valor, '1000');
      valor.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      document.querySelector<HTMLButtonElement>('[data-testid="guardar-presupuesto"]')!.click();
      await Promise.resolve();
    });
    expect(document.getElementById('presupuesto-rubro-error')?.textContent).toBe('Escribe el nombre del rubro.');
  });
});
