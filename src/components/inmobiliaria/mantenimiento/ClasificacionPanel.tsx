'use client'

/**
 * ClasificacionPanel.tsx — Phase 7 plan 07-04 (DASH-03)
 *
 * Shows category + severity badges, the 0–100 score (Progress + bucket), the
 * agent rationale, and the probable-responsible party — explicitly framed as a
 * HYPOTHESIS, never a verdict (CONTEXT §compliance "No prometer", threat T-07-03).
 *
 * Presentational only.
 *
 * ⚠️ Deviation from 07-04 plan Task 1 (Rule 3 — align with real 07-01 type):
 * the plan said `clasificacion` carries `responsableProbable`/`confianza`, but the
 * real `MaintenanceTicketDetail['clasificacion']` is
 * `{ categoria, severidad, score, bucket, rationale }`. `responsableProbable` lives
 * on the card (`MaintenanceTicketCard`). So this panel takes it as a SEPARATE prop.
 *
 * i18n: canonical C7-03 keys — `…detalle.clasificacion` (title),
 * `…detalle.responsableHipotesis` (the hypothesis label), `…enums.severidad.*`,
 * `…enums.categoria.*`, `…enums.bucket.*`, `…enums.responsable.*`.
 */

import { Tag } from '@phosphor-icons/react'
import { Badge, Card, CardContent, CardHeader, CardTitle, Progress } from '@/components/ui'
import { useI18n } from '@/lib/i18n'
import type {
  MaintenanceTicketDetail,
  ProbableResponsible,
  Severity,
} from '@/lib/types/mantenimiento'

interface ClasificacionPanelProps {
  clasificacion: MaintenanceTicketDetail['clasificacion']
  /** From the card — shown as a hypothesis (07-01 type keeps this off `clasificacion`). */
  responsableProbable: ProbableResponsible
}

const ROOT = 'inmobiliaria.ai.mantenimiento'

/** Severity → Badge variant (emergencia/alta destacan; media advierte; resto neutro). */
function severityVariant(sev: Severity): 'destructive' | 'warning' | 'secondary' {
  if (sev === 'emergencia' || sev === 'alta') return 'destructive'
  if (sev === 'media') return 'warning'
  return 'secondary'
}

/** Bucket → i18n key segment (enum keys are capitalized: Bajo/Medio/Alto/Critico/Emergencia). */
function bucketKey(bucket: string): string {
  return bucket.charAt(0).toUpperCase() + bucket.slice(1)
}

export function ClasificacionPanel({ clasificacion, responsableProbable }: ClasificacionPanelProps) {
  const { t } = useI18n()
  const score = Math.min(100, Math.max(0, Math.round(clasificacion.score)))

  return (
    <Card data-testid="clasificacion-panel">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Tag size={18} className="text-indigo-500" weight="duotone" aria-hidden="true" />
          {t(`${ROOT}.detalle.clasificacion`)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{t(`${ROOT}.enums.categoria.${clasificacion.categoria}`)}</Badge>
          <Badge variant={severityVariant(clasificacion.severidad)}>
            {t(`${ROOT}.enums.severidad.${clasificacion.severidad}`)}
          </Badge>
        </div>

        {/* Score + bucket */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span>
              {t(`${ROOT}.card.score`)} · {t(`${ROOT}.enums.bucket.${bucketKey(clasificacion.bucket)}`)}
            </span>
            <span className="font-mono text-neutral-900 dark:text-white">{score}</span>
          </div>
          <Progress value={score} size="sm" />
        </div>

        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          {clasificacion.rationale}
        </p>

        {/* Responsable probable — explicitly a HYPOTHESIS, never a verdict */}
        <div
          data-testid="responsable-hipotesis"
          className="rounded-lg bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-700 p-3"
        >
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
            {t(`${ROOT}.detalle.responsableHipotesis`)}
          </p>
          <Badge variant="secondary">{t(`${ROOT}.enums.responsable.${responsableProbable}`)}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}
