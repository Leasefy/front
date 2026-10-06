/**
 * CB-13 / CB-14 (QA de Contabilidad, 03-10-2026): el cajón del asiento.
 *
 *   · nunca pinta un uuid (terceros, reversa, origen);
 *   · con el detalle del back dice «Propietario · Paula…», «Reversa del N.º 18»
 *     y «Reversado por el N.º 165», y esos números abren ese asiento;
 *   · no ofrece «Reversar» a un asiento ya reversado ni a una reversa.
 */
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { AsientoContable } from '@/lib/api/contabilidad.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api } = vi.hoisted(() => ({
  api: { asientos: { detalle: vi.fn(), reversar: vi.fn() } },
}));

vi.mock('@/lib/api/contabilidad.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contabilidad.service')>(
    '@/lib/api/contabilidad.service',
  );
  return { ...actual, contabilidadApi: api };
});
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ formatCurrency: (n: number) => `$ ${n.toLocaleString('es-CO')}` }),
}));

import { DetalleDeAsiento } from './DetalleDeAsiento';

const UUID_PROPIETARIO = '9e09fd33-c093-4c23-93ad-4b396871dec1';
const UUID_ORIGINAL = '7d800802-f3d2-4994-a610-127b649c911e';
const UUID_COBRO = 'd8e5b110-c26d-4cf8-b374-008c4fb494fe';

function asiento(extra: Partial<AsientoContable> = {}): AsientoContable {
  return {
    id: 'a-163',
    agencyId: 'ag',
    numero: 163,
    fecha: '2026-10-04',
    descripcion: 'Reversa del asiento N.º 18: Causación cobro',
    origen: 'MANUAL',
    origenId: UUID_ORIGINAL,
    cerrado: false,
    creadoPorUserId: null,
    createdAt: '2026-10-04T00:00:00Z',
    movimientos: [
      {
        id: 'm1',
        asientoId: 'a-163',
        cuentaId: 'c-1305',
        debitoCop: 0,
        creditoCop: 1500000,
        terceroTipo: 'ARRENDATARIO',
        terceroId: null,
        descripcion: 'Cobro',
        orden: 0,
        cuenta: { codigo: '130505', nombre: 'Nacionales' },
      },
      {
        id: 'm2',
        asientoId: 'a-163',
        cuentaId: 'c-2815',
        debitoCop: 1500000,
        creditoCop: 0,
        terceroTipo: 'PROPIETARIO',
        terceroId: UUID_PROPIETARIO,
        descripcion: 'Canon',
        orden: 1,
        cuenta: { codigo: '28150505', nombre: 'Canon recaudado para propietarios' },
      },
    ],
    ...extra,
  };
}

const q = (t: string) => document.querySelector<HTMLElement>(`[data-testid="${t}"]`);

let host: HTMLDivElement;
let root: Root;

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function pintar(a: AsientoContable) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<DetalleDeAsiento asiento={a} abierto onCerrar={() => {}} />);
  });
  await esperar();
}

beforeEach(() => {
  api.asientos.detalle.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = '';
});

describe('<DetalleDeAsiento> · CB-13, sin ids crudos', () => {
  it('🔴 con un back que todavía no manda nombres, no pinta ningún uuid', async () => {
    api.asientos.detalle.mockRejectedValue(new Error('sin la ruta'));
    await pintar(
      asiento({ origen: 'COBRO', origenId: UUID_COBRO, descripcion: 'Causación cobro 2026-10', numero: 18, id: 'a-18' }),
    );
    const texto = q('detalle-de-asiento')!.textContent ?? '';
    expect(texto).not.toContain(UUID_PROPIETARIO);
    expect(texto).not.toContain(UUID_COBRO);
    expect(texto).not.toMatch(/ARRENDATARIO|PROPIETARIO ·/);
    expect(texto).toContain('Generado por la causación de un cobro');
  });

  it('con el detalle del back: el nombre del tercero y el rótulo del origen', async () => {
    const base = asiento({ origen: 'COBRO', origenId: UUID_COBRO, numero: 18, id: 'a-18' });
    api.asientos.detalle.mockResolvedValue({
      ...base,
      origenLegible: { tipo: 'COBRO', rotulo: 'Cobro de octubre de 2026 · Valentina Ospina Duque', id: 'x' },
      reversadoPor: null,
      reversaDe: null,
      movimientos: base.movimientos.map((m) =>
        m.terceroTipo === 'PROPIETARIO' ? { ...m, terceroNombre: 'Paula Andrea Quintero', terceroDocumento: '43123456' } : m,
      ),
    });
    await pintar(base);
    expect(api.asientos.detalle).toHaveBeenCalledWith('a-18');
    const terceros = Array.from(document.querySelectorAll('[data-testid="tercero-de-la-linea"]')).map(
      (n) => n.textContent,
    );
    expect(terceros).toEqual(['Propietario · Paula Andrea Quintero (43123456)']);
    expect(q('origen-del-asiento')!.textContent).toContain('Cobro de octubre de 2026 · Valentina Ospina Duque');
  });
});

