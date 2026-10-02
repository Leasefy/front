/**
 * Los topes de las plantillas y los documentos, con las MISMAS frases que el
 * back (02-10-2026).
 *
 * 🔁 Espejo de `back/src/inmobiliaria/documentos/dto/limites-de-los-documentos.ts`:
 * mismos números y mismas frases. Si cambia uno, cambia el otro.
 */

import { esDiaDelCalendario } from '@/lib/contratos/limites-del-contrato'

export const MAX_LARGO_NOMBRE_DE_LA_PLANTILLA = 200
export const MAX_LARGO_VERSION_DE_LA_PLANTILLA = 20
export const MAX_VARIABLES_DE_LA_PLANTILLA = 200
export const MAX_LARGO_NOMBRE_DEL_DOCUMENTO = 200

/** El rango de la fecha de vigencia de la carta de incremento. */
export const FECHA_DE_VIGENCIA_DESDE = '2000-01-01'
export const FECHA_DE_VIGENCIA_HASTA = '2100-12-31'

export const MENSAJES_DE_LOS_DOCUMENTOS = {
  nombreDeLaPlantillaLargo: 'El nombre de la plantilla puede tener hasta 200 caracteres.',
  versionLarga: 'La versión puede tener hasta 20 caracteres.',
  variablesMaximas: 'Una plantilla puede usar hasta 200 variables.',
  nombreDelDocumentoLargo: 'El nombre del documento puede tener hasta 200 caracteres.',
  // 🔴 02-10-2026 · Las fechas que se corrían (`2026-02-31` → 3 de marzo): el
  // back rechaza `fechaDeVigencia` en `GET /inmobiliaria/documents/preparar`.
  fechaDeVigencia: 'La fecha de vigencia no es un día real del calendario (usa AAAA-MM-DD).',
  fechaDeVigenciaFueraDeRango: 'La fecha de vigencia debe estar entre el año 2000 y el 2100.',
} as const

/**
 * Lo que el back diría de la fecha de vigencia, o `null` si está bien.
 *
 * Sólo opina sobre una fecha ya escrita entera (`AAAA-MM-DD`): mientras la
 * persona va tecleando no se le grita, y el diálogo tampoco le pregunta nada
 * al back con una fecha a medias.
 */
export function errorDeLaFechaDeVigencia(valor: string | null | undefined): string | null {
  const dia = valor?.trim() ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return null
  if (!esDiaDelCalendario(dia)) return MENSAJES_DE_LOS_DOCUMENTOS.fechaDeVigencia
  return dia < FECHA_DE_VIGENCIA_DESDE || dia > FECHA_DE_VIGENCIA_HASTA
    ? MENSAJES_DE_LOS_DOCUMENTOS.fechaDeVigenciaFueraDeRango
    : null
}
