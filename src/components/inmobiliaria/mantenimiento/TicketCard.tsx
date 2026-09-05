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
  // emergencia y alta comparten el tono `danger` (los dos son severidad crítica);
  // el anillo a full distingue la emergencia. El label i18n va siempre al lado,
  // así que el color no es el único portador de la distinción.
  emergencia: 'bg-danger-soft text-danger ring-1 ring-danger',
  alta: 'bg-danger-soft text-danger ring-1 ring-danger/30',
  media: 'bg-warning-soft text-warning ring-1 ring-warning/30',
  baja: 'bg-info-soft text-info ring-1 ring-info/30',
  informativa: 'bg-surface-muted text-fg-muted ring-1 ring-border',
}

/** Tailwind classes per score bucket (the colored score pill). */
const BUCKET_CLASSES: Record<ScoreBucket, string> = {
  bajo: 'bg-surface-muted text-fg-muted',
  medio: 'bg-info-soft text-info',
  alto: 'bg-warning-soft text-warning',
  critico: 'bg-danger-soft text-danger',
  // `critico` y `emergencia` caen los dos en `danger`; el anillo escala el último.
  emergencia: 'bg-danger-soft text-danger ring-1 ring-danger',
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
      className="cursor-pointer p-4 transition-colors hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
    >
      {/* Header: title + score pill */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-fg leading-snug">
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
      <p className="mt-1.5 flex items-center gap-1 text-xs text-fg-muted">
        <MapPin size={13} weight="duotone" className="shrink-0" />
        <span className="truncate">
          {ticket.inmueble.address}
          {ticket.inmueble.unit ? ` · ${ticket.inmueble.unit}` : ''}
        </span>
      </p>

      {/* Severidad + categoría + tiempo */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Badge className={SEVERITY_CLASSES[ticket.severidad]}>{sev}</Badge>
        <Badge className="bg-surface-muted text-fg-muted" Icon={Wrench}>
          {cat}
        </Badge>
        <span className="inline-flex items-center gap-1 text-xs text-fg-subtle">
          <Clock size={12} weight="duotone" className="shrink-0" />
          {relativeTime(ticket.createdAt, locale)}
        </span>
      </div>

      {/* Proveedor sugerido */}
      <p className="mt-2 text-xs text-fg-muted">
        <span className="text-fg-subtle">
          {t('inmobiliaria.ai.mantenimiento.card.proveedorSugerido')}:
        </span>{' '}
        {ticket.proveedorSugerido ? (
          <span className="font-medium text-fg">
            {ticket.proveedorSugerido}
          </span>
        ) : (
          <span className="italic text-fg-subtle">
            {t('inmobiliaria.ai.mantenimiento.card.sinProveedor')}
          </span>
        )}
      </p>

      {/* Responsable — ALWAYS a hypothesis, never a verdict (FENCE) */}
      <p className="mt-1 text-xs text-fg-muted">
        <span aria-hidden="true">≈ </span>
        {responsableLabel}
      </p>

      {/* Secondary badges */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {ticket.requiereAprobacion ? (
          <Badge className="bg-primary-soft text-primary ring-1 ring-primary/30">
            {t('inmobiliaria.ai.mantenimiento.card.requiereAprobacion')}
          </Badge>
        ) : null}
        {ticket.reabierto ? (
          <Badge
            className="bg-danger-soft text-danger ring-1 ring-danger/30"
            Icon={ArrowsClockwise}
          >
            {t('inmobiliaria.ai.mantenimiento.card.reabierto')}
          </Badge>
        ) : null}
        {ticket.retencionRiesgo ? (
          <Badge
            className="bg-warning-soft text-warning ring-1 ring-warning/30"
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
            className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-surface-muted text-fg-subtle"
            aria-label={t('inmobiliaria.ai.mantenimiento.inbox.card.hasPhotos')}
          >
            <Camera size={12} weight="duotone" />
          </span>
        ) : null}
        {ticket.costoEstimadoCop !== undefined ? (
          <Badge className="bg-success-soft text-success ring-1 ring-success/30">
            {formatCOP(ticket.costoEstimadoCop)}
          </Badge>
        ) : null}
      </div>
    </Card>
  )
}
