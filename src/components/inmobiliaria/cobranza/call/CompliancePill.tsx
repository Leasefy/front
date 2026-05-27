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
      return 'bg-red-100 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800'
    case 'warning':
      return 'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800'
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
