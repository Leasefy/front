'use client'
// Phase 30 plan 30-05 (COTI-UI-02)

import { Minus, Plus } from '@phosphor-icons/react'
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
          className={errors.canonCop ? 'border-rose-500 focus-visible:ring-rose-500/20' : ''}
        />
        {errors.canonCop && (
          <p className="text-sm text-rose-600 dark:text-rose-400">{errors.canonCop}</p>
        )}
      </div>

      {/* Tipo de inmueble — 4 toggle cards */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          {t('inmobiliaria.ai.cotizador.nueva.step2.tipoLabel')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {TIPO_OPTIONS.map(tipo => {
            const isActive = value.tipoInmueble === tipo
            return (
              <button
                key={tipo}
                type="button"
                onClick={() => onChange('tipoInmueble', tipo)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                }`}
              >
                {t(`inmobiliaria.ai.cotizador.nueva.step2.tipoOptions.${tipo}`)}
              </button>
            )
          })}
        </div>
        {errors.tipoInmueble && (
          <p className="text-sm text-rose-600 dark:text-rose-400">{errors.tipoInmueble}</p>
        )}
      </div>

      {/* Codeudores */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          {t('inmobiliaria.ai.cotizador.nueva.step2.codeudoresLabel')}
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={value.codeudoresCount <= 0}
            onClick={() => onChange('codeudoresCount', value.codeudoresCount - 1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Disminuir codeudores"
          >
            <Minus size={16} />
          </button>
          <span className="min-w-[2rem] text-center text-base font-semibold text-foreground">
            {value.codeudoresCount}
          </span>
          <button
            type="button"
            disabled={value.codeudoresCount >= 3}
            onClick={() => onChange('codeudoresCount', value.codeudoresCount + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Aumentar codeudores"
          >
            <Plus size={16} />
          </button>
          <span className="text-xs text-muted-foreground">
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
          className="flex-1 uppercase tracking-wide"
          size="lg"
        >
          {t('inmobiliaria.ai.cotizador.nueva.actions.siguiente')}
        </Button>
      </div>
    </div>
  )
}
