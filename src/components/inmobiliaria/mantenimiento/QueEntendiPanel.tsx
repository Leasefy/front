'use client'

/**
 * QueEntendiPanel.tsx — Phase 7 plan 07-04 (DASH-03)
 *
 * The "Qué entendí" panel: the agent's paraphrase of the tenant report plus the
 * original raw description. Presentational only.
 *
 * i18n: `…mantenimiento.detalle.queEntendi` (canonical C7-03 key, a STRING title).
 */

import { ChatCenteredText } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, Separator } from '@/components/ui'
import { useI18n } from '@/lib/i18n'

interface QueEntendiPanelProps {
  queEntendi: string
  descripcion: string
}

const KEY = 'inmobiliaria.ai.mantenimiento.detalle'

export function QueEntendiPanel({ queEntendi, descripcion }: QueEntendiPanelProps) {
  const { t } = useI18n()

  return (
    <Card data-testid="que-entendi-panel">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ChatCenteredText size={18} className="text-primary" weight="duotone" aria-hidden="true" />
          {t(`${KEY}.queEntendi`)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <p className="text-sm leading-relaxed text-fg">{queEntendi}</p>
        <Separator />
        <p className="text-sm leading-relaxed text-fg-muted italic">
          {descripcion}
        </p>
      </CardContent>
    </Card>
  )
}
