'use client'
// Phase 30 plan 30-05 (COTI-UI-02)

import { useRef } from 'react'
import { useI18n } from '@/lib/i18n'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Step1Value {
  cedula: string
  nombre: string
  ciudad: string
}

interface WizardStep1CandidatoProps {
  value: Step1Value
  onChange: (field: 'cedula' | 'nombre' | 'ciudad', value: string) => void
  onNext: () => void
  errors: { cedula?: string; nombre?: string; ciudad?: string }
  onCedulaBlur?: () => void
}

export function WizardStep1Candidato({
  value,
  onChange,
  onNext,
  errors,
  onCedulaBlur,
}: WizardStep1CandidatoProps) {
  const { t } = useI18n()
  const nombreRef = useRef<HTMLInputElement>(null)
  const ciudadRef = useRef<HTMLInputElement>(null)
  const nextBtnRef = useRef<HTMLButtonElement>(null)

  const strippedCedula = value.cedula.replace(/[\s.\-]/g, '')
  const isCedulaFormatOk = /^[\d.\-\s]{7,15}$/.test(value.cedula) && /^\d{7,10}$/.test(strippedCedula)

  const canProceed =
    value.cedula.trim() !== '' &&
    value.nombre.trim() !== '' &&
    value.ciudad.trim() !== '' &&
    !errors.cedula

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-foreground">
        {t('inmobiliaria.ai.cotizador.nueva.step1.heading')}
      </h2>

      {/* Cédula */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('inmobiliaria.ai.cotizador.nueva.step1.cedulaLabel')}
        </label>
        <Input
          type="text"
          inputMode="numeric"
          autoFocus
          value={value.cedula}
          placeholder={t('inmobiliaria.ai.cotizador.nueva.step1.cedulaPlaceholder')}
          onChange={e => onChange('cedula', e.target.value)}
          onBlur={() => onCedulaBlur?.()}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              nombreRef.current?.focus()
            }
          }}
          className={errors.cedula ? 'border-[#C4503B]/30 focus-visible:ring-[#C4503B]/20' : ''}
        />
        {errors.cedula && (
          <p className="text-sm text-[#C4503B] dark:text-[#E0664D]">{errors.cedula}</p>
        )}
      </div>

      {/* Nombre */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('inmobiliaria.ai.cotizador.nueva.step1.nombreLabel')}
        </label>
        <Input
          ref={nombreRef}
          type="text"
          value={value.nombre}
          placeholder={t('inmobiliaria.ai.cotizador.nueva.step1.nombrePlaceholder')}
          onChange={e => onChange('nombre', e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              ciudadRef.current?.focus()
            }
          }}
          className={errors.nombre ? 'border-[#C4503B]/30 focus-visible:ring-[#C4503B]/20' : ''}
        />
        {errors.nombre && (
          <p className="text-sm text-[#C4503B] dark:text-[#E0664D]">{errors.nombre}</p>
        )}
      </div>

      {/* Ciudad */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('inmobiliaria.ai.cotizador.nueva.step1.ciudadLabel')}
        </label>
        <Input
          ref={ciudadRef}
          type="text"
          value={value.ciudad}
          placeholder={t('inmobiliaria.ai.cotizador.nueva.step1.ciudadPlaceholder')}
          onChange={e => onChange('ciudad', e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (canProceed) onNext()
              else nextBtnRef.current?.focus()
            }
          }}
          className={errors.ciudad ? 'border-[#C4503B]/30 focus-visible:ring-[#C4503B]/20' : ''}
        />
        {errors.ciudad && (
          <p className="text-sm text-[#C4503B] dark:text-[#E0664D]">{errors.ciudad}</p>
        )}
      </div>

      <Button
        ref={nextBtnRef}
        disabled={!canProceed}
        onClick={onNext}
        className="w-full"
        size="lg"
      >
        {t('inmobiliaria.ai.cotizador.nueva.actions.siguiente')}
      </Button>
    </div>
  )
}
