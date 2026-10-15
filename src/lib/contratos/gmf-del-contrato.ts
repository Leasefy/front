/**
 * 🔴 El 4x1000 del giro, elegido en el contrato (Juan, Portofino, 15-10-2026:
 * «en el contrato, seleccionable si se le cobra al propietario»).
 *
 * Tres opciones, no dos: «Como la inmobiliaria» (`null`) no es «la inmobiliaria
 * lo asume»: es seguir lo que ella configure, hoy y mañana. Por eso la ficha
 * dice qué rige HOY con esa opción.
 *
 * Sin 4x1000 configurado en la inmobiliaria (`porMil: null`) no se descuenta en
 * ningún giro, elija lo que elija el contrato (`costosDeLaCuota` del back): la
 * ficha lo dice en vez de prometer un descuento que no va a pasar.
 */
import type { GmfDeLaInmobiliaria } from '@/lib/types/contract'

export type EleccionDelGmf = 'inmobiliaria-decide' | 'propietario' | 'inmobiliaria'

export function eleccionDelGmf(valor: boolean | null | undefined): EleccionDelGmf {
  if (valor === true) return 'propietario'
  if (valor === false) return 'inmobiliaria'
  return 'inmobiliaria-decide'
}

export function valorDeLaEleccion(eleccion: EleccionDelGmf): boolean | null {
  if (eleccion === 'propietario') return true
  if (eleccion === 'inmobiliaria') return false
  return null
}

/** Qué hace la inmobiliaria hoy, en palabras: «lo paga el propietario» o «lo asume la inmobiliaria». */
function loQueHaceLaInmobiliaria(gmf: GmfDeLaInmobiliaria): string {
  return gmf.trasladaAlPropietario ? 'lo paga el propietario' : 'lo asume la inmobiliaria'
}

/** Las tres opciones del formulario, con lo que rige hoy en la primera. */
export function opcionesDelGmf(
  gmf: GmfDeLaInmobiliaria | null | undefined,
): Array<{ valor: EleccionDelGmf; etiqueta: string }> {
  return [
    {
      valor: 'inmobiliaria-decide',
      etiqueta: gmf ? `Como la inmobiliaria (hoy ${loQueHaceLaInmobiliaria(gmf)})` : 'Como la inmobiliaria',
    },
    { valor: 'propietario', etiqueta: 'Lo paga el propietario: se descuenta de su giro' },
    { valor: 'inmobiliaria', etiqueta: 'Lo asume la inmobiliaria: no se descuenta del giro' },
  ]
}

/**
 * Lo que dice la fila «4x1000 del giro» de la ficha. `null` = no se sabe (un
 * back anterior que no manda la configuración de la inmobiliaria y el contrato
 * sin elegir).
 */
export function textoDelGmf(
  trasladaGmfAlPropietario: boolean | null | undefined,
  gmf: GmfDeLaInmobiliaria | null | undefined,
): string | null {
  const eleccion = eleccionDelGmf(trasladaGmfAlPropietario)
  const sinConfigurar = gmf != null && gmf.porMil === null
  if (sinConfigurar) {
    return eleccion === 'propietario'
      ? 'Propietario, pero no se descuenta: la inmobiliaria no tiene configurado el 4x1000'
      : 'No se descuenta: la inmobiliaria no tiene configurado el 4x1000'
  }
  if (eleccion === 'propietario') return 'Lo paga el propietario: se descuenta de su giro'
  if (eleccion === 'inmobiliaria') return 'Lo asume la inmobiliaria'
  if (!gmf) return null
  return `Como la inmobiliaria: ${loQueHaceLaInmobiliaria(gmf)}`
}

/** La ayuda del campo: desde cuándo rige y qué hacer con lo ya liquidado. */
export const AYUDA_DEL_GMF =
  'Rige para el giro de este mes y los que siguen, mientras no estén en una liquidación. Si este mes ya tiene una liquidación sin girar, cancélala en Liquidaciones y vuelve a generarla.'
