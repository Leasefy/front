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
      <div className="rounded-xl border border-border bg-card px-6 py-20 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-muted">
          <WarningOctagon weight="duotone" className="h-6 w-6 text-fg-subtle" aria-hidden="true" />
        </div>
        <div className="mt-4 space-y-1.5">
          <p className="text-[15px] font-semibold text-fg">Esta sección se rompió</p>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-fg-muted">
            Fue un problema nuestro, no tuyo. Vuelve a cargarla; si sigue igual,
            escribinos y pasanos la referencia.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium text-fg transition-colors hover:bg-surface-muted"
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
        {error.digest && (
          <p className="mt-6 font-mono text-[11px] text-fg-subtle">Ref: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
