'use client';

import Link from 'next/link';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SignOut } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth';
import { ForceLightMode } from '@/components/providers/ForceLightMode';
import { ActivarSegundoFactorPasoAPaso } from '@/components/auth/ActivarSegundoFactorPasoAPaso';
import { AsistentePendienteGuard } from '@/components/auth/AsistentePendienteGuard';
import { FondoDeMarca } from '@/components/auth/FondoDeMarca';
import LogoDefs from '@/components/landing-v2/LogoDefs';
import {
  destinoTrasElSegundoFactor,
  rutaAlSegundoFactor,
} from '@/lib/auth/regreso-tras-el-segundo-factor';
import { useSalidaDelSegundoFactor } from '@/lib/auth/use-salida-del-segundo-factor';
import { sanitizeReturnUrl } from '@/lib/utils/safe-redirect';

/** El `returnUrl` de la barra, saneado donde se lee (como en `/auth/mfa-verify`). */
function returnUrlDeLaBarra(): string | null {
  if (typeof window === 'undefined') return null;
  const crudo = new URLSearchParams(window.location.search).get('returnUrl');
  const saneado = sanitizeReturnUrl(crudo, '/');
  return saneado === '/' ? null : saneado;
}

/**
 * T-0099 — el destino de «inscripción pendiente»: la política del rol exige
 * `aal2` (`segundoFactor.exigido`) y la cuenta no tiene NINGÚN factor al cual
 * subir. `ProtectedRoute` manda acá cuando `mfaEnrollRequired` es true —
 * salvo desde el panel de la inmobiliaria, donde se activa DENTRO
 * (`SegundoFactorDentroDelPanel`, Nico 30-09: «yo estoy es dentro»).
 *
 * ── 🔴 30-09-2026 · El rebote después de activar ──────────────────────────
 *
 * Antes montaba `MfaSetupSection` (la fila de Configuración) SIN
 * `enElIngreso`: el primer código se verificaba por HTTP crudo, la sesión del
 * SDK quedaba en `aal1` y el AuthProvider no se enteraba. Luego mandaba a
 * `/auth/mfa-verify`, que veía `mfaEnrollRequired` todavía en true y lo
 * devolvía acá, donde se pintaba «Activada · Desactivar»; al final terminaba
 * en `/auth/mfa-verify` pidiendo OTRO código.
 *
 * Ahora el paso a paso verifica el primer código por el SDK (sale
 * `MFA_CHALLENGE_VERIFIED` y `auth-context` apaga los dos pendientes), esta
 * página llama `setMfaVerified()` como `alActivarElNuevo` de mfa-verify, y
 * sale directo al destino en cuanto el contexto suelta `mfaEnrollRequired`.
 * Nunca pasa por `/auth/mfa-verify` ni pinta la tarjeta de Configuración.
 */
export default function MfaEnrollPage() {
  const router = useRouter();
  const {
    user,
    mfaEnrollRequired,
    mfaRequired,
    isLoading: cargandoLaSesion,
    setMfaVerified,
    signOut,
  } = useAuth();
  const rol = user?.role;
  // La salida tras activar (el «Listo», esperar al contexto, el tope de 8 s)
  // es la misma que la de la escena dentro del panel: vive en el hook. Acá se
  // sale navegando.
  const { activadoEn, alActivar, yaSalioRef } = useSalidaDelSegundoFactor({
    mfaEnrollRequired,
    setMfaVerified,
    destino: () => destinoTrasElSegundoFactor(returnUrlDeLaBarra(), rol),
    salir: (destino) => router.replace(destino),
  });

  // Si no hace falta inscribir, no se queda nadie varado acá. Espera a que la
  // sesión termine de cargar: con el valor de fábrica (false) mandaba al panel
  // y el panel lo devolvía (el mismo arreglo del 29-09 en mfa-verify).
  useEffect(() => {
    if (!user || cargandoLaSesion || activadoEn !== null || yaSalioRef.current) return;
    if (mfaEnrollRequired) return;
    yaSalioRef.current = true;
    router.replace(
      mfaRequired
        ? rutaAlSegundoFactor(returnUrlDeLaBarra())
        : destinoTrasElSegundoFactor(returnUrlDeLaBarra(), user.role),
    );
  }, [user, cargandoLaSesion, mfaEnrollRequired, mfaRequired, activadoEn, router, yaSalioRef]);

  /**
   * Al abrir, la cuenta ya tenía un factor verificado (otra pestaña, otro
   * dispositivo): lo que falta es escribir su código, en `/auth/mfa-verify`.
   */
  const alYaTenerFactor = useCallback(() => {
    if (yaSalioRef.current) return;
    yaSalioRef.current = true;
    router.replace(rutaAlSegundoFactor(returnUrlDeLaBarra()));
  }, [router, yaSalioRef]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace('/auth');
  }, [signOut, router]);

  return (
    <ForceLightMode>
      {/* 🔴 El asistente de registro a medias manda sobre el segundo factor
          (Nico, 30-09: «no me llevó al paso donde lo dejé»): misma regla que
          «primero la migración». Si hay asistente pendiente, este guard se
          lleva a la persona a terminarlo; el 2FA la espera a la salida. */}
      <AsistentePendienteGuard />
      {/* La misma caja que `/auth` y `/auth/mfa-verify`: entrar es una sola
          secuencia, con el mismo fondo y la tarjeta en el mismo sitio. */}
      <div className="relative min-h-screen bg-background" data-lenis-prevent>
        <FondoDeMarca />

        <LogoDefs />
        {/* z-20: por encima del contenido (z-10), que ocupa toda la pantalla y se
            tragaba el clic. La capa no recibe eventos; sólo el logo. */}
        <div className="pointer-events-none fixed inset-0 z-20 hidden lg:block">
          <Link
            href="/"
            aria-label="Leasefy — inicio"
            className="pointer-events-auto absolute left-8 top-8 inline-flex text-white"
          >
            <svg viewBox="0 0 947 235" className="block h-8 w-auto" role="img" aria-label="Leasefy">
              <use href="#lfLogo" />
            </svg>
          </Link>
        </div>

        <div className="relative z-10 flex min-h-screen flex-col lg:flex-row lg:items-center lg:justify-end lg:p-8">
          <div
            className="relative flex w-full flex-col justify-center px-4 py-10 sm:px-10 lg:max-h-[calc(100vh-4rem)] lg:w-[540px] lg:justify-start lg:overflow-y-auto lg:rounded-lg lg:bg-surface lg:p-10 lg:shadow-lg lg:ring-1 lg:ring-border-faint"
            data-lenis-prevent
            data-testid="mfa-enroll-tarjeta"
          >
            {/* `my-auto` y no `justify-center`: si el contenido es más alto que
                la tarjeta, `justify-center` corta el principio y no se puede
                subir a verlo (pasaba a 1440×900 con el paso 1). */}
            <div className="mx-auto w-full max-w-md space-y-6 lg:my-auto lg:max-w-none">
              <ActivarSegundoFactorPasoAPaso
                onActivado={alActivar}
                onYaTeniaFactor={alYaTenerFactor}
              />

              {activadoEn === null ? (
                <div className="border-t border-border-faint pt-4 text-center">
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="inline-flex items-center gap-1.5 text-body-sm text-fg-muted transition-colors hover:text-fg"
                  >
                    <SignOut className="h-4 w-4" aria-hidden="true" />
                    Cerrar sesión
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </ForceLightMode>
  );
}
