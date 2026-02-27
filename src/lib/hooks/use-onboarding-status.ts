'use client';

import { useState, useEffect } from 'react';

// ============================================================================
// NOTA PARA BACKEND:
// ============================================================================
// Si el usuario ya aplicó a una propiedad, ya tenemos:
// - Info básica (nombre, teléfono) → Paso 1 completado
// - Verificación de ingresos (empleo, salario) → Paso 2 completado
//
// Este hook debe consultar al backend qué pasos ya están completados
// basándose en los datos que ya tenemos del usuario.
//
// TODO: Cuando se integre el backend, este hook debe:
// 1. Consultar qué datos ya tenemos (de aplicaciones previas)
// 2. Auto-completar los pasos que ya tenemos info
// 3. Calcular completedSteps basado en datos reales del servidor
// 4. Eliminar la dependencia de localStorage
//
// Ejemplo de respuesta del backend:
// {
//   hasBasicInfo: true,        // Ya tenemos nombre y teléfono
//   hasIncomeVerification: true, // Ya tenemos empleo e ingresos
//   hasPreferences: false,     // Aún no tenemos preferencias
//   hasDocuments: false        // Aún no tenemos documentos
// }
// → completedSteps = [1, 2], startAtStep = 3
// ============================================================================

export interface OnboardingStatus {
  isComplete: boolean;
  isLoading: boolean;
  completedSteps: number[];
  totalSteps: number;
  progressPercentage: number;
  // TODO (backend): agregar hasApplications para saltar onboarding si ya aplicó
}

const TOTAL_STEPS = 3;
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
        // Filter to only valid steps (1, 2, 3) in case of old data with step 4
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
