'use client'

/**
 * Nivel interno de Acuerdos de pago: armar un acuerdo general.
 *
 * Ruta propia y no modal porque son tres decisiones (a quién, qué ofrecer, en
 * qué orden gana) y el camino de vuelta tiene que ser explícito.
 */

import { useCallback } from 'react'

import { PageGuard } from '@/components/auth/PageGuard'
import {
  AcuerdoGeneralForm,
  BORRADOR_VACIO,
} from '@/components/inmobiliaria/cobranza/AcuerdoGeneralForm'
import {
  useAcuerdosGenerales,
  type AcuerdoGeneralNuevo,
} from '@/lib/hooks/cobranza/use-acuerdos-generales'

function NuevoAcuerdoGeneral() {
  const { crear } = useAcuerdosGenerales()

  const guardar = useCallback(
    async (payload: AcuerdoGeneralNuevo) => {
      await crear(payload)
    },
    [crear],
  )

  return (
    <AcuerdoGeneralForm
      titulo="Crear acuerdo general"
      inicial={BORRADOR_VACIO}
      onGuardar={guardar}
      textoGuardar="Crear acuerdo"
    />
  )
}

export default function Page() {
  return (
    <PageGuard module="cobranza">
      <NuevoAcuerdoGeneral />
    </PageGuard>
  )
}
