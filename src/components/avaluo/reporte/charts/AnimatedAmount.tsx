'use client'

/**
 * AnimatedAmount.tsx — la cifra del héroe con count-up.
 *
 * El número REAL vive siempre en el DOM (`sr-only`): lo lee el lector de
 * pantalla, lo encuentra Ctrl-F, lo lleva el export y lo ve el test. Lo que se
 * anima es una copia decorativa (`aria-hidden`) que sube de 0 al valor en
 * 1,1 s con ease-out expo, escribiendo `textContent` por frame (sin estado de
 * React: 60 renders por segundo no aportan nada). Con
 * `prefers-reduced-motion` la copia decorativa arranca en el valor final y no
 * se mueve.
 *
 * El símbolo va PEGADO a la cifra en la copia visible («$519.853.230», como
 * el mockup): `formatCurrency` del repo imprime «$ 519.853.230» y ese espacio
 * es un punto de quiebre — a 390 px el «$» quedaba solo en una línea. La copia
 * `sr-only` conserva el texto exacto del escalar (es lo que se anuncia, lo que
 * encuentra Ctrl-F y lo que verifica el test); sólo cambia la tipografía de la
 * copia decorativa. Ver `glueCurrencySymbol`.
 */

import { useEffect, useRef } from 'react'
import { animate, useReducedMotion } from 'framer-motion'
import { formatCurrency } from '@/lib/format'

/**
 * «$ 519.853.230» → «$519.853.230». Quita el espacio (normal o NBSP) entre el
 * símbolo y el primer dígito; no toca nada más del texto. Exportada para el
 * test.
 */
export function glueCurrencySymbol(text: string): string {
  return text.replace(/^(\$)[\s\u00a0]+(?=\d)/, '$1')
}

export function AnimatedAmount({
  value,
  text,
  className,
}: {
  value: number
  /** El texto EXACTO del escalar (`formatScalar`), el que se anuncia. */
  text: string
  className?: string
}) {
  const reduced = useReducedMotion()
  const node = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = node.current
    if (el === null) return
    if (reduced) {
      el.textContent = glueCurrencySymbol(text)
      return
    }
    const controls = animate(0, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = glueCurrencySymbol(formatCurrency(Math.round(v)))
      },
      onComplete: () => {
        el.textContent = glueCurrencySymbol(text)
      },
    })
    return () => controls.stop()
  }, [value, text, reduced])

  return (
    <span className={className}>
      <span ref={node} aria-hidden="true" data-count-up="" className="whitespace-nowrap">
        {glueCurrencySymbol(text)}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  )
}
