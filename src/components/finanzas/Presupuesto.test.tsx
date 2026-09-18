/**
 * El presupuesto no pinta `$0` donde nadie midió.
 *
 * Lo que estos tests fijan: un rubro sin fuente de real sale con guion y con el
 * motivo escrito; el total del real NO lo suma; y el aviso dice cuántos rubros
 * quedaron sin comparar. Un cero en «real» haría planificar sobre una mentira.
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

describe('🔴 lo que no se pudo medir se pinta con guion', () => {
  it('un rubro CON real muestra sus cuatro números', async () => {
    await pintar();
    expect(testId('presupuesto-comisiones')?.textContent).toContain('100.000.000');
    expect(testId('real-comisiones')?.textContent).toContain('112.000.000');
    expect(testId('contra-comisiones')?.textContent).toContain('12.000.000');
    expect(testId('variacion-comisiones')?.textContent).toBe('+17.9 %');
  });

  it('un rubro SIN real sale con `—`, nunca con `$0`', async () => {
    await pintar();
    expect(testId('real-nomina')?.textContent).toBe('—');
    expect(testId('contra-nomina')?.textContent).toBe('—');
    expect(testId('anterior-nomina')?.textContent).toBe('—');
    expect(testId('variacion-nomina')?.textContent).toBe('—');
    // Y su presupuesto SÍ se muestra: saber cuánto se planeó ya vale.
    expect(testId('presupuesto-nomina')?.textContent).toContain('40.000.000');
  });

  it('y dice POR QUÉ no se puede medir, en la misma fila', async () => {
    await pintar();
    expect(testId('sin-real-nomina')?.textContent).toContain('asientos que cargue el contador');
    // El que sí se mide no tiene ese texto.
    expect(testId('sin-real-comisiones')).toBeNull();
  });
});

describe('los totales y el aviso', () => {
  it('el total del real NO suma los desconocidos, y lo dice', async () => {
    await pintar();
    expect(testId('total-presupuesto')?.textContent).toContain('140.000.000');
    expect(testId('total-real')?.textContent).toContain('112.000.000');
    expect(container.textContent).toContain('NO incluye 1 rubro(s)');
  });

  it('el aviso del back se muestra arriba', async () => {
    await pintar();
    expect(testId('presupuesto-avisos')?.textContent).toContain('Nómina');
  });
});

describe('sin la migración', () => {
  it('explica que falta y no ofrece el botón de cargar', async () => {
    h.presupuesto.mockResolvedValue(
      cargado({
        disponible: false,
        motivo: 'Falta la migración 20260917224000_presupuesto_por_mes_y_rubro.',
        filas: [],
      }),
    );
    await pintar();
    expect(testId('sin-la-migracion')?.textContent).toContain('20260917224000');
    expect(testId('cargar-presupuesto')).toBeNull();
    // Pero la comparación con el real SÍ se sigue viendo.
    expect(testId('real-comisiones')?.textContent).toContain('112.000.000');
  });
});

describe('sin diálogos del navegador', () => {
  it('quitar un rubro se confirma con el diálogo del sistema de diseño', async () => {
    /*
     * `window.confirm` no existe en happy-dom, así que se planta uno para poder
     * afirmar que NO se llamó: sin plantarlo, un `spyOn` reventaría y el test
     * pasaría a verde por el motivo equivocado el día que alguien lo use.
     */
    const confirmar = vi.fn(() => true);
    (window as unknown as { confirm: () => boolean }).confirm = confirmar;

    await pintar();
    const boton = testId('quitar-comisiones') as HTMLButtonElement | null;
    expect(boton).not.toBeNull();
    await act(async () => {
      boton?.click();
    });
    expect(confirmar).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('¿Quitar el presupuesto de este rubro?');
  });

  it('un rubro sin presupuesto cargado no ofrece quitarlo', async () => {
    await pintar();
    expect(testId('quitar-nomina')).toBeNull();
  });
});
