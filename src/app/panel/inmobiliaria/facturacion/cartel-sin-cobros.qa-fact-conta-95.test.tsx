/**
 * QA-FACT-CONTA-95 r2 · FA-H-10: «Facturación» exige `cobros:view` (lo que pide
 * el back en todas sus rutas). Sin ese permiso —la matriz en caliente se lo
 * quita al contador— se ve el cartel entero «No tienes acceso a Facturación»,
 * no la pantalla con cada consulta en 403.
 */
import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { permisos } = vi.hoisted(() => ({
  permisos: { modulos: {} as Record<string, string[]> },
}));
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({
    canAccess: (m: string, a: string) => (permisos.modulos[m] ?? []).includes(a),
    isAdmin: false,
    isLoading: false,
    agencyRole: 'CONTADOR',
    permisosDelBack: { cobros: permisos.modulos.cobros ?? [] },
    refetch: vi.fn(),
  }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/panel/inmobiliaria/facturacion',
}));

import { PageGuard } from '@/components/auth/PageGuard';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let container: HTMLDivElement;
let root: Root | null = null;
afterEach(() => {
  if (root) act(() => root?.unmount());
  root = null;
  container?.remove();
});
function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
    root.render(
      <PageGuard module="cobros" roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]} seccion="Facturación">
        <div data-testid="contenido">Por facturar</div>
      </PageGuard>,
    );
  });
  return container;
}

describe('FA-H-10 · Facturación sin cobros:view', () => {
  it('la página pide el módulo cobros en su guarda', () => {
    const fuente = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
    expect(fuente).toMatch(/<PageGuard module="cobros" roles=\{\[AGENCY_ROLES\.ADMIN, AGENCY_ROLES\.CONTADOR\]\} seccion="Facturación">/);
  });
  it('el contador sin cobros:view ve el cartel entero, no la pantalla', () => {
    permisos.modulos = { reportes: ['view'] };
    const c = pintar();
    expect(c.querySelector('[data-testid="contenido"]')).toBeNull();
    expect(c.querySelector('[data-testid="pantalla-negada"]')?.textContent).toMatch(/Facturación/);
  });
  it('con cobros:view entra', () => {
    permisos.modulos = { cobros: ['view'] };
    const c = pintar();
    expect(c.querySelector('[data-testid="contenido"]')).not.toBeNull();
  });
});