describe('<DetalleDeAsiento> · CB-14, reversado y reversa', () => {
  it('🔴 una reversa dice «Reversa del N.º 18», lo abre, y no ofrece «Reversar»', async () => {
    const reversa = asiento({ reversaDe: { id: 'a-18', numero: 18 }, reversadoPor: null });
    const original = asiento({
      id: 'a-18',
      numero: 18,
      origen: 'COBRO',
      origenId: UUID_COBRO,
      descripcion: 'Causación cobro 2026-10',
      reversaDe: null,
      reversadoPor: { id: 'a-163', numero: 163 },
    });
    api.asientos.detalle.mockImplementation(async (id: string) => (id === 'a-18' ? original : reversa));
    await pintar(reversa);

    expect(q('reversa-de')!.textContent).toBe('Reversa del N.º 18');
    expect(q('abrir-reversar')).toBeNull();
    expect(q('estado-del-asiento')!.textContent).toBe('Reversa');
    expect(q('detalle-de-asiento')!.textContent).not.toContain(UUID_ORIGINAL);

    await act(async () => {
      q('reversa-de')!.querySelector('button')!.click();
    });
    await esperar();
    // El mismo cajón ahora muestra el N.º 18, ya reversado por el 163.
    expect(q('detalle-de-asiento')!.textContent).toContain('Asiento n.º 18');
    expect(q('reversado-por')!.textContent).toBe('Reversado por el N.º 163');
    expect(q('abrir-reversar')).toBeNull();
    expect(q('estado-del-asiento')!.textContent).toBe('Reversado');
  });

  it('back anterior: la reversa sin número ofrece «Abrir el original» sin pintar su id', async () => {
    api.asientos.detalle.mockImplementation(async () => asiento());
    await pintar(asiento());
    expect(q('reversa-de')!.textContent).toBe('Es la reversa de otro asiento · Abrir el original');
    expect(q('abrir-reversar')).toBeNull();
  });

  it('un asiento vivo sí ofrece «Reversar»', async () => {
    const vivo = asiento({ origen: 'COBRO', origenId: UUID_COBRO, reversaDe: null, reversadoPor: null });
    api.asientos.detalle.mockResolvedValue(vivo);
    await pintar(vivo);
    expect(q('abrir-reversar')).not.toBeNull();
  });
});

describe('<DetalleDeAsiento> · contrato del back (QA-CONTA-BACK)', () => {
  it('🔴 el back decide: sin «Reversar» y con su porqué; la pastilla dice el tipo del origen', async () => {
    const auto = asiento({
      origen: 'MANUAL',
      origenId: null,
      reversaDe: null,
      reversadoPor: null,
      origenLegible: { tipo: 'EGRESO', rotulo: 'Egreso N.º 2 · QA-CB Ferretería Doce SAS', id: 'e2' },
      sePuedeReversar: false,
      porQueNoSeReversa: 'Es un asiento automático: se corrige anulando el egreso.',
    });
    api.asientos.detalle.mockResolvedValue(auto);
    await pintar(auto);
    expect(q('abrir-reversar')).toBeNull();
    expect(q('detalle-de-asiento')!.textContent).toContain('se corrige anulando el egreso');
    expect(q('detalle-de-asiento')!.textContent).toContain('Egreso');
    expect(q('origen-del-asiento')!.textContent).toContain('Generado por: Egreso N.º 2');
  });
});
