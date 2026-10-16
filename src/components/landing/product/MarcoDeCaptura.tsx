'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import type { Captura, NotaSobreLaCaptura, Rect } from '@/lib/landing/capturas'

/**
 * Una pantalla REAL del panel dentro de su marco (Nico, 12-10-2026: «que no se
 * sienta como IA… donde haya imágenes, sácalo directamente del producto»).
 *
 * Lo que se mueve encima es poco y dice algo:
 * - `inclinada`: entra inclinada y se aplana al bajar, como quien pone la
 *   pantalla sobre la mesa.
 * - `notas`: un cursor va a un punto de la pantalla, la acerca y deja una
 *   nota; después la siguiente. Una a la vez, nunca un collage.
 * - `foco`: se acerca a la parte que cuenta la historia y la enmarca (el
 *   recorrido de cada interna).
 * Con «reducir movimiento» todo queda quieto: la captura, el foco ya puesto y
 * las notas a la vista.
 */

const EASE = [0.22, 1, 0.36, 1] as const

/** Escala y desplazamiento (en % del marco) para que `r` quede centrado. */
function acercar(r: Rect, max = 2.4) {
  const s = Math.min(max, Math.max(1, Math.min(100 / r.w, 100 / r.h) * 0.9))
  const cx = r.x + r.w / 2
  const cy = r.y + r.h / 2
  // Sin mostrar lo que hay fuera de la captura.
  const tx = Math.min(0, Math.max(100 - 100 * s, 50 - cx * s))
  const ty = Math.min(0, Math.max(100 - 100 * s, 50 - cy * s))
  return { s, tx, ty }
}

const QUIETO = { s: 1, tx: 0, ty: 0 }

interface MarcoDeCapturaProps {
  captura: Captura
  notas?: NotaSobreLaCaptura[]
  foco?: Rect | null
  etiqueta?: string | null
  inclinada?: boolean
  /** La portada se pide primero; el resto, cuando se acerca. */
  prioritaria?: boolean
  oscuro?: boolean
  className?: string
  'data-testid'?: string
}

export function MarcoDeCaptura({
  captura,
  notas = [],
  foco = null,
  etiqueta = null,
  inclinada = false,
  prioritaria = false,
  oscuro = false,
  className,
  'data-testid': testId,
}: MarcoDeCapturaProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reducido = useReducedMotion() ?? false
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start 30%'] })
  const giro = useTransform(scrollYProgress, [0, 1], [inclinada && !reducido ? 16 : 0, 0])
  const escala = useTransform(scrollYProgress, [0, 1], [inclinada && !reducido ? 0.93 : 1, 1])

  // La nota que se muestra (-1 = ninguna todavía).
  const [nota, setNota] = useState(-1)
  useEffect(() => {
    if (reducido || notas.length === 0) return
    let n = 0
    const primera = setTimeout(() => setNota(0), 1100)
    const ciclo = setInterval(() => {
      n = (n + 1) % (notas.length + 1)
      // Una vuelta sin nota: la pantalla entera también se mira.
      setNota(n === notas.length ? -1 : n)
    }, 3800)
    return () => {
      clearTimeout(primera)
      clearInterval(ciclo)
    }
  }, [reducido, notas.length])

  const activa = nota >= 0 ? notas[nota] : null
  const vista = foco
    ? acercar(foco)
    : activa && !reducido
      ? acercar({ x: activa.x - 22, y: activa.y - 18, w: 44, h: 36 }, 1.28)
      : QUIETO
  // Dónde queda en el marco un punto de la captura, ya acercada.
  const enPantalla = (x: number, y: number) => ({ left: `${vista.tx + x * vista.s}%`, top: `${vista.ty + y * vista.s}%` })

  return (
    <motion.div
      ref={ref}
      className={['landing-pr-marco', oscuro ? 'landing-pr-marco--oscuro' : '', className ?? ''].join(' ').trim()}
      style={{ rotateX: giro, scale: escala }}
      data-testid={testId}
    >
      <div className="landing-pr-marco-barra" aria-hidden="true">
        <span className="landing-pr-marco-puntos">
          <i />
          <i />
          <i />
        </span>
        <span className="landing-pr-marco-url">app.leasefy.co · Tu Inmobiliaria</span>
      </div>
      <div className="landing-pr-marco-vista">
        <motion.div
          className="landing-pr-marco-capa"
          // El acercamiento se calcula desde la esquina de arriba a la izquierda.
          style={{ originX: 0, originY: 0 }}
          initial={false}
          animate={{ x: `${vista.tx}%`, y: `${vista.ty}%`, scale: vista.s }}
          transition={reducido ? { duration: 0 } : { duration: 1.15, ease: EASE }}
        >
          <AnimatePresence initial={false} mode="sync">
            <motion.img
              key={captura.src}
              src={captura.src}
              alt={captura.alt}
              className="landing-pr-marco-img"
              width={2400}
              height={1500}
              loading={prioritaria ? 'eager' : 'lazy'}
              decoding="async"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducido ? 0 : 0.5, ease: EASE }}
            />
          </AnimatePresence>
        </motion.div>

        {foco && (
          <motion.span
            className="landing-pr-marco-anillo"
            aria-hidden="true"
            initial={false}
            animate={{
              left: `${vista.tx + foco.x * vista.s}%`,
              top: `${vista.ty + foco.y * vista.s}%`,
              width: `${foco.w * vista.s}%`,
              height: `${foco.h * vista.s}%`,
            }}
            transition={reducido ? { duration: 0 } : { duration: 1.15, ease: EASE }}
          />
        )}
        <AnimatePresence>
          {foco && etiqueta && (
            <motion.span
              key={etiqueta}
              className="landing-pr-marco-etiqueta"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducido ? 0 : 0.4, delay: reducido ? 0 : 0.5, ease: EASE }}
            >
              {etiqueta}
            </motion.span>
          )}
        </AnimatePresence>

        {/* El cursor y la nota: sólo con movimiento. Quietos, las notas van debajo. */}
        {!reducido && notas.length > 0 && (
          <>
            <motion.span
              className="landing-pr-cursor"
              aria-hidden="true"
              initial={{ left: '96%', top: '96%', opacity: 0 }}
              animate={activa ? { ...enPantalla(activa.x, activa.y), opacity: 1 } : { left: '96%', top: '96%', opacity: 0 }}
              transition={{ duration: 0.9, ease: EASE }}
            >
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path d="M4 2.5 19.5 12l-7 1.6L9 20.5z" />
              </svg>
            </motion.span>
            <AnimatePresence>
              {activa && (
                <motion.span
                  key={activa.texto}
                  className="landing-pr-nota"
                  style={enPantalla(activa.x, activa.y)}
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.45, delay: 0.75, ease: EASE }}
                >
                  {activa.texto}
                </motion.span>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
      {reducido && notas.length > 0 && (
        <ul className="landing-pr-notas-quietas">
          {notas.map((n) => (
            <li key={n.texto}>{n.texto}</li>
          ))}
        </ul>
      )}
    </motion.div>
  )
}
