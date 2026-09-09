'use client'

/**
 * IdleSessionGuard — cierre de sesión por inactividad, con aviso previo.
 *
 * Se monta UNA vez en el layout raíz, dentro de AuthProvider. Mientras haya
 * usuario y `NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES` esté configurado:
 *
 *   1. cualquier acción real del usuario (click, tecla, scroll, touch) corre la
 *      marca de actividad hacia adelante — compartida entre pestañas;
 *   2. a falta de 60 s para el tope aparece este aviso con la cuenta regresiva;
 *   3. si aprieta «Continuar», la sesión sigue como si nada;
 *   4. si el contador llega a 0, se revoca la sesión EN EL SERVIDOR y recién
 *      ahí se cierra y se vuelve al login.
 *
 * El paso 4 es el que hace que esto sea una medida de seguridad y no un
 * decorado: los access tokens de Supabase se validan por firma contra el JWKS,
 * no contra una tabla, así que uno ya emitido sigue sirviendo hasta su `exp`
 * por más que el navegador haya vuelto al login. Sin la revocación, alguien que
 * copió el token entraba igual hasta una hora después.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth/use-auth'
import { getAccessToken } from '@/lib/api/client'
import { revokeSession } from '@/lib/api/session.service'
import { terminarSesion } from '@/lib/auth/session-terminal'
import {
  evaluarInactividad,
  hayCierrePorInactividad,
  registrarActividad,
  limpiarActividad,
  topeDeInactividadMs,
  ultimaActividad,
  AVISO_MS,
} from '@/lib/auth/idle-timeout'

/**
 * Cada cuánto se revisa el reloj. No define la precisión del cierre —eso lo da
 * la resta de timestamps— sólo cada cuánto se refresca el número en pantalla.
 */
const PERIODO_DE_CHEQUEO_MS = 1000

/**
 * Tope para la revocación en el servidor.
 *
 * Se espera —no es fire-and-forget— porque es la parte que de verdad invalida
 * el token: cerrar antes de que responda dejaría el token vivo, que es
 * exactamente lo que esto viene a evitar. Pero se espera CON tope: si el
 * backend está caído, el usuario igual tiene que salir.
 */
const TOPE_DE_REVOCACION_MS = 2500

/**
 * Los eventos que cuentan como "el usuario está acá".
 *
 * `mousemove` NO está en la lista a propósito: un mouse apoyado en una mesa que
 * tiembla, o cualquier extensión que mueva el cursor, mantendría la sesión viva
 * para siempre y la función no serviría para nada. Se piden actos deliberados.
 */
const EVENTOS_DE_ACTIVIDAD = [
  'pointerdown',
  'keydown',
  'scroll',
  'wheel',
  'touchstart',
] as const

