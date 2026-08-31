'use client'

/**
 * PilotoKpis — la franja de números del Piloto automático.
 *
 * SOLO números que ya viven en los hooks de la página (nada inventado):
 *   · Pendientes        = inbox.total
 *   · Prioridad alta    = inbox.porPrioridad.alta
 *   · Prioridad media   = inbox.porPrioridad.media
 *   · Actividad de hoy  = count del feed con `at` de hoy (lo calcula la página)
 *
 * Un valor `undefined` (fuente caída / endpoint aún no publicado) pinta «—»,
 * nunca un cero: un cero afirma que no hay nada, que es lo que no sabemos.
 */

import { useI18n } from '@/lib/i18n'
import { formatCurrency } from '@/lib/format'

const NS = 'inmobiliaria.piloto.kpis'

export interface PilotoKpisProps {
  pendientes: number | undefined
  alta: number | undefined
  media: number | undefined
  actividadHoy: number | undefined
  /**
   * Recuperado del mes (COP, del briefing). Sin dato el tile NO se pinta:
   * un «—» en un renglón de plata se lee como plata en cero o rota.
   */
  recuperadoMesCop?: number
  isLoading?: boolean
}

const numberFormatter = new Intl.NumberFormat('es-CO')

function KpiCard({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground leading-tight">{label}</p>
      <p className="text-xl font-semibold text-foreground mt-1 font-mono tabular-nums">
        {value === undefined ? '—' : numberFormatter.format(value)}
      </p>
    </div>
  )
}

export function PilotoKpis({
  pendientes,
  alta,
  media,
  actividadHoy,
  recuperadoMesCop,
  isLoading,
}: PilotoKpisProps) {
  const { t } = useI18n()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="piloto-kpis-loading">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl border border-border bg-muted/40 animate-pulse" />
        ))}
      </div>
    )
  }

  const conRecuperado = typeof recuperadoMesCop === 'number'

  return (
    <div
      className={`grid grid-cols-2 gap-4 ${conRecuperado ? 'md:grid-cols-3 xl:grid-cols-5' : 'md:grid-cols-4'}`}
      data-testid="piloto-kpis"
    >
      <KpiCard label={t(`${NS}.pendientes`)} value={pendientes} />
      <KpiCard label={t(`${NS}.alta`)} value={alta} />
      <KpiCard label={t(`${NS}.media`)} value={media} />
      <KpiCard label={t(`${NS}.actividadHoy`)} value={actividadHoy} />
      {conRecuperado && (
        <div className="rounded-xl border border-border bg-card p-4" data-testid="piloto-kpi-recuperado">
          <p className="text-xs text-muted-foreground leading-tight">{t(`${NS}.recuperadoMes`)}</p>
          <p className="text-xl font-semibold text-foreground mt-1 font-mono tabular-nums whitespace-nowrap">
            {formatCurrency(recuperadoMesCop)}
          </p>
        </div>
      )}
    </div>
  )
}
