/**
 * QA-PROP-95 B-40 (04-10-2026): el banco devolvió el giro de Paula por la CUENTA
 * y no hay un cambio de cuenta aprobado después: lo suyo queda retenido (no
 * entra a ningún lote). La ficha sólo decía «giro atrasado · Ir a
 * dispersiones», donde no se puede girar. Ahora lo dice y lleva a «Cambiar cuenta».
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Propietario } from '@/lib/types/inmobiliaria';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}(${Object.values(p).join(',')})` : k),
    locale: 'es',
  }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href, ...props }, children),
}));

import { PropietarioStats } from './PropietarioStats';

const paula: Propietario = {
  id: 'p1',
  name: 'Paula',
  email: null,
  phone: null,
  documentType: 'CC',
  documentNumber: '52123456',
  bankAccount: { bank: 'bancolombia', accountType: 'savings', accountNumber: '123', accountHolder: 'Paula' },
  propertyCount: 1,
  activeLeases: 1,
  totalMonthlyRent: 2_350_000,
  pendingBalance: 1_585_800,
  createdAt: '2026-09-01',
  updatedAt: '2026-09-01',
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
});
const render = (propietario: Propietario) =>
  act(() => root.render(React.createElement(PropietarioStats, { propietario, variant: 'full', consignaciones: [] })));

describe('<PropietarioStats> — B-40: el giro devuelto por la cuenta', () => {
  it('dice que lo suyo está retenido y lleva a cambiar la cuenta', () => {
    render({ ...paula, giroRetenidoPorLaCuenta: true });
    const a = container.querySelector('[data-testid="alerta-giro-retenido"]');
    expect(a?.textContent).toContain('El banco devolvió su último giro por la cuenta');
    expect(a?.textContent).toContain('hasta que un administrador apruebe el cambio de su cuenta bancaria');
    expect(a?.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/propietarios/p1?cambiarCuenta=1');
  });

  it('sin retención, o con la plata oculta (asesor), no lo dice', () => {
    render({ ...paula, giroRetenidoPorLaCuenta: false });
    expect(container.querySelector('[data-testid="alerta-giro-retenido"]')).toBeNull();
    render({ ...paula, giroRetenidoPorLaCuenta: null, plataOculta: true });
    expect(container.querySelector('[data-testid="alerta-giro-retenido"]')).toBeNull();
  });
});
