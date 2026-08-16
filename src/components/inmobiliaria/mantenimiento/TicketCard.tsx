'use client'

/**
 * TicketCard.tsx — Phase 7 plan 07-03 (DASH-02)
 *
 * One card in the prioritized maintenance inbox. Shows título, inmueble, score +
 * bucket, categoría, tiempo (relative), proveedor sugerido (if any) and the
 * approval badge, plus secondary badges (reabierto / fotos / retención / severidad)
 * and the probable-responsible party.
 *
 * COMPLIANCE (CONTEXT §"No prometer"): `responsableProbable` is ALWAYS rendered as a
 * HYPOTHESIS — prefixed with "≈" and the i18n enum label — never as a verdict.
 *
 * ALL user-facing strings come from i18n keys declared by 07-02 (the canonical
 * C7-03 tree). No hardcoded Spanish/English literals. Domain types imported from
 * 07-01; never redefined.
 */

import type * as React from 'react'
import {
  Camera,
  MapPin,
  Clock,
  Wrench,
  ArrowsClockwise,
  ShieldWarning,
  type Icon,
} from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { relativeTime } from '@/lib/cartera'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui'
import type { MaintenanceTicketCard, Severity, ScoreBucket } from '@/lib/types/mantenimiento'

interface TicketCardProps {
  ticket: MaintenanceTicketCard
  onSelect: (id: string) => void
}

/** Compact integer-COP formatter (parity with CobranzaKpiStrip / MantenimientoKpiStrip). */
function formatCOP(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value}`
}

/** Tailwind classes per severity (calca daysBadgeClasses de DeudoresListClient). */
const SEVERITY_CLASSES: Record<Severity, string> = {
  emergencia:
    'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/30 dark:text-red-400 dark:ring-red-800',
  alta:
    'bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:ring-orange-800',
  media:
    'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-800',
  baja:
    'bg-sky-50 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:ring-sky-800',
  informativa:
    'bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200 dark:bg-neutral-800/50 dark:text-neutral-400 dark:ring-neutral-700',
}

/** Tailwind classes per score bucket (the colored score pill). */
const BUCKET_CLASSES: Record<ScoreBucket, string> = {
  bajo: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  medio: 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300',
  alto: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  critico: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
  emergencia: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
}

/**
 * The bucket i18n keys are Capitalized (enums.bucket.Bajo …) while the domain
 * `ScoreBucket` union is lowercase. Map lowercase value → canonical capitalized key.
 */
const BUCKET_I18N_KEY: Record<ScoreBucket, string> = {
  bajo: 'Bajo',
  medio: 'Medio',
  alto: 'Alto',
  critico: 'Critico',
  emergencia: 'Emergencia',
}

function Badge({
  children,
  className,
  Icon,
}: {
  children: React.ReactNode
  className?: string
  Icon?: Icon
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        className,
      )}
    >
      {Icon ? <Icon size={12} className="shrink-0" weight="duotone" /> : null}
      {children}
    </span>
  )
}

export function TicketCard({ ticket, onSelect }: TicketCardProps) {
  const { t, locale } = useI18n()

  const sev = t(`inmobiliaria.ai.mantenimiento.enums.severidad.${ticket.severidad}`)
  const cat = t(`inmobiliaria.ai.mantenimiento.enums.categoria.${ticket.categoria}`)
  const bucketLabel = t(`inmobiliaria.ai.mantenimiento.enums.bucket.${BUCKET_I18N_KEY[ticket.bucket]}`)
  const responsableLabel = t(
    `inmobiliaria.ai.mantenimiento.enums.responsable.${ticket.responsableProbable}`,
  )

  const handleActivate = () => onSelect(ticket.id)

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={ticket.titulo}
      onClick={handleActivate}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleActivate()
        }
      }}
      className="cursor-pointer p-4 transition-colors hover:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:hover:border-violet-500"
    >
      {/* Header: title + score pill */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white leading-snug">
          {ticket.titulo}
        </h3>
        <span
          className={cn(
            'shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums',
            BUCKET_CLASSES[ticket.bucket],
          )}
          aria-label={`${t('inmobiliaria.ai.mantenimiento.card.score')} ${ticket.score} ${bucketLabel}`}
        >
          {ticket.score}
          <span className="opacity-70">·</span>
          {bucketLabel}
        </span>
      </div>

      {/* Inmueble */}
      <p className="mt-1.5 flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
        <MapPin size={13} weight="duotone" className="shrink-0" />
        <span className="truncate">
          {ticket.inmueble.address}
          {ticket.inmueble.unit ? ` · ${ticket.inmueble.unit}` : ''}
        </span>
      </p>

      {/* Severidad + categoría + tiempo */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Badge className={SEVERITY_CLASSES[ticket.severidad]}>{sev}</Badge>
        <Badge className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" Icon={Wrench}>
          {cat}
        </Badge>
        <span className="inline-flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
          <Clock size={12} weight="duotone" className="shrink-0" />
          {relativeTime(ticket.createdAt, locale)}
        </span>
      </div>

      {/* Proveedor sugerido */}
      <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
        <span className="text-neutral-400 dark:text-neutral-500">
          {t('inmobiliaria.ai.mantenimiento.card.proveedorSugerido')}:
        </span>{' '}
        {ticket.proveedorSugerido ? (
          <span className="font-medium text-neutral-800 dark:text-neutral-200">
            {ticket.proveedorSugerido}
          </span>
        ) : (
          <span className="italic text-neutral-400 dark:text-neutral-500">
            {t('inmobiliaria.ai.mantenimiento.card.sinProveedor')}
          </span>
        )}
      </p>

      {/* Responsable — ALWAYS a hypothesis, never a verdict (FENCE) */}
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        <span aria-hidden="true">≈ </span>
        {responsableLabel}
      </p>

      {/* Secondary badges */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {ticket.requiereAprobacion ? (
          <Badge className="bg-violet-50 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:ring-violet-800">
            {t('inmobiliaria.ai.mantenimiento.card.requiereAprobacion')}
          </Badge>
        ) : null}
        {ticket.reabierto ? (
          <Badge
            className="bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:ring-rose-800"
            Icon={ArrowsClockwise}
          >
            {t('inmobiliaria.ai.mantenimiento.card.reabierto')}
          </Badge>
        ) : null}
        {ticket.retencionRiesgo ? (
          <Badge
            className="bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200 dark:bg-fuchsia-950/30 dark:text-fuchsia-300 dark:ring-fuchsia-800"
            Icon={ShieldWarning}
          >
            {t('inmobiliaria.ai.mantenimiento.card.retencionRiesgo')}
          </Badge>
        ) : null}
        {ticket.hasPhotos ? (
          // Icon-only affordance: the canonical C7-03 `card.*` tree has no `hasPhotos`
          // key (reported as a coordination gap). We use the existing-but-non-canonical
          // `inbox.card.hasPhotos` only for the aria-label so the badge stays accessible.
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
            aria-label={t('inmobiliaria.ai.mantenimiento.inbox.card.hasPhotos')}
          >
            <Camera size={12} weight="duotone" />
          </span>
        ) : null}
        {ticket.costoEstimadoCop !== undefined ? (
          <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800">
            {formatCOP(ticket.costoEstimadoCop)}
          </Badge>
        ) : null}
      </div>
    </Card>
  )
}
