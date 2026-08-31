'use client'

/**
 * PilotoKpis — los cuatro números que cambian lo que hacés hoy.
 *
 * ── Por qué se rediseñó (2026-08-30) ───────────────────────────────────────
 * Los tiles anteriores decían «Pendientes 20» y al lado «Prioridad alta 20»:
 * el MISMO número dos veces, porque el micro sube a alta todo lo que lleva
 * más de 48 h esperando. Un KPI que repite a su vecino no informa, ocupa.
 *
 * Ahora cada tile responde algo distinto:
 *   · Esperan tu decisión — con cuántas llevan más de una semana (eso sí
 *     cambia la urgencia, y no estaba en ninguna parte).
 *   · Recuperado este mes — la plata, cuando el briefing la trae.
 *   · Actividad de hoy — cuánto se movió el piloto sin vos.
 *   · Agentes autónomos — cuánto delegaste de verdad (n de m).
 *
 * `undefined` se pinta «—», nunca 0: un cero inventado miente sobre una
 * fuente que no contestó.
 */

import { ClockCountdown, Lightning, Robot, TrendUp, type Icon } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { formatCurrency } from '@/lib/format'

interface Tile {
  label: string
  valor: string
  sublabel?: string
  icon: Icon
  /** Resalta el tile cuando el número exige acción. */
  alerta?: boolean
}

export interface PilotoKpisProps {
  pendientes?: number
  /** Cuántas de las pendientes llevan más de 7 días esperando. */
  atrasadas?: number
  actividadHoy?: number
  recuperadoMesCop?: number
  autonomos?: number
  totalAgentes?: number
  isLoading?: boolean
}

const num = (n?: number): string => (typeof n === 'number' ? String(n) : '—')

export function PilotoKpis({
  pendientes,
  atrasadas,
  actividadHoy,
  recuperadoMesCop,
  autonomos,
  totalAgentes,
  isLoading = false,
}: PilotoKpisProps) {
  const { t } = useI18n()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[86px] animate-pulse rounded-lg border border-border bg-surface-muted"
            role="status"
            aria-label={t('common.loading')}
          />
        ))}
      </div>
    )
  }

  const tiles: Tile[] = [
    {
      label: t('inmobiliaria.piloto.kpis.pendientes'),
      valor: num(pendientes),
      icon: ClockCountdown,
      ...(typeof atrasadas === 'number' && atrasadas > 0
        ? {
            sublabel: t('inmobiliaria.piloto.kpis.atrasadas', { n: String(atrasadas) }),
            alerta: true,
          }
        : {}),
    },
    ...(typeof recuperadoMesCop === 'number'
      ? [
          {
            label: t('inmobiliaria.piloto.kpis.recuperadoMes'),
            valor: formatCurrency(recuperadoMesCop),
            icon: TrendUp,
          },
        ]
      : []),
    {
      label: t('inmobiliaria.piloto.kpis.actividadHoy'),
      valor: num(actividadHoy),
      icon: Lightning,
    },
    {
      label: t('inmobiliaria.piloto.kpis.autonomos'),
      valor:
        typeof autonomos === 'number' && typeof totalAgentes === 'number'
          ? `${autonomos}/${totalAgentes}`
          : '—',
      sublabel: t('inmobiliaria.piloto.kpis.autonomosHint'),
      icon: Robot,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((tile) => {
        const TileIcon = tile.icon
        return (
          <div
            key={tile.label}
            className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong"
          >
            <div className="flex items-center gap-1.5 text-xs text-fg-muted">
              <TileIcon weight="duotone" className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{tile.label}</span>
            </div>
            <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-fg">
              {tile.valor}
            </p>
            {tile.sublabel && (
              <p
                className={`mt-0.5 truncate text-[11px] ${tile.alerta ? 'text-danger' : 'text-fg-subtle'}`}
              >
                {tile.sublabel}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
