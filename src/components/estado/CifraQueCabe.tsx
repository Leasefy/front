/**
 * Una cifra que siempre cabe en su tarjeta (Nico, 20-10-2026: en Propietarios,
 * «Canon mensual» decía «$ 1.270.514.293,» y el resto se salía por el borde).
 *
 * La cifra va en la letra mono de Cadence (todas las letras del mismo ancho,
 * 0,6 em), así que el ancho del texto es `largo × 0,6 em`. Con eso, la letra
 * se achica sólo lo que haga falta para que la cifra entera quepa en el ancho
 * de la tarjeta (`cqi` = el ancho del contenedor); si cabe, queda igual.
 * Nunca se recorta ni se redondea: se ve completa, con sus centavos.
 *
 * Sólo CSS: no mide nada ni salta al cargar. Va dentro del valor de un
 * `KpiCard` (un bloque que ocupa el ancho de la tarjeta); en un contenedor que
 * se ajusta a su contenido no sirve, porque ahí el ancho lo pone la cifra.
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Ancho de cada letra de la mono (JetBrains Mono: 600/1000), con un poco de aire. */
const ANCHO_DE_LETRA_EM = 0.6

export function CifraQueCabe({
  children,
  className,
  texto,
}: {
  children: ReactNode
  className?: string
  /**
   * El texto con que se mide el ancho cuando la cifra no es un texto (un
   * `AnimatedNumber` que cuenta): el de la cifra final ya escrita.
   */
  texto?: string
}) {
  const medida = texto ?? (typeof children === 'string' ? children : '')
  const largo = Math.max(medida.length, 1)
  return (
    <span className={cn('block w-full min-w-0 [container-type:inline-size]', className)} title={medida || undefined}>
      {/* En línea (no bloque): la cifra chica se apoya en la misma línea que
          las cifras grandes de las tarjetas vecinas, y la tarjeta no cambia de alto. */}
      <span
        className="inline-block whitespace-nowrap"
        style={{ fontSize: `min(1em, calc(100cqi / ${(largo * ANCHO_DE_LETRA_EM).toFixed(2)}))` }}
        data-testid="cifra-que-cabe"
      >
        {children}
      </span>
    </span>
  )
}
