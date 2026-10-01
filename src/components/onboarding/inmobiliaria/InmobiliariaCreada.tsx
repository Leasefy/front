'use client'

/**
 * El momento en que la inmobiliaria queda creada.
 *
 * Nico (30-09-2026): «cuando uno le da finalizar onboarding antes había algo
 * que salía confeti celebrando que creó la cuenta y ya si luego pasaba al
 * home, eso dónde quedó?». Volvió como un check azul con confeti. Esa misma
 * noche (7:32 p. m.) pidió más: «en vez de ese ícono, haz algo más wow, que se
 * sienta que somos inteligentes, quizás un fondo así bien top con ruido de los
 * gradientes que tenemos que se mueve y entra y se va con una animación bien
 * top, y colocas ahí mejor el logo de Leasefy … y cuando se acaba este se va
 * solo al panel para evitar que dé clic clic clic».
 *
 * ── La puesta en escena (≈ 5 s) ────────────────────────────────────────────
 *
 *   0,0 s  La aurora de la marca (`AuroraDeMarca`: el degradado con grano de
 *          las portadas de los correos) se abre en círculo desde donde va el
 *          logo, y se asienta (escala 1,18 → 1).
 *   0,35 s El logo de Leasefy se DIBUJA: primero el contorno, después el
 *          rayado de la marca (las rayas del cuadro del login) lo barre de
 *          izquierda a derecha, y al final queda macizo en blanco.
 *   1,15 s Una sola chispa de luz sale del logo: el confeti de antes, pero
 *          integrado al fondo (blanco, crema y cielo, puntos chicos, poca
 *          gravedad). El confeti azul y gris sobre un fondo azul competía.
 *   0,95 s El texto entra escalonado. Mientras se lee, la aurora se mueve, el
 *          grano titila y el halo del logo respira.
 *   4,3 s  Sale: el texto y el logo se van hacia arriba, la aurora se disuelve
 *          en el fondo de la app, y en ese mismo instante se llama a
 *          `onIrAlPanel` (refresca la sesión y navega: el arreglo del 07-09
 *          vive en `CompleteStepForm.irAlPanel` y no se toca acá).
 *
 * ── Reglas ─────────────────────────────────────────────────────────────────
 *
 *   1. Se muestra UNA vez, en la transición: vive en el estado de
 *      `CompleteStepForm` y no se persiste. Quien recarga ya está en el panel.
 *   2. Se va sola, UNA vez. «Ir ahora» adelanta la salida; el temporizador y
 *      el botón pasan por la misma puerta (`salir`), que sólo abre una vez:
 *      nunca dos navegaciones. Sin cuenta regresiva numérica.
 *   3. `prefers-reduced-motion`: la misma composición quieta, sin dibujo, sin
 *      chispa y sin aurora en movimiento; el texto está desde el principio y
 *      también se va sola al mismo tiempo.
 *   4. Si la navegación tarda (el refresco de la sesión es una llamada de
 *      red), queda el fondo de la app con «Entrando a tu panel…»: nunca un
 *      hueco mudo.
 *
 * Va por portal a `document.body`: el `transform` de la transición de página
 * vuelve «contenedor» a cualquier `fixed` descendiente (DESIGN.md §19), y la
 * cabecera del asistente («Salir del registro») no tiene nada que hacer
 * encima de una inmobiliaria ya creada.
 */

import { useCallback, useEffect, useId, useRef, useState, type Ref } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import confetti from 'canvas-confetti'

import { CargaDeMarca } from '@/components/ui/carga-de-marca'
import { useLenis } from '@/components/providers/SmoothScroll'
import { AuroraDeMarca } from '@/components/brand/AuroraDeMarca'
import { LEASEFY_SYMBOL_PATH, LEASEFY_SYMBOL_VIEWBOX } from '@/components/brand/leasefy-logo-paths'

