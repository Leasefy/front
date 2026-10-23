/**
 * «Completa tu perfil» (glow up 22-10): el ícono suelto, el avance en una línea con sus pasos en contorno, y el
 * botón de la casa que dice lo que pasa; sin colores a mano.
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ locale: 'es', t: (k: string) => k }) }));
vi.mock('@/lib/hooks/use-onboarding-status', () => ({
  useOnboardingStatus: () => ({ completedSteps: [1, 2], totalSteps: 4, progressPercentage: 50 }),
}));

import { CompleteProfileFirst } from './CompleteProfileFirst';

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

describe('Completa tu perfil', () => {
  it('dice cuánto lleva y ofrece seguir, con el botón de la casa y sin colores a mano', () => {
    act(() => root.render(<CompleteProfileFirst context="applications" />));
    expect(host.querySelector('[data-testid="avance-del-perfil"]')?.textContent).toContain('2/4');
    expect(host.textContent).toContain('ver tus postulaciones');
    const seguir = host.querySelector('a[href="/onboarding/inquilino"]');
    expect(seguir?.textContent).toContain('Seguir con mi perfil');
    // Los que se pintaban a mano aquí (el botón de Cadence trae los suyos).
    for (const hex of ['#1A40FF', '#EEF1FF', '#E8F3EC', '#2C7A53']) expect(host.innerHTML).not.toContain(hex);
  });
});
