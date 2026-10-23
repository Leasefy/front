/**
 * Los tres estados de una pantalla del admin —cargando, error y vacío—, igual
 * que en la plataforma. Nunca una pantalla en blanco. El de error se pinta como
 * `<FalloDeCarga>` de la plataforma y usa su clasificador (20-10-2026).
 *
 * Cada uno va en su tarjeta (`suelto`, por defecto) o sin ella (`suelto={false}`)
 * para cuando vive DENTRO de otra tarjeta, como la de una tabla.
 */

import Link from 'next/link'
import { Appear, EmptyState, SkeletonBlock } from '@leasefy/cadence'
import type { TonoDeEsfera } from '@leasefy/cadence'
import { ArrowsClockwise, MagnifyingGlass, WarningOctagon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { clasificarFallo } from '@/lib/errores/clasificar'

import { cn } from '@/lib/utils'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'

const TARJETA = 'rounded-lg border border-border bg-surface'

export function LoadingBlock({
  label = 'Cargando',
  filas = 4,
  suelto = true,
  className,
}: {
  label?: string
  filas?: number
  suelto?: boolean
  className?: string
}) {
  return (
    <div className={cn(suelto && TARJETA, className)} role="status" aria-label={label}>
      <SkeletonBlock rows={filas} showHeader={false} className="p-5" />
    </div>
  )
}

export function ErrorBlock({
  error,
  onReintentar,
  titulo = 'No pudimos cargar esto',
  volverA,
  suelto = true,
  className,
}: {
  error: Error | string
  onReintentar?: () => void
  titulo?: string
  /** La salida cuando reintentar no tiene sentido (un 404 en una ficha). */
  volverA?: { label: string; href: string }
  suelto?: boolean
  className?: string
}) {
  // 02-10-2026 · Por el traductor (regla de oro): nunca «Error 500» ni
  // «Failed to fetch» crudos.
  const msg = typeof error === 'string' ? error : mensajeDelAdmin(error, { accion: 'cargar esta pantalla' })
  // «Intentar de nuevo» sólo si volver a pedirlo puede dar otro resultado:
  // sobre un 404 o un 403 sería mentir (el clasificador de la plataforma).
  const sePuedeReintentar = typeof error === 'string' || clasificarFallo(error).sePuedeReintentar
  // Llega después de «cargando»: entra con fundido y 4 px (Cadence).
  return (
    <Appear distance="xs" className={cn(suelto && TARJETA, className)}>
      {/* Glow up 22-10: el ícono va suelto (sin su baldosa) y el cartel siempre
          ofrece algo: reintentar si puede cambiar, o volver. */}
      <div role="alert" className="px-6 py-12 text-center">
        <WarningOctagon weight="duotone" className="mx-auto h-8 w-8 text-fg-subtle" aria-hidden="true" />
        <div className="mt-4 space-y-1.5">
          <p className="text-subtitle font-medium text-fg">{titulo}</p>
          <p className="mx-auto max-w-md text-body-sm text-fg-muted">{msg}</p>
        </div>
        {(onReintentar && sePuedeReintentar) || volverA ? (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {onReintentar && sePuedeReintentar ? (
              <Button variant="outline" size="sm" hideArrow onClick={onReintentar} className="gap-2">
                <ArrowsClockwise className="h-4 w-4" aria-hidden="true" />
                Intentar de nuevo
              </Button>
            ) : null}
            {volverA ? (
              <Button variant="ghost" size="sm" asChild>
                <Link href={volverA.href}>{volverA.label}</Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </Appear>
  )
}

export function EmptyBlock({
  title,
  hint,
  icono,
  accion,
  ilustracion,
  tono,
  suelto = true,
  className,
}: {
  title: string
  hint?: string
  icono?: React.ReactNode
  accion?: React.ReactNode
  /** Una ilustración 3D (`<Ilustracion nombre tono="auto" />`) para el vacío grande de la pantalla. */
  ilustracion?: React.ReactNode
  /** El tono de la esfera del ícono: `exito` cuando no tener nada pendiente está bien. */
  tono?: TonoDeEsfera
  suelto?: boolean
  className?: string
}) {
  return (
    <Appear distance="xs" className={cn(suelto && TARJETA, className)}>
      <EmptyState
        icon={icono ?? <MagnifyingGlass weight="bold" />}
        title={title}
        description={hint}
        action={accion}
        ilustracion={ilustracion}
        tono={tono}
      />
    </Appear>
  )
}
