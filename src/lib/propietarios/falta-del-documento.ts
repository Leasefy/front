/**
 * AVISO-TIPO-DOC (05-10-2026) · la regla de «qué le falta al documento del
 * propietario para que su factura por mandato se numere». PURO (sin la API),
 * para que lo use también el filtro de la lista de Propietarios.
 *
 * Es la regla del freno del back (`bloqueoDeLaFila`, QA-FACT-PROF y
 * QA-FACT-CONTA-95 · B-08), en el mismo orden, sobre `datosPendientes` (que el
 * back deriva de los mismos campos). Los códigos son el espejo
 * `CODIGOS_DEL_DOCUMENTO_DEL_MANDANTE` de `lib/facturacion/por-facturar.ts`.
 */
import { CODIGOS_DEL_DOCUMENTO_DEL_MANDANTE } from '@/lib/facturacion/por-facturar'
import type { Propietario } from '@/lib/types/inmobiliaria'

export type FaltaDelDocumento = (typeof CODIGOS_DEL_DOCUMENTO_DEL_MANDANTE)[number]

/** Los rótulos de la fila frenada en Facturación (NuevaFactura): los mismos aquí. */
export const QUE_FALTA_EN_PALABRAS: Readonly<Record<FaltaDelDocumento, string>> = {
  MANDANTE_SIN_DOCUMENTO: 'Falta el documento del propietario',
  MANDANTE_SIN_TIPO_DE_DOCUMENTO: 'Falta el tipo de documento del propietario',
  MANDANTE_TIPO_DE_DOCUMENTO_POR_REVISAR: 'Revisa el tipo de documento del propietario',
}

/** El parámetro de la lista de Propietarios y su único valor. */
export const PARAMETRO_FALTA = 'falta'
export const FALTA_TIPO_DE_DOCUMENTO = 'tipo-de-documento'
export const RUTA_DE_LOS_QUE_FALTAN = `/panel/inmobiliaria/propietarios?${PARAMETRO_FALTA}=${FALTA_TIPO_DE_DOCUMENTO}`

/** ¿Tiene mandato? Lo mismo que la lista cuenta como sus propiedades: principal vivo o copropiedad. */
function tieneMandato(p: Pick<Propietario, 'propertyCount' | 'copropiedadesCount'>): boolean {
  return (p.propertyCount ?? 0) > 0 || (p.copropiedadesCount ?? 0) > 0
}

/**
 * Lo que le falta a la ficha para que su factura por mandato se numere, o
 * `null`. Sin mandato, `null`: no tiene facturas por mandato que frenar.
 */
export function faltaDelDocumentoDelPropietario(
  p: Pick<Propietario, 'datosPendientes' | 'propertyCount' | 'copropiedadesCount'>,
): FaltaDelDocumento | null {
  if (!tieneMandato(p)) return null
  const pendientes = p.datosPendientes ?? []
  if (pendientes.includes('documento')) return 'MANDANTE_SIN_DOCUMENTO'
  if (pendientes.includes('tipoDocumento')) return 'MANDANTE_SIN_TIPO_DE_DOCUMENTO'
  if (pendientes.includes('tipoDocumentoPorRevisar')) return 'MANDANTE_TIPO_DE_DOCUMENTO_POR_REVISAR'
  return null
}

/**
 * Quién lo ve: quien puede arreglarlo. Administrador, o contador al que su
 * inmobiliaria le dejó editar propietarios (el back lo exige igual: facturación
 * + `propietarios:edit`). El asesor edita propietarios pero no ve facturación.
 */
export function puedeVerElAviso(permisos: {
  isAdmin: boolean
  agencyRole: string | null
  canAccess: (modulo: string, accion: string) => boolean
}): boolean {
  if (permisos.isAdmin) return true
  return permisos.agencyRole?.toUpperCase() === 'CONTADOR' && permisos.canAccess('propietarios', 'edit')
}

