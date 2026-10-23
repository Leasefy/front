'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CaretDown, CaretRight, List, MagnifyingGlass, SignOut } from '@phosphor-icons/react'
import { CrossFade, MonoLabel } from '@leasefy/cadence'

import { getSupabase } from '@/lib/supabase/client'
import { openPlanMobileSidebar } from '@/components/ui/plan/PlanSidebar'
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListLabel,
  DropdownListSeparator,
  DropdownListTrigger,
} from '@/components/ui/dropdown-menu'
import { NAV_ITEMS } from '@/components/admin/Nav'
import { nombreDeLaSeccion, pantallaDeLaRuta } from '@/lib/admin/menu-del-admin'
import type { PersonaDelAdmin } from '@/lib/admin/persona-del-admin'

/**
 * La cabecera del admin, con el marco de la del panel (`PlanHeader`):
 * `sticky`, 64 px, el fondo del tema y el filete de abajo.
 *
 * Izquierda: el botón del menú en el celular y la miga «Sección › Pantalla»
 * (en una ficha, la pantalla es un enlace de vuelta a su lista). Derecha: el
 * buscador de pantallas en el celular (en escritorio vive en la barra) y la
 * persona que entró, «Nico · CPO», con cerrar sesión.
 */
export function CabeceraDelAdmin({
  persona,
  onBuscar,
}: {
  persona: PersonaDelAdmin
  onBuscar: () => void
}) {
  const ruta = usePathname() ?? '/admin'
  const pantalla = pantallaDeLaRuta(ruta, NAV_ITEMS)
  const seccion = pantalla ? nombreDeLaSeccion(pantalla.seccion) : null
  const enUnaFicha = Boolean(pantalla && ruta !== pantalla.href)

  async function cerrarSesion() {
    await getSupabase()?.auth.signOut()
    window.location.href = '/admin/login'
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <button
            type="button"
            onClick={openPlanMobileSidebar}
            aria-label="Abrir el menú de navegación"
            className="-ml-1.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-fg-muted outline-none transition-colors hover:bg-surface-muted hover:text-fg focus-visible:ring-2 focus-visible:ring-primary/40 lg:hidden"
          >
            <List className="h-5 w-5" />
          </button>

          <nav aria-label="Dónde estás" className="min-w-0">
            <CrossFade swapKey={pantalla?.href ?? ruta} mode="popLayout">
              <ol className="flex min-w-0 items-center gap-1.5 text-body-sm">
                {seccion ? (
                  <>
                    <li className="hidden shrink-0 text-fg-subtle sm:block">{seccion}</li>
                    <li aria-hidden="true" className="hidden shrink-0 text-fg-subtle sm:block">
                      <CaretRight className="h-3.5 w-3.5" />
                    </li>
                  </>
                ) : null}
                <li className="min-w-0 truncate">
                  {pantalla && enUnaFicha ? (
                    <Link
                      href={pantalla.href}
                      className="font-medium text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
                    >
                      {pantalla.nombre}
                    </Link>
                  ) : (
                    <span className="font-medium text-fg" aria-current="page">
                      {pantalla?.nombre ?? 'Admin'}
                    </span>
                  )}
                </li>
                {enUnaFicha ? (
                  <>
                    <li aria-hidden="true" className="shrink-0 text-fg-subtle">
                      <CaretRight className="h-3.5 w-3.5" />
                    </li>
                    <li className="shrink-0 font-medium text-fg" aria-current="page">
                      Detalle
                    </li>
                  </>
                ) : null}
              </ol>
            </CrossFade>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onBuscar}
            aria-label="Buscar una pantalla"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-fg-muted outline-none transition-colors hover:bg-surface-muted hover:text-fg focus-visible:ring-2 focus-visible:ring-primary/40 lg:hidden"
          >
            <MagnifyingGlass className="h-5 w-5" />
          </button>

          <DropdownList>
            <DropdownListTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg bg-surface-muted py-1.5 pl-1.5 pr-1.5 outline-none transition-colors hover:bg-border focus-visible:ring-2 focus-visible:ring-primary/40 sm:pr-2.5"
                aria-label={`Tu cuenta: ${persona.nombre}`}
                data-testid="admin-persona"
              >
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-ink">
                  <span className="text-sm font-medium text-ink-fg">{persona.inicial}</span>
                </span>
                <span className="hidden min-w-0 flex-col items-start leading-tight sm:flex">
                  <span className="max-w-[160px] truncate text-body-sm font-medium text-fg">{persona.nombre}</span>
                  {persona.cargo ? (
                    <MonoLabel className="text-[10px]">{persona.cargo}</MonoLabel>
                  ) : null}
                </span>
                <CaretDown className="hidden h-4 w-4 text-fg-subtle sm:block" />
              </button>
            </DropdownListTrigger>
            <DropdownListContent
              className="w-64 rounded-lg border border-border bg-surface p-1.5 shadow-lg"
              align="end"
              sideOffset={8}
            >
              <DropdownListLabel className="px-3 py-2">
                <p className="text-[14px] font-medium text-fg">
                  {persona.nombre}
                  {persona.cargo ? <span className="text-fg-muted"> · {persona.cargo}</span> : null}
                </p>
                <p className="truncate text-[12px] text-fg-muted">{persona.correo}</p>
                <span className="mt-1.5 inline-block rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-fg-muted">
                  Equipo de Leasefy
                </span>
              </DropdownListLabel>
              <DropdownListSeparator className="my-1 bg-surface-muted" />
              <DropdownListItem
                onClick={() => void cerrarSesion()}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-caption text-danger hover:bg-danger-soft"
              >
                <SignOut className="h-4 w-4 stroke-[1.5px]" />
                Cerrar sesión
              </DropdownListItem>
            </DropdownListContent>
          </DropdownList>
        </div>
      </div>
    </header>
  )
}
