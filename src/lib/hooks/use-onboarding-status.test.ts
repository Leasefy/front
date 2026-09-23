/**
 * El muro «Completa tu perfil» lo decide el BACK, no el navegador.
 *
 * QA 22-09: un inquilino con contratos vigentes que entraba por un enlace
 * directo, sin haber pasado por `/inquilino` en ese navegador, quedaba detrás
 * del muro en nueve pantallas porque el caché local estaba vacío.
 */

import { describe, expect, it } from 'vitest';

import { estadoDelOnboarding } from './use-onboarding-status';

const completo = {
  id: 'u1',
  profileSource: 'backend' as const,
  onboardingCompleted: true,
  firstName: 'Alejandro',
  phone: '3001234567',
  tenantOnboardingData: undefined,
};

describe('estadoDelOnboarding', () => {
  it('perfil del back completo + navegador nuevo (sin caché): NO hay muro', () => {
    const r = estadoDelOnboarding(completo, false, { completedSteps: [], isComplete: false });
    expect(r.isComplete).toBe(true);
    expect(r.isLoading).toBe(false);
    expect(r.progressPercentage).toBe(100);
  });

  it('el back dice incompleto: hay muro aunque el caché diga completo', () => {
    const r = estadoDelOnboarding(
      { ...completo, onboardingCompleted: false, phone: undefined },
      false,
      { completedSteps: [1, 2], isComplete: true },
    );
    expect(r.isComplete).toBe(false);
    expect(r.completedSteps).toEqual([]);
  });

  it('el perfil de respaldo de la sesión (back caído) no cuenta: se usa el caché', () => {
    const r = estadoDelOnboarding(
      { ...completo, profileSource: 'session' },
      false,
      { completedSteps: [1], isComplete: false },
    );
    expect(r.isComplete).toBe(false);
    expect(r.completedSteps).toEqual([1]);
  });

  it('mientras la sesión carga no se decide (no se pinta el muro un instante)', () => {
    expect(estadoDelOnboarding(null, true, { completedSteps: [], isComplete: false }).isLoading).toBe(true);
  });
});
