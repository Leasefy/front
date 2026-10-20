'use client'
// Phase 30 plan 30-05 (COTI-UI-02)

import { useState } from 'react'

import { Presence } from '@leasefy/cadence'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Checkbox } from '@/components/ui/checkbox'
import { formatCurrency } from '@/lib/format'
import { tipoDeInmuebleEnPalabras } from '@/lib/cotizador/tipo-de-inmueble'
import { nombreDeLaAseguradora } from '@/lib/cotizador/nombre-de-la-aseguradora'
import type { WizardConfigValue } from './WizardStep3Config'

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
  /** Lo que se eligió en «Configura la consulta» (COTIZ-PASO-3): se repasa aquí. */
  config?: WizardConfigValue
  /**
   * 🔴 COTIZ-6 (QA 19-10-2026, Nico): la persona confirma que el candidato la
   * autorizó. Sin la casilla no se consulta (el micro también lo exige).
   */
  autorizacion: boolean
  onAutorizacion: (v: boolean) => void
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
  config,
  autorizacion,
  onAutorizacion,
}: WizardStep3ReviewProps) {
  const { t } = useI18n()
  const tf = (k: string, fb: string, vars?: Record<string, string>) => {
    const r = t(k, vars)
    return r === k ? fb : r
  }
  const S = 'inmobiliaria.ai.cotizador.nueva.step3'
  const [intentoSinAutorizacion, setIntentoSinAutorizacion] = useState(false)
  const enviar = () => {
    if (!autorizacion) {
      setIntentoSinAutorizacion(true)
      document.getElementById('cotizador-autorizacion')?.focus()
      return
    }
    onSubmit()
  }
  const submitLabel = ctaLabel ?? t('inmobiliaria.ai.cotizador.nueva.actions.enviar')

  const rows: { label: string; value: string }[] = [
    { label: t('inmobiliaria.ai.cotizador.nueva.step3.cedulaRow'), value: maskCedula(candidato.cedula) },
    { label: t('inmobiliaria.ai.cotizador.nueva.step3.nombreRow'), value: candidato.nombre },
    { label: t('inmobiliaria.ai.cotizador.nueva.step3.ciudadRow'), value: candidato.ciudad },
    {
      label: t('inmobiliaria.ai.cotizador.nueva.step3.canonRow'),
      value: `${formatCurrency(propiedad.canonCop)}/mes`,
    },
    { label: t('inmobiliaria.ai.cotizador.nueva.step3.tipoRow'), value: tipoDeInmuebleEnPalabras(propiedad.tipoInmueble) },
    {
      label: t('inmobiliaria.ai.cotizador.nueva.step3.codeudoresRow'),
      value: String(propiedad.codeudoresCount),
    },
    ...(config
      ? [
          {
            label: tf(`${S}.aseguradorasRow`, 'Aseguradoras'),
            value:
              config.carrierMode === 'favoritas' && config.selectedCarriers.length > 0
                ? config.selectedCarriers.map(nombreDeLaAseguradora).join(', ')
                : tf(`${S}.aseguradorasTodas`, 'Todas las habilitadas'),
          },
          {
            label: tf(`${S}.prioridadRow`, 'Prioridad'),
            value: tf(`inmobiliaria.ai.cotizador.nueva.config.prioridad.${config.priority}`, config.priority),
          },
        ]
      : []),
  ]
  const nombre = candidato.nombre.trim() || 'la persona'

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-fg">
        {t('inmobiliaria.ai.cotizador.nueva.step3.heading')}
      </h2>

      {/* Review card */}
      <div className="rounded-lg border border-border bg-surface p-5 space-y-3">
        {rows.map(row => (
          <div key={row.label} className="flex justify-between gap-4">
            <span className="text-sm text-fg-muted">{row.label}</span>
            <span className="text-sm font-medium text-fg text-right">{row.value}</span>
          </div>
        ))}
      </div>

      {/* 🔴 COTIZ-6: la autorización del candidato (⚖️ texto pendiente del abogado). */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <label htmlFor="cotizador-autorizacion" className="flex cursor-pointer items-start gap-3">
          <Checkbox
            id="cotizador-autorizacion"
            checked={autorizacion}
            onCheckedChange={(v) => {
              onAutorizacion(v === true)
              if (v === true) setIntentoSinAutorizacion(false)
            }}
            aria-required="true"
            aria-invalid={intentoSinAutorizacion && !autorizacion ? true : undefined}
            className="mt-0.5"
          />
          {/* Nico 19-10: corto, sin explicar de más (⚖️ el abogado puede ajustarlo). */}
          <span className="text-sm text-fg">
            {tf(`${S}.autorizacion`, `Tengo la autorización de ${nombre} para esta consulta.`, { nombre })}
          </span>
        </label>
        <Presence show={intentoSinAutorizacion && !autorizacion}>
          <p role="alert" className="mt-2 text-caption text-danger" data-testid="cotizador-autorizacion-falta">
            {tf(`${S}.autorizacionFalta`, 'Marca la casilla para consultar.')}
          </p>
        </Presence>
      </div>

      {/* ARCO error */}
      {arcoError && (
        <div
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger"
        >
          {t('inmobiliaria.ai.cotizador.nueva.errors.arcoBloqueado')}
        </div>
      )}

      {/* Actions — a 390 px van una sobre otra: «Consultar asegurabilidad» no
          cabe al lado de «Atrás» y se salía de la pantalla (QA 19-10-2026). */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
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
            onClick={enviar}
            disabled={isLoading}
            className="flex-1"
            size="lg"
          >
            {isLoading ? (
              <Spinner size="sm" variant="current" />
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
