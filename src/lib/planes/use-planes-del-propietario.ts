'use client';

/**
 * Los planes del propietario (`PLANS`) con el precio que cobra el back.
 * Ver `precio-del-plan-del-propietario.ts`.
 */

import { useCallback, useMemo } from 'react';

import { getPlanById, PLANS } from '@/lib/constants/subscription-plans';
import { useSubscriptionPlans } from '@/lib/hooks/useSubscription';
import type { Plan, PlanId } from '@/lib/types/subscription';

import { conPrecioDelBack } from './precio-del-plan-del-propietario';

export function usePlanesDelPropietario() {
  const { plans: delBack, isLoading, error } = useSubscriptionPlans('LANDLORD');
  const planes = useMemo<Plan[]>(() => PLANS.map((p) => conPrecioDelBack(p, delBack)), [delBack]);
  const planDe = useCallback(
    (id: PlanId): Plan => conPrecioDelBack(getPlanById(id), delBack),
    [delBack],
  );
  return { planes, planDe, delBack, cargando: isLoading, error };
}
