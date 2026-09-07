'use client'

/**
 * ImagenesPanel.tsx — Phase 7 plan 07-04 (DASH-03)
 *
 * Renders the per-photo VisionAnalysis as a list of FINDINGS cards (the mock has
 * no real image URLs — see mock-mantenimiento §visionFor). This panel's whole job
 * is to surface the LIMITS of the automated analysis: it must always show
 * `safety_hold`, `requires_human_inspection`, `cannot_determine[]` and the
 * `photo_quality_score`, and it must NEVER assert "clearance" for a dangerous
 * category (CONTEXT §compliance "No prometer", threat T-07-03).
 *
 * Presentational only — props typed against @/lib/types/mantenimiento (07-01).
 *
 * i18n: uses the canonical C7-03 keys that EXIST under `…mantenimiento.detalle.*`
 * (imagenes / safetyHold / visionLimite / calidadFoto). Keys for "requires human
 * inspection", "signals" and "no images" are NOT in the C7-03 tree — reported as a
 * follow-up; this panel reuses `detalle.imagenes` for the empty heading and shows
 * the raw signal/limit strings (synthetic es-CO copy from the mock) verbatim.
 */

import { Warning, WarningOctagon, Eye, ImageSquare } from '@phosphor-icons/react'
import { Badge, Card, CardContent, CardHeader, CardTitle, Progress } from '@/components/ui'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { VisionAnalysis } from '@/lib/types/mantenimiento'

interface ImagenesPanelProps {
  vision: VisionAnalysis[]
}

const KEY = 'inmobiliaria.ai.mantenimiento.detalle'

/** Clamp a 0..100 quality heuristic to an integer percentage. */
function qualityPct(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)))
}

export function ImagenesPanel({ vision }: ImagenesPanelProps) {
  const { t } = useI18n()

  return (
    <Card data-testid="imagenes-panel">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageSquare size={18} className="text-info" weight="duotone" aria-hidden="true" />
          {t(`${KEY}.imagenes`)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {vision.length === 0 ? (
          <div
            data-testid="vision-empty"
            className="rounded-lg border-2 border-dashed border-border bg-surface-muted px-4 py-6 text-center text-sm text-fg-muted"
          >
            {t(`${KEY}.imagenes`)}
          </div>
        ) : (
          vision.map((v, idx) => {
            const pct = qualityPct(v.photo_quality_score)
            return (
              <div
                key={idx}
                data-testid="vision-item"
                className="rounded-lg border border-border p-4 space-y-3"
              >
                {/* Safety hold — most prominent, destructive */}
                {v.safety_hold && (
                  <div
                    data-testid="vision-safety-hold"
                    className="flex items-start gap-2"
                  >
                    <Badge variant="destructive" className="gap-1">
                      <WarningOctagon size={14} weight="fill" aria-hidden="true" />
                      {t(`${KEY}.safetyHold`)}
                    </Badge>
                  </div>
                )}

                {/* Requires human inspection */}
                {v.requires_human_inspection && (
                  <div data-testid="vision-requires-inspection">
                    <Badge variant="warning" className="gap-1">
                      <Eye size={14} weight="duotone" aria-hidden="true" />
                      {t(`${KEY}.visionLimite`)}
                    </Badge>
                  </div>
                )}

                {/* Signals — neutral chips */}
                {v.signals.length > 0 && (
                  <ul data-testid="vision-signals" className="flex flex-wrap gap-1.5">
                    {v.signals.map((s, i) => (
                      <li key={i}>
                        <Badge variant="secondary">{s}</Badge>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Photo quality — Progress */}
                <div data-testid="vision-quality" className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-fg-muted">
                    <span>{t(`${KEY}.calidadFoto`)}</span>
                    <span className="font-mono">{pct}%</span>
                  </div>
                  <Progress value={pct} size="sm" />
                </div>

                {/* cannot_determine — explicit, never hidden */}
                {v.cannot_determine.length > 0 && (
                  <div
                    data-testid="vision-cannot-determine"
                    className={cn(
                      'rounded-md border border-warning/30',
                      'bg-warning-soft p-3',
                    )}
                  >
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-warning mb-1.5">
                      <Warning size={14} weight="duotone" aria-hidden="true" />
                      {t(`${KEY}.visionLimite`)}
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-xs text-warning">
                      {v.cannot_determine.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
