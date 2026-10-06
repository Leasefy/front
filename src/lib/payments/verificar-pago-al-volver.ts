/**
 * Verificar al volver de Wompi (Nico, 02-10-2026, ola «seguimiento 4»).
 *
 * El checkout del arriendo vuelve a `/inquilino/pagos?id=<transacción>`. El
 * `id` lo pone Wompi en la URL (un parámetro del navegador: NUNCA es la fuente
 * de verdad). Con él, el portal le pide al back que consulte ESA transacción
 * en Wompi y la pase por el mismo camino que el webhook
 * (`POST /leases/pagos-en-linea/:transaccionId/verificar`, idempotente): así se
 * recupera un pago cuyo webhook nunca llegó. Lo que se le dice a la persona es
 * lo que respondió el back.
 *
 * Sin llamadas a Wompi desde el navegador: la llave privada vive en el back.
 */

import { apiClient } from '@/lib/api/client'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'

/** Lo que el back dice del pago con que la persona volvió. */
export type EstadoDelPagoAlVolver = 'APROBADO' | 'EN_VERIFICACION' | 'RECHAZADO' | 'ANULADO'

export interface PagoVerificadoAlVolver {
  transaccionId: string
  estado: EstadoDelPagoAlVolver
  leaseId: string
  periodo: { mes: number; anio: number }
  /** La frase del back, en español y de tú. */
  mensaje: string
}

/**
 * El `id` de la transacción con que volvió Wompi, o `null` si no hay uno que
 * valga la pena verificar (vacío, o con algo que cambiaría la forma de la URL
 * del back). La misma regla que valida el back.
 */
export function transaccionDelRetorno(params: { get(nombre: string): string | null }): string | null {
  const id = params.get('id')?.trim() ?? ''
  return /^[A-Za-z0-9-]{3,64}$/.test(id) ? id : null
}

export function verificarPagoAlVolver(transaccionId: string): Promise<PagoVerificadoAlVolver> {
  return apiClient.post<PagoVerificadoAlVolver>(
    `/leases/pagos-en-linea/${encodeURIComponent(transaccionId)}/verificar`,
    {},
  )
}

/** Cómo suena el aviso: confirmado es éxito; rechazado o anulado, error; lo demás, información. */
export function tonoDelAviso(estado: EstadoDelPagoAlVolver): 'success' | 'error' | 'info' {
  if (estado === 'APROBADO') return 'success'
  if (estado === 'RECHAZADO' || estado === 'ANULADO') return 'error'
  return 'info'
}

/** La frase en inglés (el back sólo habla español). */
export function mensajeEnIngles(estado: EstadoDelPagoAlVolver): string {
  switch (estado) {
    case 'APROBADO':
      return 'Your rent payment was confirmed.'
    case 'RECHAZADO':
      return 'Wompi did not approve the payment. You can try again.'
    case 'ANULADO':
      return 'The payment was voided in Wompi. You can try again.'
    case 'EN_VERIFICACION':
      return 'Your payment is being verified. No need to pay again: you will see the confirmation in your history when it completes.'
  }
}

/** Lo que `avisarDelPagoAlVolver` necesita del toast (el del DS: `toast.success|error|info`). */
export interface AvisadorDelPago {
  success(texto: string, opciones?: { id?: string; duration?: number }): unknown
  error(texto: string, opciones?: { id?: string; duration?: number }): unknown
  info(texto: string, opciones?: { id?: string; duration?: number }): unknown
}

/** Un solo aviso que se actualiza: «verificando…» → lo que dijo el back. */
export const ID_DEL_AVISO = 'verificar-pago-al-volver'

/**
 * Al volver de Wompi a `/inquilino/pagos`: dice «verificando…», le pide al back
 * verificar la transacción y dice lo que el back respondió (o por qué no se
 * pudo, con el traductor: «conexión» sólo sin respuesta). Siempre termina
 * llamando `recargar` (las solicitudes y el período). Nunca lanza.
 */
export async function avisarDelPagoAlVolver(e: {
  transaccion: string
  locale: string
  aviso: AvisadorDelPago
  recargar: () => void
  verificar?: (transaccionId: string) => Promise<PagoVerificadoAlVolver>
}): Promise<PagoVerificadoAlVolver | null> {
  const es = e.locale === 'es'
  const verificar = e.verificar ?? verificarPagoAlVolver
  e.aviso.info(es ? 'Estamos verificando tu pago con Wompi…' : 'We are checking your payment with Wompi…', {
    id: ID_DEL_AVISO,
  })
  try {
    const pago = await verificar(e.transaccion)
    const texto = es ? pago.mensaje : mensajeEnIngles(pago.estado)
    const opciones = { id: ID_DEL_AVISO, duration: 8000 }
    const tono = tonoDelAviso(pago.estado)
    if (tono === 'success') e.aviso.success(texto, opciones)
    else if (tono === 'error') e.aviso.error(texto, opciones)
    else e.aviso.info(texto, opciones)
    return pago
  } catch (err) {
    e.aviso.error(
      mensajeParaLaPersona(err, {
        accion: 'verificar tu pago',
        porDefecto: es
          ? 'No pudimos verificar tu pago ahora. Si Wompi lo aprobó, vas a verlo en tu historial en unos minutos.'
          : 'We could not check your payment right now. If Wompi approved it, you will see it in your history in a few minutes.',
      }),
      { id: ID_DEL_AVISO, duration: 8000 },
    )
    return null
  } finally {
    e.recargar()
  }
}