/** Cuándo empieza a irse sola: lo justo para leer el título y el nombre. */
export const MOMENTO_DE_SALIR_MS = 4300
/** Lo que dura la salida, hasta quedar en el fondo de la app. */
export const DURACION_DE_LA_SALIDA_MS = 650
/** Cuándo sale la chispa: cuando el logo termina de dibujarse. */
const MOMENTO_DE_LA_CHISPA_MS = 1150

/** La chispa: la luz de la aurora, no un cotillón. */
const COLORES_DE_LA_CHISPA = ['#ffffff', '#ffffff', '#f4d9a6', '#a9d4f5', '#c9d1ff']

/** Donde se abre la aurora: a la altura del logo. */
const ORIGEN = '50% 36%'

const SUAVE = [0.22, 1, 0.36, 1] as const
const HACIA_AFUERA = [0.4, 0, 1, 1] as const

type Fase = 'viva' | 'saliendo' | 'esperando'

export interface InmobiliariaCreadaProps {
  /** La razón social que cargó en el asistente; sin ella se celebra igual. */
  nombre: string | null
  /** Al panel: refresca la sesión y navega. Se llama UNA sola vez. */
  onIrAlPanel: () => void
  /** Ya se está yendo: la sesión se refresca y se navega. */
  yendo: boolean
}

