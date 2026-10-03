/**
 * Al volver de Wompi a un acuerdo (Nico, 02-10-2026, «seguimiento 4»): la
 * página dice que el pago se está confirmando y qué pasa con un pago que no es
 * de una cuota (el acuerdo completo: una persona lo revisa y lo aplica). Antes
 * no decía nada y la persona podía pagar dos veces.
 */

import * as React from 'react';
import { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { AcuerdoDetail } from '@/lib/api/tenant-acuerdos.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { acuerdosDelInquilino } = vi.hoisted(() => ({ acuerdosDelInquilino: vi.fn() }));

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/lib/hooks/use-tenant-acuerdos', () => ({
  useTenantAcuerdos: () => acuerdosDelInquilino(),
}));

import { AvisoDelPagoDelAcuerdo, TEXTOS_DEL_AVISO } from './AvisoDelPagoDelAcuerdo';
import AcuerdoDetailPage from '@/app/inquilino/acuerdos/[id]/page';

const PLAN = {
  planId: 'plan-1',
  tenantId: 'agency-1',
  debtorId: 'debtor-1',
  stage: 'S2',
  status: 'active',
  paymentProvider: 'wompi',
  paymentUrl: null,
  totalDueCop: 900_000,
  initialAmountCop: 450_000,
  discountAppliedPct: 0,
  discountKind: 'none',
  offeredAt: '2026-09-20T00:00:00.000Z',
  acceptedAt: '2026-09-21T00:00:00.000Z',
  defaultedAt: null,
  installments: [{ number: 1, dueDate: '2026-11-05T00:00:00.000Z', amountCop: 450_000, status: 'pending', paidAt: null }],
} as AcuerdoDetail;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  acuerdosDelInquilino.mockReturnValue({ items: [PLAN], isLoading: false, error: null, refetch: vi.fn() });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  window.history.replaceState(null, '', '/');
  vi.restoreAllMocks();
});

const aviso = () => container.querySelector('[data-testid="aviso-del-pago-del-acuerdo"]');

describe('AvisoDelPagoDelAcuerdo', () => {
  it('dice que se confirma, que no hay que volver a pagar y qué pasa con el acuerdo completo', async () => {
    await act(async () => {
      root.render(<AvisoDelPagoDelAcuerdo show locale="es" />);
    });
    const texto = aviso()?.textContent ?? '';
    expect(texto).toContain(TEXTOS_DEL_AVISO.es.titulo);
    expect(texto).toContain('No hace falta volver a pagar');
    expect(texto).toContain('una persona de tu inmobiliaria lo revisa y lo aplica');
    expect(aviso()?.getAttribute('role')).toBe('status');
  });

  it('sin volver de Wompi no se pinta', async () => {
    await act(async () => {
      root.render(<AvisoDelPagoDelAcuerdo show={false} locale="es" />);
    });
    expect(aviso()).toBeNull();
  });

  it('«Entendido» lo cierra (sale con su animación y se desmonta)', async () => {
    await act(async () => {
      root.render(<AvisoDelPagoDelAcuerdo show locale="es" />);
    });
    const boton = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Entendido')!;
    await act(async () => {
      boton.click();
    });
    await vi.waitFor(() => expect(aviso()).toBeNull());
  });
});

describe('la pantalla del acuerdo al volver de Wompi (`?id=`)', () => {
  async function montarLaPagina() {
    const params = Promise.resolve({ id: 'plan-1' });
    await act(async () => {
      root.render(
        <Suspense fallback={null}>
          <AcuerdoDetailPage params={params} />
        </Suspense>,
      );
    });
    await act(async () => {
      await params;
    });
  }

  it('con `?id=` muestra el aviso y limpia la URL (recargar no lo repite)', async () => {
    window.history.replaceState(null, '', '/inquilino/acuerdos/plan-1?id=1234-1610641025-49201&env=test');
    const limpiar = vi.spyOn(window.history, 'replaceState');
    await montarLaPagina();
    expect(aviso()).not.toBeNull();
    expect(limpiar).toHaveBeenCalledWith(null, '', '/inquilino/acuerdos/plan-1');
  });

  it('sin `?id=` no hay aviso', async () => {
    window.history.replaceState(null, '', '/inquilino/acuerdos/plan-1');
    await montarLaPagina();
    expect(aviso()).toBeNull();
  });
});

describe('la pantalla del acuerdo: firmar sólo un acuerdo ofrecido (02-10-2026)', () => {
  async function montar(plan: AcuerdoDetail) {
    acuerdosDelInquilino.mockReturnValue({ items: [plan], isLoading: false, error: null, refetch: vi.fn() });
    window.history.replaceState(null, '', '/inquilino/acuerdos/plan-1');
    const params = Promise.resolve({ id: 'plan-1' });
    await act(async () => {
      root.render(
        <Suspense fallback={null}>
          <AcuerdoDetailPage params={params} />
        </Suspense>,
      );
    });
    await act(async () => {
      await params;
    });
  }

  it('un acuerdo cancelado (la inmobiliaria lo rechazó) no ofrece firmar: dice que ya no se puede', async () => {
    await montar({ ...PLAN, status: 'cancelled', acceptedAt: null } as AcuerdoDetail);
    expect(container.textContent).not.toContain('Firmar para aceptar');
    expect(container.querySelector('[data-testid="acuerdo-no-aceptable"]')?.textContent).toContain(
      'Este acuerdo ya no se puede aceptar',
    );
  });

  it('un acuerdo ofrecido sí ofrece firmar', async () => {
    await montar({ ...PLAN, status: 'offered', acceptedAt: null } as AcuerdoDetail);
    expect(container.textContent).toContain('Firmar para aceptar');
    expect(container.querySelector('[data-testid="acuerdo-no-aceptable"]')).toBeNull();
  });
});
