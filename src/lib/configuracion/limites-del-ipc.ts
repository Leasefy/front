/**
 * El IPC que configura la inmobiliaria, con las MISMAS cifras y las MISMAS
 * frases que el back (02-10-2026).
 *
 * 🔁 Espejo de `back/src/inmobiliaria/agency/dto/limites-del-ipc.ts` (las
 * frases) y de `IPC_MAXIMO` en `back/src/contracts/renovacion/renovacion-automatica.ts`
 * (el tope). Si cambia uno, cambia el otro.
 *
 * Dos campos de Configuración → Perfil → Renovación automática:
 *   · `ipcVigente` (`ConfigRenovacionAutomatica`): de 0 a 100 %, dos decimales;
 *   · `ipcPorAnio` (`ConfigIpcPorAnio`): mayor que 0 y hasta 100 %, dos decimales.
 *
 * El tope es 100 por decisión de Nico (02-10-2026); hasta ese día era 30. Es el
 * mismo con el que la renovación lee el IPC por año.
 */

import { repartirErroresDelServidor, traeErroresPorCampo } from '@/lib/errores/errores-en-el-formulario'

/** El mismo `@Min(0) @Max(IPC_MAXIMO)` del DTO del back. */
export const IPC_MINIMO = 0
export const IPC_MAXIMO = 100

export const MENSAJES_DEL_IPC = {
  ipcVigente: 'El IPC vigente debe ser un número entre 0 y 100 %, con hasta dos decimales.',
  ipcPorAnio:
    'El IPC de cada año debe ser mayor que 0 y hasta 100 %, con hasta dos decimales, en un año entre 2000 y 2100.',
} as const

/**
 * Lo que el back dijo de UN campo del IPC en un 400 con `campos`: la frase de
 * ese campo (va BAJO él) y lo demás que esta sección no muestra (va a un toast).
 *
 * Sin `campos` —un 403, un 5xx, la red— no devuelve nada: el padre
 * (`SeccionPerfil`, `guardarCon({ pintaLosCampos: true })`) ya lo avisó con el
 * traductor, y decirlo dos veces es ruido.
 */
export function loQueElBackDijoDelIpc(
  error: unknown,
  campo: keyof typeof MENSAJES_DEL_IPC,
): { delCampo?: string; sueltos: string[] } {
  if (!traeErroresPorCampo(error)) return { sueltos: [] }
  const reparto = repartirErroresDelServidor(error, { campos: [campo] })
  return { delCampo: reparto.porCampo[campo], sueltos: reparto.sueltos }
}
