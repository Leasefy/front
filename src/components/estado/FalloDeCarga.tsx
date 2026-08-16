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
        'relative overflow-hidden rounded-2xl border border-border bg-card',
        'px-6 py-12 sm:px-10',
        className,
      )}
      role="alert"
      data-testid="fallo-de-carga"
      data-tipo={fallo.tipo}
    >
      {/* Un halo apenas perceptible detrás del ícono: da un centro visual sin
          agregar un color de estado. Un cartel de error no tiene que gritar. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface-muted/70 blur-2xl"
      />

      <div className="relative mx-auto flex max-w-sm flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-muted">
          <Icono weight="duotone" className="h-5 w-5 text-fg-subtle" aria-hidden="true" />
        </div>

        <h2 className="mt-5 text-base font-semibold tracking-tight text-fg">
          {fallo.titulo}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          {fallo.descripcion}
        </p>

        {(mostrarReintentar || volverA || fallo.tipo === 'sinSesion') && (
          <div className="mt-6 flex w-full flex-wrap items-center justify-center gap-2">
            {mostrarReintentar && (
              <Button onClick={onReintentar} className="gap-2" data-testid="reintentar">
                <ArrowsClockwise className="h-4 w-4" aria-hidden="true" />
                Intentar de nuevo
              </Button>
            )}
            {fallo.tipo === 'sinSesion' && (
              <Button asChild>
                {/* `/auth`, no `/auth/login` — esa ruta no existe y el botón
                    caía en el 404. Con returnUrl para volver donde estaba. */}
                <Link href={`/auth?returnUrl=${encodeURIComponent(rutaActual)}`}>
                  Volver a entrar
                </Link>
              </Button>
            )}
            {volverA && (
              <Button
                asChild
                variant={mostrarReintentar || fallo.tipo === 'sinSesion' ? 'ghost' : 'default'}
                className="gap-2"
              >
                <Link href={volverA.href}>
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  {volverA.label}
                </Link>
              </Button>
            )}
          </div>
        )}

        {/*
          La referencia, visible.
          El copy dice «escribinos con la referencia» y no había ninguna en
          pantalla: pedirle a alguien un dato que no le mostramos es mandarlo a
          buscar lo que no existe. El mensaje crudo del backend sigue oculto —
          sirve para diagnosticar, no para leer.
        */}
        {fallo.status ? (
          <p className="mt-6 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
            Referencia {fallo.tipo}-{fallo.status}
          </p>
        ) : null}

        {fallo.mensajeOriginal && (
          <span className="sr-only" data-testid="fallo-detalle-tecnico">
            {fallo.mensajeOriginal}
          </span>
        )}
      </div>
    </div>
  )
}
