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
    /* 🔴 20-09 · La fila dice la MARCA, no el motivo entero. Con once rubros
       sin medir, el mismo párrafo de cuatro renglones salía ocho veces y
       ocupaba el 70 % de la tabla, mientras el aviso de arriba ya lo decía
       una vez con la lista completa. El motivo entero queda en el `title`. */
    expect(testId('sin-real-nomina')?.textContent).toContain('Sin cuentas del PUC');
    expect(testId('sin-real-nomina')?.getAttribute('title')).toContain(
      'asientos que cargue el contador',
    );
    // El que sí se mide no tiene ese texto.
    expect(testId('sin-real-comisiones')).toBeNull();
  });
});

describe('los totales y el aviso', () => {
  it('el total del real NO suma los desconocidos, y lo dice', async () => {
    await pintar();
    expect(testId('total-presupuesto')?.textContent).toContain('140.000.000');
    expect(testId('total-real')?.textContent).toContain('112.000.000');
    expect(container.textContent).toContain('NO incluye 1 rubro que todavía no se puede medir');
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
    expect(testId('sin-la-migracion')?.textContent).not.toContain('20260917224000');
    expect(testId('sin-la-migracion')?.textContent).toContain('todavía no está disponible');
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

/*
 * Sistema de errores (02-10-2026): 🔁 el valor presupuestado con ceros de más
 * (para arriba o para abajo: puede ser negativo) dice la frase del back bajo
 * el campo y no viaja; un 5xx dice «de nuestro lado» con la referencia.
 */
describe('cargar el presupuesto · errores en su campo', () => {
  const enDoc = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  function escribir(el: HTMLInputElement, valor: string) {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  async function abrirYEscribir(valor: string) {
    await pintar();
    await act(async () => {
      (testId('cargar-presupuesto') as HTMLButtonElement).click();
    });
    await act(async () => {
      escribir(enDoc('presupuesto-rubro') as HTMLInputElement, 'comisiones');
      escribir(enDoc('presupuesto-valor') as HTMLInputElement, valor);
    });
  }
  async function guardar() {
    await act(async () => {
      (enDoc('guardar-presupuesto') as HTMLButtonElement).click();
      await Promise.resolve();
    });
  }

  it('🔁 un valor con ceros de más se ataja antes de enviar, con la frase del back', async () => {
    await abrirYEscribir('120000000000');
    expect(document.getElementById('presupuesto-valor-error')?.textContent).toBe(
      'El valor presupuestado no puede pasar de $2.000.000.000 (ni de -$2.000.000.000). Revisa que no sobren ceros.',
    );
    await guardar();
    expect(h.guardar).not.toHaveBeenCalled();
  });

  it('un valor negativo dentro del rango sí se manda (un rubro de costo)', async () => {
    h.guardar.mockResolvedValue({});
    await abrirYEscribir('-35000000');
    expect(document.getElementById('presupuesto-valor-error')?.textContent ?? '').toBe('');
    await guardar();
    expect(h.guardar).toHaveBeenCalledWith(expect.objectContaining({ valorCop: -35_000_000 }));
  });

  it('🔴 un 5xx dice «de nuestro lado» con la referencia', async () => {
    const { ApiError } = await import('@/lib/api/client');
    const { toast } = await import('@/components/ui/toast');
    h.guardar.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
        referencia: 'ffff6666',
      }),
    );
    await abrirYEscribir('120000000');
    await guardar();

    const texto = vi.mocked(toast.error).mock.calls.at(-1)![0] as string;
    expect(texto).toMatch(/No pudimos cargar el presupuesto: algo falló de nuestro lado/);
    expect(texto).toContain('ffff6666');
  });
});
