/**
 * La frase del mes de Payu (EL MOLDE de `components/retencion/frases.ts`: el
 * resumen es una FRASE, no fichas sueltas). Pura, para que la pantalla y las
 * pruebas digan lo mismo.
 *
 * 🔴 Con Payu apagado no se inventa nada: se dice que está apagado y quién lo
 * prende, y sólo se cuentan los links que el back dice que salieron.
 */
import { formatCurrency } from '@/lib/format'
import { nombreDelMes } from '@/lib/recaudo/meses'
import type { ResumenDeLinksDePago } from '@/lib/types/payu'

export const PAYU_APAGADO = 'Payu está apagado en el servidor: lo prende Leasefy.'

const cuotas = (n: number) => `${n} ${n === 1 ? 'cuota' : 'cuotas'}`

/**
 * «mandó el link de 40 de 105 cuotas[ de octubre de 2026]; 12 se pagaron por
 * link (…) y quedan … pendientes». El mes va sólo si la frase no lo dijo antes.
 */
function loQueMando(r: ResumenDeLinksDePago, deMes: string | null): string {
  const pagados =
    r.pagadosPorLink === 0
      ? 'ninguna se ha pagado por link todavía'
      : `${r.pagadosPorLink === 1 ? '1 se pagó' : `${r.pagadosPorLink} se pagaron`} por link (${formatCurrency(r.montoCobradoPorLinkCop)})`
  return (
    `mandó el link de ${r.linksEnviados} de ${cuotas(r.cuotas)}${deMes ? ` de ${deMes}` : ''}; ${pagados}` +
    ` y quedan ${formatCurrency(r.pendientesCop)} pendientes.`
  )
}

export function fraseDelMesDePayu(r: ResumenDeLinksDePago): string {
  const mes = nombreDelMes(r.mes)

  if (!r.payuActivo) {
    return r.linksEnviados === 0
      ? `${PAYU_APAGADO} No ha mandado ningún link de ${mes}.`
      : `${PAYU_APAGADO} Mientras estuvo prendido ${loQueMando(r, mes)}`
  }

  if (r.cuotas === 0) return `Payu está prendido, pero ${mes} no tiene cuotas por cobrar.`

  if (r.linksEnviados === 0) {
    const cuales = r.cuotas === 1 ? 'la cuota' : `las ${r.cuotas} cuotas`
    return `Payu está prendido y todavía no ha mandado links de ${cuales} de ${mes}: el primer aviso de cada cuota sale 3 días antes de su vencimiento.`
  }

  return `En ${mes} Payu ${loQueMando(r, null)}`
}
