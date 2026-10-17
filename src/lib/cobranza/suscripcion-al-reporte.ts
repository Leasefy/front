/**
 * La suscripción de cada persona al Reporte diario (MORI-24, QA-AGENTES 16-10):
 * lo que dice el aviso al guardar. Antes no decía nada.
 */

import type { SubscriptionPatch } from '@/lib/hooks/cobranza/use-subscription'

/**
 * Sólo español: la pantalla de la inmobiliaria. Con el WhatsApp de la
 * inmobiliaria apagado, prender el personal no manda nada todavía: se dice.
 */
export function fraseDelGuardado(patch: SubscriptionPatch, whatsappDeLaInmobiliaria: boolean | null): string {
  if (patch.whatsapp_enabled === true) {
    return whatsappDeLaInmobiliaria === false
      ? 'Guardado. El reporte te llegará por WhatsApp cuando tu inmobiliaria prenda ese envío.'
      : 'Listo: el reporte diario te llega por WhatsApp.'
  }
  if (patch.whatsapp_enabled === false && patch.email_enabled === undefined) {
    return 'Ya no recibes el reporte diario por WhatsApp.'
  }
  if (patch.email_enabled === true) return 'Listo: el reporte diario te llega por correo cada mañana.'
  if (patch.email_enabled === false) return 'Ya no recibes el reporte diario por correo.'
  return 'Guardado.'
}

/**
 * «1 de 1 persona» / «2 de 5 personas» bajo «Cuántos del equipo lo reciben»
 * (antes «1 de 1 miembros suscritos»: el plural no seguía al total).
 */
export function cuantosDelEquipo(suscritos: number, total: number): string {
  return `${suscritos} de ${total} ${total === 1 ? 'persona' : 'personas'}`
}
