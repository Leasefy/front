/**
 * page.test.tsx — Inquilinos, el vacío.
 *
 * Nico (2026-09-03): «¿por qué tengo migrar contrato como CTA secundario?».
 * Queda UN solo botón, y es «Migrar contratos»: el back arma esta lista con
 * `lease.findMany` agrupado por `tenantId`, así que lo único que la llena es
 * un contrato. Un inquilino cargado en el paso «Terceros» de la migración
 * (usuario + invitación al portal) no aparece acá hasta que exista el suyo.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React; // jsx-preserve

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    locale: 'es',
    t: (k: string) => k,
    formatCurrency: (n: number) => String(n),
  }),
}));

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}));

vi.mock('@/lib/hooks/use-inquilinos', () => ({
  useInquilinos: () => ({ inquilinos: [], cargando: false, error: null, refrescar: vi.fn() }),
}));

vi.mock('@/components/inmobiliaria/InquilinosTable', () => ({
  BarraDeInquilinos: () => null,
  InquilinosTable: () => null,
}));

vi.mock('@/components/inmobiliaria/InquilinoDrawer', () => ({
  InquilinoDrawer: () => null,
}));

import InquilinosPage from './page';

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(<InquilinosPage />);
  });
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
});

describe('/panel/inmobiliaria/inquilinos — vacío sin filtros', () => {
  it('ofrece UN solo botón, y lleva a migrar contratos', () => {
    const vacio = host.querySelector('[data-testid="sin-datos"]');
    expect(vacio).not.toBeNull();
    expect(vacio!.getAttribute('data-caso')).toBe('vacio');

    const enlaces = Array.from(vacio!.querySelectorAll('a'));
    expect(enlaces).toHaveLength(1);
    expect(enlaces[0].getAttribute('href')).toBe('/panel/inmobiliaria/contratos/migrar');
    expect(enlaces[0].textContent).toContain('inquilinos.vacioContrato');

    // El paso «Terceros» de la migración no lleva botón: carga personas, no
    // arriendos, y esta lista seguiría vacía.
    expect(vacio!.querySelectorAll('button')).toHaveLength(0);
    expect(host.querySelector('a[href*="migracion/terceros"]')).toBeNull();
    expect(vacio!.textContent).toContain('inquilinos.vacioDescripcion');
  });
});
