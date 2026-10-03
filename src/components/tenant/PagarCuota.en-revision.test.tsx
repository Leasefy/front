/**
 * 🔴 ARREGLOS-6 (Nico, ARREGLOS-3 Q2 a): mientras un pago del acuerdo COMPLETO
 * espera a que una persona de la inmobiliaria lo revise, el portal NO ofrece
 * «Pagar» en ese acuerdo (la plata ya entró: otra cuota sería cobrar dos
 * veces). El back/micro lo dicen con `pagoPendienteDeRevision`; un micro
 * anterior no lo manda y el botón sigue como siempre.
 */

import * as React from 'react';
import { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { AcuerdoDetail, AcuerdoInstallment } from '@/lib/api/tenant-acuerdos.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { acuerdosDelInquilino } = vi.hoisted(() => ({ acuerdosDelInquilino: vi.fn() }));

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/lib/api/client', async (original) => ({
  ...(await original<typeof import('@/lib/api/client')>()),
  getAccessToken: () => 'tenant-jwt',
}));
vi.mock('@/lib/hooks/use-tenant-acuerdos', () => ({
  useTenantAcuerdos: () => acuerdosDelInquilino(),
}));

import { PagarCuota } from './PagarCuota';
import AcuerdoDetailPage from '@/app/inquilino/acuerdos/[id]/page';

const CUOTA: AcuerdoInstallment = {
  number: 2,
  dueDate: '2026-11-05T00:00:00.000Z',
  amountCop: 450_000,
  status: 'pending',
  paidAt: null,
};

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
  installments: [{ ...CUOTA, number: 1, status: 'paid', paidAt: '2026-10-05T00:00:00.000Z' }, CUOTA],
} as AcuerdoDetail;

let container: HTMLDivElement;
let root: Root;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
  acuerdosDelInquilino.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function botonDePagar(): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find((b) => /pagar/i.test(b.textContent ?? ''));
}

async function montarLaPantalla(plan: AcuerdoDetail) {
  acuerdosDelInquilino.mockReturnValue({ items: [plan], isLoading: false, error: null, refetch: vi.fn() });
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

describe('🔴 «Pagar» con un pago del acuerdo completo en revisión', () => {
  it('PagarCuota: sin botón y con el aviso de que no tiene que pagar nada más', async () => {
    await act(async () => {
      root.render(<PagarCuota planId="plan-1" cuota={CUOTA} locale="es" pagoPendienteDeRevision />);
    });
    expect(botonDePagar()).toBeUndefined();
    const aviso = container.querySelector('[data-testid="pagar-cuota-en-revision"]');
    expect(aviso?.textContent).toMatch(/acuerdo completo/);
    expect(aviso?.textContent).toMatch(/no tienes que pagar ninguna cuota/);
    expect(aviso?.getAttribute('role')).toBe('status');
  });

  it('la pantalla del acuerdo pasa `pagoPendienteDeRevision` del plan: no ofrece pagar', async () => {
    await montarLaPantalla({ ...PLAN, pagoPendienteDeRevision: true });
    expect(botonDePagar()).toBeUndefined();
    expect(container.querySelector('[data-testid="pagar-cuota-en-revision"]')).not.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sin el campo (un micro anterior) o en false: el botón sigue como siempre', async () => {
    await montarLaPantalla(PLAN);
    expect(botonDePagar()?.textContent).toContain('Pagar cuota 2');
    expect(container.querySelector('[data-testid="pagar-cuota-en-revision"]')).toBeNull();
  });
});
