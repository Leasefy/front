'use client'

/**
 * DecisionCard — estudio de inquilino (el alma de la visión §7/§9/§10).
 *
 * Renderiza la DECISIÓN explicada derivada del motor (deriveEstudioDecision):
 * tipo de resultado + banda/score + resumen + tabla de indicadores + motivos +
 * condiciones + "siguiente mejor acción" + CTAs.
 *
 * UX-only: NO ejecuta nada — emite `onAction(code)` para que la página/rail
 * decida qué hacer (T-323: nunca un "rechazar/descartar" automático).
 */

import { Button } from '@/components/ui/button'
import type { EstudioActionCode, EstudioDecision } from '@/lib/estudio/decision'
import { resultTypeColorClasses } from '@/lib/estudio/colors'
import { ResultTypeBadge } from './ResultTypeBadge'
import { IndicadoresTable } from './IndicadoresTable'
import { CondicionesList } from './CondicionesList'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/** Etiquetas por defecto (es) — fallback si la clave i18n aún no existe. */
const ACTION_LABELS_ES: Record<EstudioActionCode, string> = {
  enviar_a_asegurabilidad: 'Enviar a asegurabilidad',
  crear_contrato: 'Crear contrato',
  compartir_propietario: 'Compartir con propietario',
  descargar: 'Descargar estudio',
  solicitar_codeudor: 'Solicitar codeudor',
  pedir_documentos: 'Pedir documentos adicionales',
  enviar_revision_humana: 'Enviar a revisión humana',
  buscar_otro_candidato: 'Buscar otro candidato',
  sugerir_inmueble_menor: 'Sugerir inmueble de menor valor',
}

export interface DecisionCardProps {
  decision: EstudioDecision
  onAction?: (code: EstudioActionCode) => void
  className?: string
}

export function DecisionCard({ decision, onAction, className }: DecisionCardProps) {
  const { t } = useI18n()
  const c = resultTypeColorClasses(decision.resultType)

  /** i18n con fallback: evita que una clave faltante muestre la clave cruda. */
  const tf = (key: string, fallback: string): string => {
    const r = t(key)
    return r === key ? fallback : r
  }
  const actionLabel = (code: EstudioActionCode): string =>
    tf(`inmobiliaria.ai.estudio.acciones.${code}`, ACTION_LABELS_ES[code])

  const next = decision.siguienteMejorAccion
  const secondaryCtas = decision.ctas.filter((code) => code !== next?.code)

  return (
    <div
      className={cn('rounded-lg border bg-card p-5 space-y-5', c.border, className)}
      data-testid="estudio-decision-card"
      data-result-type={decision.resultType}
    >
      {/* Header — tipo de resultado + banda/score */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1.5 min-w-0">
          <ResultTypeBadge resultType={decision.resultType} />
          <h3 className="text-base font-semibold text-fg leading-tight">{decision.titulo}</h3>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap',
            c.text,
            c.bg,
            c.border,
          )}
        >
          {tf('inmobiliaria.ai.estudio.detalle.nivel', 'Nivel')} {decision.scoreBand} · {decision.score}/100
        </span>
      </div>

      {/* Resumen humano */}
      {decision.resumen && (
        <p className="text-sm text-fg-muted leading-relaxed">{decision.resumen}</p>
      )}

      {/* Tabla de indicadores (visión §7) */}
      <IndicadoresTable indicadores={decision.indicadores} />

      {/* Motivos (visión §10) */}
      {decision.motivos.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
            {tf('inmobiliaria.ai.estudio.detalle.motivos', 'Motivos')}
          </p>
          <ul role="list" className="space-y-1">
            {decision.motivos.map((m, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm text-fg leading-snug"
              >
                <span aria-hidden className="mt-1.5 w-1 h-1 rounded-full bg-fg-subtle shrink-0" />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Condiciones para avanzar (visión §9) */}
      <CondicionesList condiciones={decision.condiciones} />

      {/* Siguiente mejor acción + CTAs (visión §7) */}
      {(next || secondaryCtas.length > 0) && (
        <div className="space-y-2 pt-1">
          {next && (
            <Button
              type="button"
              onClick={() => onAction?.(next.code)}
              className="w-full"
              data-action={next.code}
            >
              {actionLabel(next.code)}
            </Button>
          )}
          {secondaryCtas.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {secondaryCtas.map((code) => (
                <Button
                  key={code}
                  type="button"
                  variant="secondary"
                  size="sm"
                  hideArrow
                  onClick={() => onAction?.(code)}
                  data-action={code}
                >
                  {actionLabel(code)}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
