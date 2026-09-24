'use client'

/**
 * PanelPrefsContext — el «ya lo vio» de las bienvenidas de primera vez del
 * panel de la inmobiliaria: el recorrido guiado (`TourDelPanel`) y la
 * presentación de cada agente de IA (`AgentIntroModal`).
 *
 * ── La regla (Nico, 23-09, manda) ─────────────────────────────────────────
 *
 * «El onboarding solo debe aparecer una sola vez por inmobiliaria: si le da
 * omitir no vuelve a aparecer y si lo ve completo no vuelve a aparecer.»
 *
 *   · La unidad es la INMOBILIARIA: si cualquier persona de la agencia la
 *     omite o la termina, no le vuelve a salir sola a nadie de esa agencia, en
 *     ningún navegador ni dispositivo.
 *   · Omitir, la ✕ o Esc → `omitido`; llegar al final → `completo`. El back
 *     guarda cuál fue, quién y cuándo, y la primera gana.
 *   · «Ver el recorrido ahora» (Configuración → Preferencias) sigue: lo pide
 *     la persona, dura sólo esta sesión y no cambia el «visto» de la agencia.
 *   · 🔴 Mientras no se sepa la respuesta del servidor, NO se muestra. Nada de
 *     un recorrido que arranca y después se cierra.
 *
 * ── Por qué reaparecía (medido el 23-09) ──────────────────────────────────
 *
 * La versión anterior guardaba en localStorage (por navegador) y hacía PATCH
 * a una preferencia POR MIEMBRO del micro (`agent.agency_members`, donde
 * muchos roles del ERP ni están, así que fallaba), pero LEÍA de `/users/me`
 * del back —las preferencias de búsqueda del inquilino—, que nunca trae la
 * marca: el servidor decía siempre «no visto». Y sin localStorage el estado
 * pasaba a `false` al montar, así que el recorrido arrancaba ANTES de
 * preguntarle a nadie. Otro navegador, otra persona o un localStorage borrado
 * = el recorrido otra vez.
 *
 * Ahora se escribe y se lee el MISMO recurso: `GET/PUT
 * /inmobiliaria/onboarding-visto` del back (`onboarding-visto.service.ts`).
 *
 * ── Tres estados ──────────────────────────────────────────────────────────
 *
 *   `null`  → no se sabe todavía (cargando, falló, o el back no tiene la
 *             migración). NO se muestra.
 *   `true`  → la inmobiliaria ya la vio. NO se muestra.
 *   `false` → la inmobiliaria no la ha visto: se muestra, una vez.
 *
 * localStorage es sólo una CACHÉ de `true`, por agencia y clave, para no
 * esperar al servidor cuando ya se sabe. Si la caché dice «visto» y el
 * servidor no lo tiene (el PUT se cayó, se cerró la pestaña a mitad), se le
 * vuelve a mandar al servidor: lo que la persona cerró, cerrado queda.
 */

import * as React from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/lib/auth'
import {
  CLAVE_DEL_RECORRIDO_DEL_PANEL,
  onboardingVistoApi,
  type EstadoDelOnboarding,
  type OnboardingVisto,
} from '@/lib/api/onboarding-visto.service'

void React

/** Prefijo de la caché local de «visto». Lleva la agencia: un navegador puede entrar a varias. */
export const PREFIJO_DE_LA_CACHE = 'leasefy:onboarding-visto:v2:'

/**
 * La clave de la versión anterior (por navegador, sin agencia). Si está en
 * `true`, esta persona ya cerró el recorrido en este navegador: se toma como
 * «visto» de la agencia en la que está y se sube al servidor, para que el
 * arreglo no le muestre el recorrido una vez más a quien ya lo había cerrado.
 */
export const CLAVE_DE_LA_VERSION_ANTERIOR = 'leasefy_panel_tour_dismissed_v1'

/**
 * Cuánto esperar antes de volver a preguntar si la lectura FALLA (no si dice
 * `disponible: false`, que es una respuesta). Se agota rápido a propósito:
 * es para la carrera del token recién renovado, no para un back caído.
 */
export const ESPERAS_PARA_VOLVER_A_LEER_MS = [1500, 4000, 10000]

function claveDeCache(agencyId: string, clave: string): string {
  return `${PREFIJO_DE_LA_CACHE}${agencyId}:${clave}`
}

function esEstado(v: unknown): v is EstadoDelOnboarding {
  return v === 'completo' || v === 'omitido'
}

