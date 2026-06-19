'use client'
// Phase 30 plan 30-05 (COTI-UI-02)

import { SpinnerGap } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/format'

interface Step3Candidato {
  cedula: string
  nombre: string
  ciudad: string
}

interface Step3Propiedad {
  canonCop: number
  tipoInmueble: string
  codeudoresCount: number
}

interface WizardStep3ReviewProps {
  candidato: Step3Candidato
  propiedad: Step3Propiedad
  onSubmit: () => void
  onBack: () => void
  isLoading: boolean
  arcoError: boolean
  canCreate: boolean
  /**
   * Optional submit-CTA override. Asegurabilidad Tier-B (visión #5) renames the
   * final CTA to "Consultar asegurabilidad". Falls back to the legacy enviar key.
   */
  ctaLabel?: string
}

function maskCedula(raw: string): string {
  const digits = raw.replace(/[\s.\-]/g, '')
  if (digits.length < 4) return '•••'
  return digits.slice(0, 2) + '•••' + digits.slice(-2)
}

export function WizardStep3Review({
  candidato,
  propiedad,
  onSubmit,
  onBack,
  isLoading,
  arcoError,
  canCreate,
  ctaLabel,
}: WizardStep3ReviewProps) {
  const { t } = useI18n()
  const submitLabel = ctaLabel ?? t('inmobiliaria.ai.cotizador.nueva.actions.enviar')

  const rows: { label: string; value: string }[] = [
    { label: t('inmobiliaria.ai.cotizador.nueva.step3.cedulaRow'), value: maskCedula(candidato.cedula) },
    { label: t('inmobiliaria.ai.cotizador.nueva.step3.nombreRow'), value: candidato.nombre },
    { label: t('inmobiliaria.ai.cotizador.nueva.step3.ciudadRow'), value: candidato.ciudad },
    {
      label: t('inmobiliaria.ai.cotizador.nueva.step3.canonRow'),
      value: `${formatCurrency(propiedad.canonCop)}/mes`,
    },
    { label: t('inmobiliaria.ai.cotizador.nueva.step3.tipoRow'), value: propiedad.tipoInmueble },
    {
      label: t('inmobiliaria.ai.cotizador.nueva.step3.codeudoresRow'),
      value: String(propiedad.codeudoresCount),
    },
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-foreground">
        {t('inmobiliaria.ai.cotizador.nueva.step3.heading')}
      </h2>

      {/* Review card */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        {rows.map(row => (
          <div key={row.label} className="flex justify-between gap-4">
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className="text-sm font-medium text-foreground text-right">{row.value}</span>
          </div>
        ))}
      </div>

      {/* ARCO error */}
      {arcoError && (
        <div
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger"
        >
          {t('inmobiliaria.ai.cotizador.nueva.errors.arcoBloqueado')}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="secondary"
          hideArrow
          onClick={onBack}
          disabled={isLoading}
          className="flex-1"
          size="lg"
        >
          {t('inmobiliaria.ai.cotizador.nueva.actions.atras')}
        </Button>

        {canCreate ? (
          <Button
            hideArrow
            onClick={onSubmit}
            disabled={isLoading}
            className="flex-1"
            size="lg"
          >
            {isLoading ? (
              <SpinnerGap size={18} weight="fill" className="animate-spin" />
            ) : (
              submitLabel
            )}
          </Button>
        ) : (
          <span
            title={t('inmobiliaria.ai.cotizador.nueva.errors.sinPermiso')}
            className="flex-1"
          >
            <Button
              disabled
              hideArrow
              className="w-full"
              size="lg"
            >
              {submitLabel}
            </Button>
          </span>
        )}
      </div>
    </div>
  )
}
