'use client'

/**
 * PilotoNovedad — la presentación del Piloto automático, la primera vez.
 *
 * Nico (30-09): «quizás cuando entren puedan ver con un modal de esos donde
 * mostramos nuevo feature y explicamos qué hace esto». Es el patrón §Novedades
 * del sistema de diseño (`FeatureAnnouncement` de cadence), el mismo que
 * presenta a cada agente al entrar a su espacio (`AgentIntroModal`): tres
 * pasos cortos y «Entendido».
 *
 * ── Una vez por PERSONA, guardado en el servidor ──────────────────────────
 * El «ya la vi» usa el mismo mecanismo que el recorrido del panel y las
 * presentaciones de los agentes (`PanelPrefsContext` →
 * `/inmobiliaria/onboarding-visto`), no `localStorage`: otro navegador u otro
 * computador ya la saben vista. Ese recurso guarda por INMOBILIARIA, así que la
 * clave lleva el id de la persona (`novedad:piloto:<usuario>`): cada miembro
 * del equipo la ve una vez, porque cada uno necesita entender su Inicio. Sin
 * id de usuario, cae a la clave de la agencia.
 *
 *   · «Entendido» la deja `completo`; Esc, el fondo o la ✕, `omitido`.
 *   · Mientras no se sabe si ya la vio (`estaVista` → `null`) no sale.
 *   · Se vuelve a ver desde «¿Cómo funciona?» (`forzada`), sin tocar la marca.
 *
 * ── Nunca encima de otra bienvenida (coordinación, 30-09) ────────────────
 * El Inicio es donde también abre el recorrido del panel, y el orden de Nico
 * para una cuenta nueva es: migración → segundo factor → recorrido. Esto va
 * DESPUÉS de todo eso, y nunca a la vez:
 *   · Mientras el recorrido no se ha visto o no se sabe (`tourDismissed`
 *     `false` o `null`), espera.
 *   · Si el recorrido se vio en ESTA sesión, no sale hasta la próxima: el
 *     recorrido ya presentó la píldora y los modos (`tour.pasos.piloto`), y
 *     encadenar dos bienvenidas es lo más intrusivo. Sin marcar nada: la
 *     próxima vez que entre al Inicio, la ve.
 *   · Si hay una capa encima —el muro de migración, la bienvenida a Leasefy,
 *     o cualquier diálogo abierto— espera a que caiga, igual que el
 *     recorrido (`CAPAS_QUE_BLOQUEAN` en `pasos-del-tour.ts`). Las pantallas
 *     del segundo factor son otra ruta: el Inicio ni está montado.
 *
 * A11y: `Dialog` de Radix — foco atrapado y devuelto al cerrar, Esc, título y
 * descripción anunciados.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Robot, SlidersHorizontal, Tray, X } from '@phosphor-icons/react'
import { FeatureAnnouncement } from '@leasefy/cadence'

import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { usePanelPrefsSafe } from '@/lib/context/PanelPrefsContext'
import { ASPA_DE_CIERRE } from '@/components/ui/aspa-de-cierre'
import type { EstadoDelOnboarding } from '@/lib/api/onboarding-visto.service'
import { claveDeLaNovedadDelPiloto } from './como-funciona'

const NS = 'inmobiliaria.piloto.novedad'

/** El mismo respiro que la presentación de los agentes: que la pantalla pinte primero. */
const ESPERA_AL_ENTRAR_MS = 600
/** Cada cuánto se vuelve a mirar si la capa de encima ya cayó. */
const LATIDO_MS = 1000

/**
 * Las capas que tapan el Inicio. Las mismas familias que frenan el recorrido
 * (`CAPAS_QUE_BLOQUEAN`), escritas acá para no atarse al archivo del
 * recorrido, que se está rediseñando aparte. La primera es la más confiable:
 * el muro deja todo el panel `inert` y `aria-hidden` mientras tapa (también
 * durante la bienvenida a Leasefy), y un diálogo de Radix abierto esconde a
 * sus hermanos con `aria-hidden`.
 */
const CAPAS_ENCIMA = [
  '[inert] [data-testid="piloto-page"]',
  '[aria-hidden="true"] [data-testid="piloto-page"]',
  '[data-testid="muro-migracion"]',
  '[data-testid="bienvenida-a-leasefy"]',
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
]

export function hayUnaCapaEncima(doc: Pick<Document, 'querySelector'> = document): boolean {
  return CAPAS_ENCIMA.some((sel) => {
    try {
      return doc.querySelector(sel) !== null
    } catch {
      return false
    }
  })
}

/**
 * ¿Se vio el recorrido en esta sesión? A nivel de módulo, no de componente:
 * sobrevive a ir y volver del Inicio sin recargar, y se olvida al recargar.
 * `tourDismissed === false` es la única señal de que el recorrido estuvo
 * (o está) en pantalla; `null` es «todavía no se sabe» en cada carga.
 */
