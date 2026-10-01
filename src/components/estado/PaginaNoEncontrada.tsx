'use client'

/**
 * La 404, con cariño (Nico, 01-10: «esto debemos hacer un glow up, algo
 * hermoso, porque igual hay que ayudar al usuario de una manera más bonita»).
 *
 * Somos una plataforma de arriendos, así que una página que no existe es una
 * DIRECCIÓN que no existe: una placa de nomenclatura —«Calle 404 # 4-04»—
 * sobre la aurora de la marca. Y ayuda de verdad: dice qué ruta se buscó,
 * ofrece volver atrás y lleva a los cuatro lugares a los que la gente suele
 * querer ir, con su panel si ya tiene sesión.
 *
 * Sin «Reintentar», a propósito: reintentar un 404 no lo cambia.
 */

import { useContext, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  House,
  MagnifyingGlass,
  MapPin,
  Question,
  SquaresFour,
  type Icon,
} from '@phosphor-icons/react'

import { AuroraDeMarca } from '@/components/brand/AuroraDeMarca'
import { LeasefyLogotype, LeasefySymbol } from '@/components/brand/LeasefySymbol'
import { AuthContext } from '@/lib/auth/auth-context'

interface Destino {
  href: string
  icono: Icon
  titulo: string
  detalle: string
}

function destinos(conSesion: boolean): Destino[] {
  return [
    conSesion
      ? { href: '/auth/post-login', icono: SquaresFour, titulo: 'Ir a mi panel', detalle: 'Tus inmuebles, contratos y pagos.' }
      : { href: '/', icono: House, titulo: 'Ir al inicio', detalle: 'La portada de Leasefy.' },
    { href: '/propiedades', icono: MagnifyingGlass, titulo: 'Buscar arriendos', detalle: 'Inmuebles disponibles para arrendar.' },
    conSesion
      ? { href: '/', icono: House, titulo: 'Ir al inicio', detalle: 'La portada de Leasefy.' }
      : { href: '/auth', icono: SquaresFour, titulo: 'Entrar a mi cuenta', detalle: 'Tu panel, tus contratos y tus pagos.' },
    { href: '/ayuda', icono: Question, titulo: 'Centro de ayuda', detalle: 'Respuestas y cómo escribirnos.' },
  ]
}

/** La placa: así se ve una dirección en Colombia. Ésta no lleva a ningún lado. */
function PlacaDeDireccion() {
  return (
    <div className="relative">
      <div className="relative -rotate-2 rounded-xl bg-white px-7 pb-5 pt-4 text-ink shadow-[0_24px_60px_-20px_rgba(4,30,77,0.65)] ring-1 ring-black/5">
        <div className="pointer-events-none absolute inset-1.5 rounded-lg border-2 border-ink/80" />
        <div className="relative flex items-center justify-between gap-6">
          <span className="font-mono text-label uppercase tracking-mono-label text-ink/60">Dirección</span>
          <LeasefySymbol size={12} className="text-primary" />
        </div>
        <p className="relative mt-1 font-heading text-[44px] font-semibold leading-none tracking-[-0.04em] sm:text-[52px]">
          Calle 404
        </p>
        <p className="relative mt-2 font-mono text-[22px] font-medium tracking-tight text-ink/80"># 4 – 04</p>
      </div>
      <span className="absolute -right-4 -top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white text-primary shadow-lg ring-1 ring-black/5">
        <MapPin weight="fill" className="h-5 w-5" />
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger font-mono text-[10px] font-bold text-white">
          ?
        </span>
      </span>
    </div>
  )
}

export function PaginaNoEncontrada() {
  const ruta = usePathname()
  const router = useRouter()
  // Contexto crudo: la 404 no puede caerse por no tener sesión.
  const conSesion = Boolean(useContext(AuthContext)?.user)
  // «Volver» sólo si hay a dónde: abierta en una pestaña nueva no hay historial.
  const [hayAtras, setHayAtras] = useState(false)
  useEffect(() => setHayAtras(window.history.length > 1), [])

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg">
      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" aria-label="Leasefy — inicio" className="text-fg">
          <LeasefyLogotype size={24} />
        </Link>
      </header>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 px-6 pb-16 pt-4 sm:px-10 lg:min-h-[calc(100vh-96px)] lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-24">
        {/* La lámina: la aurora de la marca con la placa encima. */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex aspect-[5/4] items-center justify-center overflow-hidden rounded-2xl ring-1 ring-black/5 sm:aspect-[4/3] lg:aspect-[5/6]"
          data-testid="no-encontrada-lamina"
        >
          <AuroraDeMarca className="absolute inset-0" />
          <div className="relative">
            <PlacaDeDireccion />
          </div>
        </motion.div>

        {/* Lo que pasó y a dónde ir. */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="font-mono text-label uppercase tracking-mono-label text-primary">Error 404</p>
          <h1 className="mt-3 text-balance font-heading text-[36px] font-semibold leading-[1.05] tracking-[-0.035em] text-fg sm:text-[44px]">
            Esta dirección no existe
          </h1>
          <p className="mt-4 max-w-md text-pretty text-body text-fg-muted">
            Buscamos por todo el mapa y no encontramos esta página. Puede que el enlace esté mal escrito o que lo
            que buscabas se haya movido.
          </p>
          {ruta && ruta !== '/' ? (
            <p className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-border-faint bg-surface-muted px-3 py-1.5 text-body-sm text-fg-muted">
              <span className="shrink-0">Buscaste</span>
              <code className="truncate font-mono text-fg" data-testid="no-encontrada-ruta">
                {ruta}
              </code>
            </p>
          ) : null}

          <p className="mt-9 font-mono text-label uppercase tracking-mono-label text-fg-subtle">A dónde quieres ir</p>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2" data-testid="no-encontrada-destinos">
            {destinos(conSesion).map(({ href, icono: Icono, titulo, detalle }) => (
              <li key={titulo}>
                <Link
                  href={href}
                  className="group flex h-full items-start gap-3 rounded-xl border border-border bg-surface p-3.5 transition-colors hover:border-primary/40 hover:bg-primary-soft/40"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Icono className="h-[18px] w-[18px]" weight="duotone" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-body-sm font-semibold text-fg">
                      {titulo}
                      <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-fg-subtle opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                    </span>
                    <span className="mt-0.5 block text-caption text-fg-muted">{detalle}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
            {hayAtras ? (
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-1.5 text-body-sm font-medium text-fg transition-colors hover:text-primary"
                data-testid="no-encontrada-volver"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver a la página anterior
              </button>
            ) : null}
            <p className="text-body-sm text-fg-muted">
              ¿Llegaste por un enlace nuestro?{' '}
              <a href="mailto:hola@leasefy.co" className="font-medium text-primary hover:underline">
                Escríbenos
              </a>{' '}
              y lo arreglamos.
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  )
}
