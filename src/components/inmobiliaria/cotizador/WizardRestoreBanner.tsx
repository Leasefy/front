'use client'
// Phase 30 plan 30-05 (COTI-UI-02)

import { ClockClockwise } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'

interface WizardRestoreBannerProps {
  onContinue: () => void
  onStartFresh: () => void
}

export function WizardRestoreBanner({ onContinue, onStartFresh }: WizardRestoreBannerProps) {
  const { t } = useI18n()

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4">
      <div className="flex items-start gap-3">
        <ClockClockwise
          size={18}
          weight="regular"
          className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300"
        />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          {t('inmobiliaria.ai.cotizador.nueva.restoreBanner.message')}
        </p>
      </div>
      <div className="mt-3 flex gap-3">
        <Button size="sm" onClick={onContinue}>
          {t('inmobiliaria.ai.cotizador.nueva.actions.continuar')}
        </Button>
        <Button size="sm" variant="outline" onClick={onStartFresh}>
          {t('inmobiliaria.ai.cotizador.nueva.actions.empezarDeNuevo')}
        </Button>
      </div>
    </div>
  )
}
