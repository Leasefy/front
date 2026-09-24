'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, SignOut } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth';
import { ForceLightMode } from '@/components/providers/ForceLightMode';
import { MfaSetupSection } from '@/components/settings/MfaSetupSection';

/**
 * T-0099 — enroll-pending destination (contract.md T-0099 §3): the back's
 * role policy requires aal2 (`segundoFactor.exigido`) but this session has
 * NO verified TOTP factor to even step up to. `ProtectedRoute` redirects
 * here (ahead of `/auth/mfa-verify`, its verify-pending sibling) whenever
 * `mfaEnrollRequired` is true.
 *
 * Reuses `MfaSetupSection` (already the Settings → Seguridad enroll UI) so
 * the enroll flow — QR, secret, code — isn't duplicated. Once a factor is
 * enrolled AND verified, `onEnrolled` hands off to `/auth/mfa-verify`: this
 * screen's verify goes over raw REST (MfaSetupSection's own module doc
 * explains why — the SDK's session lock deadlocks it), which never updates
 * the Supabase JS client's cached session. `/auth/mfa-verify` does the
 * SDK-recognized step-up that actually flips `mfaRequired`/
 * `mfaEnrollRequired` and refreshes `apiClient`'s token
 * (`MFA_CHALLENGE_VERIFIED`, `auth-context.tsx`).
 */
export default function MfaEnrollPage() {
  const router = useRouter();
  const { user, mfaEnrollRequired, signOut } = useAuth();

  // If enrollment isn't (or is no longer) required, don't strand the user
  // here — send them where they belong. Mirrors /auth/mfa-verify's own
  // "not needed, get out" guard.
  useEffect(() => {
    if (user && !mfaEnrollRequired) {
      const dashboardPath = user.role === 'agency'
        ? '/panel/inmobiliaria'
        : user.role === 'landlord'
          ? '/panel'
          : '/inquilino';
      router.replace(dashboardPath);
    }
  }, [user, mfaEnrollRequired, router]);

  const handleEnrolled = useCallback(() => {
    router.replace('/auth/mfa-verify');
  }, [router]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace('/auth');
  }, [signOut, router]);

  return (
    <ForceLightMode>
      <div className="min-h-screen flex items-center justify-center bg-bg px-4">
        <div className="w-full max-w-sm space-y-8">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-[16px] bg-primary-soft flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-primary" weight="fill" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-fg tracking-tight">
              Activa tu segundo factor
            </h1>
            <p className="text-sm text-fg-muted">
              Tu rol maneja la plata de propietarios e inquilinos, así que entrar con
              contraseña no alcanza. Actívalo una vez: son dos minutos.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <MfaSetupSection onEnrolled={handleEnrolled} />
          </div>

          {/* Sign out link */}
          <div className="text-center">
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors"
            >
              <SignOut className="w-4 h-4" />
              Cerrar sesion
            </button>
          </div>
        </div>
      </div>
    </ForceLightMode>
  );
}
