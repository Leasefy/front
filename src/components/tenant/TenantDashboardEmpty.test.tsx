/**
 * El inicio de quien todavía no completó su perfil (glow up 22-10): el encabezado común, lo que falta en la lista
 * de la casa con su botón, y los atajos (el marketplace en otra pestaña).
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ locale: 'es', t: (k: string) => k }) }));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: 'u-1', name: 'Laura Gómez' } }) }));
vi.mock('@/lib/hooks/use-time-greeting', () => ({ useTimeGreeting: () => ({ greeting: 'Buenas noches' }) }));
vi.mock('@/lib/onboarding/tenant-onboarding-status', () => ({
  deriveTenantOnboardingStatus: () => ({ basicInfoComplete: true, preferencesComplete: false }),
  readTenantOnboardingCacheStatus: () => ({ completedSteps: [], isComplete: false }),
}));

import { TenantDashboardEmpty } from './TenantDashboardEmpty';

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

describe('Inicio sin perfil completo', () => {
  it('el saludo como título, lo que falta con su botón y el marketplace en otra pestaña', async () => {
    await act(async () => root.render(<TenantDashboardEmpty />));
    expect(host.querySelector('h1')?.textContent).toBe('Buenas noches, Laura');
    expect(host.textContent).toContain('Para completar tu perfil te falta 1 paso');
    expect(host.querySelector('[data-testid="inicio-lo-que-falta"] a[href="/onboarding/inquilino"]')).not.toBeNull();
    const marketplace = host.querySelector('a[href="/propiedades"]');
    expect(marketplace?.getAttribute('target')).toBe('_blank');
    expect(marketplace?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(host.innerHTML).not.toContain('#f8f8f8');
  });
});
