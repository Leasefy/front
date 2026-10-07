/**
 * 🔴 QA-FACT-CONTA-95 (05-10-2026) · CB-B-26: la bitácora de reaperturas
 * mostraba al que reabrió con su UUID y la fecha en «4/10/2026, 12:02:50 a. m.».
 * Va su NOMBRE y la fecha de la casa en la hora de Colombia.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { BitacoraDeReaperturas, ResultadoDeReapertura } from '@/lib/api/contabilidad.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, permisoMock, toastMock } = vi.hoisted(() => ({
  api: { asientos: { reabrir: vi.fn(), reaperturas: vi.fn() } },
  permisoMock: { puede: true, motivo: null as string | null, usuarioId: 'u-1' },
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/api/contabilidad.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contabilidad.service')>(
    '@/lib/api/contabilidad.service',
  );
  return { ...actual, contabilidadApi: api };
});
vi.mock('../use-puede-escribir', async () => {
  const actual = await vi.importActual<typeof import('../use-puede-escribir')>(
    '../use-puede-escribir',
  );
  return { ...actual, usePuedeReabrir: () => permisoMock };
});
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));

import { Reapertura } from './Reapertura';

const bitacora = (extra: Partial<BitacoraDeReaperturas> = {}): BitacoraDeReaperturas => ({
  disponible: true,
  motivo: null,
  reaperturas: [],
  ...extra,
});

const resultado = (extra: Partial<ResultadoDeReapertura> = {}): ResultadoDeReapertura => ({
  reapertura: {
    id: 'r-1',
    agencyId: 'a-1',
    fronteraAnterior: '2025-12-31T00:00:00.000Z',
    fronteraNueva: '2025-11-30T00:00:00.000Z',
    motivo: 'Faltó causar la factura de aseo',
    reabiertoPorUserId: 'u-1',
    reabiertoAt: '2026-09-19T14:00:00.000Z',
  },
  fronteraAnterior: '2025-12-31',
  fronteraNueva: '2025-11-30',
  aviso:
    'Se movió la frontera del cierre. Los asientos que ya estaban marcados como cerrados NO se desmarcan.',
  ...extra,
});

let container: HTMLDivElement;
let root: Root | null = null;
const q = (t: string) => document.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;
const todos = (t: string) =>
  Array.from(document.querySelectorAll(`[data-testid="${t}"]`)) as HTMLElement[];

beforeEach(() => {
  api.asientos.reabrir.mockReset().mockResolvedValue(resultado());
  api.asientos.reaperturas.mockReset().mockResolvedValue(bitacora());
  permisoMock.puede = true;
  permisoMock.motivo = null;
  permisoMock.usuarioId = 'u-1';
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

async function pintar(cerradaHasta: string | null = '2025-12-31') {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<Reapertura cerradaHasta={cerradaHasta} />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function clic(el: HTMLElement) {
  await act(async () => {
    el.click();
    await Promise.resolve();
  });
}

describe('QA-FACT-CONTA-95 · la bitácora dice QUIÉN por su nombre', () => {
  const fila = (extra: Record<string, unknown>) => ({
    id: 'r-9',
    agencyId: 'a-1',
    fronteraAnterior: '2026-07-31T00:00:00.000Z',
    fronteraNueva: null,
    motivo: 'Prueba de cierre y reapertura de julio',
    reabiertoPorUserId: '1a000000-0000-4000-8000-000000000001',
    reabiertoAt: '2026-10-04T05:02:50.274Z',
    ...extra,
  });

  it('🔴 el nombre de quien reabrió, nunca su UUID, y la fecha de la casa', async () => {
    api.asientos.reaperturas.mockResolvedValue(bitacora({ reaperturas: [fila({ reabiertoPorNombre: 'Natalia Gómez' })] }));
    await pintar('2026-07-31');
    expect(q('reapertura-quien')!.textContent).toBe('Natalia Gómez');
    expect(todos('fila-de-reapertura')[0].textContent).not.toContain('1a000000-0000-4000-8000-000000000001');
    expect(q('reapertura-cuando')!.textContent).toBe('4 de octubre de 2026, 12:02 a. m.');
  });

  it('una cuenta que ya no existe (o un back anterior) tampoco muestra el UUID', async () => {
    api.asientos.reaperturas.mockResolvedValue(bitacora({ reaperturas: [fila({})] }));
    await pintar('2026-07-31');
    expect(q('reapertura-quien')!.textContent).toBe('una persona que ya no está en la inmobiliaria');
  });
});
