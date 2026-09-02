/**
 * CompletarMandatosLoteDialog.test.tsx — T-0030 WU-3, Slice A (R1).
 *
 * The submission logic itself (payload building, 409-as-success, partial
 * failure) is exhaustively covered by `submitMandatosLote.test.ts` — these
 * are smoke/wiring tests: the dialog renders the batch, "Hacerlo después"
 * skips without calling onDone, and an empty batch renders nothing (same
 * closed-state contract as the single-row `CompletarMandatoDialog`).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { InmuebleSinConsignacion } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, params?: Record<string, unknown>) => {
      if (params) {
        return Object.entries(params).reduce(
          (acc: string, [key, val]) => acc.replace(`{{${key}}}`, String(val)),
          k,
        );
      }
      return k;
    },
    locale: 'es',
  }),
}));

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'agente@test.com' } }),
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { CompletarMandatosLoteDialog } from './CompletarMandatosLoteDialog';

function makeInmueble(overrides: Partial<InmuebleSinConsignacion> = {}): InmuebleSinConsignacion {
  return {
    propertyId: 'prop-1',
    propertyTitle: 'Depto Chicó',
    propertyAddress: 'Cra 11 #94-45',
    propertyCity: 'Bogotá',
    propertyZone: 'Chicó',
    propertyType: 'apartment',
    propertyThumbnail: null,
    monthlyRent: 2_500_000,
    adminFee: 0,
    status: 'draft',
    createdAt: '2026-08-26T00:00:00.000Z',
    ...overrides,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
});

describe('<CompletarMandatosLoteDialog> — smoke render', () => {
  it('renders the whole batch, including a ROOM row (same shape as the table traps)', () => {
    expect(() => {
      act(() => {
        root.render(
          <CompletarMandatosLoteDialog
            inmuebles={[
              makeInmueble({ propertyId: 'a', propertyTitle: 'Depto Chicó' }),
              makeInmueble({ propertyId: 'b', propertyTitle: 'Cuarto en Room', propertyType: 'room', propertyZone: '' }),
            ]}
            onClose={vi.fn()}
            propietarios={[]}
            agentes={[]}
            onDone={vi.fn()}
          />,
        );
      });
    }).not.toThrow();
    // Dialog portals its content to `document.body`, not `container`.
    expect(document.body.textContent).toContain('Depto Chicó');
    expect(document.body.textContent).toContain('Cuarto en Room');
  });

  it('renders nothing for an empty batch — same closed-state contract as CompletarMandatoDialog', () => {
    act(() => {
      root.render(
        <CompletarMandatosLoteDialog
          inmuebles={[]}
          onClose={vi.fn()}
          propietarios={[]}
          agentes={[]}
          onDone={vi.fn()}
        />,
      );
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('"Hacerlo después" (skip) calls onClose and never onDone — R2: creates nothing further', () => {
    const onClose = vi.fn();
    const onDone = vi.fn();
    act(() => {
      root.render(
        <CompletarMandatosLoteDialog
          inmuebles={[makeInmueble()]}
          onClose={onClose}
          propietarios={[]}
          agentes={[]}
          onDone={onDone}
        />,
      );
    });

    const skipBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('inmobiliaria.import.confirm.mandateBatch.skip'),
    );
    expect(skipBtn).toBeTruthy();
    act(() => {
      (skipBtn as HTMLElement).click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('the confirm button starts disabled — no propietario picked yet', () => {
    act(() => {
      root.render(
        <CompletarMandatosLoteDialog
          inmuebles={[makeInmueble()]}
          onClose={vi.fn()}
          propietarios={[]}
          agentes={[]}
          onDone={vi.fn()}
        />,
      );
    });

    const confirmBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('inmobiliaria.import.confirm.mandateBatch.confirm'),
    );
    expect(confirmBtn).toBeTruthy();
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(true);
  });
});
