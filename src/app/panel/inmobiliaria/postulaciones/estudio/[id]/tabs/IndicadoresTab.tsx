'use client'

/**
 * IndicadoresTab — estudio de inquilino, vista de caso (zona CENTRO).
 *
 * La tabla de los 7 indicadores derivados (identidad, documentos, ingresos,
 * capacidad de pago, riesgo documental, crédito, codeudor) + las condiciones
 * que mejorarían la viabilidad (qué desbloquearía el caso).
 */

import { IndicadoresTable } from '@/components/inmobiliaria/estudio/IndicadoresTable'
import { CondicionesList } from '@/components/inmobiliaria/estudio/CondicionesList'
import { useI18n } from '@/lib/i18n'
import type { EstudioDecision } from '@/lib/estudio/decision'

interface IndicadoresTabProps {
  decision: EstudioDecision
}

const NS = 'inmobiliaria.ai.estudio'

export function IndicadoresTab({ decision }: IndicadoresTabProps) {
  const { t } = useI18n()

  return (
    <div className="space-y-5">
      <IndicadoresTable indicadores={decision.indicadores} />

      {decision.condiciones.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
            {t(`${NS}.detalle.condicionesTitulo`)}
          </p>
          <CondicionesList condiciones={decision.condiciones} />
        </div>
      )}
    </div>
  )
}
