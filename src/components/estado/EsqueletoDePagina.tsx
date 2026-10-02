import * as React from 'react'

import { PageSkeleton, type PageSkeletonVariant } from '@/components/skeleton/panel/PageSkeleton'
import { cn } from '@/lib/utils'

/**
 * La carga de una pantalla que vive DENTRO de un panel —con su menú y su
 * cabecera alrededor—: el esqueleto de `PageSkeleton` con la semántica de una
 * carga (`role="status"`, `aria-busy` y un «Cargando…» para el lector de
 * pantalla), que `PageSkeleton` solo no trae.
 *
 * Nico, 01-10: «el logo sólo en cargas de pantalla completa». Estas pantallas
 * pintaban `CargaDeMarca` centrada con el menú y la cabecera del panel
 * alrededor: no es pantalla completa, es el contenido de una página. Lo que va
 * es la forma de lo que viene, no el logo (ver `carga-de-marca.tsx`).
 */
export interface EsqueletoDePaginaProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** La forma de la pantalla que se está cargando. Por defecto `list`. */
  variante?: PageSkeletonVariant
  /** Nombre accesible de la carga. Por defecto «Cargando». */
  etiqueta?: string
}

export function EsqueletoDePagina({
  variante = 'list',
  etiqueta = 'Cargando',
  className,
  ...props
}: EsqueletoDePaginaProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={etiqueta}
      data-testid="esqueleto-de-pagina"
      className={cn('w-full', className)}
      {...props}
    >
      <PageSkeleton variant={variante} />
      <span className="sr-only">{etiqueta}…</span>
    </div>
  )
}