export function IdleSessionGuard() {
  const { isAuthenticated } = useAuth()
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null)
  const [cerrando, setCerrando] = useState(false)

  const activo = isAuthenticated && hayCierrePorInactividad()

  // El aviso en un ref además del estado: los listeners se registran una sola
  // vez y leerían un `segundosRestantes` congelado en su closure.
  const enAvisoRef = useRef(false)
  const cerrandoRef = useRef(false)

  /**
   * Cierre por inactividad: revocar y recién después salir.
   *
   * El orden importa y es contraintuitivo. `terminarSesion` levanta la bandera
   * que hace que apiClient corte TODA petición nueva sin salir a la red — o sea
   * que una revocación disparada después no llegaría nunca. Y el token hay que
   * pasarlo explícito porque el cierre limpia el que está en memoria.
   */
  const cerrarPorInactividad = useCallback(async () => {
    if (cerrandoRef.current) return
    cerrandoRef.current = true
    setCerrando(true)

    const token = getAccessToken() ?? undefined
    if (token) {
      await Promise.race([
        revokeSession(token).catch(() => {
          // Un backend caído no puede dejar al usuario adentro. Se pierde la
          // invalidación del token, no la salida.
        }),
        new Promise((resolve) => setTimeout(resolve, TOPE_DE_REVOCACION_MS)),
      ])
    }

    limpiarActividad()
    terminarSesion('inactividad')
  }, [])

  /** «Continuar»: corre la marca y saca el aviso, también en las otras pestañas. */
  const continuar = useCallback(() => {
    registrarActividad(true)
    enAvisoRef.current = false
    setSegundosRestantes(null)
  }, [])

  // ── Marcar actividad ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!activo) return

    // Entrar a la app YA es actividad: sin esta marca inicial, una pestaña
    // recién abierta heredaría la inactividad de la sesión anterior.
    registrarActividad(true)

    const alHaberActividad = () => {
      // Con el aviso en pantalla sólo vale el botón. Si un scroll accidental lo
      // cancelara, el usuario nunca se enteraría de que estuvo por salir — y el
      // cartel aparecería y desaparecería sin que entienda por qué.
      if (enAvisoRef.current || cerrandoRef.current) return
      registrarActividad()
    }

    EVENTOS_DE_ACTIVIDAD.forEach((evento) =>
      window.addEventListener(evento, alHaberActividad, { passive: true }),
    )
    return () => {
      EVENTOS_DE_ACTIVIDAD.forEach((evento) =>
        window.removeEventListener(evento, alHaberActividad),
      )
    }
  }, [activo])

  // ── El reloj ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activo) return

    const topeMs = topeDeInactividadMs()

    const revisar = () => {
      if (cerrandoRef.current) return

      const estado = evaluarInactividad(
        Date.now(),
        ultimaActividad(),
        topeMs,
        AVISO_MS,
      )

      if (estado.fase === 'vencida') {
        void cerrarPorInactividad()
        return
      }
      if (estado.fase === 'aviso') {
        enAvisoRef.current = true
        setSegundosRestantes(estado.segundosRestantes)
        return
      }
      // Volvió a haber actividad (típicamente desde OTRA pestaña): se retira el
      // aviso sin que este usuario haya tocado nada acá.
      if (enAvisoRef.current) {
        enAvisoRef.current = false
        setSegundosRestantes(null)
      }
    }

    revisar()
    const id = setInterval(revisar, PERIODO_DE_CHEQUEO_MS)
    return () => clearInterval(id)
  }, [activo, cerrarPorInactividad])

  // Al desmontar (logout voluntario, cambio de cuenta) se olvida la marca para
  // que la sesión siguiente no arranque contando la inactividad de la anterior.
  useEffect(() => {
    if (activo) return
    enAvisoRef.current = false
    cerrandoRef.current = false
    setSegundosRestantes(null)
    setCerrando(false)
    limpiarActividad()
  }, [activo])

  if (segundosRestantes === null) return null

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-title"
      aria-describedby="idle-desc"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      data-lenis-prevent
    >
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-center shadow-xl">
        <h2 id="idle-title" className="text-lg font-semibold text-fg">
          ¿Sigues ahí?
        </h2>
        <p id="idle-desc" className="mt-2 text-sm text-fg-muted">
          Por seguridad vamos a cerrar tu sesión por inactividad.
        </p>

        {/* aria-live para que un lector de pantalla anuncie la cuenta regresiva
            sin que el usuario tenga que ir a buscarla. */}
        <p
          className="mt-4 text-4xl font-semibold tabular-nums text-fg"
          aria-live="assertive"
        >
          {segundosRestantes}
        </p>
        <p className="mt-1 text-xs text-fg-subtle">segundos</p>

        {/*
          El `Button` de la casa, no un `<button>` con grises a mano (Nico,
          2026-09-09: «el CTA es negro y debe ser azul primary, conectado todo
          con cadence»).

          No era sólo el botón: la tarjeta entera estaba escrita con
          `bg-white` / `text-neutral-900` y su pareja `dark:`, o sea que en
          modo oscuro se pintaba a mano lo que los tokens ya resuelven, y el
          único botón que la persona ve cuando su sesión está por morir se veía
          como un secundario cualquiera.
        */}
        <Button
          type="button"
          onClick={continuar}
          disabled={cerrando}
          isLoading={cerrando}
          autoFocus
          hideArrow
          className="mt-5 w-full"
        >
          {cerrando ? 'Cerrando sesión…' : 'Continuar'}
        </Button>
      </div>
    </div>
  )
}
