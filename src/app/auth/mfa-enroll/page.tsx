'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, SignOut } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth';
import { ForceLightMode } from '@/components/providers/ForceLightMode';
import { MfaSetupSection } from '@/components/settings/MfaSetupSection';
import { destinoTrasElSegundoFactor, RUTA_DEL_SEGUNDO_FACTOR } from '@/lib/auth/regreso-tras-el-segundo-factor';
import { sanitizeReturnUrl } from '@/lib/utils/safe-redirect';

/**
 * T-0099 — enroll-pending destination (contract.md T-0099 §3): the back's
 * role policy requires aal2 (`segundoFactor.exigido`) but this session has
 * NO verified TOTP factor to even step up to. `ProtectedRoute` redirects
 * here (ahead of `/auth/mfa-verify`, its verify-pending sibling) whenever
 * `mfaEnrollRequired` is true.
 *
 * Reuses `MfaSetupSection` (already the Settings → Seguridad enroll UI) so
 * the enroll flow — QR, secret, code — isn't duplicated.
 *
 * T-0123: it runs with `enElIngreso`, so the first code is verified through
 * the SDK (`mfa.challenge` + `mfa.verify`). That upgrades the cached session
 * to aal2 and emits `MFA_CHALLENGE_VERIFIED`, which refreshes `apiClient`'s
 * token (`auth-context.tsx`). Verifying over raw REST (the previous wiring)
 * left the SDK session at aal1, so the hand-off to `/auth/mfa-verify` bounced
 * back here (stale `mfaEnrollRequired`) and the panel finally loaded with an
 * aal1 token — every back call 403 SEGUNDO_FACTOR_REQUERIDO.
 *
 * - `onEnrolled` (fresh enroll+verify, session now aal2): release the gate and
 *   go to the destination, once.
 * - `onYaInscrito` (a verified factor already existed on mount, session still
 *   aal1): that is a step-up, so it goes to `/auth/mfa-verify`, never enrolls.
 */
export default function MfaEnrollPage() {
  const router = useRouter();
  const { user, mfaEnrollRequired, signOut, setMfaVerified } = useAuth();
  /** Navigate at most once: `onEnrolled` and the "flags cleared" effect race. */
  const yaSalioRef = useRef(false);

  const destino = useCallback((): string => {
    const crudo =
      typeof window === 'undefined'
        ? null
        : new URLSearchParams(window.location.search).get('returnUrl');
    const saneado = sanitizeReturnUrl(crudo, '/');
    return destinoTrasElSegundoFactor(saneado === '/' ? null : saneado, user?.role);
  }, [user?.role]);

  // If enrollment isn't (or is no longer) required, don't strand the user
  // here — send them where they belong. Mirrors /auth/mfa-verify's own
  // "not needed, get out" guard.
  useEffect(() => {
    if (user && !mfaEnrollRequired && !yaSalioRef.current) {
      yaSalioRef.current = true;
      router.replace(destino());
    }
  }, [user, mfaEnrollRequired, router, destino]);

  const handleEnrolled = useCallback(() => {
    if (yaSalioRef.current) return;
    yaSalioRef.current = true;
    // The SDK verify already made the session aal2; clear the local flags now
    // instead of waiting for the deferred MFA check.
    setMfaVerified();
    router.replace(destino());
  }, [router, setMfaVerified, destino]);

  const handleYaInscrito = useCallback(() => {
    if (yaSalioRef.current) return;
    yaSalioRef.current = true;
    router.replace(RUTA_DEL_SEGUNDO_FACTOR);
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
            <MfaSetupSection enElIngreso onEnrolled={handleEnrolled} onYaInscrito={handleYaInscrito} />
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
