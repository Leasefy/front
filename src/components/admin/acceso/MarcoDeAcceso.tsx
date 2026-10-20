'use client'

import { Eyebrow } from '@leasefy/cadence'

import { LeasefyLogotype } from '@/components/brand/LeasefySymbol'
import { FondoDeMarca } from '@/components/auth/FondoDeMarca'
import LogoDefs from '@/components/landing-v2/LogoDefs'
import { ForceLightMode } from '@/components/providers/ForceLightMode'

/**
 * El marco de las pantallas de entrada del admin: login, el enlace del correo,
 * «sin acceso» y el segundo factor.
 *
 * 🔴 19-10-2026 (Nico: «el admin debe ser admin de Leasefy»). Es la MISMA
 * entrada que la de la plataforma (`/auth`, `/auth/mfa-verify`): el video de
 * marca a pantalla completa, el logotipo blanco arriba a la izquierda y la
 * tarjeta de 480 px flotando a la derecha. En el celular no hay video: la
 * tarjeta es la pantalla y lleva el logotipo arriba. Antes era un panel
 * partido con el logo y el azul de otra marca.
 *
 * Lo único propio es el rótulo «Admin de Leasefy» sobre el título, para que
 * nadie confunda esta puerta con la de las inmobiliarias. Sin testimonios: son
 * para convencer a quien llega, y acá entra el equipo.
 */
export function MarcoDeAcceso({
  children,
  centrado = false,
  'data-testid': testId,
}: {
  children: React.ReactNode
  /** Contenido centrado en la tarjeta (cargando, «sin acceso»). */
  centrado?: boolean
  'data-testid'?: string
}) {
  return (
    <ForceLightMode>
      <div className="relative min-h-screen bg-background" data-lenis-prevent>
        <FondoDeMarca />

        <LogoDefs />
        {/* z-20: por encima de la tarjeta, que ocupa toda la pantalla. La capa
            no recibe clics; sólo el logo. */}
        <div className="pointer-events-none fixed inset-0 z-20 hidden lg:block">
          <a
            href="/"
            aria-label="Leasefy — inicio"
            className="pointer-events-auto absolute left-8 top-8 inline-flex text-white"
          >
            <svg viewBox="0 0 947 235" className="block h-8 w-auto" role="img" aria-label="Leasefy">
              <use href="#lfLogo" />
            </svg>
          </a>
        </div>

        <div className="relative z-10 flex min-h-screen flex-col lg:flex-row lg:items-center lg:justify-end lg:p-8">
          <div
            className="relative flex w-full flex-col px-6 py-6 sm:px-10 sm:py-8 lg:max-h-[calc(100vh-4rem)] lg:w-[480px] lg:overflow-y-auto lg:rounded-lg lg:bg-surface lg:p-10 lg:shadow-[0_24px_64px_-16px_rgba(20,19,15,0.45)] lg:ring-1 lg:ring-black/5"
            data-lenis-prevent
            data-testid={testId ?? 'admin-acceso'}
          >
            {/* En el celular la marca va en la tarjeta: sin video, la pantalla
                no diría de quién es. */}
            <div className="mx-auto flex h-8 w-full max-w-[400px] items-center lg:hidden">
              <a href="/" className="inline-flex items-center" aria-label="Leasefy — inicio">
                <LeasefyLogotype size={20} className="text-fg" title="Leasefy" />
              </a>
            </div>

            <div
              className={
                'mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center gap-7 py-12 lg:py-0 ' +
                (centrado ? 'items-center text-center' : 'lg:justify-start')
              }
            >
              <Eyebrow>Admin de Leasefy</Eyebrow>
              {children}
            </div>
          </div>
        </div>
      </div>
    </ForceLightMode>
  )
}

/**
 * El título y la bajada de la tarjeta, con la misma tipografía que `/auth`
 * (30 px; `text-h2` es responsiva y a 1440 se parte en la tarjeta de 480).
 */
export function TituloDeAcceso({ titulo, bajada }: { titulo: React.ReactNode; bajada?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h1 className="text-balance font-heading text-[30px] font-medium leading-[1.1] tracking-[-0.03em] text-fg">
        {titulo}
      </h1>
      {bajada ? <p className="text-pretty text-body-sm text-fg-muted">{bajada}</p> : null}
    </div>
  )
}
