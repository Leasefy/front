import Link from 'next/link'
import { MagnifyingGlass } from '@phosphor-icons/react/dist/ssr'

/**
 * 404 dentro del panel — se renderiza con el sidebar puesto, así que la
 * persona no queda expulsada del panel por escribir mal una URL.
 *
 * Lo dispara `notFound()` desde una página cuando el backend responde 404,
 * y también cualquier ruta inexistente bajo /panel/inmobiliaria.
 *
 * Sin «Intentar de nuevo»: un 404 no cambia porque insistas.
 */

export default function NoEncontradoEnPanel() {
  return (
    <div className="p-4 md:p-6">
      <div className="rounded-xl border border-border bg-card px-6 py-20 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-muted">
          <MagnifyingGlass weight="duotone" className="h-6 w-6 text-fg-subtle" aria-hidden="true" />
        </div>
        <div className="mt-4 space-y-1.5">
          <p className="text-[15px] font-semibold text-fg">No encontramos eso</p>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-fg-muted">
            Puede que se haya eliminado, o que el enlace esté mal. Revisa la dirección
            o vuelve al panel.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/panel/inmobiliaria/dashboard"
            className="inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-medium text-fg transition-colors hover:bg-surface-muted"
          >
            Volver al panel
          </Link>
          <Link
            href="/panel/inmobiliaria/propiedades"
            className="inline-flex h-10 items-center rounded-full px-5 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
          >
            Ver inmuebles
          </Link>
        </div>
      </div>
    </div>
  )
}
