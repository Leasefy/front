'use client';

import { useAuth } from '@/lib/auth/use-auth';
import type { OnboardingStep } from '@/lib/types/inmobiliaria';

// ============================================================================
// Types
// ============================================================================

/** @deprecated Use OnboardingStep from @/lib/types/inmobiliaria */
export type AgencyOnboardingStep = OnboardingStep;

export interface AgencyOnboardingStatusResult {
  steps: OnboardingStep[];
  isComplete: boolean;
  completionPercent: number;
  isAdmin: boolean;
}

// ============================================================================
// Mock steps (replace with API call when backend endpoint is ready)
// GET /inmobiliaria/agency/onboarding-status
// ============================================================================

const MOCK_STEPS: OnboardingStep[] = [
  {
    key: 'profile',
    label: 'Completa el perfil de tu agencia',
    completed: true,
    action: { label: 'Editar', href: '/panel/inmobiliaria/configuracion' },
  },
  {
    key: 'first_property',
    label: 'Agrega tu primera propiedad en consignación',
    completed: false,
    action: { label: 'Agregar', href: '/panel/inmobiliaria/inmuebles/nuevo' },
  },
  {
    key: 'invite_agent',
    label: 'Invita a un agente a tu equipo',
    completed: false,
    action: { label: 'Invitar', href: '/panel/inmobiliaria/agentes' },
  },
  {
    key: 'first_collection',
    label: 'Registra tu primer cobro',
    completed: false,
    action: { label: 'Ver cobros', href: '/panel/inmobiliaria/cobros' },
  },
];

// ============================================================================
// Hook
// ============================================================================

/**
 * useAgencyOnboardingStatus
 *
 * Returns the onboarding checklist steps for an agency admin.
 * Currently uses mock data — replace fetch call with real API when ready.
 *
 * Only ADMIN agency members see the checklist.
 * The checklist hides itself when all steps are complete.
 *
 * TODO (backend): Replace MOCK_STEPS with:
 *   const data = await apiClient.get('/inmobiliaria/agency/onboarding-status')
 *   return { steps: data.steps, ... }
 */
export function useAgencyOnboardingStatus(): AgencyOnboardingStatusResult {
  const { user, agencyRole } = useAuth();

  // Only INMOBILIARIA users with ADMIN role see the checklist
  const isAdmin = user?.role === 'agency' && agencyRole === 'ADMIN';

  const completedCount = MOCK_STEPS.filter((s) => s.completed).length;
  const totalCount = MOCK_STEPS.length;
  const isComplete = completedCount === totalCount;
  const completionPercent = Math.round((completedCount / totalCount) * 100);

  return {
    steps: MOCK_STEPS,
    isComplete,
    completionPercent,
    isAdmin,
  };
}
