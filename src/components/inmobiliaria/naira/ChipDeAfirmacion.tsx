'use client'

/**
 * ChipDeAfirmacion — la clase de una afirmación causal (aritmética, asociación, hipótesis), con su explicación en un
 * popover (Fase 13, plan 13-02; D13-10, CLM-01, UI-SPEC §6.4).
 *
 * Pinta la clase que TRAE el contrato y nada más: no recibe ni ve la oración que acompaña (la clase la deriva el linter
 * del agente, nunca el front a partir de palabras). Se monta SOLO desde `OracionesCausales`, que es donde vive el
 * fail-closed de una oración sin clase (la guardia claimclass-del-contrato.test.ts lo fija).
 *
 * Es un botón con nombre accesible («Qué significa ASOCIACIÓN»: contiene el rótulo visible, WCAG 2.5.3) que abre el
 * popover. Sin acento (UI-SPEC §5): variante `outline`, rótulo mono en mayúsculas (`text-overline`, D13-20).
 */

import type { JSX } from 'react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useI18n } from '@/lib/i18n'
import type { ClaseDeAfirmacion } from '@/lib/naira/afirmaciones'

export interface ChipDeAfirmacionProps {
  readonly claimClass: ClaseDeAfirmacion
}

const ETIQUETA_DE_CLASE = {
  aritmetica: 'inmobiliaria.ai.naira.afirmacion.aritmetica',
  asociacion: 'inmobiliaria.ai.naira.afirmacion.asociacion',
  hipotesis: 'inmobiliaria.ai.naira.afirmacion.hipotesis',
} as const satisfies Record<ClaseDeAfirmacion, string>

const EXPLICACION_DE_CLASE = {
  aritmetica: 'inmobiliaria.ai.naira.afirmacion.explicacionAritmetica',
  asociacion: 'inmobiliaria.ai.naira.afirmacion.explicacionAsociacion',
  hipotesis: 'inmobiliaria.ai.naira.afirmacion.explicacionHipotesis',
} as const satisfies Record<ClaseDeAfirmacion, string>

export function ChipDeAfirmacion({ claimClass }: ChipDeAfirmacionProps): JSX.Element {
  const { t } = useI18n()
  const etiqueta = t(ETIQUETA_DE_CLASE[claimClass])
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-claim-class={claimClass}
          aria-label={t('inmobiliaria.ai.naira.afirmacion.queSignifica', { clase: etiqueta })}
          className="ml-1 h-auto rounded-full px-2 py-0.5 align-baseline"
        >
          <span className="text-overline">{etiqueta}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-xs text-sm text-fg">{t(EXPLICACION_DE_CLASE[claimClass])}</PopoverContent>
    </Popover>
  )
}
