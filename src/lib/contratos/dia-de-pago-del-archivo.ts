/**
 * dia-de-pago-del-archivo — T-0153 §3.3. Copia FIEL de la regla del back
 * (`diaDePagoDelArchivo`, autoritativa) para MOSTRAR en la vista previa qué día
 * quedaría. El front no deriva ni manda `paymentDay`: sólo lo enseña.
 *
 *   1. un `paymentDay` entero en [1,31] manda (tope 28)
 *   2. base = la fecha de cartera, o la de inicio (sólo texto yyyy-mm-dd, sin zonas)
 *   3. prorratear -> 1; si no -> el día de la base (tope 28)
 */

const FECHA = /^(\d{4})-(\d{2})-(\d{2})/

function diaDeLaFecha(texto: string | undefined): number | null {
  const m = typeof texto === 'string' ? FECHA.exec(texto.slice(0, 10)) : null
  if (!m) return null
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const real = new Date(Date.UTC(anio, mes - 1, dia))
  const existe =
    real.getUTCFullYear() === anio && real.getUTCMonth() === mes - 1 && real.getUTCDate() === dia
  return existe ? dia : null
}

export function diaDePagoDelArchivo(entrada: {
  paymentDay?: number
  fechaDeCartera?: string
  startDate?: string
  prorratear: boolean
}): number | null {
  const { paymentDay } = entrada
  if (typeof paymentDay === 'number' && Number.isInteger(paymentDay) && paymentDay >= 1 && paymentDay <= 31) {
    return Math.min(paymentDay, 28)
  }
  const dia = diaDeLaFecha(entrada.fechaDeCartera) ?? diaDeLaFecha(entrada.startDate)
  if (dia === null) return null
  return entrada.prorratear ? 1 : Math.min(dia, 28)
}
