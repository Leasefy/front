'use client'

/**
 * T-0153 (A3): el archivo pidió un «Tipo de interés» (por día o monto fijo) y la
 * inmobiliaria no tiene esa regla de mora. El contrato SE MIGRÓ igual (aviso
 * no bloqueante del back, `regla_de_interes_no_configurada`); esto dice qué
 * hacer, como alerta en línea y no como chip.
 */

import * as React from 'react'
import { AlertaAccionable } from '@/components/ui/alerta-accionable'

export function AvisoDeReglaDeInteres({
  avisos,
}: {
  avisos?: Array<{ codigo: string; cuantos?: number }>
}) {
  const aviso = avisos?.find((a) => a.codigo === 'regla_de_interes_no_configurada')
  if (!aviso) return null
  const n = aviso.cuantos
  const quienes =
    n === undefined ? 'Algunos contratos' : n === 1 ? '1 contrato' : `${n} contratos`
  return (
    <AlertaAccionable
      severidad="warning"
      data-testid="aviso-regla-de-interes"
      titulo={`${quienes} pedían un tipo de interés que la inmobiliaria no tiene configurado`}
    >
      Se migraron igual. Para que ese tipo de interés se aplique, configura la regla
      de interés de mora (por día o monto fijo) en la configuración de la inmobiliaria.
    </AlertaAccionable>
  )
}
