/**
 * Refresca lo que dice el back de la plata (`GET /config/plata`) para las
 * pantallas («centavos en todo»). Vive aparte de `con-centavos.ts` para que los
 * formatos de plata —que también usa el servidor— no arrastren el cliente HTTP
 * (ver `preguntarLaConfigDePlata`).
 */

import { pedirConfigDePlata } from '@/lib/api/config-de-plata.service'

import { preguntarLaConfigDePlata, type ConCentavosPorArea } from './con-centavos'

/** Pregunta al back si la respuesta ya venció (60 s). Nunca lanza. */
export function refrescarConfigDePlata(): Promise<ConCentavosPorArea> {
  return preguntarLaConfigDePlata(() => pedirConfigDePlata())
}
