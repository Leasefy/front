'use client'

/**
 * El cartel de «no se pudo cargar», que decide solo qué decir.
 *
 * Reemplaza el patrón `<ErrorState description={error} onRetry={fetch} />`,
 * que mostraba el mensaje crudo del backend —en inglés— y ofrecía reintentar
 * incluso sobre un 404.
 *
 * Ver src/lib/errores/clasificar.ts para la tabla de los cuatro estados.
 * El estado vacío NO va acá: eso es <EmptyState>.
 */

import Link from 'next/link'
import {
  ArrowsClockwise,
  MagnifyingGlass,
  Lock,
  WifiSlash,
  WarningOctagon,
  ArrowLeft,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { clasificarFallo, type Contexto, type TipoDeFallo } from '@/lib/errores/clasificar'
import { cn } from '@/lib/utils'

const ICONO: Record<TipoDeFallo, Icon> = {
  noExiste: MagnifyingGlass,
  sinPermiso: Lock,
  sinSesion: Lock,
  red: WifiSlash,
  servidor: WarningOctagon,
}

export interface FalloDeCargaProps {
  /** Lo que tiró el catch. */
  error: unknown
  /** Qué se estaba cargando: «la propiedad», «el contrato»… */
  queEs?: Contexto['queEs']
  /** Sólo se usa si el fallo es de los que pueden cambiar al reintentar. */
  onReintentar?: () => void
  /** A dónde volver cuando reintentar no tiene sentido. */
  volverA?: { label: string; href: string }
  className?: string
}

export function FalloDeCarga({
  error,
  queEs,
  onReintentar,
  volverA,
  className,
}: FalloDeCargaProps) {
  const fallo = clasificarFallo(error, { queEs })
  const Icono = ICONO[fallo.tipo]
  // Para volver a donde estaba después de entrar de nuevo.
  const rutaActual =
    typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/'

  // El botón de reintentar aparece SÓLO si volver a pedirlo puede dar otro
  // resultado. Sobre un 404 o un 403 sería mentir.
  const mostrarReintentar = fallo.sePuedeReintentar && Boolean(onReintentar)

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card px-6 py-16 text-center',
        className,
      )}
      role="alert"
      data-testid="fallo-de-carga"
      data-tipo={fallo.tipo}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-muted">
        <Icono weight="duotone" className="h-6 w-6 text-fg-subtle" aria-hidden="true" />
      </div>

      <div className="mt-4 space-y-1.5">
        <p className="text-[15px] font-semibold text-fg">{fallo.titulo}</p>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-fg-muted">
          {fallo.descripcion}
        </p>
      </div>

      {(mostrarReintentar || volverA || fallo.tipo === 'sinSesion') && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {mostrarReintentar && (
            <Button
              onClick={onReintentar}
              variant="outline"
              className="gap-2"
              data-testid="reintentar"
            >
              <ArrowsClockwise className="h-4 w-4" aria-hidden="true" />
              Intentar de nuevo
            </Button>
          )}
          {fallo.tipo === 'sinSesion' && (
            <Button asChild>
              {/* `/auth`, no `/auth/login` — esa ruta no existe y el botón caía
                  en el 404. Con returnUrl para volver donde estaba, igual que
                  ProtectedRoute. */}
              <Link href={`/auth?returnUrl=${encodeURIComponent(rutaActual)}`}>
                Volver a entrar
              </Link>
            </Button>
          )}
          {volverA && (
            <Button asChild variant={mostrarReintentar ? 'ghost' : 'outline'} className="gap-2">
              <Link href={volverA.href}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {volverA.label}
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* El mensaje del backend sirve para diagnosticar, no para leer: queda en
          el DOM pero no en pantalla. */}
      {fallo.mensajeOriginal && (
        <span className="sr-only" data-testid="fallo-detalle-tecnico">
          {fallo.mensajeOriginal}
        </span>
      )}
    </div>
  )
}
