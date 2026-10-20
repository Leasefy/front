'use client'
// Phase 30 plan 30-05 (COTI-UI-02)

import { Minus, Plus } from '@phosphor-icons/react'
import { SegmentedControl } from '@leasefy/cadence'
import { useI18n } from '@/lib/i18n'
import { MoneyInput } from '@/components/ui/money-input'
import { Button } from '@/components/ui/button'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { TIPOS_DE_INMUEBLE_DEL_COTIZADOR, type TipoDeInmuebleDelCotizador } from '@/lib/cotizador/tipo-de-inmueble'

// 🔴 COTIZ-5 (19-10-2026, Nico): «Local u oficina» en una sola opción (`local`):
// la base del micro no conoce «oficina» y era un 500.
const TIPO_OPTIONS = TIPOS_DE_INMUEBLE_DEL_COTIZADOR
type TipoInmueble = TipoDeInmuebleDelCotizador

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

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-fg">
        {t('inmobiliaria.ai.cotizador.nueva.step2.heading')}
      </h2>

      {/* Canon mensual */}
      <div className="space-y-1.5">
        <label htmlFor="cotizador-canon" className="text-sm font-medium text-fg">
          {t('inmobiliaria.ai.cotizador.nueva.step2.canonLabel')}
        </label>
        {/* COTIZ-2 (19-10-2026): el canon con sus puntos de mil mientras se escribe. */}
        <MoneyInput
          id="cotizador-canon"
          value={value.canonCop === '' ? '' : String(value.canonCop)}
          placeholder={t('inmobiliaria.ai.cotizador.nueva.step2.canonPlaceholder')}
          onChange={crudo => onChange('canonCop', crudo === '' ? '' : Number(crudo))}
          aria-invalid={errors.canonCop ? true : undefined}
          aria-describedby={errors.canonCop ? 'cotizador-canon-error' : undefined}
        />
        {/* 02-10-2026: el error entra suave (Cadence), con o sin servidor detrás. */}
        <ErrorDelCampo id="cotizador-canon-error" mensaje={errors.canonCop} className="mt-0" />
      </div>

      {/* Tipo de inmueble — selector excluyente (UI-DS-CONTRACT §3) */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-fg">
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
        <ErrorDelCampo id="cotizador-tipo-error" mensaje={errors.tipoInmueble} className="mt-0" />
      </div>

      {/* Codeudores */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-fg">
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
          <span className="min-w-[2rem] text-center text-base font-semibold text-fg tabular-nums">
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
        {/* COTIZ-3 (19-10-2026): prendido; al pulsarlo, cada campo dice qué le falta. */}
        <Button
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
