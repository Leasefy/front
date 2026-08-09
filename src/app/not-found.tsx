import Link from 'next/link'
import type { Metadata } from 'next'

/**
 * 404 global.
 *
 * Antes de esto no existía ninguno: cualquier URL mal escrita mostraba la
 * pantalla por defecto de Next, en inglés y sin salida.
 *
 * Sin botón de reintentar, a propósito: reintentar un 404 no lo cambia.
 */

export const metadata: Metadata = {
  title: 'Esta página no existe · Leasefy',
}

export default function NoEncontrado() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6 py-24">
      <div className="w-full max-w-md text-center">
        <p className="font-mono text-label uppercase tracking-mono-label text-fg-subtle">
          Error 404
        </p>
        <h1 className="mt-3 text-h1 font-semibold text-fg">Esta página no existe</h1>
        <p className="mt-3 text-body text-fg-muted">
          Puede que el enlace esté mal escrito, o que lo que buscabas se haya movido.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-body-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover"
          >
            Ir al inicio
          </Link>
          <Link
            href="/propiedades"
            className="inline-flex h-11 items-center rounded-full border border-border px-6 text-body-sm font-medium text-fg transition-colors hover:bg-surface-muted"
          >
            Ver propiedades
          </Link>
        </div>
      </div>
    </main>
  )
}
