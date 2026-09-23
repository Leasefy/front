'use client';

import { useContext, useEffect, useState } from 'react';

import { AuthContext } from '@/lib/auth/auth-context';
import {
  deriveTenantOnboardingStatus,
  readTenantOnboardingCacheStatus,
  type TenantOnboardingCacheStatus,
  type TenantOnboardingUserSlice,
} from '@/lib/onboarding/tenant-onboarding-status';

export interface OnboardingStatus {
  isComplete: boolean;
  isLoading: boolean;
  completedSteps: number[];
  totalSteps: number;
  progressPercentage: number;
}

const TOTAL_STEPS = 2;

/**
 * El muro «Completa tu perfil» de las pantallas del portal del inquilino.
 *
 * 🔴 QA 22-09 (P1): este hook leía SÓLO `localStorage.plan_onboarding_tenant`.
 * Un inquilino con dos contratos vigentes que entraba por un enlace directo
 * (`/inquilino/arriendo`, el enlace de un correo, otro dispositivo, una pestaña
 * privada) veía «Completa tu perfil · 0/2» en nueve pantallas; si antes pasaba
 * por `/inquilino`, la misma URL abría, porque el inicio sí le pregunta al back
 * y de paso rehidrata el caché. Dos pantallas del mismo portal, dos respuestas
 * a «¿completó el perfil?».
 *
 * Ahora la regla es la del inicio (`deriveTenantOnboardingStatus`): manda el
 * BACK (`onboardingCompletedAt`, vía `GET /users/me`). El caché del navegador
 * sólo se lee cuando no hay un perfil cargado del back — el mismo respaldo que
 * ya tenía el inicio —.
 */
export function estadoDelOnboarding(
  user: (TenantOnboardingUserSlice & { id?: string }) | null | undefined,
  authCargando: boolean,
  cache: TenantOnboardingCacheStatus | null,
): OnboardingStatus {
  if (user?.profileSource === 'backend') {
    const back = deriveTenantOnboardingStatus(user);
    const completedSteps = back.isComplete
      ? [1, 2]
      : [back.basicInfoComplete ? 1 : null, back.preferencesComplete ? 2 : null].filter(
          (s): s is number => s !== null,
        );
    return conPasos(back.isComplete, false, completedSteps);
  }
  // Mientras la sesión carga no se decide nada: pintar el muro un instante y
  // después el arriendo es otra forma de decir dos cosas.
  if (authCargando || cache === null) return conPasos(false, true, []);
  return conPasos(cache.isComplete, false, cache.completedSteps);
}

function conPasos(isComplete: boolean, isLoading: boolean, completedSteps: number[]): OnboardingStatus {
  return {
    isComplete,
    isLoading,
    completedSteps,
    totalSteps: TOTAL_STEPS,
    progressPercentage: Math.round((completedSteps.length / TOTAL_STEPS) * 100),
  };
}

export function useOnboardingStatus(): OnboardingStatus {
  // `useContext` y no `useAuth()`: fuera del proveedor (pruebas de una pantalla
  // suelta) se queda con el caché en vez de reventar.
  const auth = useContext(AuthContext);
  const user = auth?.user ?? null;
  const authCargando = auth?.isLoading ?? false;
  const userId = user?.id ?? null;

  const [cache, setCache] = useState<TenantOnboardingCacheStatus | null>(null);

  useEffect(() => {
    const leer = () => setCache(readTenantOnboardingCacheStatus(userId));
    leer();
    // Otra pestaña que termina el recorrido, o el mismo recorrido en esta.
    window.addEventListener('storage', leer);
    window.addEventListener('onboarding-updated', leer);
    return () => {
      window.removeEventListener('storage', leer);
      window.removeEventListener('onboarding-updated', leer);
    };
  }, [userId]);

  return estadoDelOnboarding(user, authCargando, cache);
}
