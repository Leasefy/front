'use client'
// Phase 30 plan 30-05 (COTI-UI-02)

import { Minus, Plus } from '@phosphor-icons/react'
import { SegmentedControl } from '@leasefy/cadence'
import { useI18n } from '@/lib/i18n'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const TIPO_OPTIONS = ['apartamento', 'casa', 'oficina', 'local'] as const
type TipoInmueble = (typeof TIPO_OPTIONS)[number]

interface Step2Value {
  canonCop: number | ''
  tipoInmueble: string
  codeudoresCount: number
}

interface WizardStep2PropiedadProps {
  value: Step2Value
  onChange: (field: 'canonCop' | 'tipoInmueble' | 'codeudoresCount', value: number | string) => void
  onNext: () => void
  onBack: () => void
  errors: { canonCop?: string; tipoInmueble?: string }
}

export function WizardStep2Propiedad({
  value,
  onChange,
  onNext,
  onBack,
  errors,
}: WizardStep2PropiedadProps) {
  const { t } = useI18n()

  const canProceed =
    value.canonCop !== '' &&
    Number(value.canonCop) > 0 &&
    value.tipoInmueble !== ''

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-foreground">
        {t('inmobiliaria.ai.cotizador.nueva.step2.heading')}
      </h2>

      {/* Canon mensual */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('inmobiliaria.ai.cotizador.nueva.step2.canonLabel')}
        </label>
        <Input
          type="text"
          inputMode="numeric"
          value={value.canonCop === '' ? '' : String(value.canonCop)}
          placeholder={t('inmobiliaria.ai.cotizador.nueva.step2.canonPlaceholder')}
          onChange={e => {
            const raw = e.target.value.replace(/[^\d]/g, '')
            onChange('canonCop', raw === '' ? '' : Number(raw))
          }}
          onBlur={() => {
            if (value.canonCop === '' || Number(value.canonCop) <= 0) {
              // parent controls errors via validateStep2 — blur just ensures field is touched
            }
          }}
          className={errors.canonCop ? 'border-danger/40 focus-visible:ring-danger/20' : ''}
        />
        {errors.canonCop && (
          <p className="text-sm text-danger">{errors.canonCop}</p>
        )}
      </div>

      {/* Tipo de inmueble — selector excluyente (UI-DS-CONTRACT §3) */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          {t('inmobiliaria.ai.cotizador.nueva.step2.tipoLabel')}
        </label>
        {/* value vacío → ningún segmento activo (preserva la validación canProceed) */}
        <SegmentedControl<TipoInmueble>
          fullWidth
          aria-label={t('inmobiliaria.ai.cotizador.nueva.step2.tipoLabel')}
          value={value.tipoInmueble as TipoInmueble}
          onChange={tipo => onChange('tipoInmueble', tipo)}
          options={TIPO_OPTIONS.map(tipo => ({
            value: tipo,
            label: t(`inmobiliaria.ai.cotizador.nueva.step2.tipoOptions.${tipo}`),
          }))}
        />
        {errors.tipoInmueble && (
          <p className="text-sm text-danger">{errors.tipoInmueble}</p>
        )}
      </div>

      {/* Codeudores */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          {t('inmobiliaria.ai.cotizador.nueva.step2.codeudoresLabel')}
        </label>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            hideArrow
            disabled={value.codeudoresCount <= 0}
            onClick={() => onChange('codeudoresCount', value.codeudoresCount - 1)}
            aria-label="Disminuir codeudores"
          >
            <Minus size={16} />
          </Button>
          <span className="min-w-[2rem] text-center text-base font-semibold text-foreground tabular-nums">
            {value.codeudoresCount}
          </span>
          <Button
            variant="outline"
            size="icon"
            hideArrow
            disabled={value.codeudoresCount >= 3}
            onClick={() => onChange('codeudoresCount', value.codeudoresCount + 1)}
            aria-label="Aumentar codeudores"
          >
            <Plus size={16} />
          </Button>
          <span className="text-xs text-fg-muted">
            {t('inmobiliaria.ai.cotizador.nueva.step2.codeudoresHint')}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={onBack}
          className="flex-1"
          size="lg"
        >
          {t('inmobiliaria.ai.cotizador.nueva.actions.atras')}
        </Button>
        <Button
          disabled={!canProceed}
          onClick={onNext}
          className="flex-1"
          size="lg"
        >
          {t('inmobiliaria.ai.cotizador.nueva.actions.siguiente')}
        </Button>
      </div>
    </div>
  )
}
