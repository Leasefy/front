'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAgencySubscription } from '@/lib/hooks/useAgencySubscription';
import { useAuth } from '@/lib/auth/use-auth';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';

/**
 * AgencySubscriptionGuard — UX-only gate for the agency ("inmobiliaria") panel.
 *
 * Access is governed by CAPS, not by paid-vs-free: any agency with an active
 * subscription — INCLUDING the free/default plan — may use the panel, and the
 * plan's caps (maxProperties/maxUsers/monthlyEvalCap) throttle usage server-side.
 * Only a SUSPENDED or CANCELLED subscription (dunning) is bounced. The backend
 * remains the source of truth — this is front-end enforcement only, so it fails
 * OPEN on any indeterminate state (loading / error) to never bounce on a
 * transient failure.
 *
 * Decision order:
 *   1. Exempt routes (/upgrade, /checkout) → render children (avoid redirect
 *      loop; those pages carry their own guards).
 *   2. Indeterminate (loading || error || plan undefined) → render children.
 *   3. Has panel access (active plan, free or paid) → render children.
 *   4. Suspended/cancelled + admin → redirect to /upgrade + lightweight spinner.
 *   5. Suspended/cancelled + non-admin → full-screen blocking screen (no redirect).
 *
 * Intentionally does NOT depend on PermissionsProvider — it wraps the entire
 * provider subtree in the inmobiliaria layout.
 */

const EXEMPT_PREFIXES = [
  '/panel/inmobiliaria/upgrade',
  '/panel/inmobiliaria/checkout',
];

export function AgencySubscriptionGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { hasPanelAccess, indeterminate } = useAgencySubscription();
  const { agencyRole } = useAuth();

  const isAdmin = agencyRole === AGENCY_ROLES.ADMIN;
  const isExempt = EXEMPT_PREFIXES.some((prefix) => pathname?.startsWith(prefix));

  const passthrough = isExempt || indeterminate || hasPanelAccess;
  // Only admins are bounced to the self-serve upgrade flow; non-admins can't pay.
  const shouldRedirect = !passthrough && isAdmin;

  useEffect(() => {
    if (shouldRedirect) {
      router.replace('/panel/inmobiliaria/upgrade');
    }
  }, [shouldRedirect, router]);

  if (passthrough) {
    return <>{children}</>;
  }

  // No paid plan, admin → redirecting; show a lightweight spinner (mirrors PageGuard).
  if (isAdmin) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-[#1A40FF]/30 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No paid plan, non-admin → full-screen blocking screen (no redirect).
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md mx-auto rounded-lg bg-surface-raised border border-border p-8 text-center space-y-4 shadow-sm">
        <h2 className="text-h2">Tu agencia no tiene un plan activo</h2>
        <p className="text-body-sm text-fg-secondary">
          Contactá al administrador de tu agencia para activar una suscripción y
          volver a usar el panel.
        </p>
      </div>
    </div>
  );
}
