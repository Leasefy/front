/**
 * modal-conserva-el-scroll.test.tsx
 *
 * 🔴 Abrir un modal en esta pantalla mandaba la página al tope.
 *
 * El efecto que bloquea el scroll del fondo tenía la limpieza FUERA del
 * `if (open)`. React corre la limpieza del render anterior antes del efecto
 * nuevo, así que al pasar de cerrado a abierto pasaba esto, en orden:
 *
 *   1. limpieza: `window.scrollTo(0, -parseInt('' || '0'))` → scroll al tope;
 *   2. efecto:   `const scrollY = window.scrollY` → ya vale 0;
 *   3. body queda con `top: -0px`.
 *
 * O sea: abrir «Agregar propietario» desde la mitad de la lista te subía
 * arriba de todo, y al cerrar te dejaba ahí. Se veía como un salto sin causa,
 * y nada fallaba.
 *
 * 02-10-2026: la cáscara a mano se fue; los cuatro diálogos de la lista son el
 * `Dialog` de la plataforma, que congela el fondo con `react-remove-scroll`
 * (marca `data-scroll-locked` en el body) SIN fijarlo con `position: fixed` y
 * sin tocar el scroll. Este archivo sigue fijando las dos mitades: al abrir el
 * fondo se congela donde estaba (nadie lo manda al tope), y al irse el modal
 * la página sigue donde estaba y el fondo se suelta.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { paramsState, replaceMock } = vi.hoisted(() => ({
  paramsState: { nuevo: null as string | null },
  replaceMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (k: string) => (k === 'nuevo' ? paramsState.nuevo : null) }),
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k, formatCurrency: (n: number) => String(n) }),
}));

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}));

// Con todos los permisos: el modal de alta sólo se abre para quien puede crear.
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: () => true, isLoading: false }),
}));

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  usePropietarios: () => ({
    propietarios: [],
    isLoading: false,
    errorCrudo: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/lib/hooks/use-migracion-con-deuda', () => ({ useMigracionConDeuda: () => null }));

vi.mock('@/lib/api/inmobiliaria.service', () => ({
  propietariosApi: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/components/inmobiliaria', () => ({
  PropietarioCard: () => null,
  PropietarioTable: () => null,
  PropietarioForm: () => null,
}));
vi.mock('@/components/inmobiliaria/TerceroIACapture', () => ({ TerceroIACapture: () => null }));

import PropietariosPage from './page';

const SCROLL = 640;
let container: HTMLDivElement;
let root: Root;
let scrollTo: ReturnType<typeof vi.fn>;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  paramsState.nuevo = null;
  Object.defineProperty(window, 'scrollY', { value: SCROLL, writable: true, configurable: true });
  scrollTo = vi.fn((_x: number, y: number) => {
    Object.defineProperty(window, 'scrollY', { value: y, writable: true, configurable: true });
  });
  Object.defineProperty(window, 'scrollTo', { value: scrollTo, writable: true, configurable: true });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.removeAttribute('style');
  vi.clearAllMocks();
});

describe('Abrir un modal no mueve la página', () => {
  it('al abrir, el fondo se congela DONDE estaba', async () => {
    paramsState.nuevo = 'true';
    await act(async () => {
      root.render(React.createElement(PropietariosPage));
    });

    // El modal de alta está abierto (el de la plataforma, con su rol)…
    const dialogo = document.body.querySelector('[role="dialog"]');
    expect(dialogo?.textContent).toContain('inmobiliaria.propietarios.addOwner');
    // …el fondo quedó congelado…
    expect(document.body.hasAttribute('data-scroll-locked')).toBe(true);
    // …y donde estaba: nadie lo fijó en `top: -0px` ni scrolleó al tope.
    expect(document.body.style.position).toBe('');
    expect(document.body.style.top).toBe('');
    expect(window.scrollY).toBe(SCROLL);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('al desmontar con el modal abierto, la página sigue donde estaba y el fondo se suelta', async () => {
    paramsState.nuevo = 'true';
    await act(async () => {
      root.render(React.createElement(PropietariosPage));
    });
    expect(document.body.hasAttribute('data-scroll-locked')).toBe(true);
    await act(async () => root.unmount());

    expect(document.body.hasAttribute('data-scroll-locked')).toBe(false);
    expect(window.scrollY).toBe(SCROLL);
    expect(scrollTo).not.toHaveBeenCalledWith(0, 0);
    expect(document.body.style.position).toBe('');

    // El `afterEach` desmonta de nuevo; que sea inofensivo.
    root = createRoot(container);
  });
});
