/**
 * page.test.tsx — Inquilinos, el vacío. Que son DOS vacíos, no uno.
 *
 * 1. **Nada migrado**: Nico (2026-09-03) «¿por qué tengo migrar contrato como
 *    CTA secundario?». Queda UN solo botón, y es «Migrar contratos»: el back
 *    arma esta lista con `lease.findMany` agrupado por `tenantId`, así que lo
 *    único que la llena es un contrato.
 *
 * 2. **Migrado y a medias** (2026-09-03, tarde): 91 contratos migrados, 89 sin
 *    inmueble ⇒ cero arriendos ⇒ esta lista vacía. Decir «traé los que ya
 *    tenés en otro sistema» es pedirle migrar a alguien que acaba de migrar.
 *    Se dice el número real y el botón lleva a completar la migración.
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

/** La deuda de migración es lo único que cambia entre los dos vacíos. */
const { deudaMock } = vi.hoisted(() => ({ deudaMock: vi.fn() }));
vi.mock('@/lib/hooks/use-migracion-con-deuda', () => ({
  useMigracionConDeuda: () => deudaMock(),
}));

import InquilinosPage from './page';

let host: HTMLDivElement;
let root: Root;

function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(<InquilinosPage />);
  });
}

beforeEach(() => {
  deudaMock.mockReset();
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
});

describe('/panel/inmobiliaria/inquilinos — vacío sin nada migrado', () => {
  it('ofrece UN solo botón, y lleva a migrar contratos', () => {
    deudaMock.mockReturnValue(null);
    montar();

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

describe('/panel/inmobiliaria/inquilinos — vacío con la migración a medias', () => {
  beforeEach(() => {
    deudaMock.mockReturnValue({
      contratos: 91,
      sinInmueble: 89,
      sinPropietario: 89,
      pendientes: 0,
      sinInquilino: null,
    });
    montar();
  });

  it('🔴 no le pide migrar a quien ya migró', () => {
    const vacio = host.querySelector('[data-testid="sin-datos"]')!;
    expect(vacio.textContent).not.toContain('inquilinos.vacioDescripcion');
    expect(vacio.textContent).not.toContain('inquilinos.vacioContrato');
  });

  it('nombra la deuda de la migración y trae el botón que la completa', () => {
    const vacio = host.querySelector('[data-testid="sin-datos"]')!;
    expect(vacio.textContent).toContain('migracion.enLaLista.titulo');
    expect(vacio.textContent).toContain('migracion.enLaLista.detalle');

    const enlaces = Array.from(vacio.querySelectorAll('a'));
    expect(enlaces).toHaveLength(1);
    expect(enlaces[0].getAttribute('href')).toBe('/panel/inmobiliaria/contratos/migrar');
    expect(enlaces[0].textContent).toContain('migracion.enLaLista.accion');
  });
});
