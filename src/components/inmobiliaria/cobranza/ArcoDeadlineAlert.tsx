'use client'

/**
 * ArcoDeadlineAlert — el bloque de plazos ARCO fijado arriba de la campana.
 *
 * Va FIJO y no dentro de la lista de notificaciones, por una razón de fondo:
 * un plazo legal no es una notificación. Una notificación se marca como leída y
 * se va; un término de la Ley 1581 sigue corriendo aunque lo hayas visto, y sólo
 * desaparece cuando resolvés la solicitud. Mezclarlo con lo demás —ordenado por
 * fecha, con botón de "marcar como leída"— le daría al operador una forma de
 * silenciar algo que no se puede silenciar.
 *
 * Por eso: siempre arriba, sin descartar, y se va solo cuando el plazo deja de
 * estar en riesgo.
 */

import Link from 'next/link'
import { WarningCircle, Clock, CaretRight } from '@phosphor-icons/react'
import { Banner } from '@leasefy/cadence'

import { useI18n } from '@/lib/i18n'
import type { ArcoAlertsResult } from '@/lib/hooks/cobranza/use-arco-alerts'

const ARCO_HREF = '/panel/inmobiliaria/cobros/cobranza/arco'
const NS = 'inmobiliaria.ai.arco'

export function ArcoDeadlineAlert({
  alerts,
  onNavigate,
}: {
  alerts: ArcoAlertsResult
  onNavigate?: () => void
}) {
  const { t } = useI18n()

  if (alerts.all.length === 0) return null

  const critical = alerts.hasOverdue
  const count = critical ? alerts.overdue.length : alerts.urgent.length

  const title = critical
    ? t(`${NS}.${count === 1 ? 'attention.overdueTitle' : 'attention.overdueTitlePlural'}`)
        .replace('{count}', String(count))
    : t(`${NS}.${count === 1 ? 'attention.urgentTitle' : 'attention.urgentTitlePlural'}`)
        .replace('{count}', String(count))
        .replace('{days}', String(alerts.threshold))

  return (
    <Link
      href={ARCO_HREF}
      onClick={onNavigate}
      className="block border-b border-border-faint transition-opacity hover:opacity-80"
    >
      <Banner
        variant={critical ? 'danger' : 'warning'}
        title={title}
        // Dentro del popover el banner va a sangre: el borde y el radio los
        // pone la fila, no el propio banner.
        className="rounded-none border-0"
        icon={
          critical ? (
            <WarningCircle className="h-5 w-5" weight="fill" aria-hidden="true" />
          ) : (
            <Clock className="h-5 w-5" weight="fill" aria-hidden="true" />
          )
        }
      >
        {/* `span`, no `div`: Banner pinta sus children dentro de un `<p>`. */}
        <span className="flex items-center justify-between gap-2">
          <span className="text-xs leading-snug">{t(`${NS}.alert.subtitle`)}</span>
          <CaretRight className="h-4 w-4 shrink-0" weight="regular" aria-hidden="true" />
        </span>
      </Banner>
    </Link>
  )
}
