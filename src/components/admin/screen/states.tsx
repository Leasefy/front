/**
 * Los tres estados de una pantalla del admin —cargando, error y vacío— con los
 * componentes de Cadence (`SkeletonBlock`, `ErrorState`, `EmptyState`), igual
 * que en la plataforma. Nunca una pantalla en blanco.
 *
 * Cada uno va en su tarjeta (`suelto`, por defecto) o sin ella (`suelto={false}`)
 * para cuando vive DENTRO de otra tarjeta, como la de una tabla.
 */

import { Appear, EmptyState, ErrorState, SkeletonBlock } from '@leasefy/cadence'
import { MagnifyingGlass } from '@phosphor-icons/react'

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
  // Llega después de «cargando»: entra con fundido y 4 px (Cadence).
  return (
    <Appear distance="xs" className={cn(suelto && TARJETA, className)}>
      <ErrorState title={titulo} message={msg} onRetry={onReintentar} role="alert" />
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
