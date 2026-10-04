'use client'

/**
 * ¿Esta plata ya se escribe con centavos? («centavos en todo», C3-FRONT).
 *
 *   const conCentavos = usePlataConCentavos(AREAS_DE_LA_DEUDA)
 *
 * `true` sólo si el back dice que TODAS esas áreas tienen sus dos llaves
 * prendidas (`GET /config/plata`, ver `con-centavos.ts`). Mientras no contesta,
 * si contesta mal o si es un back viejo: `false`, como hoy. Sin áreas no
 * pregunta nada y es `false` (el campo sigue en pesos enteros).
 *
 * En el servidor y en la primera pintada también es `false`: así el HTML del
 * servidor y el del navegador coinciden, y el campo se abre a los decimales
 * en cuanto llega la respuesta.
 */

import { useEffect, useSyncExternalStore } from 'react'

import {
  NINGUNA_CON_CENTAVOS,
  conCentavosEn,
  configDePlataAhora,
  refrescarConfigDePlata,
  suscribirseALaConfigDePlata,
  type AreasDePlata,
} from './con-centavos'

const sinRespuestaTodavia = () => NINGUNA_CON_CENTAVOS

export function usePlataConCentavos(areas?: AreasDePlata | null): boolean {
  const pregunta = areas !== null && areas !== undefined && areas.length > 0
  const estado = useSyncExternalStore(
    suscribirseALaConfigDePlata,
    configDePlataAhora,
    sinRespuestaTodavia,
  )
  useEffect(() => {
    if (pregunta) void refrescarConfigDePlata()
  }, [pregunta])
  return pregunta ? conCentavosEn(estado, areas) : false
}
