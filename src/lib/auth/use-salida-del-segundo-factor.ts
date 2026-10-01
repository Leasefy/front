'use client';

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';

/**
 * Cuánto se deja ver el «Listo» antes de salir: lo justo para leerlo.
 * La salida no espera a nadie más que al contexto (ver `TOPE_DEL_CONTEXTO_MS`).
 */
export const PAUSA_DEL_LISTO_MS = 1200;
/**
 * Si el contexto de auth no se entera del `aal2` en este tiempo, se sale con
 * una carga completa: la sesión `aal2` ya está guardada y el AuthProvider, al
 * arrancar de cero, la lee bien. Navegar con el router ANTES de que se entere
 * es lo que rebotaba (ProtectedRoute veía `mfaEnrollRequired` todavía en true).
 */
export const TOPE_DEL_CONTEXTO_MS = 8000;

export interface OpcionesDeLaSalida {
  /**
   * `useAuth().mfaEnrollRequired` y `useAuth().setMfaVerified` de quien llama.
   * Entran por acá y no con un `useAuth()` adentro para que el hook no dependa
   * de cuál de los dos caminos de import (`@/lib/auth` o `…/use-auth`) usa la
   * pantalla — ni de cuál de los dos dobla su prueba.
   */
  mfaEnrollRequired: boolean;
  setMfaVerified: () => void;
  /**
   * Adónde se sale. Se pregunta en el momento de salir (no al montar), para
   * que lea la barra y el rol vigentes.
   */
  destino: () => string;
  /**
   * Cómo se sale cuando el contexto YA sabe que la sesión es `aal2`. En
   * `/auth/mfa-enroll` es navegar con el router; dentro del panel es soltar la
   * escena para que se monte el panel de verdad. Si el contexto no se entera a
   * tiempo, la salida es SIEMPRE una carga completa de `destino()`.
   */
  salir: (destino: string) => void;
}

export interface SalidaDelSegundoFactor {
  /** Cuándo pasó el primer código. Mientras sea null, se está inscribiendo. */
  activadoEn: number | null;
  /** El `onActivado` del paso a paso. */
  alActivar: () => void;
  /** Ya se salió (o se está saliendo por otra puerta): no salir dos veces. */
  yaSalioRef: MutableRefObject<boolean>;
}

/**
 * La salida después de ACTIVAR el segundo factor, compartida por
 * `/auth/mfa-enroll` y por la escena «dentro» del panel de la inmobiliaria.
 *
 * ── 🔴 30-09-2026 · El rebote después de activar ──────────────────────────
 *
 * El paso a paso verifica el primer código por el SDK (sale
 * `MFA_CHALLENGE_VERIFIED` y `auth-context` apaga los dos pendientes). Acá:
 *  1. `alActivar` llama `setMfaVerified()` —como `alActivarElNuevo` de
 *     mfa-verify— para que ProtectedRoute no pida el código mientras llega el
 *     evento del SDK, y anota la hora.
 *  2. En cuanto el contexto suelta `mfaEnrollRequired` (y el «Listo» alcanzó a
 *     leerse, `PAUSA_DEL_LISTO_MS`), se sale con `salir`.
 *  3. Si no lo suelta en `TOPE_DEL_CONTEXTO_MS`, carga completa: la sesión
 *     `aal2` ya está guardada y el AuthProvider, al arrancar, la lee bien.
 *
 * Nunca se sale ANTES de que el contexto se entere: eso era el rebote.
 */
export function useSalidaDelSegundoFactor({
  mfaEnrollRequired,
  setMfaVerified,
  destino,
  salir,
}: OpcionesDeLaSalida): SalidaDelSegundoFactor {
  const [activadoEn, setActivadoEn] = useState<number | null>(null);
  const yaSalioRef = useRef(false);
  // En refs: quien llama las pasa en línea y no deben rearmar los relojes.
  const destinoRef = useRef(destino);
  destinoRef.current = destino;
  const salirRef = useRef(salir);
  salirRef.current = salir;

  useEffect(() => {
    if (activadoEn === null || yaSalioRef.current) return;
    const transcurrido = Date.now() - activadoEn;
    if (!mfaEnrollRequired) {
      const reloj = setTimeout(() => {
        yaSalioRef.current = true;
        salirRef.current(destinoRef.current());
      }, Math.max(0, PAUSA_DEL_LISTO_MS - transcurrido));
      return () => clearTimeout(reloj);
    }
    const tope = setTimeout(() => {
      yaSalioRef.current = true;
      window.location.assign(destinoRef.current());
    }, Math.max(0, TOPE_DEL_CONTEXTO_MS - transcurrido));
    return () => clearTimeout(tope);
  }, [activadoEn, mfaEnrollRequired]);

  const alActivar = useCallback(() => {
    setMfaVerified();
    setActivadoEn(Date.now());
  }, [setMfaVerified]);

  return { activadoEn, alActivar, yaSalioRef };
}
