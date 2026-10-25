/**
 * Lo que la lista de links de Payu necesita y no es React: hasta qué mes se
 * puede avanzar y cómo se escribe un instante.
 */

import { diaEnColombia, fechaCorta } from '@/lib/fechas/fecha-de-la-casa'
import { mesActual, sumarMeses } from '@/lib/recaudo/meses'

/**
 * El último mes que se puede mirar: el SIGUIENTE al corriente (en Bogotá).
 *
 * No el corriente, como en Cobros: el primer aviso sale 3 días antes del
 * vencimiento, así que la cuota que vence el 1, el 2 o el 3 del mes que viene
 * ya tiene link ESTE mes. Más allá no hay aviso posible, y una tabla vacía de
 * un mes que no llegó se leería como «Payu no hizo nada».
 */
export function mesTopeDeLosLinks(hoy: string = mesActual()): string {
  return sumarMeses(hoy, 1)
}

/** Un instante en hora de Bogotá, corto: «5 oct, 8:02 a. m.». */
export function instanteEnBogota(iso: string, locale: 'es' | 'en' = 'es'): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso
  // Revisora r25 (Agente de pagos): en español, el día como lo escribe la casa —«16 oct 2026, 4:40 p. m.»—,
  // no «16 de oct, 4:40 p. m.» (VOZ §4). La hora, la de Bogotá.
  if (locale === 'es') {
    const hora = fecha.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit' })
    return `${fechaCorta(diaEnColombia(iso))}, ${hora}`
  }
  return fecha.toLocaleString('en-US', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}
