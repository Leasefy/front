'use client'

/**
 * La voz del día: la frase del director (o del pulso) que «se dice» palabra
 * por palabra, como si la estuviera diciendo. Cada palabra entra con un
 * fundido y 4 px (`motionDistance.xs`), escalonada con el paso de Cadence; al
 * terminar, el cursor se apaga. Con movimiento reducido la frase está entera
 * desde el principio. El lector de pantalla lee la frase una vez, entera.
 *
 * Cambia la frase → se vuelve a decir (la `key` es el texto).
 */

import { motion } from 'framer-motion'
import { motionDistance, motionDuration, motionEase, usePrefersReducedMotion } from '@leasefy/cadence'

import { cn } from '@/lib/utils'

/** Ritmo de lectura: ~55 ms por palabra, con techo para que una frase larga no tarde más de 2,4 s. */
function pasoPorPalabra(n: number): number {
  return Math.min(0.055, (motionDuration.ambient - motionDuration.base) / Math.max(1, n))
}

export function Voz({ texto, className, como: Como = 'p' }: { texto: string; className?: string; como?: 'p' | 'h2' }) {
  const reducido = usePrefersReducedMotion()
  const palabras = texto.split(/\s+/).filter(Boolean)
  const paso = pasoPorPalabra(palabras.length)
  if (reducido) return <Como className={className}>{texto}</Como>
  return (
    <Como className={cn('relative', className)} key={texto}>
      <span className="sr-only">{texto}</span>
      <span aria-hidden="true">
        {palabras.map((p, i) => (
          <motion.span
            // eslint-disable-next-line react/no-array-index-key -- la misma palabra puede repetirse; el orden es la identidad.
            key={`${i}-${p}`}
            className="inline-block whitespace-pre"
            initial={{ opacity: 0, y: motionDistance.xs }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * paso, duration: motionDuration.base, ease: motionEase.enter }}
          >
            {i < palabras.length - 1 ? `${p} ` : p}
          </motion.span>
        ))}
        <motion.span
          className="ml-0.5 inline-block h-[0.9em] w-[2px] translate-y-[0.12em] rounded-full bg-current"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ delay: 0.15, duration: 0.15 + palabras.length * paso + motionDuration.slow, times: [0, 0.05, 0.85, 1], ease: 'linear' }}
        />
      </span>
    </Como>
  )
}
