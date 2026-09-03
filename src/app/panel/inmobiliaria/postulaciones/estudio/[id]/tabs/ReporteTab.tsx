'use client'

/**
 * ReporteTab — estudio de inquilino, vista de caso (zona CENTRO).
 *
 * Visión §15: el REPORTE FINAL del estudio, con dos vistas según el público:
 *  - "Interna inmobiliaria": versión completa (puntaje, motivos, condiciones).
 *  - "Propietario": versión resumida (resultado + síntesis, sin internals).
 * Más los botones Descargar / Compartir (PLACEHOLDERS — el armado del PDF y el
 * envío necesitan backend que todavía no existe; T-323: ninguna acción decide).
 *
 * Lo que se muestra del resultado (titulo / resumen / score / nivel) SÍ viene
 * del pipeline vía la decisión derivada — sin invenciones. Si aún no hay
 * decisión, mostramos un EMPTY-STATE.
 */

import { useState } from 'react'
import { FileText, DownloadSimple, ShareNetwork } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@leasefy/cadence'
import { EmptyState } from '@/components/data-display/EmptyState'
import type { EstudioDecision, TenantScoringResult } from '@/lib/estudio/decision'

interface ReporteTabProps {
  decision?: EstudioDecision
  result?: TenantScoringResult
}

const NS = 'inmobiliaria.ai.estudio'

type Audiencia = 'interna' | 'propietario'

export function ReporteTab({ decision, result }: ReporteTabProps) {
  const { t } = useI18n()
  const [audiencia, setAudiencia] = useState<Audiencia>('interna')

  /** i18n con fallback — nunca muestra la clave cruda. */
  const tf = (key: string, fallback: string): string => {
    const r = t(key)
    return r === key ? fallback : r
  }

  if (!decision) {
    return (
      <EmptyState
        icon={FileText}
        title={tf(`${NS}.detalle.reporte.empty.title`, 'El reporte aún no está listo')}
        description={tf(
          `${NS}.detalle.reporte.empty.description`,
          'Cuando el estudio tenga una decisión, podrás ver y compartir el reporte final desde aquí.',
        )}
      />
    )
  }

  const esInterna = audiencia === 'interna'

  return (
    <div className="space-y-5">
      {/* Barra de control: selector de audiencia + acciones */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Selector excluyente Interna / Propietario (SegmentedControl, §3) */}
        <SegmentedControl<Audiencia>
          aria-label={tf(`${NS}.detalle.reporte.audiencia`, 'Vista del reporte')}
          value={audiencia}
          onChange={(v) => setAudiencia(v)}
          options={[
            { value: 'interna', label: tf(`${NS}.detalle.reporte.interna`, 'Interna inmobiliaria') },
            { value: 'propietario', label: tf(`${NS}.detalle.reporte.propietario`, 'Propietario') },
          ]}
        />

        {/* Acciones (placeholders sin backend — §6 / T-323) */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            hideArrow
            disabled
            title={tf(`${NS}.detalle.reporte.proximamente`, 'Próximamente')}
          >
            <DownloadSimple className="w-4 h-4" weight="bold" aria-hidden="true" />
            {tf(`${NS}.detalle.reporte.descargar`, 'Descargar')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            hideArrow
            disabled
            title={tf(`${NS}.detalle.reporte.proximamente`, 'Próximamente')}
          >
            <ShareNetwork className="w-4 h-4" weight="bold" aria-hidden="true" />
            {tf(`${NS}.detalle.reporte.compartir`, 'Compartir')}
          </Button>
        </div>
      </div>

      {/* Nota de "próximamente" para descargar/compartir */}
      <p className="text-xs text-fg-subtle -mt-2">
        {tf(
          `${NS}.detalle.reporte.accionesNota`,
          'Descargar y compartir estarán disponibles cuando se conecte el generador de reportes.',
        )}
      </p>

      {/* Documento del reporte */}
      <article
        data-audiencia={audiencia}
        className="rounded-lg border border-border bg-card p-5 space-y-4"
      >
        {/* Encabezado del reporte */}
        <header className="flex items-start gap-3 pb-4 border-b border-border">
          <span className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
            <FileText
              className="w-5 h-5 text-primary"
              weight="duotone"
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-fg">
              {esInterna
                ? tf(`${NS}.detalle.reporte.tituloInterna`, 'Reporte del estudio · uso interno')
                : tf(`${NS}.detalle.reporte.tituloPropietario`, 'Reporte del estudio para el propietario')}
            </h3>
            <p className="text-xs text-fg-muted">
              {esInterna
                ? tf(`${NS}.detalle.reporte.subInterna`, 'Versión completa con puntaje, motivos y condiciones.')
                : tf(`${NS}.detalle.reporte.subPropietario`, 'Versión resumida, lista para enviar al propietario.')}
            </p>
          </div>
        </header>

        {/* Resultado (del pipeline) */}
        <section className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
            {tf(`${NS}.detalle.reporte.resultado`, 'Resultado')}
          </p>
          <p className="text-sm font-semibold text-fg">{decision.titulo}</p>
          <p className="text-sm leading-relaxed text-fg-muted">
            {decision.resumen}
          </p>
        </section>

        {/* Puntaje — SOLO en la vista interna */}
        {esInterna && (
          <section className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-4 py-2.5">
            <span className="text-sm font-medium text-fg">
              {tf(`${NS}.detalle.reporte.puntaje`, 'Puntaje')}
            </span>
            <span className="text-sm font-semibold text-fg tabular-nums">
              {decision.score}/100 · {tf(`${NS}.detalle.nivel`, 'Nivel')} {decision.scoreBand}
            </span>
          </section>
        )}

        {/* Motivos — SOLO en la vista interna */}
        {esInterna && decision.motivos.length > 0 && (
          <section className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
              {tf(`${NS}.detalle.reporte.motivos`, 'Motivos')}
            </p>
            <ul role="list" className="space-y-1.5">
              {decision.motivos.map((m, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm text-fg leading-snug"
                >
                  <span
                    aria-hidden="true"
                    className="mt-1.5 w-1 h-1 rounded-full bg-fg-subtle shrink-0"
                  />
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Condiciones — SOLO en la vista interna */}
        {esInterna && decision.condiciones.length > 0 && (
          <section className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
              {tf(`${NS}.detalle.reporte.condiciones`, 'Condiciones')}
            </p>
            <ul role="list" className="space-y-1.5">
              {decision.condiciones.map((c, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm text-fg leading-snug"
                >
                  <span
                    aria-hidden="true"
                    className="mt-1.5 w-1 h-1 rounded-full bg-warning-700 shrink-0"
                  />
                  <span>{c.detalle}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Nota de la vista propietario (qué se omite) */}
        {!esInterna && (
          <p className="text-xs text-fg-subtle leading-snug pt-1 border-t border-border">
            {tf(
              `${NS}.detalle.reporte.notaPropietario`,
              'La vista del propietario omite el puntaje y los detalles internos del análisis.',
            )}
          </p>
        )}
      </article>
    </div>
  )
}
