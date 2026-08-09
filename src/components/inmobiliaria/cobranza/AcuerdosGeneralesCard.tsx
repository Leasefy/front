'use client'

/**
 * AcuerdosGeneralesCard — los acuerdos que el agente puede cerrar SOLO.
 *
 * Un acuerdo puntual se arma para una persona. Pero también existe el acuerdo
 * GENERAL: «si el deudor cabe en estas condiciones, tomalo y listo, no me
 * preguntes». Eso ya existe y el agente ya lo lee — vive en la política de la
 * agencia (`GET/PATCH /api/agency/:id/policy`, campos `allowedPaymentPlans`,
 * `maxDiscountPct`, `minPaymentCop`, `negotiationMaxAttempts`,
 * `allowHardshipPath`) y se edita en Configuración §Negociación.
 *
 * Lo que faltaba era que se viera desde acá: quien mira Acuerdos no tenía cómo
 * saber que el marco general estaba en otra pantalla. Esta tarjeta es de sólo
 * lectura a propósito — la edición vive en un solo lugar, no en dos.
 */

import Link from 'next/link'
import { ArrowRight, Robot } from '@phosphor-icons/react'
import { Card } from '@leasefy/cadence'

import { Button } from '@/components/ui'
import { useI18n } from '@/lib/i18n'
import { useAgencyPolicy } from '@/lib/hooks/cobranza/use-agency-policy'

const CONFIG_HREF =
  '/panel/inmobiliaria/ai/cobranza/configuracion#heading-negociacion'

function Dato({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="space-y-0.5 min-w-0">
      <p className="text-xs text-fg-muted">{rotulo}</p>
      <p className="text-sm font-medium text-fg font-mono tabular-nums truncate">
        {valor}
      </p>
    </div>
  )
}

export function AcuerdosGeneralesCard() {
  const { formatCurrency } = useI18n()
  const { data, isLoading, error, notProvisioned } = useAgencyPolicy()

  // Sin política todavía no hay marco general que mostrar; una tarjeta con
  // ceros se leería como «el agente no puede cerrar nada», que no es lo mismo.
  if (isLoading || error || notProvisioned || !data) return null

  const plazos =
    data.allowedPaymentPlans && data.allowedPaymentPlans.length > 0
      ? data.allowedPaymentPlans.map((m) => `${m}`).join(' · ') + ' meses'
      : 'Sin plazos habilitados'

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-9 h-9 rounded-lg bg-surface-muted flex items-center justify-center shrink-0">
            <Robot
              className="w-5 h-5 text-fg-muted"
              weight="duotone"
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-fg">
              Acuerdos que el agente puede cerrar solo
            </h2>
            <p className="text-xs text-fg-muted max-w-xl leading-relaxed">
              Si el deudor cabe en estas condiciones, el agente cierra el
              acuerdo sin preguntarte. Fuera de este marco, escala a una
              persona.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" hideArrow className="shrink-0">
          <Link href={CONFIG_HREF}>
            Ajustar
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
        <Dato rotulo="Plazos permitidos" valor={plazos} />
        <Dato rotulo="Descuento máximo" valor={`${data.maxDiscountPct}%`} />
        <Dato rotulo="Pago mínimo" valor={formatCurrency(data.minPaymentCop)} />
        <Dato
          rotulo="Intentos de negociación"
          valor={`${data.negotiationMaxAttempts}`}
        />
      </div>
    </Card>
  )
}
