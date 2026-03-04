'use client';

import { useState, useEffect } from 'react';

// ============================================================================
// NOTA PARA BACKEND:
// ============================================================================
// El onboarding solo recolecta info básica y preferencias (2 pasos).
// Los datos de ingresos/empleo se recolectan durante la postulación.
//
// Flags necesarios del backend:
// - hasBasicInfo: boolean (nombre, teléfono)
// - hasPreferences: boolean (preferencias de vivienda)
// ============================================================================

export interface OnboardingStatus {
  isComplete: boolean;
  isLoading: boolean;
  completedSteps: number[];
  totalSteps: number;
  progressPercentage: number;
}

const TOTAL_STEPS = 2;
const STORAGE_KEY = 'plan_onboarding_tenant';

/**
 * Hook to check tenant onboarding completion status
 * Reads from localStorage and provides loading state
 *
 * NOTE: When backend is ready, this should also check if user has
 * existing applications - if so, skip onboarding entirely.
 */
export function useOnboardingStatus(): OnboardingStatus {
  const [status, setStatus] = useState<OnboardingStatus>({
    isComplete: false,
    isLoading: true,
    completedSteps: [],
    totalSteps: TOTAL_STEPS,
    progressPercentage: 0,
  });

  useEffect(() => {
    const checkStatus = () => {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        setStatus({
          isComplete: false,
          isLoading: false,
          completedSteps: [],
          totalSteps: TOTAL_STEPS,
          progressPercentage: 0,
        });
        return;
      }

      try {
        const parsed = JSON.parse(saved);
        const completedSteps = (parsed.completedSteps || []).filter((s: number) => s <= TOTAL_STEPS);
        const isComplete = completedSteps.length >= TOTAL_STEPS;
        const progressPercentage = Math.round((completedSteps.length / TOTAL_STEPS) * 100);

        setStatus({
          isComplete,
          isLoading: false,
          completedSteps,
          totalSteps: TOTAL_STEPS,
          progressPercentage,
        });
      } catch {
        setStatus({
          isComplete: false,
          isLoading: false,
          completedSteps: [],
          totalSteps: TOTAL_STEPS,
          progressPercentage: 0,
        });
      }
    };

    checkStatus();

    // Listen for storage changes (in case user completes onboarding in another tab)
    window.addEventListener('storage', checkStatus);
    // Listen for custom event (same-tab updates from TenantOnboardingContext)
    window.addEventListener('onboarding-updated', checkStatus);
    return () => {
      window.removeEventListener('storage', checkStatus);
      window.removeEventListener('onboarding-updated', checkStatus);
    };
  }, []);

  return status;
}
