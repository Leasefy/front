/**
 * Mis arriendos del propietario (glow up 22-10): LA RESPUESTA —lo que espera recibir al mes— una sola vez y en
 * grande (antes, en una tarjeta y otra vez en un bloque azul), con las demás cifras en una franja.
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es', formatCurrency: (n: number) => `$ ${n}` }),
}));
vi.mock('@/lib/hooks/useLeases', () => ({
  useLeases: () => ({
    leases: [],
    stats: { activeLeases: 2, endingSoon: 0, totalMonthlyIncome: 4_000_000, pendingPayments: 1, latePayments: 0 },
    isLoading: false,
    error: null,
    errorCrudo: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/components/lease/LeaseExpandableItem', () => ({ LeaseExpandableItem: () => null }));

import LandlordLeasesPage from './page';

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('Mis arriendos del propietario', () => {
  it('lo que espera recibir al mes sale una sola vez, en grande, con el recaudo al pie', () => {
    act(() => root.render(<LandlordLeasesPage />));
    const cifra = host.querySelector('[data-testid="ingreso-esperado"]');
    expect(cifra?.textContent).toContain('$ 4000000');
    expect(cifra?.textContent).toContain('landlord.leases.collectionRate');
    expect((host.textContent ?? '').split('$ 4000000').length - 1).toBe(1);
    expect(host.textContent).not.toContain('landlord.leases.financialSummary');
  });
});
