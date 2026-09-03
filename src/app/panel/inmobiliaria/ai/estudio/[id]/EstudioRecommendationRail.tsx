'use client'

/**
 * EstudioRecommendationRail — estudio de inquilino, zona DERECHA "Recomendación".
 *
 * Espejo de DebtorActionRail (cobranza):
 *  - eyebrow de zona
 *  - "Siguiente mejor acción": la `decision.siguienteMejorAccion` derivada del
 *    motor + el primer motivo (decision.motivos[0]) bajo una hairline como "por qué".
 *  - "Acciones rápidas": un RailAction por cada CTA de `decision.ctas`,
 *    RBAC-gated por `perms?.canAccess('estudio','decide')` (admin override).
 *
 * UX-only: NO ejecuta nada por sí mismo — relayea `onAction(code)` al padre.
 *
 * T-323 (guardrail legal duro): la UI NUNCA ofrece un "rechazar/descartar"
 * automático. El catálogo de acciones (EstudioActionCode) no contiene ninguna
 * acción de rechazo automático — `buscar_otro_candidato` es una sugerencia que
 * el humano inicia, no una baja del candidato. La decisión final es del humano.
 */

import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext'
import type { EstudioActionCode, EstudioDecision } from '@/lib/estudio/decision'
import { RailAction } from './RailAction'

const NS = 'inmobiliaria.ai.estudio'

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

interface EstudioRecommendationRailProps {
  decision: EstudioDecision | null
  runId: string
  onAction?: (code: EstudioActionCode) => void
}

export function EstudioRecommendationRail({
  decision,
  onAction,
}: EstudioRecommendationRailProps) {
  const { t } = useI18n()
  const perms = usePermissionsContextSafe()
  // estudio = ABSENT-ALLOWED tier; the decide action gates state-changing CTAs.
  const canDecide = perms?.canAccess('estudio', 'decide') ?? false
  const isAdmin = perms?.isAdmin ?? false
  const canAct = canDecide || isAdmin

  /** i18n con fallback: evita que una clave faltante muestre la clave cruda. */
  const tf = (key: string, fallback: string): string => {
    const r = t(key)
    return r === key ? fallback : r
  }
  const actionLabel = (code: EstudioActionCode): string =>
    tf(`${NS}.acciones.${code}`, ACTION_LABELS_ES[code])

  if (!decision) {
    return (
      <div className="space-y-4">
        <h2 className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"
          />
          <span className="text-xs font-medium uppercase tracking-wide text-fg-muted">
            {t(`${NS}.detalle.recomendacion`)}
          </span>
        </h2>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-fg-muted">
            {t(`${NS}.detalle.sinRecomendacion`)}
          </p>
        </div>
      </div>
    )
  }

  const next = decision.siguienteMejorAccion
  const porQue = decision.motivos[0] ?? null

  return (
    <div className="space-y-4">
      {/* Zone eyebrow */}
      <h2 className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"
        />
        <span className="text-xs font-medium uppercase tracking-wide text-fg-muted">
          {t(`${NS}.detalle.recomendacion`)}
        </span>
      </h2>

      {/* Siguiente mejor acción */}
      <section
        className="rounded-lg border border-border bg-card p-4"
        data-testid="estudio-rail-next-action"
      >
        <h3 className="text-base font-semibold text-fg">
          {t(`${NS}.detalle.siguienteMejorAccion`)}
        </h3>
        {next ? (
          <>
            <Button
              type="button"
              onClick={() => onAction?.(next.code)}
              disabled={!canAct}
              title={!canAct ? t(`${NS}.detalle.sinPermisoAccion`) : undefined}
              data-action={next.code}
              className="mt-3 w-full"
            >
              {actionLabel(next.code)}
            </Button>
            {/* Por qué — hairline-separated quiet block (decision.motivos[0]) */}
            {porQue && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs font-medium text-fg-muted">
                  {t(`${NS}.detalle.porQue`)}
                </p>
                <p className="mt-0.5 text-sm leading-snug text-fg">
                  {porQue}
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-fg-muted">
            {t(`${NS}.detalle.sinRecomendacion`)}
          </p>
        )}
      </section>

      {/* Acciones rápidas — el resto de los CTAs derivados */}
      {decision.ctas.length > 0 && (
        <section
          className="rounded-lg border border-border bg-card p-4"
          data-testid="estudio-rail-quick-actions"
        >
          <h3 className="text-base font-semibold text-fg">
            {t(`${NS}.detalle.accionesRapidas`)}
          </h3>
          <div className="mt-3 space-y-2">
            {decision.ctas
              .filter((code) => code !== next?.code)
              .map((code) => (
                <RailAction
                  key={code}
                  label={actionLabel(code)}
                  disabled={!canAct}
                  disabledTooltip={t(`${NS}.detalle.sinPermisoAccion`)}
                  onClick={() => onAction?.(code)}
                  testId={`estudio-rail-${code}`}
                />
              ))}
          </div>
          {/* Nota T-323 — la decisión final es del humano */}
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs leading-snug text-fg-subtle">
              {t(`${NS}.detalle.notaHumano`)}
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