export function InmobiliariaCreada({ nombre, onIrAlPanel }: InmobiliariaCreadaProps) {
  const sinMovimiento = useReducedMotion() === true
  const animar = !sinMovimiento
  const lenis = useLenis()
  const titulo = useId()
  const descripcion = useId()
  const dialogoRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const [montado, setMontado] = useState(false)
  const [fase, setFase] = useState<Fase>('viva')

  // La puerta de salida: la abren el temporizador o el botón, lo que llegue
  // primero, y una sola vez. El `onIrAlPanel` vigente se lee por ref para que
  // un padre que pasa una flecha nueva en cada render no reinicie el reloj.
  const yaSalio = useRef(false)
  const irAlPanel = useRef(onIrAlPanel)
  useEffect(() => {
    irAlPanel.current = onIrAlPanel
  }, [onIrAlPanel])

  const salir = useCallback(() => {
    if (yaSalio.current) return
    yaSalio.current = true
    setFase('saliendo')
    irAlPanel.current()
  }, [])

  useEffect(() => setMontado(true), [])

  // La página de atrás no se mueve mientras esto está encima.
  useEffect(() => {
    lenis?.stop()
    return () => lenis?.start()
  }, [lenis])

  // Sin botón, el foco vive en el propio diálogo (Nico, 2026-09-30: «para
  // qué [Ir al panel], si la pantalla solita ya lo lleva»).
  useEffect(() => {
    if (!montado) return
    dialogoRef.current?.focus()
  }, [montado])

  // Se va sola.
  useEffect(() => {
    if (!montado) return
    const reloj = setTimeout(salir, MOMENTO_DE_SALIR_MS)
    return () => clearTimeout(reloj)
  }, [montado, salir])

  // Terminada la salida, si la navegación todavía no llegó, se dice.
  useEffect(() => {
    if (fase !== 'saliendo') return
    const reloj = setTimeout(() => setFase('esperando'), DURACION_DE_LA_SALIDA_MS)
    return () => clearTimeout(reloj)
  }, [fase])

  // La chispa, desde el logo, cuando termina de dibujarse.
  useEffect(() => {
    if (!montado || sinMovimiento) return
    const reloj = setTimeout(() => {
      const caja = logoRef.current?.getBoundingClientRect()
      const origen =
        caja && window.innerWidth > 0 && window.innerHeight > 0
          ? {
              x: (caja.left + caja.width / 2) / window.innerWidth,
              y: (caja.top + caja.height / 2) / window.innerHeight,
            }
          : { x: 0.5, y: 0.36 }
      const comun = {
        origin: origen,
        colors: COLORES_DE_LA_CHISPA,
        shapes: ['circle' as const],
        spread: 360,
        gravity: 0.5,
        decay: 0.92,
        zIndex: 80,
        disableForReducedMotion: true,
      }
      confetti({ ...comun, particleCount: 70, startVelocity: 24, scalar: 0.7, ticks: 170 })
      confetti({ ...comun, particleCount: 30, startVelocity: 12, scalar: 0.5, ticks: 120 })
    }, MOMENTO_DE_LA_CHISPA_MS)
    return () => {
      clearTimeout(reloj)
      confetti.reset()
    }
  }, [montado, sinMovimiento])

  if (!montado) return null

  const viva = fase === 'viva'

  const texto: Variants = {
    oculto: {},
    visible: { transition: { delayChildren: animar ? 0.95 : 0, staggerChildren: animar ? 0.1 : 0 } },
    fuera: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
  }
  const renglon: Variants = {
    oculto: animar ? { opacity: 0, y: 12 } : { opacity: 1 },
    visible: { opacity: 1, y: 0, transition: { duration: animar ? 0.55 : 0, ease: SUAVE } },
    fuera: animar
      ? { opacity: 0, y: -10, transition: { duration: 0.3, ease: HACIA_AFUERA } }
      : { opacity: 0, transition: { duration: 0.2 } },
  }

  return createPortal(
    <div
      ref={dialogoRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titulo}
      aria-describedby={descripcion}
      tabIndex={-1}
      className="fixed inset-0 z-[70] overflow-hidden bg-bg focus:outline-none"
      data-testid="inmobiliaria-creada"
      data-fase={fase}
      data-lenis-prevent
      // Nada que tabular acá y el foco no se escapa a la página de atrás.
      onKeyDown={(e) => {
        if (e.key === 'Tab') {
          e.preventDefault()
          dialogoRef.current?.focus()
        }
      }}
    >
      {/* La aurora: se abre en círculo desde el logo y se disuelve al salir. */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        initial={animar ? { clipPath: `circle(0% at ${ORIGEN})`, opacity: 1 } : false}
        animate={viva ? { clipPath: `circle(100% at ${ORIGEN})`, opacity: 1 } : { opacity: 0 }}
        transition={
          viva
            ? { clipPath: { duration: 1.05, ease: [0.65, 0, 0.35, 1] } }
            : { opacity: { duration: animar ? 0.55 : 0.25, delay: animar ? 0.1 : 0, ease: 'easeIn' } }
        }
      >
        <motion.div
          className="absolute inset-0"
          initial={animar ? { scale: 1.18 } : false}
          animate={animar ? { scale: viva ? 1 : 1.06 } : { scale: 1 }}
          transition={viva ? { duration: 1.6, ease: SUAVE } : { duration: 0.65, ease: HACIA_AFUERA }}
        >
          <AuroraDeMarca animada={animar} className="absolute inset-0" />
        </motion.div>
      </motion.div>

      <div className="absolute inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center px-6 py-12">
          <div className="w-full max-w-md text-center">
            <LogoQueSeDibuja ref={logoRef} animar={animar} saliendo={!viva} />

            <motion.div variants={texto} initial={animar ? 'oculto' : false} animate={viva ? 'visible' : 'fuera'}>
              <motion.p
                variants={renglon}
                className="text-label mt-9 tracking-[0.18em] text-white/75"
              >
                Registro completo
              </motion.p>
              <motion.h1
                variants={renglon}
                id={titulo}
                className="mt-3 text-balance font-heading text-[30px] font-medium leading-[1.1] tracking-[-0.03em] text-white sm:text-[40px]"
              >
                Tu inmobiliaria quedó creada
              </motion.h1>
              <motion.div
                variants={renglon}
                id={descripcion}
                className="mx-auto mt-4 max-w-sm text-pretty text-body-sm text-white/85 sm:text-body"
              >
                {/* Una sola línea: la pantalla dura 4 segundos (Nico, 30-09:
                    «hay mucho texto en la descripción, ¿para qué?»). */}
                {nombre ? (
                  <p>
                    <span className="font-medium text-white" data-testid="inmobiliaria-creada-nombre">
                      {nombre}
                    </span>{' '}
                    ya tiene su espacio en Leasefy.
                  </p>
                ) : (
                  <p>Te damos la bienvenida a Leasefy.</p>
                )}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {fase === 'esperando' ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.3 }}
          >
            <CargaDeMarca
              tamano="md"
              disposicion="apilada"
              texto="Entrando a tu panel…"
              data-testid="inmobiliaria-creada-entrando"
            />
          </motion.div>
        </div>
      ) : null}
    </div>,
    document.body,
  )
}

