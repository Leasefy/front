/**
 * Los tres estados de una pantalla del admin —cargando, error y vacío—, igual
 * que en la plataforma. Nunca una pantalla en blanco. El de error se pinta como
 * `<FalloDeCarga>` de la plataforma y usa su clasificador (20-10-2026).
 *
 * Cada uno va en su tarjeta (`suelto`, por defecto) o sin ella (`suelto={false}`)
 * para cuando vive DENTRO de otra tarjeta, como la de una tabla.
 */

import { Appear, EmptyState, SkeletonBlock } from '@leasefy/cadence'
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
  suelto = true,
  className,
}: {
  error: Error | string
  onReintentar?: () => void
  titulo?: string
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
      <div role="alert" className="px-6 py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-surface-muted">
          <WarningOctagon weight="duotone" className="h-6 w-6 text-fg-subtle" aria-hidden="true" />
        </div>
        <div className="mt-4 space-y-1.5">
          <p className="text-subtitle font-medium text-fg">{titulo}</p>
          <p className="mx-auto max-w-md text-body-sm text-fg-muted">{msg}</p>
        </div>
        {onReintentar && sePuedeReintentar ? (
          <div className="mt-6 flex justify-center">
            <Button variant="outline" hideArrow onClick={onReintentar} className="gap-2">
              <ArrowsClockwise className="h-4 w-4" aria-hidden="true" />
              Intentar de nuevo
            </Button>
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
  suelto = true,
  className,
}: {
  title: string
  hint?: string
  icono?: React.ReactNode
  accion?: React.ReactNode
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
      />
    </Appear>
  )
}
