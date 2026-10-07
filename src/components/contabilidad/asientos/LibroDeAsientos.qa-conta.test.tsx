/**
 * El libro de asientos, QA de Contabilidad (03-10-2026).
 *
 *   · CB-14: la columna «Estado» dice lo que el asiento ES (Reversado, Reversa,
 *     Período cerrado) y nada en un asiento vivo — no «Abierto» en cada fila.
 *   · CB-22: bajo 768 px cada asiento es una tarjeta (n.º, fecha, descripción,
 *     monto, origen) y no una tabla que se corre de lado.
 */
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { AsientoContable } from '@/lib/api/contabilidad.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, celular } = vi.hoisted(() => ({
  api: {
    asientos: { listar: vi.fn(), cierre: vi.fn(), detalle: vi.fn() },
    puc: { listar: vi.fn() },
  },
  celular: { valor: false },
}));

vi.mock('@/lib/api/contabilidad.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contabilidad.service')>(
    '@/lib/api/contabilidad.service',
  );
  return { ...actual, contabilidadApi: api };
});
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => celular.valor }));
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ formatCurrency: (n: number) => `$ ${n.toLocaleString('es-CO')}` }),
}));
vi.mock('./CierreDePeriodo', () => ({ CierreDePeriodo: () => <div data-testid="cierre" /> }));
vi.mock('./AsientoManual', () => ({ AsientoManual: () => null }));
vi.mock('./DetalleDeAsiento', () => ({
  DetalleDeAsiento: ({ asiento }: { asiento: AsientoContable | null }) =>
    asiento ? <div data-testid="cajon-abierto">{asiento.numero}</div> : null,
}));
vi.mock('../SelectorDeCuenta', () => ({ SelectorDeCuenta: () => <div /> }));
vi.mock('../RangoDeFechas', () => ({ RangoDeFechas: () => <div /> }));

import { LibroDeAsientos } from './LibroDeAsientos';

function asiento(numero: number, extra: Partial<AsientoContable> = {}): AsientoContable {
  return {
    id: `a-${numero}`,
    agencyId: 'ag',
    numero,
    fecha: '2026-10-04T00:00:00.000Z',
    descripcion: `Asiento ${numero}: Causación cobro 2026-10 — Valentina Ospina Duque · Calle 50 # 65-30 Casa`,
    origen: 'COBRO',
    origenId: 'x',
    cerrado: false,
    creadoPorUserId: null,
    createdAt: '2026-10-04T00:00:00Z',
    movimientos: [
      { id: `m${numero}a`, asientoId: `a-${numero}`, cuentaId: 'c1', debitoCop: 1500000, creditoCop: 0, terceroTipo: null, terceroId: null, descripcion: null, orden: 0 },
      { id: `m${numero}b`, asientoId: `a-${numero}`, cuentaId: 'c2', debitoCop: 0, creditoCop: 1500000, terceroTipo: null, terceroId: null, descripcion: null, orden: 1 },
    ],
    ...extra,
  };
}

let host: HTMLDivElement;
let root: Root;

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<LibroDeAsientos />);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

beforeEach(() => {
  celular.valor = false;
  api.puc.listar.mockReset().mockResolvedValue([]);
  api.asientos.cierre.mockReset().mockResolvedValue({ cerradaHasta: null });
  api.asientos.listar.mockReset().mockResolvedValue({
    total: 4,
    limite: 10,
    desplazamiento: 0,
    asientos: [
      asiento(165, { origen: 'MANUAL', reversaDe: { id: 'a-164', numero: 164 }, reversadoPor: null }),
      asiento(164, { origen: 'MANUAL', origenId: null, reversaDe: null, reversadoPor: { id: 'a-165', numero: 165 } }),
      asiento(20, { cerrado: true, reversaDe: null, reversadoPor: null }),
      asiento(19, { reversaDe: null, reversadoPor: null }),
    ],
  });
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = '';
});

describe('<LibroDeAsientos> · CB-14, el estado del asiento', () => {
  it('🔴 dice Reversa / Reversado / Período cerrado, y nada en un asiento vivo — nunca «Abierto»', async () => {
    await montar();
    const estados = Array.from(host.querySelectorAll('[data-testid="estado-de-la-fila"]')).map(
      (n) => n.textContent,
    );
    expect(estados).toEqual(['Reversa', 'Reversado', 'Período cerrado', '']);
    expect(host.textContent).not.toContain('Abierto');
  });
});

describe('<LibroDeAsientos> · CB-22, tarjetas en el celular', () => {
  it('🔴 bajo 768 px no hay tabla: una tarjeta por asiento con lo que importa', async () => {
    celular.valor = true;
    await montar();
    expect(host.querySelector('table')).toBeNull();
    const tarjetas = host.querySelectorAll<HTMLButtonElement>('[data-testid="tarjeta-de-asiento"]');
    expect(tarjetas).toHaveLength(4);
    const primera = tarjetas[0].textContent ?? '';
    expect(primera).toContain('N.º 165 · 4 oct 2026');
    expect(primera).toContain('Valentina Ospina Duque');
    expect(primera).toContain('1.500.000');
    expect(primera).toContain('Manual');
    expect(primera).toContain('Reversa');

    await act(async () => {
      tarjetas[3].click();
    });
    expect(host.querySelector('[data-testid="cajon-abierto"]')!.textContent).toBe('19');
  });

  it('en escritorio sigue la tabla', async () => {
    await montar();
    expect(host.querySelector('table')).not.toBeNull();
    expect(host.querySelector('[data-testid="tarjetas-de-asientos"]')).toBeNull();
  });
});
