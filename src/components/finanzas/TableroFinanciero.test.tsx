/**
 * El tablero financiero pinta lo que el back midió — y calla lo que no.
 *
 * Lo que estos tests fijan:
 *   · una tasa `null` sale `—`, NUNCA «0 %», y la definición dice por qué;
 *   · los `avisos` del back se ven arriba, no escondidos;
 *   · los cuatro bloques (recaudo, cartera, propietarios, margen) están;
 *   · el selector de sede ofrece el consolidado y las sedes que mandó el back,
 *     y pedir una sede vuelve a preguntarle al back por ESA sede.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { TableroFinanciero } from '@/lib/api/finanzas.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({ tablero: vi.fn() }));

vi.mock('@/lib/api/finanzas.service', () => ({
  finanzasApi: { tablero: h.tablero },
  codigoSinMigrar: () => null,
}));

import { TableroFinancieroPanel, rangoDelTramo, textoDeLaVariacion } from './TableroFinanciero';

function tablero(extra: Partial<TableroFinanciero> = {}): TableroFinanciero {
  return {
    mes: '2026-09',
    hoy: '2026-09-17',
    sedeId: null,
    sedes: [
      { id: 's-1', nombre: 'Poblado', codigo: 'POB' },
      { id: 's-2', nombre: 'Laureles', codigo: 'LAU' },
    ],
    recaudo: {
      delDiaCop: 1_200_000,
      delMesCop: 48_000_000,
      causadoDelMesCop: 120_000_000,
      tasaPct: 40,
      base: 'CAUSADO',
      rotulo: 'Sobre lo causado del mes.',
      mesAnterior: { mes: '2026-08', recaudadoCop: 40_000_000, causadoCop: 110_000_000, tasaPct: 36.4 },
      variacionPct: 20,
    },
    cartera: {
      totalCop: 655_100_000,
      tramos: [
        { nombre: '1 a 30 días', desdeDias: 1, hastaDias: 30, carteraCop: 300_000_000, cuotas: 120 },
        { nombre: '31 a 60 días', desdeDias: 31, hastaDias: 60, carteraCop: 200_000_000, cuotas: 60 },
        { nombre: '61 a 90 días', desdeDias: 61, hastaDias: 90, carteraCop: 100_000_000, cuotas: 30 },
        { nombre: 'Más de 90 días', desdeDias: 91, hastaDias: null, carteraCop: 55_100_000, cuotas: 11 },
      ],
      enSiniestroCop: 12_000_000,
      deudores: [
        {
          clienteId: 'c-1',
          nombre: 'Marta Ochoa',
          documento: '43.123.456',
          saldoCop: 9_800_000,
          diasDeMora: 74,
          etapa: 'PREJURIDICA',
          contratos: 2,
        },
      ],
    },
    propietarios: {
      porGirarCop: 210_000_000,
      retenidoCop: 4_500_000,
      enLotesPorAprobarCop: 88_000_000,
      lotesPorAprobar: 2,
      giradoDelMesCop: 175_000_000,
    },
    margen: {
      comisionesCop: 12_000_000,
      interesesCop: 900_000,
      gastosDeCobranzaCop: 300_000,
      ingresosPropiosCop: 13_200_000,
      gmfCop: 700_000,
      pasarelaCop: 400_000,
      costosCop: 1_100_000,
      margenCop: 12_100_000,
      margenPct: 91.7,
    },
    avisos: ['3 contratos vigentes no tienen tabla de amortización: su deuda no entra acá.'],
    ...extra,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  h.tablero.mockReset().mockResolvedValue(tablero());
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
    root.render(<TableroFinancieroPanel />);
  });
}

function valor(id: string): string {
  const nodo = container.querySelector(`[data-testid="valor-${id}"]`);
  if (!nodo) throw new Error(`No hay cifra «${id}»`);
  return nodo.textContent?.trim() ?? '';
}

describe('tablero financiero', () => {
  it('pinta los cuatro bloques con las cifras del back', async () => {
    await pintar();
    for (const bloque of ['recaudo', 'cartera', 'propietarios', 'margen']) {
      expect(container.querySelector(`[data-testid="bloque-${bloque}"]`), bloque).not.toBeNull();
    }
    expect(valor('recaudo-del-dia')).toContain('1.200.000');
    expect(valor('cartera-total')).toContain('655.100.000');
    expect(valor('por-girar')).toContain('210.000.000');
    expect(valor('margen')).toContain('12.100.000');
  });

  it('🔴 una tasa que el back no pudo medir sale «—», nunca «0 %»', async () => {
    h.tablero.mockResolvedValue(
      tablero({
        recaudo: {
          ...tablero().recaudo,
          delMesCop: 0,
          causadoDelMesCop: 0,
          tasaPct: null,
          variacionPct: null,
          mesAnterior: { mes: '2026-08', recaudadoCop: 0, causadoCop: 0, tasaPct: null },
        },
        margen: { ...tablero().margen, ingresosPropiosCop: 0, margenPct: null },
      }),
    );
    await pintar();

    expect(valor('tasa-de-recaudo')).toBe('—');
    expect(valor('tasa-de-recaudo')).not.toContain('0');
    expect(container.querySelector('[data-testid="variacion-del-recaudo"]')?.textContent).toBe('—');
    expect(container.querySelector('[data-testid="margen-pct"]')?.textContent).toContain('—');
    // Y dice por qué no se midió, en vez de dejar un guion mudo.
    expect(container.textContent).toContain('no hay contra qué comparar');
  });

  it('muestra los avisos del back arriba y sin recortarlos', async () => {
    await pintar();
    const avisos = container.querySelector('[data-testid="avisos-del-tablero"]');
    expect(avisos?.textContent).toContain('no tienen tabla de amortización');
  });

  it('el siniestro se dice aparte, adentro de la cartera', async () => {
    await pintar();
    expect(container.querySelector('[data-testid="cartera-en-siniestro"]')?.textContent).toContain(
      '12.000.000',
    );
  });

  it('el deudor sale con su etapa en palabras', async () => {
    await pintar();
    const fila = container.querySelector('[data-testid="fila-deudor"]');
    expect(fila?.textContent).toContain('Marta Ochoa');
    expect(fila?.textContent).toContain('Prejurídica');
  });

  it('el consolidado es la opción por defecto y pedir una sede se la pide al back', async () => {
    await pintar();
    const selector = container.querySelector<HTMLSelectElement>('[data-testid="selector-de-sede"]');
    expect(selector).not.toBeNull();
    expect(selector!.value).toBe('');
    expect([...selector!.options].map((o) => o.textContent)).toEqual([
      'Consolidado (todas)',
      'Poblado (POB)',
      'Laureles (LAU)',
    ]);
    expect(h.tablero).toHaveBeenLastCalledWith(expect.any(String), null);

    await act(async () => {
      selector!.value = 's-2';
      selector!.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(h.tablero).toHaveBeenLastCalledWith(expect.any(String), 's-2');
  });

  it('cuando nadie debe nada lo dice con palabras, no con una tabla vacía', async () => {
    h.tablero.mockResolvedValue(tablero({ cartera: { ...tablero().cartera, deudores: [] } }));
    await pintar();
    expect(container.textContent).toContain('Nadie tiene cartera vencida en este corte');
  });
});

describe('piezas puras del tablero', () => {
  it('el rango del tramo se escribe con y sin tope', () => {
    expect(rangoDelTramo({ desdeDias: 1, hastaDias: 30 })).toBe('1-30 días de mora');
    expect(rangoDelTramo({ desdeDias: 91, hastaDias: null })).toBe('91+ días de mora');
  });

  it('la variación lleva signo, y `null` es una raya', () => {
    expect(textoDeLaVariacion(20)).toBe('+20.0%');
    expect(textoDeLaVariacion(-8.25)).toBe('-8.3%');
    expect(textoDeLaVariacion(null)).toBe('—');
  });
});
