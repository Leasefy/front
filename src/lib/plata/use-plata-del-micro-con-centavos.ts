'use client'

/**
 * ¿Lo que este formulario escribe en el MICRO ya puede llevar centavos?
 * (`GET /config/plata` del micro, C4). `false` mientras no contesta, en el
 * servidor, en la primera pintada, con un micro viejo o si falla: como hoy.
 */

import { useEffect, useSyncExternalStore } from 'react'

import {
  plataDelMicroConCentavosAhora,
  refrescarPlataDelMicro,
  suscribirseALaPlataDelMicro,
} from './micro-con-centavos'

const sinRespuestaTodavia = () => false

export function usePlataDelMicroConCentavos(): boolean {
  const estado = useSyncExternalStore(
    suscribirseALaPlataDelMicro,
    plataDelMicroConCentavosAhora,
    sinRespuestaTodavia,
  )
  useEffect(() => {
    void refrescarPlataDelMicro()
  }, [])
  return estado
}
