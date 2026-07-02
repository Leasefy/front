'use client'

/**
 * HistorialTab — estudio de inquilino, vista de caso (zona CENTRO).
 *
 * Visión §11: la línea de tiempo vertical de eventos del estudio (solicitud
 * creada → documentos recibidos → motor evaluó → decisión → acciones del
 * humano …). UX-only: el historial real necesita un endpoint de eventos que
 * todavía no existe → mostramos un EMPTY-STATE con la estructura de ejemplo
 * de cómo se verá la línea de tiempo (sin inventar datos ni endpoints).
 */

import { ClockCounterClockwise, type Icon } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { EmptyState } from '@/components/data-display/EmptyState'
import type { EstudioDecision, TenantScoringResult } from '@/lib/estudio/decision'

interface HistorialTabProps {
  /** disponibles para enriquecer el historial cuando exista backend. */
  decision?: EstudioDecision
  result?: TenantScoringResult
}

const NS = 'inmobiliaria.ai.estudio'

/** Pasos de ejemplo (estructura visual de la futura línea de tiempo). */
const EJEMPLO_EVENTOS: { icon: Icon; titleKey: string; titleFb: string; descKey: string; descFb: string }[] = [
  {
    icon: ClockCounterClockwise,
    titleKey: `${NS}.detalle.historial.ejemplo.solicitud.title`,
    titleFb: 'Solicitud creada',
    descKey: `${NS}.detalle.historial.ejemplo.solicitud.desc`,
    descFb: 'El candidato inició el proceso de estudio.',
  },
  {
    icon: ClockCounterClockwise,
    titleKey: `${NS}.detalle.historial.ejemplo.documentos.title`,
    titleFb: 'Documentos recibidos',
    descKey: `${NS}.detalle.historial.ejemplo.documentos.desc`,
    descFb: 'Se cargaron los soportes de identidad e ingresos.',
  },
  {
    icon: ClockCounterClockwise,
    titleKey: `${NS}.detalle.historial.ejemplo.evaluacion.title`,
    titleFb: 'Estudio evaluado',
    descFb: 'El motor analizó la información y calculó el puntaje.',
    descKey: `${NS}.detalle.historial.ejemplo.evaluacion.desc`,
  },
  {
    icon: ClockCounterClockwise,
    titleKey: `${NS}.detalle.historial.ejemplo.decision.title`,
    titleFb: 'Decisión registrada',
    descKey: `${NS}.detalle.historial.ejemplo.decision.desc`,
    descFb: 'Se determinó el resultado y las próximas acciones.',
  },
]

export function HistorialTab(_props: HistorialTabProps) {
  const { t } = useI18n()

  /** i18n con fallback — nunca muestra la clave cruda. */
  const tf = (key: string, fallback: string): string => {
    const r = t(key)
    return r === key ? fallback : r
  }

  return (
    <div className="space-y-5">
      <EmptyState
        icon={ClockCounterClockwise}
        title={tf(`${NS}.detalle.historial.empty.title`, 'Aún no hay historial')}
        description={tf(
          `${NS}.detalle.historial.empty.description`,
          'Cuando el estudio registre eventos, verás aquí la línea de tiempo completa: desde la solicitud hasta la decisión y las acciones del equipo.',
        )}
      />

      {/* Estructura de ejemplo — cómo se verá la línea de tiempo (sin datos reales) */}
      <section
        aria-label={tf(`${NS}.detalle.historial.ejemplo.title`, 'Ejemplo de la línea de tiempo')}
        className="rounded-xl border border-border bg-card p-5"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
          {tf(`${NS}.detalle.historial.ejemplo.title`, 'Ejemplo de la línea de tiempo')}
        </p>
        <ol role="list" className="mt-4 relative">
          {/* Línea vertical conectora */}
          <span
            aria-hidden="true"
            className="absolute left-[11px] top-1 bottom-1 w-px bg-border"
          />
          {EJEMPLO_EVENTOS.map((ev, i) => {
            const EvIcon = ev.icon
            return (
              <li key={ev.titleKey} className="relative flex gap-3 pb-5 last:pb-0">
                <span className="relative z-10 w-6 h-6 rounded-full bg-surface-muted flex items-center justify-center shrink-0 ring-4 ring-card">
                  <EvIcon
                    className="w-3.5 h-3.5 text-fg-subtle"
                    weight="duotone"
                    aria-hidden="true"
                  />
                </span>
                <div className="min-w-0 flex-1 -mt-0.5">
                  <p className="text-sm font-medium text-fg leading-tight">
                    {tf(ev.titleKey, ev.titleFb)}
                  </p>
                  <p className="mt-0.5 text-xs text-fg-muted leading-snug">
                    {tf(ev.descKey, ev.descFb)}
                  </p>
                  <span className="mt-1 inline-block text-xs text-fg-subtle tabular-nums">
                    {tf(`${NS}.detalle.historial.ejemplo.pendiente`, '— · —')}
                  </span>
                </div>
                {/* marca de paso (placeholder visual) */}
                <span className="text-xs text-fg-subtle tabular-nums shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </li>
            )
          })}
        </ol>
        <p className="mt-1 text-xs text-fg-subtle leading-snug">
          {tf(
            `${NS}.detalle.historial.ejemplo.nota`,
            'Estructura ilustrativa. Los eventos reales aparecerán con su fecha y autor cuando estén disponibles.',
          )}
        </p>
      </section>
    </div>
  )
}
