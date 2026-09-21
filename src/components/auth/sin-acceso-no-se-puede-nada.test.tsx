/**
 * 🔴 SI NO TIENES ACCESO A UNA PANTALLA, NO PUEDES HACER NADA EN ELLA.
 *
 * Nico, 21-09-2026, mirando el Pipeline: «¿por qué no me das acceso a todo? y
 * si no tengo acceso, ¿por qué el botón no está disabled?». La pantalla se
 * pintaba entera —título, fichas, buscador, filtros y un «+ Nuevo lead» azul y
 * vivo— y sólo el hueco del centro decía «No tienes acceso a esto».
 *
 * Lo que fija esta prueba, sobre el mecanismo y no sobre una pantalla, para que
 * valga para todas:
 *
 * - negado el dato PRINCIPAL, no queda NINGÚN control usable en la pantalla;
 * - un 500 NO apaga nada (control positivo: sin esto, una pantalla que nunca
 *   pintara sus botones pasaría la prueba igual);
 * - una sección SECUNDARIA negada degrada sola y no tumba lo que sí sirve;
 * - y al administrador no se le dice que le pida permiso a un administrador.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ApiError } from '@/lib/api/client';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const permisos = vi.hoisted(() => ({
  canAccess: () => true,
  isAdmin: true,
  isLoading: false,
  agencyRole: 'ADMIN' as string | null,
}));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => permisos }));
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => permisos,
  usePermissionsContext: () => permisos,
}));
vi.mock('@/lib/hooks/use-sin-senal', () => ({
  useSinSenal: () => false,
  estaSinSenal: () => false,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

import { PageGuard } from './PageGuard';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';

/** Una pantalla con lo que tenía la del Pipeline: acciones fuera del hueco de datos. */
function PantallaDePrueba({
  error,
  principal = true,
}: {
  error: unknown;
  principal?: boolean;
}) {
  return (
    <PageGuard module="pipeline">
      <div>
        <h1>Pipeline</h1>
        <button type="button">Nuevo lead</button>
        <input aria-label="Buscar por candidato o propiedad" />
        <EstadoDeDatos
          principal={principal}
          cargando={false}
          error={error}
          queEs="el pipeline"
        >
          <p>Las filas del pipeline</p>
        </EstadoDeDatos>
      </div>
    </PageGuard>
  );
}

const NEGADO = new ApiError(403, 'No tienes permiso para view en pipeline', 'SIN_PERMISO_DE_MODULO', {
  code: 'SIN_PERMISO_DE_MODULO',
  module: 'pipeline',
  action: 'view',
  role: 'AGENTE',
});

let contenedor: HTMLDivElement;
let raiz: Root;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  permisos.isAdmin = true;
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

async function montar(nodo: React.ReactElement) {
  await act(async () => {
    raiz.render(nodo);
  });
}

/** Todo lo que una persona podría pulsar o teclear y que NO está deshabilitado. */
function controlesUsables() {
  return [
    ...contenedor.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
      'button, input, select, textarea, [role="button"]',
    ),
  ].filter((el) => !(el as HTMLButtonElement).disabled);
}

describe('🔴 una pantalla negada no deja hacer nada', () => {
  it('negado el dato principal, no queda ningún control usable', async () => {
    await montar(<PantallaDePrueba error={NEGADO} />);
    expect(controlesUsables()).toEqual([]);
    // Y lo que queda dice qué pasó, nombrando la sección que el back negó.
    // (El título de la pantalla YA NO está: la pantalla entera se reemplazó.)
    expect(contenedor.textContent).toContain('Pipeline');
    expect(contenedor.textContent).not.toContain('Las filas del pipeline');
  });

  it('🔴 con un 500 la pantalla NO se apaga: los controles pueden volver a servir', async () => {
    await montar(<PantallaDePrueba error={new ApiError(500, 'Internal server error')} />);
    const textos = controlesUsables().map(
      (c) => c.getAttribute('aria-label') ?? c.textContent,
    );
    expect(textos).toContain('Nuevo lead');
    expect(textos).toContain('Buscar por candidato o propiedad');
  });

  it('una sección SECUNDARIA negada degrada sola y no tumba la pantalla', async () => {
    await montar(<PantallaDePrueba error={NEGADO} principal={false} />);
    const textos = controlesUsables().map(
      (c) => c.getAttribute('aria-label') ?? c.textContent,
    );
    expect(textos).toContain('Nuevo lead');
  });

  it('sin error, la pantalla es la de siempre', async () => {
    await montar(<PantallaDePrueba error={null} />);
    expect(contenedor.textContent).toContain('Las filas del pipeline');
    expect(controlesUsables()).toHaveLength(2);
  });

  it('🔴 al administrador no se le dice que le pida permiso a un administrador', async () => {
    await montar(<PantallaDePrueba error={NEGADO} />);
    expect(contenedor.textContent).not.toContain('Pídele a un administrador');
    expect(contenedor.textContent).toContain('no es por tus permisos');
  });

  it('a quien de verdad no lo tiene, se le nombra la sección', async () => {
    permisos.isAdmin = false;
    await montar(<PantallaDePrueba error={NEGADO} />);
    expect(contenedor.textContent).toContain('No tienes acceso a Pipeline');
    expect(contenedor.textContent).toContain('Pídele a un administrador');
  });
});
