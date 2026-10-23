/**
 * GLOW UP (21-10-2026): el detalle de un acuerdo de pago en el orden del
 * trabajo. Se viene a firmar el acuerdo o a pagar la cuota que sigue: eso va
 * debajo del encabezado; el plan de cuotas se consulta después; el «aceptado»
 * y el historial, al final.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, Suspense } from 'react';

import type { AcuerdoDetail } from '@/lib/api/tenant-acuerdos.types';

const { datos } = vi.hoisted(() => ({
  datos: { items: [] as AcuerdoDetail[], error: null as string | null, refetch: vi.fn() },
}));

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/lib/hooks/use-tenant-acuerdos', () => ({
  useTenantAcuerdos: () => ({ items: datos.items, isLoading: false, error: datos.error, refetch: datos.refetch }),
}));
vi.mock('@/components/tenant/AcuerdoAcceptPanel', () => ({
  AcuerdoAcceptPanel: () => <div data-testid="panel-de-firma" />,
}));
vi.mock('@/components/tenant/PagarCuota', () => ({
  PagarCuota: () => <div data-testid="pagar-cuota" />,
}));
vi.mock('@/components/tenant/CuotaPlanTable', () => ({
  CuotaPlanTable: () => <div data-testid="tabla-de-cuotas" />,
}));
vi.mock('@/components/tenant/AvisoDelPagoDelAcuerdo', () => ({
  AvisoDelPagoDelAcuerdo: () => null,
}));

import AcuerdoDetailPage from './page';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function plan(parcial: Partial<AcuerdoDetail> = {}): AcuerdoDetail {
  return {
    planId: 'p1',
    status: 'offered',
    totalDueCop: 1_200_000,
    offeredAt: '2026-10-01T15:00:00.000Z',
    acceptedAt: null,
    operatorApprovedAt: '2026-10-02T15:00:00.000Z',
    installments: [
      { cuotaNumber: 1, amountCop: 600_000, dueDate: '2026-11-05', status: 'pending' },
      { cuotaNumber: 2, amountCop: 600_000, dueDate: '2026-12-05', status: 'pending' },
    ],
    ...parcial,
  } as unknown as AcuerdoDetail;
}

let root: Root | null = null;

async function montar(id = 'p1') {
  const contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  const params = Promise.resolve({ id });
  await act(async () => {
    root!.render(
      <Suspense fallback={null}>
        <AcuerdoDetailPage params={params} />
      </Suspense>,
    );
  });
  await act(async () => {
    await params;
  });
}

const $ = (testid: string) => document.querySelector(`[data-testid="${testid}"]`);

function antes(a: Element | null, b: Element | null): boolean {
  if (!a || !b) throw new Error('falta un bloque');
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

beforeEach(() => {
  datos.items = [plan()];
  document.body.innerHTML = '';
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root!.unmount();
    });
  }
  root = null;
  document.body.innerHTML = '';
});

describe('Detalle del acuerdo — en el orden del trabajo', () => {
  it('el encabezado dice el total y cuántas cuotas, con el estado al lado', async () => {
    await montar();
    const encabezado = document.querySelector('header');
    expect(encabezado?.querySelector('h1')?.textContent).toBe('Acuerdo de pago');
    expect(encabezado?.contains($('acuerdo-estado'))).toBe(true);
    expect($('acuerdo-total')?.textContent).toMatch(/Total del acuerdo:.*1\.?200\.?000.*2 cuotas/);
  });

  it('aprobado y sin firmar: firmar va antes que el plan de cuotas', async () => {
    await montar();
    expect($('acuerdo-firmar')?.contains($('panel-de-firma'))).toBe(true);
    expect(antes($('acuerdo-firmar'), $('acuerdo-plan'))).toBe(true);
    expect($('acuerdo-aceptado')).toBeNull();
  });

  it('aceptado: pagar la cuota va primero; el «aceptado» y el historial, al final', async () => {
    datos.items = [plan({ status: 'active', acceptedAt: '2026-10-03T15:00:00.000Z' } as Partial<AcuerdoDetail>)];
    await montar();
    expect($('acuerdo-pagar')).not.toBeNull();
    expect(antes($('acuerdo-pagar'), $('acuerdo-plan'))).toBe(true);
    expect(antes($('acuerdo-plan'), $('acuerdo-aceptado'))).toBe(true);
    expect(antes($('acuerdo-aceptado'), $('acuerdo-historial'))).toBe(true);
  });

  it('sin la aprobación de la inmobiliaria no se ofrece firmar', async () => {
    datos.items = [plan({ operatorApprovedAt: null })];
    await montar();
    expect($('acuerdo-por-aprobar')).not.toBeNull();
    expect($('panel-de-firma')).toBeNull();
  });

  it('vuelve a Acuerdos', async () => {
    await montar();
    expect($('acuerdo-volver')?.querySelector('a')?.getAttribute('href')).toBe('/inquilino/acuerdos');
  });
});

describe('Acuerdo de pago del inquilino — glow up 22-10', () => {
  afterEach(() => {
    datos.error = null;
    datos.refetch.mockClear();
  });

  it('si no carga, «Reintentar» vuelve a pedir (el «Volver» ya está arriba)', async () => {
    datos.error = 'No pudimos leer tus acuerdos.';
    await montar();
    const reintentar = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Reintentar'));
    expect(reintentar).toBeTruthy();
    await act(async () => reintentar!.click());
    expect(datos.refetch).toHaveBeenCalledTimes(1);
  });
});