/** Rayas del motivo de la marca, cada 8 unidades del dibujo del logo. */
const RAYAS = Array.from({ length: 32 }, (_, i) => -4 + i * 8)

interface LogoQueSeDibujaProps {
  animar: boolean
  saliendo: boolean
  ref: Ref<HTMLDivElement>
}

/**
 * La ola de Leasefy, en blanco, dibujándose: contorno → rayado → macizo. Es
 * decorativa (`aria-hidden`): el diálogo ya se nombra con el título.
 */
function LogoQueSeDibuja({ animar, saliendo, ref }: LogoQueSeDibujaProps) {
  const recorte = `lf-ola-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  return (
    <motion.div
      ref={ref}
      aria-hidden="true"
      className="relative mx-auto w-fit"
      animate={saliendo ? { opacity: 0, y: -14, scale: 0.92 } : { opacity: 1, y: 0, scale: 1 }}
      transition={saliendo ? { duration: animar ? 0.45 : 0.2, ease: HACIA_AFUERA } : { duration: 0 }}
    >
      {/* El halo: entra con el logo y después respira. */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[260%] w-[190%] -translate-x-1/2 -translate-y-1/2"
        initial={animar ? { opacity: 0, scale: 0.5 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: animar ? 0.55 : 0, duration: animar ? 1.1 : 0, ease: SUAVE }}
      >
        <motion.div
          className="h-full w-full rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.2), rgba(255,255,255,0))' }}
          animate={animar ? { opacity: [1, 0.6], scale: [1, 0.92] } : undefined}
          transition={
            animar ? { delay: 1.7, duration: 1.6, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' } : undefined
          }
        />
      </motion.div>

      <svg
        viewBox={LEASEFY_SYMBOL_VIEWBOX}
        className="relative h-16 w-[114px] overflow-visible sm:h-[88px] sm:w-[157px]"
        data-testid="inmobiliaria-creada-logo"
      >
        <defs>
          <clipPath id={recorte}>
            <path d={LEASEFY_SYMBOL_PATH} />
          </clipPath>
        </defs>

        {/* 1. El contorno se traza… */}
        {animar ? (
          <motion.path
            d={LEASEFY_SYMBOL_PATH}
            fill="none"
            stroke="#ffffff"
            strokeWidth={3}
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 1 }}
            animate={{ pathLength: 1, opacity: 0 }}
            transition={{
              pathLength: { delay: 0.35, duration: 0.85, ease: [0.65, 0, 0.35, 1] },
              opacity: { delay: 1.45, duration: 0.3 },
            }}
          />
        ) : null}

        {/* 2. …el rayado de la marca lo barre de izquierda a derecha… */}
        {animar ? (
          <g clipPath={`url(#${recorte})`}>
            {RAYAS.map((x, i) => (
              <motion.rect
                key={x}
                x={x}
                y={68}
                width={3.2}
                height={140}
                fill="#ffffff"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{ delay: 0.8 + i * 0.016, duration: 1.1, times: [0, 0.2, 0.8, 1] }}
              />
            ))}
          </g>
        ) : null}

        {/* 3. …y queda macizo. */}
        <motion.path
          d={LEASEFY_SYMBOL_PATH}
          fill="#ffffff"
          initial={animar ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ delay: animar ? 1.3 : 0, duration: animar ? 0.5 : 0, ease: 'easeOut' }}
        />
      </svg>
    </motion.div>
  )
}
