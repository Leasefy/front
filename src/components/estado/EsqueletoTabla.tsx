'use client'

/**
 * Esqueletos con la forma de lo que va a llegar.
 *
 * Un esqueleto sólo vale si respeta la forma real: si la tabla tiene 6
 * columnas y el esqueleto pinta 3, el salto al llegar los datos es peor que
 * no haber puesto nada. Por eso estos reciben la cantidad de columnas y filas.
 */

import { cn } from '@/lib/utils'

function Barra({ className }: { className?: string }) {
  return (
    <div
      className={cn('h-3 animate-pulse rounded-full bg-surface-muted', className)}
      aria-hidden="true"
    />
  )
}

export function EsqueletoTabla({
  columnas,
  filas = 5,
  className,
}: {
  columnas: number
  filas?: number
  className?: string
}) {
  return (
    <div
      className={cn('overflow-hidden rounded-xl border border-border bg-card', className)}
      role="status"
      aria-label="Cargando"
      data-testid="esqueleto-tabla"
    >
      <div className="border-b border-border px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: columnas }).map((_, i) => (
            <Barra key={i} className="h-2.5 flex-1 max-w-[120px]" />
          ))}
        </div>
      </div>
      {Array.from({ length: filas }).map((_, f) => (
        <div key={f} className="border-b border-border px-4 py-4 last:border-0">
          <div className="flex items-center gap-4">
            {Array.from({ length: columnas }).map((_, c) => (
              <Barra
                key={c}
                className={cn('flex-1', c === 0 ? 'max-w-[180px]' : 'max-w-[110px]')}
              />
            ))}
          </div>
        </div>
      ))}
      <span className="sr-only">Cargando…</span>
    </div>
  )
}

export function EsqueletoTarjetas({
  cantidad = 3,
  className,
}: {
  cantidad?: number
  className?: string
}) {
  return (
    <div
      className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}
      role="status"
      aria-label="Cargando"
      data-testid="esqueleto-tarjetas"
    >
      {Array.from({ length: cantidad }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-5">
          <Barra className="h-2.5 w-20" />
          <Barra className="h-5 w-3/4" />
          <Barra className="w-1/2" />
        </div>
      ))}
      <span className="sr-only">Cargando…</span>
    </div>
  )
}

/** Para las tiras de indicadores del tablero. */
export function EsqueletoIndicadores({
  cantidad = 4,
  className,
}: {
  cantidad?: number
  className?: string
}) {
  return (
    <div
      className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}
      role="status"
      aria-label="Cargando"
      data-testid="esqueleto-indicadores"
    >
      {Array.from({ length: cantidad }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-5">
          <Barra className="h-2.5 w-24" />
          <Barra className="h-7 w-28" />
        </div>
      ))}
      <span className="sr-only">Cargando…</span>
    </div>
  )
}
