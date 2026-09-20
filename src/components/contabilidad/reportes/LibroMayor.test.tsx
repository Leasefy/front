/**
 * El libro mayor.
 *
 * 🔴 El test central: NO se dibujan columnas de meses que todavía no llegaron.
 * El back manda `meses` con todo el rango pedido; si el rango va hasta diciembre
 * y hoy es septiembre, tres columnas en cero se leen como «no se movió nada en
 * octubre» cuando lo que pasa es que octubre no empezó. Y se dice cuántas se
 * recortaron, para que nadie busque una columna que esperaba.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { LibroMayor as Mayor } from '@/lib/api/estados-financieros.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, fechas } = vi.hoisted(() => ({
  api: { mayor: vi.fn(), terceros: vi.fn(), pyg: vi.fn(), balanceGeneral: vi.fn() },
  /** Se fija «hoy» para que el recorte de meses no dependa del día del CI. */
  fechas: { hoy: () => '2026-09-17' },
}));

vi.mock('@/lib/api/estados-financieros.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/estados-financieros.service')>(
    '@/lib/api/estados-financieros.service',
  );
  return { ...actual, estadosFinancierosApi: api };
});
vi.mock('@/lib/contabilidad/fechas', async () => {
  const actual = await vi.importActual<typeof import('@/lib/contabilidad/fechas')>(
    '@/lib/contabilidad/fechas',
  );
  return { ...actual, hoy: fechas.hoy };
});
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}` }),
}));

import { LibroMayor } from './LibroMayor';

const mayor = (extra: Partial<Mayor> = {}): Mayor => ({
  desde: '2026-01-01',
  hasta: '2026-12-31',
  nivel: 4,
  meses: ['2026-08', '2026-09', '2026-10', '2026-11'],
  filas: [
    {
      codigo: '5135',
      nombre: 'Servicios',
      naturaleza: 'DEBITO',
      saldoAnteriorCop: 0,
      debitosCop: 1_200_000,
      creditosCop: 0,
      saldoFinalCop: 1_200_000,
      porMes: [
        { mes: '2026-08', debitosCop: 500_000, creditosCop: 0, saldoCop: 500_000 },
        { mes: '2026-09', debitosCop: 700_000, creditosCop: 0, saldoCop: 1_200_000 },
      ],
    },
  ],
  totalDebitosCop: 1_200_000,
  totalCreditosCop: 1_200_000,
  cuadra: true,
  diferenciaCop: 0,
  ...extra,
});

let container: HTMLDivElement;
let root: Root | null = null;
const q = (t: string) => document.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

beforeEach(() => {
  api.mayor.mockReset().mockResolvedValue(mayor());
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

async function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<LibroMayor />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('<LibroMayor>', () => {
  it('dibuja cada cuenta con su saldo anterior y su saldo final', async () => {
    await pintar();
    const fila = q('mayor-5135')!.textContent!;
    expect(fila).toContain('5135');
    expect(fila).toContain('Servicios');
    expect(fila).toContain('$1.200.000');
  });

  it('🔴 no dibuja los meses que todavía no llegaron', async () => {
    await pintar();
    const encabezados = [...q('libro-mayor')!.querySelectorAll('th')].map((t) => t.textContent);
    expect(encabezados).toContain('2026-08');
    expect(encabezados).toContain('2026-09');
    expect(encabezados).not.toContain('2026-10');
    expect(encabezados).not.toContain('2026-11');
  });

  it('🔴 y dice cuántas columnas se recortaron, para que nadie las busque', async () => {
    await pintar();
    const nota = q('meses-recortados')!.textContent!;
    expect(nota).toContain('2 meses');
    expect(nota).toContain('no se movió nada');
  });

  it('con el rango dentro del año en curso no recorta nada', async () => {
    api.mayor.mockResolvedValue(mayor({ meses: ['2026-08', '2026-09'] }));
    await pintar();
    expect(q('meses-recortados')).toBeNull();
  });

  it('cuando cuadra no grita, y el pie lo dice', async () => {
    await pintar();
    expect(q('mayor-no-cuadra')).toBeNull();
    expect(q('totales-del-mayor')!.textContent).toContain('cuadra');
  });

  it('🔴 cuando no cuadra sale arriba y nombra la partida doble', async () => {
    api.mayor.mockResolvedValue(
      mayor({ cuadra: false, totalCreditosCop: 1_199_000, diferenciaCop: 1_000 }),
    );

    await pintar();

    const cartel = q('mayor-no-cuadra')!.textContent!;
    expect(cartel).toContain('partida doble');
    expect(cartel).toContain('$1.000');
  });

  it('el nivel por defecto es la cuenta de 4 dígitos', async () => {
    await pintar();
    expect((q('nivel-del-mayor') as HTMLSelectElement).value).toBe('4');
    expect(api.mayor).toHaveBeenCalledWith(expect.objectContaining({ nivel: '4' }));
  });

  it('se puede pedir una sola clase del PUC', async () => {
    await pintar();
    await act(async () => {
      const select = q('clase-del-mayor') as HTMLSelectElement;
      select.value = '5';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(api.mayor).toHaveBeenCalledWith(expect.objectContaining({ clase: '5' }));
  });

  it('«Todas las clases» no manda la clave: el filtro vacío no filtra', async () => {
    await pintar();
    const [primero] = api.mayor.mock.calls[0];
    expect((primero as { clase?: string }).clase).toBeUndefined();
  });

  it('sin movimientos lo dice, en vez de una tabla vacía', async () => {
    api.mayor.mockResolvedValue(mayor({ filas: [] }));
    await pintar();
    expect(container.textContent).toContain('No hay movimientos en este rango');
  });

  it('el fallo se puede reintentar', async () => {
    api.mayor.mockRejectedValue(new Error('sin red'));
    await pintar();
    const reintentar = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Intentar de nuevo'),
    );
    expect(reintentar).toBeDefined();
  });
});
