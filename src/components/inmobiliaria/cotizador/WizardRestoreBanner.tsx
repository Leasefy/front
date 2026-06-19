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
    <div className="mb-6 rounded-xl border border-[#B7791F]/30 dark:border-[#B7791F]/40 bg-[#F8F0E0] dark:bg-[#B7791F]/15 p-4">
      <div className="flex items-start gap-3">
        <ClockClockwise
          size={18}
          weight="regular"
          className="mt-0.5 shrink-0 text-[#B7791F] dark:text-[#D2992F]"
        />
        <p className="text-sm text-[#B7791F] dark:text-[#D2992F]">
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
