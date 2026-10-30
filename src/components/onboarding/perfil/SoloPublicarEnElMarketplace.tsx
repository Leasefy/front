'use client'

import Link from 'next/link'
import { ArrowRight, Storefront } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

/**
 * 🔴 El atajo de quien SÓLO quiere publicar (Nico, 27-10-2026: «crear una cuenta
 * no está sencillo para entrar solo al marketplace… esta niña nos iba a migrar
 * 108 propiedades para marketplace, pero no dio»).
 *
 * El registro de la inmobiliaria pide NIT, razón social, representante, el
 * equipo y el segundo factor: es lo que hace falta para administrar contratos,
 * cobros y giros. Para publicar en el marketplace no hace falta nada de eso: el
 * registro corto de `/publica` (nombre de la inmobiliaria, tu nombre y tu
 * WhatsApp) y de una al publicador, sin propietario y con Excel, enlaces o
 * carpetas para traer muchos. Lo demás se completa al «Activar».
 *
 * `perfil` lleva el perfil ya elegido para que no se vuelva a preguntar.
 */
export function SoloPublicarEnElMarketplace({
  perfil,
  className,
}: {
  perfil?: 'agency' | 'landlord'
  className?: string
}) {
  const destino = perfil ? `/publica?perfil=${perfil}` : '/publica'
  return (
    <Link
      href={destino}
      className={cn(
        'group flex items-center gap-4 rounded-lg border border-border bg-surface p-4 text-left transition-colors',
        'hover:border-primary/40 hover:bg-primary-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        className,
      )}
      data-testid="solo-publicar-en-el-marketplace"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
        <Storefront size={22} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium leading-snug text-fg">
          ¿Sólo quieres publicar en el marketplace?
        </span>
        <span className="mt-0.5 block text-body-sm leading-snug text-fg-subtle">
          Gratis y en un minuto: sin NIT ni propietarios. Sube uno o cientos de una vez, con un Excel, tus enlaces o tus fotos.
        </span>
      </span>
      <span className="hidden shrink-0 items-center gap-1.5 text-body-sm font-medium text-primary sm:inline-flex">
        Publicar gratis
        <ArrowRight size={14} weight="bold" aria-hidden className="transition-transform group-hover:translate-x-0.5" />
      </span>
      <ArrowRight size={16} weight="bold" aria-hidden className="shrink-0 text-primary sm:hidden" />
    </Link>
  )
}
