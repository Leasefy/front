/**
 * Los topes de los términos del contrato y sus frases (02-10-2026).
 *
 * 🔁 Espejo de `back/src/contracts/dto/limites-del-contrato.ts`: los MISMOS
 * números y las MISMAS frases que el DTO de crear y editar un contrato. El
 * formulario los ataja ANTES de mandar; si algo llegara, el back responde 400
 * `DATOS_INVALIDOS` con la misma frase en su campo. Si cambias algo acá,
 * cámbialo allá.
 *
 * Los topes de plata son SÓLO los de la columna (`int4`, 2.147.483.647): el
 * criterio de Nico para el presupuesto del prospecto. No son una regla de
 * negocio; una cifra así siempre es un cero de más.
 */

export const CANON_MINIMO_COP = 100_000
export const CANON_MAXIMO_COP = 2_000_000_000
export const DEPOSITO_MAXIMO_COP = 2_000_000_000

export const DIA_DE_PAGO_MINIMO = 1
export const DIA_DE_PAGO_MAXIMO = 28

export const FECHA_DEL_CONTRATO_DESDE = '2000-01-01'
export const FECHA_DEL_CONTRATO_HASTA = '2100-12-31'

export const MAX_CLAUSULAS_PROPIAS = 30
export const MAX_LARGO_TITULO_DE_CLAUSULA = 100
export const MAX_LARGO_TEXTO_DE_CLAUSULA = 2000

export const MENSAJES_DEL_CONTRATO = {
  // Sólo pesos enteros, con la frase del inmueble (Nico, 02-10-2026).
  canonEntero: 'Escribe el canon en pesos enteros, sin centavos.',
  canonMinimo: 'El canon no puede ser menor que $100.000.',
  canonMaximo: 'El canon no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
  depositoEntero: 'El depósito debe ser un número entero de pesos, sin decimales.',
  depositoNegativo: 'El depósito no puede ser negativo.',
  depositoMaximo: 'El depósito no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
  diaDePago: 'El día de pago debe estar entre 1 y 28.',
  fechaDeInicio: 'Elige una fecha de inicio válida.',
  fechaDeInicioFueraDeRango: 'La fecha de inicio debe estar entre el año 2000 y el 2100.',
  fechaDeFin: 'Elige una fecha de fin válida.',
  fechaDeFinFueraDeRango: 'La fecha de fin debe estar entre el año 2000 y el 2100.',
  finAntesDelInicio: 'La fecha de fin debe ser posterior a la de inicio.',
  clausulasMaximas: 'Puedes agregar hasta 30 cláusulas propias.',
  tituloDeClausulaLargo: 'El título de cada cláusula puede tener hasta 100 caracteres.',
  textoDeClausulaLargo: 'El texto de cada cláusula puede tener hasta 2.000 caracteres.',
} as const

/** Un día real del calendario en AAAA-MM-DD (lo mismo que `EsDiaDelCalendario` del back). */
export function esDiaDelCalendario(valor: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(valor.trim())
  if (!m) return false
  const fecha = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`)
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === `${m[1]}-${m[2]}-${m[3]}`
}

/** Los campos de los términos que el back valida con estos topes. */
export type CampoDeLosTerminos = 'startDate' | 'endDate' | 'monthlyRent' | 'deposit' | 'paymentDay'

/**
 * Los términos tal como están en el formulario (texto de los inputs). Sólo
 * mira lo que se escribió: un campo vacío lo dice cada pantalla con su
 * «Requerido».
 */
export interface TerminosEscritos {
  startDate?: string
  endDate?: string
  monthlyRent?: string
  deposit?: string
  paymentDay?: string
}

/**
 * Las mismas reglas del DTO, con las mismas frases. Devuelve un error por
 * campo; vacío = el back no va a rechazar los términos por topes.
 */
export function revisarTerminosDelContrato(t: TerminosEscritos): Partial<Record<CampoDeLosTerminos, string>> {
  const errores: Partial<Record<CampoDeLosTerminos, string>> = {}
  const M = MENSAJES_DEL_CONTRATO

  const fecha = (campo: 'startDate' | 'endDate', invalida: string, fuera: string) => {
    const v = t[campo]?.trim()
    if (!v) return
    if (!esDiaDelCalendario(v)) errores[campo] = invalida
    else if (v.slice(0, 10) < FECHA_DEL_CONTRATO_DESDE || v.slice(0, 10) > FECHA_DEL_CONTRATO_HASTA) errores[campo] = fuera
  }
  fecha('startDate', M.fechaDeInicio, M.fechaDeInicioFueraDeRango)
  fecha('endDate', M.fechaDeFin, M.fechaDeFinFueraDeRango)
  if (!errores.startDate && !errores.endDate && t.startDate && t.endDate && t.endDate <= t.startDate) {
    errores.endDate = M.finAntesDelInicio
  }

  const canonTexto = t.monthlyRent?.trim()
  if (canonTexto) {
    const canon = Number(canonTexto)
    if (!Number.isFinite(canon) || !Number.isInteger(canon)) errores.monthlyRent = M.canonEntero
    else if (canon < CANON_MINIMO_COP) errores.monthlyRent = M.canonMinimo
    else if (canon > CANON_MAXIMO_COP) errores.monthlyRent = M.canonMaximo
  }

  const depositoTexto = t.deposit?.trim()
  if (depositoTexto) {
    const deposito = Number(depositoTexto)
    if (!Number.isFinite(deposito) || !Number.isInteger(deposito)) errores.deposit = M.depositoEntero
    else if (deposito < 0) errores.deposit = M.depositoNegativo
    else if (deposito > DEPOSITO_MAXIMO_COP) errores.deposit = M.depositoMaximo
  }

  const diaTexto = t.paymentDay?.trim()
  if (diaTexto) {
    const dia = Number(diaTexto)
    if (!Number.isInteger(dia) || dia < DIA_DE_PAGO_MINIMO || dia > DIA_DE_PAGO_MAXIMO) errores.paymentDay = M.diaDePago
  }

  return errores
}
