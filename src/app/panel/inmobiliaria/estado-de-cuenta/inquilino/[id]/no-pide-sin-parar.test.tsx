/**
 * QA-INQ-95 (04-10-2026) · El estado de cuenta del inquilino en el panel pedía
 * el documento SIN PARAR: ~27 GET por segundo al back (y otros tantos del
 * anticipo) hasta que el limitador respondía 429 y la pantalla caía en error.
 *
 * Causa: `cargar` era una flecha nueva en cada render y, al resolver, guardaba
 * `cliente` (un objeto NUEVO) en el estado de la página → otro render → otro
 * `cargar` → la pantalla volvía a pedir (su efecto depende de `cargar`).
 *
 * Contrato: al abrir la pantalla se pide el documento una vez (dos como mucho
 * en modo estricto), no decenas.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'u-ivan' }),
  useSearchParams: () => new URLSearchParams(''),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/panel/inmobiliaria/estado-de-cuenta/inquilino/u-ivan',
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ isAdmin: true, canAccess: () => true }),
}));
vi.mock('@/components/estado-de-cuenta/CompartirEstadoDeCuenta', () => ({ CompartirEstadoDeCuenta: () => null }));
vi.mock('@/components/estado-de-cuenta/AnticipoDelContrato', () => ({ AnticipoDelContratoSeccion: () => null }));
vi.mock('@/components/estado-de-cuenta/SaldoAFavorAlTerminar', () => ({ SaldoAFavorAlTerminarSeccion: () => null }));
vi.mock('@/components/cobranza-manual/GestionesDeLaPersona', () => ({ GestionesDeLaPersona: () => null }));
vi.mock('@/components/ui/toast', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

const inquilino = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/estado-de-cuenta.service', () => ({ estadoDeCuentaApi: { inquilino } }));

import Pagina from './page';
import { I18nProvider } from '@/lib/i18n';
import { estadoDeCuenta } from '@/components/estado-de-cuenta/ejemplo-de-prueba';

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  inquilino.mockReset();
  // Cada respuesta es un documento NUEVO (como la red): el `cliente` sale con otra identidad.
  inquilino.mockImplementation(async () => estadoDeCuenta());
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('estado de cuenta del inquilino en el panel', () => {
  it('pide el documento una vez al abrir, no sin parar', async () => {
    act(() => {
      root.render(
        <I18nProvider>
          <Pagina />
        </I18nProvider>,
      );
    });
    // 300 ms de reloj real: con el bucle, las peticiones crecen sin tope (fuera de `act`,
    // que con el bucle nunca termina de asentarse).
    await new Promise((r) => setTimeout(r, 300));
    expect(inquilino.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(inquilino.mock.calls.length).toBeLessThanOrEqual(2);
  });
});
