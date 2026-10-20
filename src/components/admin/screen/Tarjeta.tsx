import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@leasefy/cadence'

import { cn } from '@/lib/utils'

/**
 * Un bloque de una pantalla del admin: la `Card` de Cadence con su título
 * (`CardTitle`), una bajada opcional y las acciones a la derecha. Es la
 * tarjeta de las fichas de la plataforma; sin título, es sólo la superficie.
 */
export function Tarjeta({
  titulo,
  descripcion,
  acciones,
  children,
  className,
  cuerpo,
  variante = 'surface',
  ...resto
}: {
  titulo?: React.ReactNode
  descripcion?: React.ReactNode
  acciones?: React.ReactNode
  children?: React.ReactNode
  className?: string
  /** Clases del cuerpo (por defecto el padding de Cadence). */
  cuerpo?: string
  variante?: 'surface' | 'muted'
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>) {
  return (
    <Card variant={variante} className={className} {...resto}>
      {titulo || acciones ? (
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div className="min-w-0 space-y-1">
            {titulo ? <CardTitle className="text-subtitle font-semibold">{titulo}</CardTitle> : null}
            {descripcion ? <CardDescription>{descripcion}</CardDescription> : null}
          </div>
          {acciones ? <div className="flex flex-wrap items-center gap-2">{acciones}</div> : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn(!titulo && !acciones && 'pt-6', cuerpo)}>{children}</CardContent>
    </Card>
  )
}
