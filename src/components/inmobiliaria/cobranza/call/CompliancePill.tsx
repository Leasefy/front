'use client'

// Phase 31 plan 31-10 — reusable compliance flag pill.
// Severity-based color + Radix tooltip showing the flag code.

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useI18n } from '@/lib/i18n'
import type { CallComplianceFlag } from '@/lib/hooks/cobranza/use-call-detail'

interface CompliancePillProps {
  flag: Pick<CallComplianceFlag, 'id' | 'code' | 'severity' | 'label'>
}

function severityTone(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'bg-danger-soft text-danger ring-danger dark:bg-danger/30 dark:text-danger dark:ring-danger'
    case 'warning':
      return 'bg-warning-soft text-warning ring-warning dark:bg-warning/30 dark:text-warning dark:ring-warning'
    case 'info':
    default:
      return 'bg-neutral-100 text-neutral-700 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700'
  }
}

export function CompliancePill({ flag }: CompliancePillProps) {
  const { t } = useI18n()
  const tone = severityTone(flag.severity)
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="img"
            aria-label={t('inmobiliaria.ai.cobranza.call.compliance.pillAria', {
              label: flag.label,
            })}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 cursor-help ${tone}`}
          >
            {flag.label}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <span className="font-mono text-xs">{flag.code}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default CompliancePill
