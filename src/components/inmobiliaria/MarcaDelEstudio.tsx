'use client'

/**
 * El chip de la marca del estudio de una postulación: «Sin estudio», «Estudio
 * en curso», «Estudio vencido» o «Canon por encima de su respaldo ($X)».
 *
 * 🔴 El estudio es opcional (Nico, 04-10-2026): la postulación entra igual y la
 * inmobiliaria la ve marcada para decidir sabiendo qué falta. Sin marca no se
 * pinta nada (o, con `conEstudio`, «Con estudio», para la columna de la lista).
 */

import { cn } from '@/lib/utils'
import type { MarcaDelEstudio } from '@/lib/api/applications.types'
import { textoDeLaMarca } from '@/lib/postulaciones/marca-del-estudio'

export function ChipDeLaMarcaDelEstudio({
  marca,
  conEstudio = false,
  className,
}: {
  marca: MarcaDelEstudio | null | undefined
  /** Sin marca, dice «Con estudio» en vez de no pintar nada. */
  conEstudio?: boolean
  className?: string
}) {
  // `undefined` = el servidor todavía no manda la marca: no se afirma nada
  // («Con estudio» sería inventarlo). `null` = la mandó y no hay nada que marcar.
  if (marca === undefined) {
    return conEstudio ? <span className="text-fg-muted">—</span> : null
  }
  const texto = textoDeLaMarca(marca)
  if (!texto) {
    if (!conEstudio) return null
    return (
      <span
        className={cn('inline-flex items-center rounded-full bg-success-soft px-2.5 py-0.5 text-caption font-medium text-success', className)}
        data-testid="marca-del-estudio"
        data-marca="ninguna"
      >
        Con estudio
      </span>
    )
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-warning-soft px-2.5 py-0.5 text-caption font-medium text-warning',
        className,
      )}
      data-testid="marca-del-estudio"
      data-marca={marca?.codigo}
    >
      {texto}
    </span>
  )
}