let recorridoEnEstaSesion = false

/** Sólo para las pruebas. */
export function olvidarRecorridoDeEstaSesion(): void {
  recorridoEnEstaSesion = false
}

export interface PilotoNovedadProps {
  /** Abierta a mano desde «¿Cómo funciona?», aunque ya se haya visto. */
  forzada?: boolean
  /** Se cerró la que se abrió a mano. */
  onCerrarForzada?: () => void
}

export function PilotoNovedad({ forzada = false, onCerrarForzada }: PilotoNovedadProps) {
  const { t } = useI18n()
  const { user } = useAuth()
  const prefs = usePanelPrefsSafe()
  const clave = claveDeLaNovedadDelPiloto(user?.id)
  // null = no se sabe (o no hay provider): no se muestra sola.
  const vista = prefs ? prefs.estaVista(clave) : null
  const tourDismissed = prefs?.tourDismissed ?? null
  // Se anota en un efecto, no durante el render. Mientras el recorrido está
  // en `false` la novedad no puede salir de todos modos, así que el efecto
  // siempre corre antes de que `tourDismissed` pase a `true`.
  useEffect(() => {
    if (tourDismissed === false) recorridoEnEstaSesion = true
  }, [tourDismissed])
  const puedeSalirSola = vista === false && tourDismissed === true && !recorridoEnEstaSesion

  const [sola, setSola] = useState(false)

  useEffect(() => {
    if (!puedeSalirSola) {
      setSola(false)
      return
    }
    let timer = 0
    const intentar = () => {
      if (hayUnaCapaEncima()) {
        timer = window.setTimeout(intentar, LATIDO_MS)
        return
      }
      setSola(true)
    }
    timer = window.setTimeout(intentar, ESPERA_AL_ENTRAR_MS)
    return () => window.clearTimeout(timer)
  }, [puedeSalirSola])

  const abierta = forzada || sola

  /**
   * Abierta desde «¿Cómo funciona?», el botón que la pidió ya no existe (ese
   * modal se cerró para abrir éste) y Radix devolvía el foco al `body`: quien
   * navega con teclado quedaba al principio de la página. Se recuerda de dónde
   * vino para devolverlo al botón «¿Cómo funciona?».
   */
  const vinoDeLaExplicacion = useRef(false)
  useEffect(() => {
    if (forzada) vinoDeLaExplicacion.current = true
  }, [forzada])
  const devolverElFoco = useCallback((e: Event) => {
    if (!vinoDeLaExplicacion.current) return
    vinoDeLaExplicacion.current = false
    const boton = document.querySelector('[data-testid="piloto-que-es"] [data-testid="para-entender-mas"]')
    if (boton instanceof HTMLElement) {
      e.preventDefault()
      boton.focus()
    }
  }, [])

  const cerrar = useCallback(
    (estado: EstadoDelOnboarding) => {
      // La marca se escribe una sola vez: volver a verla a mano no la pisa.
      if (vista === false && prefs) void prefs.marcarVista(clave, estado)
      setSola(false)
      if (forzada) onCerrarForzada?.()
    },
    [vista, prefs, clave, forzada, onCerrarForzada],
  )

  const titulo = t(`${NS}.titulo`)
  const descripcion = t(`${NS}.descripcion`)

  return (
    <DialogPrimitive.Root open={abierta} onOpenChange={(o) => !o && cerrar('omitido')}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[300] bg-black/60 motion-safe:animate-in motion-safe:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-[300] max-h-[90dvh] w-[calc(100vw-2rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-[20px] outline-none motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"
          data-lenis-prevent
          data-testid="piloto-novedad"
          onCloseAutoFocus={devolverElFoco}
        >
          <DialogPrimitive.Title className="sr-only">{titulo}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">{descripcion}</DialogPrimitive.Description>
          <FeatureAnnouncement
            appName="Leasefy"
            appInitial="L"
            title={titulo}
            description={descripcion}
            items={[
              {
                icon: <Robot weight="duotone" aria-hidden="true" />,
                title: t(`${NS}.paso1.titulo`),
                description: t(`${NS}.paso1.texto`),
              },
              {
                icon: <Tray weight="duotone" aria-hidden="true" />,
                title: t(`${NS}.paso2.titulo`),
                description: t(`${NS}.paso2.texto`),
              },
              {
                icon: <SlidersHorizontal weight="duotone" aria-hidden="true" />,
                title: t(`${NS}.paso3.titulo`),
                description: t(`${NS}.paso3.texto`),
              },
            ]}
            ctaLabel={t(`${NS}.cta`)}
            onCta={() => cerrar('completo')}
            className="w-full"
          />
          <DialogPrimitive.Close
            aria-label={t('common.close')}
            className={`${ASPA_DE_CIERRE} absolute right-3 top-3`}
            data-testid="piloto-novedad-cerrar"
          >
            <X size={16} weight="bold" aria-hidden="true" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
