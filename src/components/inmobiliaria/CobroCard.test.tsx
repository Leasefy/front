/**
 * CobroCard.test.tsx — tenant contact guards.
 *
 * The back now sends `tenantPhone`/`tenantEmail` as nullable (a lease may have
 * no phone on file). Rendering the phone actions unguarded crashed the card via
 * `null.replace(...)`. These tests lock the guard: no phone → no tel/WhatsApp
 * links and no crash; phone present → both links render.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Cobro } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const permisos = vi.hoisted(() => ({
  valor: { isLoading: false as boolean, canAccess: (_m: string, _a: string): boolean => true },
}));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => permisos.valor }));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_target, tag: string) =>
        ({
          children,
          whileHover,
          whileTap,
          initial,
          animate,
          exit,
          transition,
          ...rest
        }: Record<string, unknown> & { children?: React.ReactNode }) =>
          React.createElement(tag, rest, children),
    },
  ),
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
}));

vi.mock('@/components/ui', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children?: React.ReactNode;
    onClick?: (e: { stopPropagation: () => void }) => void;
    disabled?: boolean;
  }) => React.createElement('button', { onClick, disabled }, children),
}));

import { CobroCard } from './CobroCard';

const BASE_COBRO: Cobro = {
  id: 'c1',
  leaseId: 'l1',
  consignacionId: 'cons1',
  propertyId: 'p1',
  propietarioId: 'own1',
  tenantId: 't1',
  agenteId: 'ag1',
  propertyTitle: 'Apto 101',
  propertyAddress: 'Calle 1 #2-3',
  tenantName: 'Jose Lopez',
  tenantEmail: 'jose@mail.com',
  tenantPhone: '300 123 4567',
  month: '2026-07',
  rentAmount: 1_000_000,
  adminAmount: 100_000,
  totalAmount: 1_100_000,
  lateFee: 0,
  totalWithFees: 1_100_000,
  status: 'pending',
  dueDate: '2026-07-05',
  paidAmount: 0,
  pendingAmount: 1_100_000,
  daysLate: 0,
  remindersSent: 0,
  createdAt: '2026-07-01',
  updatedAt: '2026-07-01',
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  permisos.valor = { isLoading: false, canAccess: () => true };
});

function render(cobro: Cobro) {
  act(() => root.render(<CobroCard cobro={cobro} />));
}

describe('<CobroCard> tenant contact', () => {
  it('renders tel + WhatsApp links when tenantPhone is present', () => {
    render(BASE_COBRO);
    const tel = container.querySelector('a[href^="tel:"]');
    const wa = container.querySelector('a[href^="https://wa.me/"]');
    expect(tel).toBeTruthy();
    expect(wa).toBeTruthy();
    // WhatsApp strips non-digits from the number.
    expect(wa?.getAttribute('href')).toBe('https://wa.me/3001234567');
  });

  it('renders no phone links and does not crash when tenantPhone is null', () => {
    expect(() => render({ ...BASE_COBRO, tenantPhone: null })).not.toThrow();
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
    expect(container.querySelector('a[href^="https://wa.me/"]')).toBeNull();
    // The tenant name still renders — only the contact links are gated.
    expect(container.textContent).toContain('Jose Lopez');
  });
});

describe('<CobroCard> «Hacer recibo» pide cobros:create (C6)', () => {
  const botonDeRecibo = () =>
    Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('recibos.hacerCorto'),
    );

  it('con permiso el botón emite', () => {
    const onRegisterPayment = vi.fn();
    act(() => root.render(<CobroCard cobro={BASE_COBRO} onRegisterPayment={onRegisterPayment} />));
    const boton = botonDeRecibo();
    expect(boton?.disabled).toBe(false);
    act(() => boton?.click());
    expect(onRegisterPayment).toHaveBeenCalledWith(BASE_COBRO);
    expect(container.querySelector('[data-testid="motivo-sin-permiso-de-recibo"]')).toBeNull();
  });

  it('un VIEWER ve el botón deshabilitado y el porqué, y no emite', () => {
    const canAccess = vi.fn((m: string, a: string) => m === 'cobros' && a === 'view');
    permisos.valor = { isLoading: false, canAccess };
    const onRegisterPayment = vi.fn();
    act(() => root.render(<CobroCard cobro={BASE_COBRO} onRegisterPayment={onRegisterPayment} />));
    const boton = botonDeRecibo();
    expect(boton).toBeTruthy();
    expect(boton?.disabled).toBe(true);
    act(() => boton?.click());
    expect(onRegisterPayment).not.toHaveBeenCalled();
    expect(canAccess).toHaveBeenCalledWith('cobros', 'create');
    expect(
      container.querySelector('[data-testid="motivo-sin-permiso-de-recibo"]')?.textContent,
    ).toBe('Necesitas permiso para crear cobros.');
  });
});