/** Lo que la caché dice que esta agencia ya vio, en este navegador. */
function leerCache(agencyId: string): Record<string, EstadoDelOnboarding> {
  const vistas: Record<string, EstadoDelOnboarding> = {}
  if (typeof window === 'undefined') return vistas
  try {
    const prefijo = `${PREFIJO_DE_LA_CACHE}${agencyId}:`
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (!k || !k.startsWith(prefijo)) continue
      const v = window.localStorage.getItem(k)
      if (esEstado(v)) vistas[k.slice(prefijo.length)] = v
    }
    if (
      !vistas[CLAVE_DEL_RECORRIDO_DEL_PANEL] &&
      window.localStorage.getItem(CLAVE_DE_LA_VERSION_ANTERIOR) === 'true'
    ) {
      vistas[CLAVE_DEL_RECORRIDO_DEL_PANEL] = 'omitido'
    }
  } catch {
    // Sin almacenamiento (modo privado): sólo manda el servidor.
  }
  return vistas
}

function guardarCache(agencyId: string, clave: string, estado: EstadoDelOnboarding): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(claveDeCache(agencyId, clave), estado)
  } catch {
    // Non-fatal: el servidor es el que manda.
  }
}

function olvidarVersionAnterior(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(CLAVE_DE_LA_VERSION_ANTERIOR)
  } catch {
    // Non-fatal.
  }
}

export interface PanelPrefsContextValue {
  /**
   * ¿El recorrido del panel ya lo vio la inmobiliaria?
   * `null` = no se sabe (no se muestra) · `true` = visto · `false` = mostrarlo.
   * Tras «Ver el recorrido ahora» vale `false` hasta que se cierre.
   */
  tourDismissed: boolean | null
  /**
   * Cierra el recorrido: `omitido` (Omitir, la ✕, Esc) o `completo` (llegó
   * al final). Queda visto para TODA la inmobiliaria.
   */
  cerrarRecorrido: (estado: EstadoDelOnboarding) => Promise<void>
  /**
   * «Ver el recorrido ahora»: sólo esta sesión, sin tocar el «visto» de la
   * agencia.
   */
  relaunchTour: () => void
  /** Lo que guardó el back del recorrido (quién y cuándo), si ya se vio. */
  vistaDelRecorrido: OnboardingVisto | null
  /** El mismo contrato de tres estados, para cualquier otra bienvenida (`agente:<id>`). */
  estaVista: (clave: string) => boolean | null
  /** La marca, para cualquier otra bienvenida. Idempotente; la primera gana. */
  marcarVista: (clave: string, estado: EstadoDelOnboarding) => Promise<void>
}

const PanelPrefsContext = createContext<PanelPrefsContextValue | null>(null)

interface ProviderProps {
  children: ReactNode
}

