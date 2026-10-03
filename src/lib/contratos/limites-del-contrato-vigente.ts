/**
 * Los topes del contrato vigente, con las MISMAS cifras y frases que el back
 * (02-10-2026).
 *
 * Conceptos, condiciones (seguro, póliza, administración), incrementos,
 * reglas de mora, cambio de parte, cesión y terminación: lo que la ficha del
 * contrato manda después de crearlo. Esos DTOs pedían sólo «entero mayor que
 * cero», y una cifra con ceros de más llegaba a una columna `int4` y volvía
 * como un error sin campo. Acá se ataja ANTES de mandar, con la frase que el
 * back diría si llegara.
 *
 * 🔁 Espejo de `back/src/contracts/limites-del-contrato-vigente.ts`. Si
 * cambia uno, cambia el otro. Son SÓLO los topes de la columna (Nico,
 * 02-10-2026), no reglas de negocio.
 */

/** Un valor en pesos que va a una columna `Int`: por debajo de 2.147.483.647. */
export const VALOR_MAXIMO_COP = 2_000_000_000

/** `ContratoReglaDeMora.valor` es `Decimal(12,4)`: ocho cifras enteras. */
export const VALOR_MAXIMO_DE_LA_REGLA_DE_MORA = 99_999_999

/** Los dueños nuevos de una cesión. */
export const MAX_NUEVOS_PROPIETARIOS = 20

/**
 * El porcentaje del incremento de un local comercial (la tasa pactada y el
 * incremento digitado): hasta 100 % hacia arriba, −99,999 % hacia abajo (una
 * rebaja), con hasta tres decimales. Los mismos topes del back
 * (`TasaAnualPactadaDto`, `IncrementoDigitadoDto`), con su frase desde el
 * 02-10-2026.
 */
export const PORCENTAJE_MAXIMO_DEL_INCREMENTO = 100
export const PORCENTAJE_MINIMO_DEL_INCREMENTO = -99.999
export const DECIMALES_DEL_PORCENTAJE_DEL_INCREMENTO = 3

/**
 * El rango de las fechas `@db.Date` del back (la del cambio de parte). Ninguna
 * pantalla manda hoy `POST /contracts/:id/cambiar-parte`: van para cuando una
 * lo haga, con la frase de abajo.
 */
export const FECHA_DEL_CONTRATO_DESDE = '2000-01-01'
export const FECHA_DEL_CONTRATO_HASTA = '2100-12-31'

const SIN_CEROS_DE_MAS = 'Revisa que no sobren ceros.'

