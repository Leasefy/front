/**
 * DispersionDetail.test.tsx — propietario contact guards.
 *
 * `Propietario.email`/`phone` are nullable in the DB (Prisma `String?`), but
 * the owner-contact block used to interpolate them unguarded into
 * `tel:`/`mailto:`/`wa.me` links — `propietario.phone.replace(...)` crashed
 * outright when `phone` was `null`. These tests lock the guard: no
 * email/phone → no crash and no broken contact link/action is rendered;
 * email/phone present → all three contact actions render.
 *
 * Sheet/dialog primitives are mocked as plain pass-throughs so the test
 * exercises the guard logic directly instead of Radix portal/dialog
 * behavior (nothing in this repo tests through a real Sheet yet).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Dispersion, Propietario } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: 'es',
    formatDate: (d: string) => d,
    formatCurrency: (n: number) => `$${n}`,
  }),
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

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children?: React.ReactNode }) => children,
  SheetContent: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children),
  SheetHeader: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children),
  SheetTitle: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

vi.mock('./ComisionDesglose', () => ({
  ComisionDesglose: () => null,
}));

const propietariosMock = vi.fn();
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  usePropietarios: () => propietariosMock(),
  useInmobiliariaConfig: () => ({ config: undefined }),
}));

import { DispersionDetail } from './DispersionDetail';

const BASE_PROPIETARIO: Propietario = {
  id: 'own1',
  name: 'Maria Perez',
  email: 'maria@mail.com',
  phone: '300 123 4567',
  documentType: 'CC',
  documentNumber: '123456',
  bankAccount: {
    bank: 'bancolombia',
    accountType: 'savings',
    accountNumber: '0011223344',
    accountHolder: 'Maria Perez',
  },
  propertyCount: 1,
  activeLeases: 1,
  totalMonthlyRent: 1_000_000,
  pendingBalance: 0,
  createdAt: '2026-06-01',
  updatedAt: '2026-06-01',
};

const BASE_DISPERSION: Dispersion = {
  id: 'd1',
  propietarioId: 'own1',
  propietarioName: 'Maria Perez',
  propietarioBankAccount: null,
  month: '2026-07',
  items: [],
  totalCollected: 1_000_000,
  totalCommission: 100_000,
  totalConceptosAFavor: 0,
  totalConceptosACargo: 0,
  totalDeTerceros: 0,
  netToPropietario: 900_000,
  status: 'pending',
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
});

function renderDetail(propietario: Propietario | null) {
  propietariosMock.mockReturnValue({ propietarios: propietario ? [propietario] : [] });
  act(() => {
    root.render(
      React.createElement(DispersionDetail, {
        isOpen: true,
        onClose: () => {},
        dispersion: BASE_DISPERSION,
      }),
    );
  });
}

describe('<DispersionDetail> propietario contact', () => {
  it('renders tel, WhatsApp and mailto actions when email/phone are present', () => {
    renderDetail(BASE_PROPIETARIO);
    const tel = container.querySelector('a[href^="tel:"]');
    const wa = container.querySelector('a[href^="https://wa.me/"]');
    const mailto = container.querySelector('a[href^="mailto:"]');
    expect(tel).toBeTruthy();
    expect(wa).toBeTruthy();
    expect(mailto).toBeTruthy();
    // WhatsApp strips non-digits from the number.
    expect(wa?.getAttribute('href')).toBe('https://wa.me/3001234567');
  });

  it('renders no contact links and does not crash when email/phone are null', () => {
    expect(() =>
      renderDetail({ ...BASE_PROPIETARIO, email: null, phone: null }),
    ).not.toThrow();
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
    expect(container.querySelector('a[href^="https://wa.me/"]')).toBeNull();
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
    // No link should ever carry a literal null/undefined value either.
    expect(container.innerHTML).not.toMatch(/href="(tel|mailto):null"/);
    expect(container.innerHTML).not.toMatch(/wa\.me\/undefined/);
    // The propietario name still renders — only the contact actions are gated.
    expect(container.textContent).toContain('Maria Perez');
  });
});
