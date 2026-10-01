'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignOut } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth';
import { ForceLightMode } from '@/components/providers/ForceLightMode';
import { ActivarSegundoFactorPasoAPaso } from '@/components/auth/ActivarSegundoFactorPasoAPaso';
import { FondoDeMarca } from '@/components/auth/FondoDeMarca';
import { BrandHomeLink } from '@/components/brand/BrandHomeLink';
import LogoDefs from '@/components/landing-v2/LogoDefs';
import {
  destinoTrasElSegundoFactor,
  rutaAlSegundoFactor,
} from '@/lib/auth/regreso-tras-el-segundo-factor';
import { sanitizeReturnUrl } from '@/lib/utils/safe-redirect';

/**
 * Cuánto se deja ver el «Listo» antes de salir: lo justo para leerlo.
 * La salida no espera a nadie más que al contexto (ver `TOPE_DEL_CONTEXTO_MS`).
 */
const PAUSA_DEL_LISTO_MS = 1200;
/**
 * Si el contexto de auth no se entera del `aal2` en este tiempo, se sale con
 * una carga completa: la sesión `aal2` ya está guardada y el AuthProvider, al
 * arrancar de cero, la lee bien. Navegar con el router ANTES de que se entere
 * es lo que rebotaba (ProtectedRoute veía `mfaEnrollRequired` todavía en true).
 */
const TOPE_DEL_CONTEXTO_MS = 8000;

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
 * subir. `ProtectedRoute` manda acá cuando `mfaEnrollRequired` es true.
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
  /** Cuándo pasó el primer código. Mientras sea null, la pantalla está inscribiendo. */
  const [activadoEn, setActivadoEn] = useState<number | null>(null);
  const yaSalioRef = useRef(false);
  const rol = user?.role;

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
  }, [user, cargandoLaSesion, mfaEnrollRequired, mfaRequired, activadoEn, router]);

  // Después de activar: se sale cuando el contexto ya sabe que la sesión es
  // `aal2` (y el «Listo» alcanzó a leerse), o con carga completa si no se
  // entera a tiempo.
  useEffect(() => {
    if (activadoEn === null || yaSalioRef.current) return;
    const destino = destinoTrasElSegundoFactor(returnUrlDeLaBarra(), rol);
    const transcurrido = Date.now() - activadoEn;
    if (!mfaEnrollRequired) {
      const reloj = setTimeout(() => {
        yaSalioRef.current = true;
        router.replace(destino);
      }, Math.max(0, PAUSA_DEL_LISTO_MS - transcurrido));
      return () => clearTimeout(reloj);
    }
    const tope = setTimeout(() => {
      yaSalioRef.current = true;
      window.location.assign(destino);
    }, Math.max(0, TOPE_DEL_CONTEXTO_MS - transcurrido));
    return () => clearTimeout(tope);
  }, [activadoEn, mfaEnrollRequired, rol, router]);

  const alActivar = useCallback(() => {
    // Como `alActivarElNuevo` de mfa-verify: ProtectedRoute no pide el código
    // mientras llega el evento del SDK.
    setMfaVerified();
    setActivadoEn(Date.now());
  }, [setMfaVerified]);

  /**
   * Al abrir, la cuenta ya tenía un factor verificado (otra pestaña, otro
   * dispositivo): lo que falta es escribir su código, en `/auth/mfa-verify`.
   */
  const alYaTenerFactor = useCallback(() => {
    if (yaSalioRef.current) return;
    yaSalioRef.current = true;
    router.replace(rutaAlSegundoFactor(returnUrlDeLaBarra()));
  }, [router]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace('/auth');
  }, [signOut, router]);

  return (
    <ForceLightMode>
      {/* La misma caja que `/auth` y `/auth/mfa-verify`: entrar es una sola
          secuencia, con el mismo fondo y la tarjeta en el mismo sitio. */}
      <div className="relative min-h-screen bg-background" data-lenis-prevent>
        <FondoDeMarca />

        <LogoDefs />
        <div className="pointer-events-none fixed inset-0 z-[1] hidden lg:block">
          <BrandHomeLink
            aria-label="Leasefy — inicio"
            className="pointer-events-auto absolute left-8 top-8 inline-flex text-white"
          >
            <svg viewBox="0 0 947 235" className="block h-8 w-auto" role="img" aria-label="Leasefy">
              <use href="#lfLogo" />
            </svg>
          </BrandHomeLink>
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
