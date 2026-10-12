/**
 * facturas-del-pago — qué dice el aviso de un pago sobre las facturas que tocó.
 *
 * T-0163: cuando un contrato divide su factura entre varios inquilinos, un
 * recibo trae una entrada por inquilino con el mismo contrato y mes. El aviso
 * habla de MESES: se juntan por mes antes de decir nada. La llave de cada
 * entrada sigue siendo `facturaId`; nada acá indexa por contrato + mes.
 */

import type { FacturaDelPago } from '@/lib/api/recibos-de-caja.types'

export interface ResumenDeLasFacturasDelPago {
  /** Los meses (`YYYY-MM`) cuyas facturas quedaron TODAS pagadas, sin repetir. */
  pagados: string[]
  /** Los meses a los que les queda plata por pagar, con lo que falta en total. */
  conSaldo: Array<{ mes: string; saldoCop: number }>
}

export function resumenDeLasFacturasDelPago(
  facturas: readonly Pick<FacturaDelPago, 'mes' | 'saldoCop'>[],
): ResumenDeLasFacturasDelPago {
  const saldoPorMes = new Map<string, number>()
  for (const f of facturas) saldoPorMes.set(f.mes, (saldoPorMes.get(f.mes) ?? 0) + f.saldoCop)
  const pagados: string[] = []
  const conSaldo: Array<{ mes: string; saldoCop: number }> = []
  for (const [mes, saldoCop] of saldoPorMes) {
    if (saldoCop <= 0) pagados.push(mes)
    else conSaldo.push({ mes, saldoCop })
  }
  return { pagados, conSaldo }
}