export const MENSAJES_DEL_CONTRATO_VIGENTE = {
  valorDelConceptoMaximo: `El valor del concepto no puede pasar de $2.000.000.000. ${SIN_CEROS_DE_MAS}`,
  valorDelConceptoEntero: 'El valor del concepto debe ser un número entero de pesos, sin decimales.',
  primaMaxima: `La prima no puede pasar de $2.000.000.000. ${SIN_CEROS_DE_MAS}`,
  primaEntera: 'La prima debe ser un número entero de pesos, sin decimales.',
  administracionMaxima: `El valor de la administración no puede pasar de $2.000.000.000. ${SIN_CEROS_DE_MAS}`,
  administracionEntera: 'El valor de la administración debe ser un número entero de pesos, sin decimales.',
  canonNuevoMaximo: `El canon nuevo no puede pasar de $2.000.000.000. ${SIN_CEROS_DE_MAS}`,
  // Sólo pesos enteros, con la frase del inmueble (Nico, 02-10-2026).
  canonNuevoEntero: 'Escribe el canon en pesos enteros, sin centavos.',
  // 02-10-2026: el porcentaje del incremento (local comercial) con su frase.
  tasaPactadaNumero: 'La tasa pactada debe ser un número con hasta tres decimales, por ejemplo 5,5.',
  tasaPactadaMinima: 'La tasa pactada no puede ser menor que −99,999 %.',
  tasaPactadaMaxima: 'La tasa pactada no puede pasar de 100 %. Revisa que no sobre una cifra.',
  incrementoNumero: 'El incremento debe ser un número con hasta tres decimales, por ejemplo 5,5.',
  incrementoMinimo: 'El incremento no puede ser menor que −99,999 %.',
  incrementoMaximo: 'El incremento no puede pasar de 100 %. Revisa que no sobre una cifra.',
  penalidadMaxima: `La penalidad no puede pasar de $2.000.000.000. ${SIN_CEROS_DE_MAS}`,
  penalidadParaLaInmobiliariaMaxima: `La parte de la inmobiliaria no puede pasar de $2.000.000.000. ${SIN_CEROS_DE_MAS}`,
  valorDeLaReglaMaximo: `El valor de la regla no puede pasar de 99.999.999. ${SIN_CEROS_DE_MAS}`,
  nuevosPropietariosMaximos: 'Una cesión puede tener hasta 20 nuevos propietarios.',
  fechaDelCambio: 'La fecha del cambio no es un día real del calendario (usa AAAA-MM-DD).',
  fechaDelCambioFueraDeRango: 'La fecha del cambio debe estar entre el año 2000 y el 2100.',
  vigenciaDesde: 'El inicio de la vigencia no es un día real del calendario (usa AAAA-MM-DD).',
  vigenciaHasta: 'El fin de la vigencia no es un día real del calendario (usa AAAA-MM-DD).',
  diaDeEntrega: 'El día de entrega no es un día real del calendario (usa AAAA-MM-DD).',
  // 🔴 02-10-2026 · Las fechas que se corrían (`2026-02-31` → 3 de marzo): el
  // back las rechaza en su campo con estas frases (seguro, terminación,
  // cesión y constancia de la carta).
  aceptacionDelSeguro: 'El día de la aceptación del seguro no es un día real del calendario (usa AAAA-MM-DD).',
  aceptacionDelSeguroFueraDeRango: 'El día de la aceptación del seguro debe estar entre el año 2000 y el 2100.',
  fechaDeTerminacion: 'La fecha de terminación no es un día real del calendario (usa AAAA-MM-DD).',
  fechaDeTerminacionFueraDeRango: 'La fecha de terminación debe estar entre el año 2000 y el 2100.',
  fechaDeLaCesion: 'La fecha de la cesión no es un día real del calendario (usa AAAA-MM-DD).',
  fechaDeLaCesionFueraDeRango: 'La fecha de la cesión debe estar entre el año 2000 y el 2100.',
  fechaDeLaConstancia: 'El día de la entrega de la carta no es un día real del calendario (usa AAAA-MM-DD).',
  fechaDeLaConstanciaFueraDeRango: 'El día de la entrega de la carta debe estar entre el año 2000 y el 2100.',
} as const

/**
 * El tope de un valor en pesos, o `null` si está bien. `undefined`/vacío no
 * opina: de «falta el valor» se encarga cada formulario.
 */
export function topeDePesos(valor: number | null | undefined, mensaje: string): string | null {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return null
  return valor > VALOR_MAXIMO_COP ? mensaje : null
}

/**
 * El porcentaje del incremento ESCRITO (la tasa pactada o el de un
 * aniversario) revisado como lo revisa el back, o `null` si sirve. Vacío no
 * opina: vacío es «quitar la tasa». Acepta la coma decimal («5,5»).
 */
export function errorDelPorcentajeDelIncremento(
  texto: string,
  cual: 'tasaPactada' | 'incremento',
): string | null {
  const M = MENSAJES_DEL_CONTRATO_VIGENTE
  const frases =
    cual === 'tasaPactada'
      ? { numero: M.tasaPactadaNumero, minimo: M.tasaPactadaMinima, maximo: M.tasaPactadaMaxima }
      : { numero: M.incrementoNumero, minimo: M.incrementoMinimo, maximo: M.incrementoMaximo }
  const limpio = texto.replace(',', '.').trim()
  if (limpio === '') return null
  const n = Number(limpio)
  if (!Number.isFinite(n)) return frases.numero
  // Como `@IsNumber({ maxDecimalPlaces: 3 })`: los decimales del número.
  const decimales = String(n).split('.')[1]?.length ?? 0
  if (decimales > DECIMALES_DEL_PORCENTAJE_DEL_INCREMENTO) return frases.numero
  if (n < PORCENTAJE_MINIMO_DEL_INCREMENTO) return frases.minimo
  if (n > PORCENTAJE_MAXIMO_DEL_INCREMENTO) return frases.maximo
  return null
}
