'use client'

/**
 * El momento en que la inmobiliaria queda creada.
 *
 * Nico (30-09-2026): «cuando uno le da finalizar onboarding antes había algo
 * que salía confeti celebrando que creó la cuenta y ya si luego pasaba al
 * home, eso dónde quedó?». Quedó en `OnboardingSuccess`, que el asistente
 * nuevo dejó de usar: al terminar se iba al panel sin decir nada.
 *
 * Las reglas son las de `BienvenidaALeasefy` (la del final de la migración):
 *   1. Se muestra UNA vez, en la transición: vive en el estado de
 *      `CompleteStepForm` y no se persiste. Quien recarga ya está en el panel.
 *   2. Un solo botón, y lo aprieta la persona. Nada de cuenta regresiva.
 *   3. El confeti respeta `prefers-reduced-motion`.
 *
 * Va por portal a `document.body`: el `transform` de la transición de página
 * vuelve «contenedor» a cualquier `fixed` descendiente (DESIGN.md §19), y la
 * cabecera del asistente («Salir del registro») no tiene nada que hacer
 * encima de una inmobiliaria ya creada.
 */

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, SealCheck } from '@phosphor-icons/react'
import confetti from 'canvas-confetti'

import { Button } from '@/components/ui/button'
import { useLenis } from '@/components/providers/SmoothScroll'

/**
 * Los colores del confeti salen de los TOKENS, no de hex escritos acá: se
 * pinta un elemento con cada clase y se lee el color que resolvió el CSS. El
 * canvas no entiende `var(--primary)` y `canvas-confetti` sólo acepta hex.
 */
const CLASES_DEL_CONFETI = ['bg-primary', 'bg-blue-300', 'bg-blue-200', 'bg-fg', 'bg-border']

function rgbAHex(color: string): string | null {
  const m = color.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i)
  if (!m) return /^#[0-9a-f]{6}$/i.test(color) ? color : null
  return `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`
}

export function coloresDelConfeti(): string[] {
  if (typeof document === 'undefined') return []
  const sonda = document.createElement('span')
  sonda.style.position = 'absolute'
  sonda.style.visibility = 'hidden'
  document.body.appendChild(sonda)
  const colores: string[] = []
  for (const clase of CLASES_DEL_CONFETI) {
    sonda.className = clase
    const leido = getComputedStyle(sonda).backgroundColor
    // Transparente (`rgba(0, 0, 0, 0)`) = la clase no resolvió: no se usa.
    if (!leido || /rgba\([^)]*,\s*0\)/.test(leido) || leido === 'transparent') continue
    const hex = rgbAHex(leido)
    if (hex) colores.push(hex)
  }
  sonda.remove()
  return colores
}

export interface InmobiliariaCreadaProps {
  /** La razón social que cargó en el asistente; sin ella se celebra igual. */
  nombre: string | null
  /** El único botón: al panel, donde sigue la migración. */
  onIrAlPanel: () => void
  /** Ya lo apretó: la sesión se refresca y se navega. */
  yendo: boolean
}

export function InmobiliariaCreada({ nombre, onIrAlPanel, yendo }: InmobiliariaCreadaProps) {
  const sinMovimiento = useReducedMotion()
  const lenis = useLenis()
  const titulo = useId()
  const descripcion = useId()
  const botonRef = useRef<HTMLButtonElement>(null)
  const [montado, setMontado] = useState(false)

  useEffect(() => setMontado(true), [])

  // La página de atrás no se mueve mientras esto está encima.
  useEffect(() => {
    lenis?.stop()
    return () => lenis?.start()
  }, [lenis])

  useEffect(() => {
    if (!montado) return
    botonRef.current?.focus()
  }, [montado])

  useEffect(() => {
    if (!montado || sinMovimiento) return
    const colores = coloresDelConfeti()
    // Dos cañones desde abajo, dos segundos y medio, cada vez con menos: el
    // mismo gesto que la bienvenida de la migración.
    const dura = 2500
    const fin = Date.now() + dura
    const disparar = () => {
      const queda = fin - Date.now()
      if (queda <= 0) return
      const cantidad = Math.round(55 * (queda / dura))
      for (const x of [0.15, 0.85]) {
        confetti({
          particleCount: cantidad,
          startVelocity: 38,
          spread: 70,
          angle: x < 0.5 ? 60 : 120,
          origin: { x, y: 0.9 },
          ...(colores.length > 0 ? { colors: colores } : {}),
          ticks: 220,
          zIndex: 80,
          disableForReducedMotion: true,
        })
      }
    }
    disparar()
    const cada = setInterval(disparar, 320)
    return () => {
      clearInterval(cada)
      confetti.reset()
    }
  }, [montado, sinMovimiento])

  if (!montado) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titulo}
      aria-describedby={descripcion}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-bg p-6"
      data-testid="inmobiliaria-creada"
      data-lenis-prevent
      // Un solo control: el foco no se escapa a la página de atrás.
      onKeyDown={(e) => {
        if (e.key === 'Tab') {
          e.preventDefault()
          botonRef.current?.focus()
        }
      }}
    >
      <motion.div
        initial={sinMovimiento ? false : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md text-center"
      >
        <motion.div
          initial={sinMovimiento ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 18 }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft"
        >
          <SealCheck className="h-10 w-10 text-primary" weight="fill" aria-hidden="true" />
        </motion.div>

        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
          Registro completo
        </p>
        <h1
          id={titulo}
          className="mt-2 text-balance text-3xl font-semibold tracking-tight text-fg"
        >
          Tu inmobiliaria quedó creada
        </h1>
        <div id={descripcion} className="mx-auto mt-3 max-w-sm space-y-2 text-pretty text-body-sm text-fg-muted">
          {nombre ? (
            <p>
              <span className="font-medium text-fg" data-testid="inmobiliaria-creada-nombre">
                {nombre}
              </span>{' '}
              ya tiene su espacio en Leasefy.
            </p>
          ) : null}
          <p>En tu panel te guiamos para traer tu operación: propietarios, inmuebles, contratos y pagos.</p>
        </div>

        <motion.div
          initial={sinMovimiento ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8"
        >
          <Button
            ref={botonRef}
            size="lg"
            hideArrow
            onClick={onIrAlPanel}
            disabled={yendo}
            isLoading={yendo}
            data-testid="inmobiliaria-creada-ir-al-panel"
          >
            {yendo ? 'Entrando a tu panel…' : 'Ir a mi panel'}
            {yendo ? null : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </motion.div>
      </motion.div>
    </div>,
    document.body,
  )
}
