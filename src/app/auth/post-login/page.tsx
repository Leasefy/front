'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/use-auth';
import { getRoleHomeRoute } from '@/lib/auth/role-routes';
import { sanitizeReturnUrl } from '@/lib/utils';

/**
 * Post-login resolver for the OAuth (Google) flow.
 *
 * The server callback (src/app/auth/callback/route.ts) exchanges the code and
 * then does a plain server redirect — it has NO access to the backend user
 * record, so it cannot know the user's role or onboarding state. Left to its
 * own devices it defaults to `/`, dropping OAuth users on the public landing.
 *
 * This client page is where the callback sends users when there is no explicit
 * returnUrl. It waits for the auth context to hydrate (which runs GET /users/me)
 * and then applies the SAME decision chain as the email/password flow in
 * AuthForm.tsx (~lines 156-196), so both login methods share one source of
 * truth for "where does a logged-in user go".
 */
function PostLoginResolver() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    needsOnboarding,
    mfaRequired,
    agencyRole,
    agencyMembershipChecked,
    hasActiveAgencyMembership,
  } = useAuth();

  // Bounded fallback for the agency-membership-probe wait — mirrors AuthForm.
  // An agency user's `agencyRole` is populated ASYNC by the probe, so we hold
  // the per-sub-role redirect until `agencyMembershipChecked`. If the probe
  // never settles, stop waiting after a few seconds and proceed with whatever
  // `agencyRole` is (defaulting to /panel/inmobiliaria).
  const [probeWaitElapsed, setProbeWaitElapsed] = React.useState(false);
  React.useEffect(() => {
    const id = setTimeout(() => setProbeWaitElapsed(true), 4000);
    return () => clearTimeout(id);
  }, []);

  const returnUrl = sanitizeReturnUrl(searchParams.get('returnUrl'), '/');

  React.useEffect(() => {
    if (authLoading) return;
    // MFA gate first (security): never bypass a pending second factor.
    if (mfaRequired) {
      router.replace('/auth/mfa-verify');
      return;
    }
    // Honor an invitation returnUrl before the generic onboarding redirect —
    // the /invitacion/[token] page handles needsOnboarding on its own.
    if (returnUrl.startsWith('/invitacion/')) {
      router.replace(returnUrl);
      return;
    }
    // JWT valid but backend has no user record yet → onboarding.
    if (needsOnboarding) {
      router.replace('/onboarding/seleccionar-rol');
      return;
    }
    // Genuinely unauthenticated (e.g. navigated here directly, or the code
    // exchange failed) → back to the login screen.
    if (!isAuthenticated || !user) {
      router.replace('/auth');
      return;
    }
    // Onboarding not complete → role picker.
    if (!user.onboardingCompleted) {
      router.replace('/onboarding/seleccionar-rol');
      return;
    }
    // Explicit destination wins over the role default.
    if (returnUrl && returnUrl !== '/') {
      router.replace(returnUrl);
      return;
    }
    // No returnUrl — redirect to the correct panel based on role. For an agency
    // user, hold until the membership probe settles so `agencyRole` resolves and
    // the per-sub-role landing route is used (otherwise it'd fall to the
    // default). The bounded `probeWaitElapsed` guarantees we never hang.
    const isAgencyUser = user.role === 'agency' || hasActiveAgencyMembership;
    if (isAgencyUser && !agencyMembershipChecked && !probeWaitElapsed) return;
    router.replace(getRoleHomeRoute(user.role, agencyRole));
  }, [
    router,
    authLoading,
    isAuthenticated,
    user,
    needsOnboarding,
    mfaRequired,
    returnUrl,
    agencyRole,
    agencyMembershipChecked,
    hasActiveAgencyMembership,
    probeWaitElapsed,
  ]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Redirigiendo...</p>
      </div>
    </div>
  );
}

export default function PostLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-muted">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Redirigiendo...</p>
          </div>
        </div>
      }
    >
      <PostLoginResolver />
    </Suspense>
  );
}
