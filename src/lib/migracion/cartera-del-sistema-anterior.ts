/**
 * 🔴 La cartera del sistema anterior, por inquilino (Juan, Portofino, 15-10-2026:
 * «la migración debería traer la cartera antigua»; Nico eligió «Saldo anterior
 * por inquilino»).
 *
 * Del balance de prueba por tercero A LA FECHA DE CORTE se toman las cuentas de
 * cartera (las 13: cuentas por cobrar) y, por documento, lo que debía cada uno.
 * El back lo lleva a su contrato como «Saldo del sistema anterior» (una cuota
 * con mora desde el corte). Puro: lo que se ve y lo que se manda sale de acá.
 */
import { netoDelRenglon, type FormaDelSaldo, type RenglonDelBalance } from './balance-de-apertura'

export interface CuentaDeCartera {
  codigo: string
  nombre: string
  /** Cuántos documentos distintos tienen saldo en ella. */
  terceros: number
  /** Débito − crédito de la cuenta, en CENTAVOS. */
  totalCentavos: number
}

export interface SaldoDeUnDocumento {
  documento: string
  nombre: string
  /** En pesos (con centavos si los hay). Positivo = lo debe. */
  saldoCop: number
}

/** Las cuentas 13 del archivo que tienen terceros, de la de más terceros a la de menos. */
export function cuentasDeCartera(
  renglones: readonly RenglonDelBalance[],
  forma: FormaDelSaldo,
): CuentaDeCartera[] {
  const porCodigo = new Map<string, { nombre: string; docs: Set<string>; total: number }>()
  for (const r of renglones) {
    if (!r.codigo.startsWith('13') || !r.documento) continue
    const neto = netoDelRenglon(r, forma, 'DEBITO', false)
    if (neto === null) continue
    const c = porCodigo.get(r.codigo) ?? { nombre: r.nombreCuenta, docs: new Set<string>(), total: 0 }
    if (!c.nombre && r.nombreCuenta) c.nombre = r.nombreCuenta
    // El mismo documento con o sin puntos es UNA persona.
    if (neto !== 0) c.docs.add(r.documento.replace(/\D/g, '') || r.documento)
    c.total += neto
    porCodigo.set(r.codigo, c)
  }
  return [...porCodigo.entries()]
    .map(([codigo, c]) => ({ codigo, nombre: c.nombre, terceros: c.docs.size, totalCentavos: c.total }))
    .filter((c) => c.terceros > 0)
    .sort((a, b) => b.terceros - a.terceros || a.codigo.localeCompare(b.codigo))
}

/**
 * Las que se marcan solas: las de cuentas por cobrar del arriendo (1380 —en
 * Portofino 13802501, «CxC de terceros - canon»— y 1305, clientes). Sin
 * ninguna de ésas, la que más terceros tiene. La persona puede cambiarlas.
 */
export function cuentasSugeridas(cuentas: readonly CuentaDeCartera[]): string[] {
  const deCartera = cuentas.filter((c) => /^(1380|1305)/.test(c.codigo)).map((c) => c.codigo)
  if (deCartera.length > 0) return deCartera
  return cuentas.length > 0 ? [cuentas[0].codigo] : []
}

/** Por documento, lo que debía en las cuentas elegidas. Los que quedan en cero no van. */
export function saldosPorDocumento(
  renglones: readonly RenglonDelBalance[],
  forma: FormaDelSaldo,
  codigos: ReadonlySet<string>,
): SaldoDeUnDocumento[] {
  const porDocumento = new Map<string, { documento: string; nombre: string; centavos: number }>()
  for (const r of renglones) {
    if (!codigos.has(r.codigo) || !r.documento) continue
    const neto = netoDelRenglon(r, forma, 'DEBITO', false)
    if (neto === null) continue
    const llave = r.documento.replace(/\D/g, '') || r.documento
    const ya = porDocumento.get(llave) ?? { documento: r.documento, nombre: r.nombreTercero, centavos: 0 }
    if (!ya.nombre && r.nombreTercero) ya.nombre = r.nombreTercero
    ya.centavos += neto
    porDocumento.set(llave, ya)
  }
  return [...porDocumento.values()]
    .filter((s) => s.centavos !== 0)
    .map((s) => ({ documento: s.documento, nombre: s.nombre, saldoCop: s.centavos / 100 }))
    .sort((a, b) => b.saldoCop - a.saldoCop)
}
