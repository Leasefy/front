/**
 * 🔴 El 429 del back (auditoría de seguridad, 23-09-2026).
 *
 * El back empezó a limitar el ritmo de las peticiones: una ráfaga de más
 * responde 429 con `Retry-After` (segundos) y un cuerpo
 * `{ code: 'DEMASIADAS_SOLICITUDES', reintentarEnSegundos, message }`. Un 429
 * también puede venir del proxy de adelante SIN ese cuerpo (nginx), así que
 * el mensaje se arma acá, con lo que haya: primero el cuerpo, después el
 * encabezado, y si no hay ninguno, sin número.
 *
 * Lo que la persona tiene que leer es CUÁNTO esperar. «Error 429» no le dice
 * nada, y «intenta de nuevo» sin plazo la invita a machacar el botón, que es
 * justo lo que alarga el bloqueo.
 */

export const CODIGO_DEMASIADAS_SOLICITUDES = 'DEMASIADAS_SOLICITUDES'

/** «45 segundos», «1 minuto», «15 minutos», «1 hora». Igual que el back. */
export function cuantoEsperar(segundos: number): string {
  if (segundos < 60) return `${segundos} ${segundos === 1 ? 'segundo' : 'segundos'}`
  const minutos = Math.ceil(segundos / 60)
  if (minutos < 60) return `${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`
  const horas = Math.ceil(minutos / 60)
  return `${horas} ${horas === 1 ? 'hora' : 'horas'}`
}

/**
 * Cuántos segundos hay que esperar, o `null` si nadie lo dijo. Lee el cuerpo
 * (`reintentarEnSegundos`) antes que el encabezado: el navegador sólo deja
 * leer `Retry-After` si el back lo expone por CORS, y el cuerpo llega siempre.
 */
export function segundosDeEspera(
  cabeceras: Pick<Headers, 'get'> | null | undefined,
  cuerpo: unknown,
): number | null {
  const delCuerpo =
    cuerpo && typeof cuerpo === 'object'
      ? (cuerpo as { reintentarEnSegundos?: unknown }).reintentarEnSegundos
      : undefined
  if (typeof delCuerpo === 'number' && Number.isFinite(delCuerpo) && delCuerpo > 0) {
    return Math.ceil(delCuerpo)
  }
  const crudo = cabeceras?.get('Retry-After')?.trim()
  if (!crudo) return null
  if (/^\d+$/.test(crudo)) {
    const n = Number(crudo)
    return n > 0 ? n : null
  }
  // `Retry-After` también puede ser una fecha HTTP.
  const cuando = Date.parse(crudo)
  if (Number.isNaN(cuando)) return null
  const faltan = Math.ceil((cuando - Date.now()) / 1000)
  return faltan > 0 ? faltan : null
}

/** La frase que se le muestra a la persona. */
export function mensajeDeDemasiadasSolicitudes(segundos: number | null): string {
  return segundos
    ? `Hiciste demasiadas solicitudes seguidas. Espera ${cuantoEsperar(segundos)} y vuelve a intentar.`
    : 'Hiciste demasiadas solicitudes seguidas. Espera un momento y vuelve a intentar.'
}
