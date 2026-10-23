/**
 * Inicio del propietario sin inmuebles (glow up 22-10): el encabezado común con «publicar» como la principal, lo
 * que falta en la lista de la casa, y nada inventado (ni «Tu potencial mensual $0» ni un video que no existe).
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ locale: 'es', t: (k: string) => k }) }));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: 'u-1', name: 'Pedro Ruiz' } }) }));
vi.mock('@/lib/hooks/use-time-greeting', () => ({ useTimeGreeting: () => ({ greeting: 'Buenos días' }) }));

import { LandlordDashboardEmpty } from './LandlordDashboardEmpty';

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  localStorage.clear();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('Inicio del propietario sin inmuebles', () => {
  it('el saludo como título, publicar como la principal y lo que falta, sin cifras ni videos inventados', async () => {
    await act(async () => root.render(<LandlordDashboardEmpty />));
    const encabezado = host.querySelector('[data-testid="encabezado-del-propietario-sin-inmuebles"]');
    expect(encabezado?.querySelector('h1')?.textContent).toBe('Buenos días, Pedro');
    expect(encabezado?.querySelector('a[href="/publicar?from=panel"]')).not.toBeNull();
    expect(host.textContent).toContain('Para empezar a arrendar te faltan 3 pasos');
    expect(host.textContent).not.toContain('Tu potencial mensual');
    expect(host.textContent).not.toContain('VideoCamera');
    expect(host.textContent).not.toContain('¡');
    const marketplace = host.querySelector('a[href="/propiedades"]');
    expect(marketplace?.getAttribute('target')).toBe('_blank');
  });
});
