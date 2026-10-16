/**
 * 🔴 CB-05 (QA-PAGOS-95 r2): las cuotas como las arma el MICRO al guardar
 * (`cartera/payment-plans/engine.ts`): iguales hacia abajo y la última se lleva
 * el resto; la primera vence en la fecha elegida y las demás, un mes después
 * cada una. Antes la vista previa redondeaba distinto y el micro ni siquiera
 * recibía lo escrito.
 */
export function cuotasDelAcuerdo(
  saldo: number,
  n: number,
  primera: string,
): { numero: number; vence: string | null; valor: number }[] {
  if (n <= 0 || saldo <= 0) return []
  const base = Math.floor(saldo / n)
  const out: { numero: number; vence: string | null; valor: number }[] = []
  let asignado = 0
  for (let i = 1; i <= n; i++) {
    const valor = i === n ? saldo - asignado : base
    asignado += valor
    out.push({ numero: i, vence: primera.length >= 10 ? mesesDespues(primera, i - 1) : null, valor })
  }
  return out
}

/** `AAAA-MM-DD` + `meses`, conservando el día (31 de enero + 1 = 28/29 de febrero), como el micro. */
function mesesDespues(fecha: string, meses: number): string {
  const [a, m, d] = fecha.slice(0, 10).split('-').map(Number)
  const ultimo = new Date(Date.UTC(a, m - 1 + meses + 1, 0)).getUTCDate()
  return new Date(Date.UTC(a, m - 1 + meses, Math.min(d, ultimo))).toISOString().slice(0, 10)
}

/**
 * QA-AGENTES 16-10 (lab): con una inicial de $5.000.000 sobre una deuda de
 * $4.200.000 no se decía nada (sólo «Guardar» apagado) y la vista previa
 * mostraba «Saldo en 2 cuotas $ 0» junto a «Pago único». Las mismas reglas
 * (y frases) que `problemasDeLoPedido` del micro, antes de guardar.
 */
export function errorDeLaCuotaInicial(input: { inicial: number; total: number; cuotas: number; plata: (n: number) => string }): string | null {
  const { inicial, total, cuotas } = input
  if (cuotas <= 0 || total <= 0 || inicial <= 0) return null
  if (inicial > total) return `La cuota inicial no puede pasar del total del acuerdo: ${input.plata(total)}.`
  if (inicial === total) return 'Con la inicial cubriendo todo no queda nada para las cuotas: elige «Pago único» o baja la inicial.'
  return null
}
