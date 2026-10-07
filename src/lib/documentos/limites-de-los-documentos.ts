/**
 * Los topes de las plantillas y los documentos, con las MISMAS frases que el
 * back (02-10-2026).
 *
 * 🔁 Espejo de `back/src/inmobiliaria/documentos/dto/limites-de-los-documentos.ts`:
 * mismos números y mismas frases. Si cambia uno, cambia el otro.
 */

import { leerFechaEscrita } from '@/lib/fechas/fecha-escrita'

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
  // back rechaza `fechaDeVigencia` en `GET /inmobiliaria/documents/preparar`
  // y, desde el hueco 1 de S2-B2, también AL GENERAR (dentro de `overrides`,
  // 400 en el campo `overrides`): `GenerarDocumentoDialog` la pinta bajo
  // «Fecha de vigencia».
  // 02-10-2026 (Nico: «¿no tenemos parsers…?»): la frase exacta la da el
  // lector compartido (`lib/fechas/fecha-escrita.ts`); ésta es el respaldo.
  fechaDeVigencia:
    'La fecha de vigencia no es un día real del calendario. Escríbela con el día primero, por ejemplo 01/12/2026.',
  fechaDeVigenciaFueraDeRango: 'La fecha de vigencia debe estar entre el año 2000 y el 2100.',
} as const

/** Cómo se llama el campo en las frases del lector. Igual que en el back. */
export const ETIQUETA_DE_LA_VIGENCIA = 'La fecha de vigencia'

/**
 * Lo que el back diría de la fecha de vigencia, o `null` si está bien.
 *
 * 🔴 02-10-2026 (Nico: «¿no tenemos parsers que solucionan eso? si no, constrúyelos»):
 * la fecha se escribe como la escribe una persona («01/12/2026», «1/12/26»,
 * «1 de diciembre de 2026», «dic 1 2026»…) y se lee con el lector compartido
 * (`lib/fechas/fecha-escrita.ts`, espejo del back).
 *
 * Mientras la persona va tecleando no se le grita lo que todavía puede
 * arreglar escribiendo (falta el año, aún no se entiende): eso se dice cuando
 * sale del campo o pide generar (`terminada`). Lo que ya no tiene arreglo —un
 * día que no existe («31/02/2026»), un mes de más de 12, fuera de 2000–2100—
 * se dice de una.
 */
export function errorDeLaFechaDeVigencia(
  valor: string | null | undefined,
  { terminada = false }: { terminada?: boolean } = {},
): string | null {
  if (!valor || valor.trim() === '') return null
  const lectura = leerFechaEscrita(valor, { etiqueta: ETIQUETA_DE_LA_VIGENCIA })
  if (!lectura.ok) {
    return lectura.motivo === 'NO_EXISTE' || terminada ? lectura.mensaje : null
  }
  return lectura.iso < FECHA_DE_VIGENCIA_DESDE || lectura.iso > FECHA_DE_VIGENCIA_HASTA
    ? MENSAJES_DE_LOS_DOCUMENTOS.fechaDeVigenciaFueraDeRango
    : null
}

/**
 * La fecha de vigencia en `AAAA-MM-DD` —lo que viaja al back—, o `null` si no
 * se entiende o está fuera de 2000–2100.
 */
export function vigenciaComoIso(valor: string | null | undefined): string | null {
  if (!valor || valor.trim() === '') return null
  const lectura = leerFechaEscrita(valor)
  if (!lectura.ok) return null
  return lectura.iso < FECHA_DE_VIGENCIA_DESDE || lectura.iso > FECHA_DE_VIGENCIA_HASTA
    ? null
    : lectura.iso
}
