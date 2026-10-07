import { ApiError } from '@/lib/api/client'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'

/**
 * Por qué no se pudo abrir una conversación directa (02-10-2026).
 *
 * El back distingue «no hay relación» (403 `SIN_RELACION`) y «no tiene cuenta»
 * (404 `SIN_CUENTA`) de un fallo cualquiera, y esa diferencia le importa a
 * quien está mirando: una es una regla, la otra es un problema. Esas dos
 * tienen su frase; todo lo demás va por el traductor: el motivo del back si
 * lo trae, un 5xx «de nuestro lado» con su referencia, y «conexión» SÓLO
 * cuando no hubo respuesta. Antes cualquier otro fallo decía «Intenta de
 * nuevo», como si fuera la red.
 */
export function mensajeDelHiloDirecto(err: unknown): string {
  if (err instanceof ApiError) {
    const code = err.code ?? (typeof err.detalle?.code === 'string' ? err.detalle.code : undefined)
    if (err.status === 404 && (!code || code === 'SIN_CUENTA')) {
      return 'Esa persona todavía no tiene cuenta en Leasefy, así que no hay dónde escribirle.'
    }
    if (err.status === 403 && (!code || code === 'SIN_RELACION')) {
      return 'Solo puedes escribirle a alguien con quien tengas un inmueble o un contrato en común.'
    }
  }
  return mensajeParaLaPersona(err, {
    porDefecto: 'No pudimos abrir la conversación. Prueba de nuevo en un momento.',
    accion: 'abrir la conversación',
  })
}