export function PanelPrefsProvider({ children }: ProviderProps) {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  /** Lo que dice el servidor. `null` = no se sabe. */
  const [delServidor, setDelServidor] = useState<Record<string, OnboardingVisto> | null>(null)
  /** Lo que ya se sabe visto sin esperar al servidor: la caché y lo cerrado en esta sesión. */
  const [locales, setLocales] = useState<Record<string, EstadoDelOnboarding>>({})
  const [relanzado, setRelanzado] = useState(false)
  /**
   * «Ver el recorrido ahora» también vuelve a presentar a cada agente de IA
   * UNA vez en esta sesión (antes lo hacía borrando su marca del navegador,
   * `resetAgentIntros`). `null` = no se pidió; el conjunto guarda las
   * presentaciones que ya se volvieron a ver desde que se pidió.
   */
  const [repuestas, setRepuestas] = useState<ReadonlySet<string> | null>(null)
  // Espejo para `marcarVista`, que no debe re-crearse con cada respuesta.
  const delServidorRef = useRef(delServidor)
  delServidorRef.current = delServidor

  useEffect(() => {
    setDelServidor(null)
    setRelanzado(false)
    setRepuestas(null)
    if (!agencyId) {
      setLocales({})
      return
    }
    const cache = leerCache(agencyId)
    setLocales(cache)

    let vigente = true
    let intento = 0
    let reintento: ReturnType<typeof setTimeout> | undefined
    const leer = () =>
      onboardingVistoApi
        .leer()
        .then((lectura) => {
          if (!vigente) return
          // Sin la migración el back no sabe: se queda en «no se sabe» y no
          // se muestra nada solo (salvo lo que la caché ya daba por visto).
          if (!lectura?.disponible || !Array.isArray(lectura.vistas)) return
          const vistas: Record<string, OnboardingVisto> = {}
          for (const v of lectura.vistas) {
            vistas[v.clave] = v
            guardarCache(agencyId, v.clave, v.estado)
          }
          setDelServidor(vistas)
          // Lo que este navegador cerró y el servidor no tiene, se le sube.
          for (const [clave, estado] of Object.entries(cache)) {
            if (vistas[clave]) continue
            onboardingVistoApi
              .marcar(clave, estado)
              .then((r) => {
                if (!vigente) return
                guardarCache(agencyId, clave, estado)
                if (clave === CLAVE_DEL_RECORRIDO_DEL_PANEL) olvidarVersionAnterior()
                setDelServidor((prev) => (prev ? { ...prev, [clave]: r } : prev))
              })
              .catch(() => {
                // Se reintenta en la próxima carga; la caché lo sostiene acá.
              })
          }
          if (vistas[CLAVE_DEL_RECORRIDO_DEL_PANEL]) olvidarVersionAnterior()
        })
        .catch(() => {
          // No se sabe: no se muestra. Nada de adivinar «no visto».
          //
          // Pero se vuelve a preguntar, pocas veces: un fallo suelto (la red,
          // el token que se está renovando) no puede costar el recorrido de
          // toda la sesión.
          //
          // ⚠️ Medido en el navegador de QA (23-09): recién pasado el segundo
          // factor, TODO el panel —pipeline, consignaciones, agentes y esta
          // lectura— respondió 403 `SEGUNDO_FACTOR_REQUERIDO` hasta recargar.
          // Eso es de la sesión, no de esto, y los reintentos no lo cubren:
          // mientras dure, el recorrido espera (no se muestra sin saber) y sale
          // en la siguiente carga.
          if (!vigente) return
          const espera = ESPERAS_PARA_VOLVER_A_LEER_MS[intento++]
          if (espera != null) reintento = setTimeout(() => void leer(), espera)
        })
    void leer()
    return () => {
      vigente = false
      if (reintento) clearTimeout(reintento)
    }
  }, [agencyId])

  const estaVista = useCallback(
    (clave: string): boolean | null => {
      if (repuestas && clave !== CLAVE_DEL_RECORRIDO_DEL_PANEL && !repuestas.has(clave)) {
        return false
      }
      if (locales[clave]) return true
      if (delServidor === null) return null
      return delServidor[clave] != null
    },
    [locales, delServidor, repuestas],
  )

  const marcarVista = useCallback(
    async (clave: string, estado: EstadoDelOnboarding) => {
      // Visto YA, en esta pantalla y en este navegador: no espera la red.
      setLocales((prev) => (prev[clave] ? prev : { ...prev, [clave]: estado }))
      setRepuestas((prev) => (prev && !prev.has(clave) ? new Set(prev).add(clave) : prev))
      if (!agencyId) return
      guardarCache(agencyId, clave, estado)
      // Ya estaba en el servidor (volver a verlo a mano): no se reescribe
      // nada, la agencia ya lo tiene visto por la primera persona.
      if (delServidorRef.current?.[clave]) return
      try {
        const r = await onboardingVistoApi.marcar(clave, estado)
        if (clave === CLAVE_DEL_RECORRIDO_DEL_PANEL) olvidarVersionAnterior()
        setDelServidor((prev) => (prev ? { ...prev, [clave]: r } : prev))
      } catch (err) {
        // La caché lo sostiene en este navegador y se reintenta en la próxima
        // carga (ver el efecto de arriba).
        console.warn('[PanelPrefsContext] no se pudo guardar la bienvenida vista:', err)
      }
    },
    [agencyId],
  )

  const cerrarRecorrido = useCallback(
    async (estado: EstadoDelOnboarding) => {
      setRelanzado(false)
      await marcarVista(CLAVE_DEL_RECORRIDO_DEL_PANEL, estado)
    },
    [marcarVista],
  )

  const relaunchTour = useCallback(() => {
    // Sólo en memoria: ni caché ni servidor. Lo pidió la persona.
    setRelanzado(true)
    setRepuestas(new Set())
  }, [])

  const tourDismissed = relanzado ? false : estaVista(CLAVE_DEL_RECORRIDO_DEL_PANEL)
  const vistaDelRecorrido = delServidor?.[CLAVE_DEL_RECORRIDO_DEL_PANEL] ?? null

  const value = useMemo<PanelPrefsContextValue>(
    () => ({
      tourDismissed,
      cerrarRecorrido,
      relaunchTour,
      vistaDelRecorrido,
      estaVista,
      marcarVista,
    }),
    [tourDismissed, cerrarRecorrido, relaunchTour, vistaDelRecorrido, estaVista, marcarVista],
  )

  return (
    <PanelPrefsContext.Provider value={value}>
      {children}
    </PanelPrefsContext.Provider>
  )
}

/** Throws if used outside the provider. */
export function usePanelPrefs(): PanelPrefsContextValue {
  const ctx = useContext(PanelPrefsContext)
  if (!ctx) {
    throw new Error('usePanelPrefs must be used inside <PanelPrefsProvider>')
  }
  return ctx
}

/**
 * Safe variant — returns null outside the provider. Used by PlanHeader which
 * renders across multiple layouts (only the inmobiliaria layout mounts the
 * provider).
 */
export function usePanelPrefsSafe(): PanelPrefsContextValue | null {
  return useContext(PanelPrefsContext)
}
