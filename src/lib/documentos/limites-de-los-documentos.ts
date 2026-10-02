/**
 * Los topes de las plantillas y los documentos, con las MISMAS frases que el
 * back (02-10-2026).
 *
 * 🔁 Espejo de `back/src/inmobiliaria/documentos/dto/limites-de-los-documentos.ts`:
 * mismos números y mismas frases. Si cambia uno, cambia el otro.
 */

export const MAX_LARGO_NOMBRE_DE_LA_PLANTILLA = 200
export const MAX_LARGO_VERSION_DE_LA_PLANTILLA = 20
export const MAX_VARIABLES_DE_LA_PLANTILLA = 200
export const MAX_LARGO_NOMBRE_DEL_DOCUMENTO = 200

export const MENSAJES_DE_LOS_DOCUMENTOS = {
  nombreDeLaPlantillaLargo: 'El nombre de la plantilla puede tener hasta 200 caracteres.',
  versionLarga: 'La versión puede tener hasta 20 caracteres.',
  variablesMaximas: 'Una plantilla puede usar hasta 200 variables.',
  nombreDelDocumentoLargo: 'El nombre del documento puede tener hasta 200 caracteres.',
} as const
