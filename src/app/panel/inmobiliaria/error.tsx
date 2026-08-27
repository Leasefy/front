'use client'

/**
 * Frontera de error de TODO el panel de inmobiliaria.
 *
 * Antes sólo existía la de /ai: un crash de render en cualquier otra sección
 * dejaba la pantalla en blanco de Next, en inglés.
 *
 * Acá sí ofrecemos reintentar, porque un crash de render es de los que pueden
 * salir distinto al volver a montar. Es el caso contrario al 404.
 */

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowsClockwise, WarningOctagon } from '@phosphor-icons/react'

export default function ErrorDelPanel({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Sin esto el error se pierde: la frontera lo captura y nadie lo ve.
    console.error('[panel/inmobiliaria] error de render', error)
  }, [error])

  return (
    <div className="p-4 md:p-6" data-testid="panel-error">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-12 sm:px-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface-muted/70 blur-2xl"
        />

        <div className="relative mx-auto flex max-w-sm flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-muted">
            <WarningOctagon
              weight="duotone"
              className="h-5 w-5 text-fg-subtle"
              aria-hidden="true"
            />
          </div>

          <h2 className="mt-5 text-base font-semibold tracking-tight text-fg">
            Esta sección se rompió
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            Fue un problema nuestro, no tuyo. Vuelve a cargarla; si sigue igual,
            escríbenos con la referencia de abajo.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-fg px-5 text-sm font-medium text-bg transition-opacity hover:opacity-90"
            >
              <ArrowsClockwise className="h-4 w-4" aria-hidden="true" />
              Volver a cargar
            </button>
            <Link
              href="/panel/inmobiliaria/dashboard"
              className="inline-flex h-10 items-center rounded-full px-5 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
            >
              Ir al panel
            </Link>
          </div>

          {/*
            La referencia SIEMPRE. `error.digest` sólo existe en producción, así
            que en dev el cartel pedía una referencia que no mostraba. Sin
            digest se usa el nombre del error, que al menos orienta a quien lo
            reporta.
          */}
          <p className="mt-6 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
            Referencia {error.digest ?? error.name ?? 'render'}
          </p>
        </div>
      </div>
    </div>
  )
}
