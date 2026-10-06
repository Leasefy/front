'use client'
// Phase 30 plan 30-05 (COTI-UI-02)

import { useRef } from 'react'
import { useI18n } from '@/lib/i18n'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'

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
      <h2 className="text-base font-semibold text-fg">
        {t('inmobiliaria.ai.cotizador.nueva.step1.heading')}
      </h2>

      {/* Cédula */}
      <div className="space-y-1.5">
        <label htmlFor="cotizador-cedula" className="text-sm font-medium text-fg">
          {t('inmobiliaria.ai.cotizador.nueva.step1.cedulaLabel')}
        </label>
        <Input
          id="cotizador-cedula"
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
          aria-invalid={errors.cedula ? true : undefined}
          aria-describedby={errors.cedula ? 'cotizador-cedula-error' : undefined}
          className={errors.cedula ? 'border-danger/40 focus-visible:ring-danger/20' : ''}
        />
        {/* 02-10-2026: el error entra suave (Cadence), con o sin servidor detrás. */}
        <ErrorDelCampo id="cotizador-cedula-error" mensaje={errors.cedula} className="mt-0" />
      </div>

      {/* Nombre */}
      <div className="space-y-1.5">
        <label htmlFor="cotizador-nombre" className="text-sm font-medium text-fg">
          {t('inmobiliaria.ai.cotizador.nueva.step1.nombreLabel')}
        </label>
        <Input
          ref={nombreRef}
          id="cotizador-nombre"
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
          aria-invalid={errors.nombre ? true : undefined}
          aria-describedby={errors.nombre ? 'cotizador-nombre-error' : undefined}
          className={errors.nombre ? 'border-danger/40 focus-visible:ring-danger/20' : ''}
        />
        {/* 02-10-2026: el error entra suave (Cadence), con o sin servidor detrás. */}
        <ErrorDelCampo id="cotizador-nombre-error" mensaje={errors.nombre} className="mt-0" />
      </div>

      {/* Ciudad */}
      <div className="space-y-1.5">
        <label htmlFor="cotizador-ciudad" className="text-sm font-medium text-fg">
          {t('inmobiliaria.ai.cotizador.nueva.step1.ciudadLabel')}
        </label>
        <Input
          ref={ciudadRef}
          id="cotizador-ciudad"
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
          aria-invalid={errors.ciudad ? true : undefined}
          aria-describedby={errors.ciudad ? 'cotizador-ciudad-error' : undefined}
          className={errors.ciudad ? 'border-danger/40 focus-visible:ring-danger/20' : ''}
        />
        {/* 02-10-2026: el error entra suave (Cadence), con o sin servidor detrás. */}
        <ErrorDelCampo id="cotizador-ciudad-error" mensaje={errors.ciudad} className="mt-0" />
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
