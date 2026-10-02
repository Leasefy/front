/**
 * 🔴 Lo que se devuelve del depósito NUNCA es negativo (Nico, 02-10-2026).
 *
 * «El valor a devolver es `@Min(0)`. Lo que el inquilino deba de más va como
 * un cargo aparte.» La pantalla restaba los descuentos del depósito y, si se
 * pasaban, mostraba un «valor a devolver» negativo. Son dos cifras distintas:
 * lo que se le devuelve (de 0 en adelante) y lo que debe APARTE.
 *
 * 🔁 Espejo de `back/src/inmobiliaria/actas/devolucion-del-deposito.ts`, que
 * es el que decide lo que se guarda: si cambias uno, cambia el otro.
 */

export interface LiquidacionDelDeposito {
  /** La suma de los descuentos (los que no son un entero ≥ 0 no cuentan). */
  descontadoCop: number
  /** Lo que se devuelve: nunca menos de 0. */
  aDevolverCop: number
  /** Lo que los descuentos pasan del depósito: va como un cargo aparte. */
  aCargoDelInquilinoCop: number
}

export function liquidarElDeposito(
  depositoCop: number,
  descuentos: ReadonlyArray<{ amount?: unknown }> | null | undefined,
): LiquidacionDelDeposito {
  const deposito = Math.max(0, Math.trunc(depositoCop) || 0)
  const descontadoCop = (descuentos ?? []).reduce<number>((suma, d) => {
    const valor = typeof d?.amount === 'number' ? d.amount : NaN
    return Number.isInteger(valor) && valor > 0 ? suma + valor : suma
  }, 0)
  return {
    descontadoCop,
    aDevolverCop: Math.max(0, deposito - descontadoCop),
    aCargoDelInquilinoCop: Math.max(0, descontadoCop - deposito),
  }
}
