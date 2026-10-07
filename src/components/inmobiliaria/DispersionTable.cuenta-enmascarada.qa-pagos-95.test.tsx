/**
 * 🔴 N-07 (QA-PAGOS-95, 05-10-2026): Dispersiones pintaba la cuenta bancaria
 * COMPLETA del propietario en la tabla, en la tarjeta y en «¿A quién le giras
 * este mes?» de Generar dispersión, mientras Liquidaciones y los lotes la
 * muestran enmascarada («•••• 8901», PG-06). En la lista va enmascarada; el
 * detalle de la dispersión la sigue mostrando completa, con su botón de copiar.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Dispersion, DispersionItem } from '@/lib/types/inmobiliaria';

void React; // jsx-preserve

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

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
        }: Record<string, unknown> & { children?: React.ReactNode }) => {
          void whileHover; void whileTap; void initial; void animate; void exit; void transition;
          return React.createElement(tag, rest, children);
        },
    },
  ),
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
}));

import { DispersionTable } from './DispersionTable';
import { DispersionCard } from './DispersionCard';

function linea(overrides: Partial<DispersionItem> = {}): DispersionItem {
  return {
    cobroId: null,
    cuotaId: 'cuota-1',
    propertyTitle: 'Apto 302 · Laureles',
    rentCollected: 2_000_000,
    commissionPercent: 10,
    commissionAmount: 200_000,
    netAmount: 1_800_000,
    conceptosAFavor: 0,
    conceptosACargo: 0,
    deTerceros: 0,
    ...overrides,
  };
}

function dispersion(overrides: Partial<Dispersion> = {}): Dispersion {
  return {
    id: 'd-1',
    propietarioId: 'p-1',
    propietarioName: 'Jorge Restrepo',
    propietarioBankAccount: null,
    month: '2026-09',
    items: [linea()],
    baseDelCanon: 'CAUSADO',
    totalCollected: 2_000_000,
    totalCommission: 200_000,
    totalConceptosAFavor: 0,
    totalConceptosACargo: 0,
    totalDeTerceros: 0,
    netToPropietario: 1_800_000,
    status: 'pending',
    createdAt: '2026-09-16',
    updatedAt: '2026-09-16',
    ...overrides,
  };
}

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

function pintar(elemento: React.ReactElement) {
  act(() => {
    root.render(elemento);
  });
}


const CUENTA = { bank: 'bancolombia', accountType: 'savings', accountNumber: '12345678901' } as Dispersion['propietarioBankAccount'];

describe('N-07 · la cuenta del propietario va enmascarada en la lista', () => {
  it('🔴 la tabla no muestra el número completo', () => {
    pintar(<DispersionTable dispersiones={[dispersion({ propietarioBankAccount: CUENTA })]} />);
    expect(host.textContent).not.toContain('12345678901');
    expect(host.textContent).toContain('•••• 8901');
  });

  it('🔴 la tarjeta tampoco', () => {
    pintar(<DispersionCard dispersion={dispersion({ propietarioBankAccount: CUENTA })} />);
    expect(host.textContent).not.toContain('12345678901');
    expect(host.textContent).toContain('Bancolombia · Ahorros •••• 8901');
  });

  it('sin cuenta lo dice, no inventa una', () => {
    pintar(<DispersionTable dispersiones={[dispersion({ propietarioBankAccount: null })]} />);
    expect(host.textContent).toContain('Sin cuenta registrada');
  });

  it('🔴 Generar dispersión enmascara la cuenta de cada propietario', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const g = readFileSync(join(process.cwd(), 'src/components/inmobiliaria/dispersion/GenerarDispersion.tsx'), 'utf8');
    expect(g).toMatch(/\$\{enmascarar\(p\.propietarioBankAccount\)\}/);
    expect(g).not.toMatch(/\$\{p\.propietarioBankAccount\}/);
  });
});
