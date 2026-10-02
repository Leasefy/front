/**
 * Los topes del mantenimiento, con las MISMAS frases que el back (02-10-2026).
 *
 * 🔁 Espejo de `back/src/inmobiliaria/mantenimiento/dto/limites-del-mantenimiento.ts`:
 * mismos números y mismas frases. Si cambia uno, cambia el otro.
 *
 * El valor de la cotización es SÓLO el tope de la columna (`int4`) en una cifra
 * que se lee: una cotización de once cifras es casi siempre un cero de más.
 */

export const VALOR_MAXIMO_DE_LA_COTIZACION_COP = 2_000_000_000
export const MAX_DIAS_ESTIMADOS = 365
export const MAX_FOTOS_DEL_MANTENIMIENTO = 30
/** `solicitudes_mantenimiento.title` y `mantenimiento_quotes.provider_name`: `VarChar(200)`. */
export const MAX_LARGO_TITULO_DEL_MANTENIMIENTO = 200
export const MAX_LARGO_NOMBRE_DEL_PROVEEDOR = 200
export const MAX_LARGO_TELEFONO_DEL_PROVEEDOR = 20
/** Las vigencias del RUT y de la seguridad social del proveedor (`@db.Date`). */
export const VIGENCIA_DESDE = '2000-01-01'
export const VIGENCIA_HASTA = '2100-12-31'

export const MENSAJES_DEL_MANTENIMIENTO = {
  valorEntero: 'El valor de la cotización debe ser un número entero de pesos, sin decimales.',
  valorNegativo: 'El valor de la cotización no puede ser negativo.',
  valorMaximo: 'El valor de la cotización no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
  diasEnteros: 'Los días estimados deben ser un número entero.',
  diasMinimos: 'Los días estimados deben ser al menos 1.',
  diasMaximos: 'Los días estimados no pueden pasar de 365.',
  fotosMaximas: 'Puedes adjuntar hasta 30 fotos.',
  fotoLocal:
    'Esa foto sólo existe en tu navegador y nadie más la puede abrir. Súbela como archivo con «Agregar foto».',
  fotoTipo: 'La foto tiene que ser JPG, PNG o WebP.',
  fotoPesada: 'La foto no puede pesar más de 5 MB.',
  tituloLargo: 'El título puede tener hasta 200 caracteres.',
  proveedorLargo: 'El nombre del proveedor puede tener hasta 200 caracteres.',
  telefonoDelProveedorLargo: 'El teléfono del proveedor puede tener hasta 20 caracteres.',
  vigenciaNoEsUnDia: 'Elige una fecha de vigencia válida (AAAA-MM-DD).',
  vigenciaFueraDeRango: 'La fecha de vigencia debe estar entre el año 2000 y el 2100.',
} as const

/**
 * Las fotos de una solicitud (02-10-2026): se suben como ARCHIVO, una por una,
 * a `POST /inmobiliaria/mantenimiento/:id/fotos`, después de crear la
 * solicitud. Antes se guardaba la vista previa del navegador (`blob:`) y nadie
 * más la podía abrir. Mismo tipo y peso que valida el back.
 */
export const TIPOS_DE_FOTO_DEL_MANTENIMIENTO = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_BYTES_DE_UNA_FOTO_DEL_MANTENIMIENTO = 5 * 1024 * 1024
/**
 * Cuántas se eligen en el formulario de crear. Es del formulario, no del back
 * (que acepta hasta `MAX_FOTOS_DEL_MANTENIMIENTO` por solicitud).
 */
export const MAX_FOTOS_AL_CREAR = 5

/** `null` si la foto se puede subir; si no, la frase del back. */
export function errorDeLaFoto(foto: { type: string; size: number }): string | null {
  if (!(TIPOS_DE_FOTO_DEL_MANTENIMIENTO as readonly string[]).includes(foto.type)) {
    return MENSAJES_DEL_MANTENIMIENTO.fotoTipo
  }
  if (foto.size > MAX_BYTES_DE_UNA_FOTO_DEL_MANTENIMIENTO) return MENSAJES_DEL_MANTENIMIENTO.fotoPesada
  return null
}

/** `null` si la vigencia sirve (o está vacía); si no, la frase del back. */
export function errorDeLaVigencia(valor: string | undefined): string | null {
  if (!valor) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim())
  const dia = m ? new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`) : null
  if (!m || !dia || Number.isNaN(dia.getTime()) || dia.toISOString().slice(0, 10) !== valor.trim()) {
    return MENSAJES_DEL_MANTENIMIENTO.vigenciaNoEsUnDia
  }
  return valor < VIGENCIA_DESDE || valor > VIGENCIA_HASTA ? MENSAJES_DEL_MANTENIMIENTO.vigenciaFueraDeRango : null
}

/** `null` si el valor de la cotización sirve; si no, la frase del back. */
export function errorDelValorDeLaCotizacion(valor: number): string | null {
  if (!Number.isFinite(valor) || !Number.isInteger(valor)) return MENSAJES_DEL_MANTENIMIENTO.valorEntero
  if (valor < 0) return MENSAJES_DEL_MANTENIMIENTO.valorNegativo
  if (valor > VALOR_MAXIMO_DE_LA_COTIZACION_COP) return MENSAJES_DEL_MANTENIMIENTO.valorMaximo
  return null
}

/** `null` si los días estimados sirven; si no, la frase del back. */
export function errorDeLosDiasEstimados(dias: number): string | null {
  if (!Number.isFinite(dias) || !Number.isInteger(dias)) return MENSAJES_DEL_MANTENIMIENTO.diasEnteros
  if (dias < 1) return MENSAJES_DEL_MANTENIMIENTO.diasMinimos
  if (dias > MAX_DIAS_ESTIMADOS) return MENSAJES_DEL_MANTENIMIENTO.diasMaximos
  return null
}
