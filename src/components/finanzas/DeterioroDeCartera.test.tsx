/**
 * El editor de tramos recalcula, y la pantalla no deja confundir el saldo con
 * lo que se asienta.
 *
 * Lo que estos tests fijan:
 *   · cambiar un porcentaje recalcula la provisión del tramo, el total y el
 *     MOVIMIENTO, sin volver a preguntarle al back;
 *   · lo que se guarda son los porcentajes, no los pesos;
 *   · los `avisos` del back (siniestro y capital) se ven;
 *   · anular pide motivo; aprobar repite el número antes del clic;
 *   · una provisión aprobada ya no se edita.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { DeterioroDelMes, ProvisionDeCartera } from '@/lib/api/finanzas.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  deterioro: vi.fn(),
  proponer: vi.fn(),
  aprobar: vi.fn(),
  anular: vi.fn(),
}));

vi.mock('@/lib/api/finanzas.service', () => ({
  finanzasApi: {
    deterioro: h.deterioro,
    proponerDeterioro: h.proponer,
    aprobarDeterioro: h.aprobar,
    anularDeterioro: h.anular,
    usura: vi.fn(),
    guardarUsura: vi.fn(),
    borrarUsura: vi.fn(),
  },
  codigoSinMigrar: () => null,
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { DeterioroDeCarteraPanel, rangoEnDias } from './DeterioroDeCartera';

const TRAMOS = [
  {
    nombre: 'Hasta 90 días',
    desdeDias: 0,
    hastaDias: 90,
    porcentaje: 0,
    porcentajeSugerido: 0,
    carteraCop: 400_000_000,
    provisionCop: 0,
    cuotas: 300,
  },
  {
    nombre: 'De 90 a 180 días',
    desdeDias: 90,
    hastaDias: 180,
    porcentaje: 50,
    porcentajeSugerido: 50,
    carteraCop: 100_000_000,
    provisionCop: 50_000_000,
    cuotas: 40,
  },
  {
    nombre: 'Más de 180 días',
    desdeDias: 180,
    hastaDias: null,
    porcentaje: 100,
    porcentajeSugerido: 100,
    carteraCop: 30_000_000,
    provisionCop: 30_000_000,
    cuotas: 12,
  },
];

function provision(extra: Partial<ProvisionDeCartera> = {}): ProvisionDeCartera {
  return {
    id: 'p-1',
    mes: '2026-09',
    estado: 'PROPUESTA',
    carteraCop: 530_000_000,
    provisionCop: 80_000_000,
    provisionAnteriorCop: 60_000_000,
    movimientoCop: 20_000_000,
    aprobadaAt: null,
    asientoId: null,
    notas: null,
    tramos: TRAMOS.map(({ nombre, desdeDias, hastaDias, porcentaje }) => ({
      nombre,
      desdeDias,
      hastaDias,
      porcentaje,
    })),
    ...extra,
  };
}

function datos(extra: Partial<DeterioroDelMes> = {}): DeterioroDelMes {
  return {
    disponible: true,
    motivo: null,
    mes: '2026-09',
    calculo: {
      tramos: TRAMOS.map((t) => ({ ...t })),
      carteraCop: 530_000_000,
      provisionCop: 80_000_000,
      cuotas: 352,
      enSiniestroCop: 12_000_000,
      cuotasEnSiniestro: 4,
      sinTramoCop: 0,
      avisos: [
        '4 cuota(s) están reclamadas a la aseguradora y quedan FUERA de esta provisión.',
        'Sólo se provisiona el CAPITAL en cartera: el interés de mora no está causado hasta que se factura.',
      ],
    },
    provision: null,
    anterior: provision({ id: 'p-0', mes: '2026-08', estado: 'APROBADA', provisionCop: 60_000_000 }),
    tramosSugeridos: TRAMOS.map(({ nombre, desdeDias, hastaDias, porcentaje }) => ({
      nombre,
      desdeDias,
      hastaDias,
      porcentaje,
    })),
    ...extra,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  h.deterioro.mockReset().mockResolvedValue(datos());
  h.proponer.mockReset().mockResolvedValue(provision());
  h.aprobar.mockReset().mockResolvedValue(provision({ estado: 'APROBADA' }));
  h.anular.mockReset().mockResolvedValue(provision({ estado: 'ANULADA' }));
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
    root.render(<DeterioroDeCarteraPanel />);
  });
}

function texto(testId: string): string {
  return document.body.querySelector(`[data-testid="${testId}"]`)?.textContent?.trim() ?? '';
}

function escribir(input: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setter?.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function botones(t: string): HTMLButtonElement[] {
  return [...document.body.querySelectorAll('button')].filter((b) => (b.textContent ?? '').includes(t));
}

describe('deterioro de cartera', () => {
  it('parte de lo que calculó el back: provisión, anterior y movimiento', async () => {
    await pintar();
    expect(texto('total-provisionado')).toContain('80.000.000');
    expect(texto('valor-provision-anterior')).toContain('60.000.000');
    expect(texto('valor-movimiento')).toContain('20.000.000');
  });

  it('🔴 editar el porcentaje de un tramo recalcula el tramo, el total y el movimiento', async () => {
    await pintar();
    const input = document.body.querySelector<HTMLInputElement>('[data-testid="porcentaje-180"]')!;
    escribir(input, '60');

    // 60 % de 30.000.000 = 18.000.000 (antes eran 30.000.000 al 100 %).
    expect(texto('provision-180')).toContain('18.000.000');
    // Total: 0 + 50.000.000 + 18.000.000 = 68.000.000.
    expect(texto('total-provisionado')).toContain('68.000.000');
    // Movimiento contra los 60.000.000 del mes anterior: 8.000.000.
    expect(texto('valor-movimiento')).toContain('8.000.000');
    // Y no le volvió a preguntar al back.
    expect(h.deterioro).toHaveBeenCalledTimes(1);
  });

  it('🔴 dice que lo que se asienta es el movimiento, no el saldo', async () => {
    await pintar();
    expect(document.body.textContent).toContain('DIFERENCIA con la del mes anterior');
    expect(texto('cifra-provision')).toContain('NO es lo que se asienta');
  });

  it('avisa cuando lo que se ve ya no es lo que está guardado', async () => {
    await pintar();
    expect(document.body.querySelector('[data-testid="hay-cambios-sin-guardar"]')).toBeNull();
    escribir(document.body.querySelector<HTMLInputElement>('[data-testid="porcentaje-180"]')!, '60');
    expect(document.body.querySelector('[data-testid="hay-cambios-sin-guardar"]')).not.toBeNull();
  });

  it('guarda los PORCENTAJES, no los pesos', async () => {
    await pintar();
    escribir(document.body.querySelector<HTMLInputElement>('[data-testid="porcentaje-180"]')!, '60');
    await act(async () => {
      document.body.querySelector<HTMLButtonElement>('[data-testid="proponer"]')!.click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(h.proponer).toHaveBeenCalledWith({
      mes: expect.any(String),
      tramos: [
        { nombre: 'Hasta 90 días', desdeDias: 0, hastaDias: 90, porcentaje: 0 },
        { nombre: 'De 90 a 180 días', desdeDias: 90, hastaDias: 180, porcentaje: 50 },
        { nombre: 'Más de 180 días', desdeDias: 180, hastaDias: null, porcentaje: 60 },
      ],
    });
  });

  it('un porcentaje fuera de 0-100 se avisa y no se deja proponer', async () => {
    await pintar();
    escribir(document.body.querySelector<HTMLInputElement>('[data-testid="porcentaje-180"]')!, '140');
    expect(texto('porcentaje-invalido')).toContain('entre 0 y 100');
    expect(
      document.body.querySelector<HTMLButtonElement>('[data-testid="proponer"]')!.disabled,
    ).toBe(true);
  });

  it('muestra los avisos del back: el siniestro y el capital', async () => {
    await pintar();
    const avisos = texto('avisos-del-deterioro');
    expect(avisos).toContain('aseguradora');
    expect(avisos).toContain('CAPITAL');
  });

  it('aprobar repite el número que se va a asentar antes del clic', async () => {
    h.deterioro.mockResolvedValue(datos({ provision: provision() }));
    await pintar();
    await act(async () => {
      document.body.querySelector<HTMLButtonElement>('[data-testid="aprobar"]')!.click();
    });
    expect(texto('movimiento-a-asentar')).toContain('20.000.000');
    expect(h.aprobar).not.toHaveBeenCalled();
    await act(async () => {
      botones('Aprobar y asentar').at(-1)!.click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(h.aprobar).toHaveBeenCalledWith('p-1');
  });

  it('anular exige motivo', async () => {
    h.deterioro.mockResolvedValue(datos({ provision: provision() }));
    await pintar();
    await act(async () => {
      document.body.querySelector<HTMLButtonElement>('[data-testid="anular"]')!.click();
    });
    const anular = botones('Anular').at(-1)!;
    expect(anular.disabled).toBe(true);
    const motivo = document.body.querySelector<HTMLTextAreaElement>(
      '[data-testid="motivo-de-la-anulacion"]',
    )!;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    act(() => {
      setter?.call(motivo, 'Se recalculó la cartera del 30');
      motivo.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      botones('Anular').at(-1)!.click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(h.anular).toHaveBeenCalledWith('p-1', 'Se recalculó la cartera del 30');
  });

  it('una provisión aprobada ya no se edita', async () => {
    h.deterioro.mockResolvedValue(datos({ provision: provision({ estado: 'APROBADA' }) }));
    await pintar();
    expect(
      document.body.querySelector<HTMLInputElement>('[data-testid="porcentaje-180"]')!.disabled,
    ).toBe(true);
    expect(
      document.body.querySelector<HTMLButtonElement>('[data-testid="proponer"]')!.disabled,
    ).toBe(true);
  });

  it('sin la migración lo explica y apaga las tres acciones', async () => {
    h.deterioro.mockResolvedValue(
      datos({ disponible: false, motivo: 'Falta la migración 20260917221000_usura_y_deterioro.' }),
    );
    await pintar();
    expect(texto('sin-la-migracion')).toContain('Víctor');
    for (const id of ['proponer', 'aprobar', 'anular']) {
      expect(
        document.body.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)!.disabled,
        id,
      ).toBe(true);
    }
  });
});

describe('piezas puras', () => {
  it('el rango en días se escribe con y sin tope', () => {
    expect(rangoEnDias({ desdeDias: 90, hastaDias: 180 })).toBe('90 a 180 días');
    expect(rangoEnDias({ desdeDias: 180, hastaDias: null })).toBe('180+ días');
  });
});
