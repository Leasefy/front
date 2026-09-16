/**
 * El cajón de la dispersión — «Recaudado» sobre un canon que nadie pagó.
 *
 * 🔴 El resumen decía «Recaudado» sobre `totalCollected` y el desglose por
 * inmueble también, y la dispersión gira por defecto con base CAUSADO: el
 * canon de la cuota del mes, haya pagado el inquilino o no. El rótulo sigue a
 * `baseDelCanon`, se dice qué es el canon causado, y ningún número cambia.
 *
 * Con el diccionario REAL (es.json) y el desglose real, no uno falso.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Dispersion } from '@/lib/types/inmobiliaria';

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

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children?: React.ReactNode }) => children,
  SheetContent: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
  SheetHeader: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
  SheetTitle: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
}));

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  usePropietarios: () => ({ propietarios: [] }),
  useInmobiliariaConfig: () => ({ config: undefined }),
}));

import { DispersionDetail } from './DispersionDetail';

function dispersion(overrides: Partial<Dispersion> = {}): Dispersion {
  return {
    id: 'd-1',
    propietarioId: 'p-1',
    propietarioName: 'Jorge Restrepo',
    propietarioBankAccount: null,
    month: '2026-09',
    items: [
      {
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
      },
    ],
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

const q = (testid: string) => document.querySelector(`[data-testid="${testid}"]`);

/** Pinta el cajón y abre el desglose por inmueble, que arranca plegado. */
function abrir(d: Dispersion) {
  act(() => {
    root.render(<DispersionDetail isOpen onClose={() => {}} dispersion={d} />);
  });
  const desplegar = Array.from(document.querySelectorAll('button[aria-expanded="false"]')).find((b) =>
    b.textContent?.includes('propiedad'),
  );
  if (!desplegar) throw new Error('No está el desglose por inmueble');
  act(() => {
    (desplegar as HTMLButtonElement).click();
  });
}

describe('DispersionDetail — el canon dice su base', () => {
  it('🔴 con base CAUSADO: «Canon causado», qué es, y ni el resumen ni el desglose dicen «recaudado»', () => {
    abrir(dispersion());

    expect(q('dispersion-rotulo-canon')?.textContent?.trim()).toBe('Canon causado');
    expect(q('dispersion-que-es-el-canon')?.textContent).toBe(
      'Canon causado: lo que el contrato cobra ese mes, aunque el inquilino no haya pagado.',
    );
    expect(q('desglose-columna-canon')?.textContent?.trim()).toBe('Canon causado');
    expect(document.body.textContent).not.toMatch(/recaud|recibid/i);
  });

  it('con base RECAUDADO: «Canon recaudado», sin la aclaración del causado', () => {
    abrir(dispersion({ baseDelCanon: 'RECAUDADO' }));

    expect(q('dispersion-rotulo-canon')?.textContent?.trim()).toBe('Canon recaudado');
    expect(q('dispersion-que-es-el-canon')).toBeNull();
    expect(q('desglose-columna-canon')?.textContent?.trim()).toBe('Canon recaudado');
  });
});
