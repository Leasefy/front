'use client'

// Phase 31 plan 31-10 — reusable compliance flag pill.
// Severity-based color + Radix tooltip showing the flag code.

import * as React from 'react'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { StatusBadge } from '@leasefy/cadence'
import { useI18n } from '@/lib/i18n'
import type { CallComplianceEvent } from '@/lib/hooks/cobranza/use-call-detail'

interface CompliancePillProps {
  flag: Pick<CallComplianceEvent, 'id' | 'code' | 'severity' | 'label'>
}

type StatusTone = NonNullable<React.ComponentProps<typeof StatusBadge>['tone']>

/**
 * El pill se armaba a mano con bg/text/ring. `StatusBadge` es exactamente la
 * voz que corresponde acá: el DS reserva el registro mono/MAYÚSCULAS para
 * señales técnicas, y una marca de cumplimiento lo es.
 */
function severityTone(severity: string): StatusTone {
  switch (severity) {
    case 'critical':
      // Ocurrió algo que no debía.
      return 'critical'
    case 'prevented':
      // El sistema lo IMPIDIÓ. No es una falta: es la defensa funcionando, y
      // pintarla de rojo haría leer como infracción lo contrario.
      return 'warning'
    case 'info':
    default:
      return 'neutral'
  }
}

export function CompliancePill({ flag }: CompliancePillProps) {
  const { t } = useI18n()
  const tone = severityTone(flag.severity)
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <StatusBadge
            role="img"
            tone={tone}
            aria-label={t('inmobiliaria.ai.cobranza.call.compliance.pillAria', {
              label: flag.label,
            })}
            className="cursor-help"
          >
            {flag.label}
          </StatusBadge>
        </TooltipTrigger>
        <TooltipContent>
          <span className="font-mono text-xs">{flag.code}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default CompliancePill
