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
  archivoTipo: 'El archivo tiene que ser una foto (JPG, PNG o WebP) o un video (MP4, MOV o WebM).',
  videoPesado: 'El video no puede pesar más de 20 MB (unos 20 segundos de video).',
  videosMaximos: 'Puedes adjuntar hasta 5 videos por solicitud.',
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
 * 🔴 21-10-2026 (Nico: «fotos y videos, con límites de peso»). Mismo bucket,
 * misma lista: el video se reconoce por la extensión. 20 MB = el techo de toda
 * subida al back; a lo sumo 5 por lista. Espejo de
 * `back/src/inmobiliaria/mantenimiento/fotos/fotos-del-mantenimiento.ts`.
 */
export const TIPOS_DE_VIDEO_DEL_MANTENIMIENTO = ['video/mp4', 'video/quicktime', 'video/webm'] as const
export const MAX_BYTES_DE_UN_VIDEO_DEL_MANTENIMIENTO = 20 * 1024 * 1024
export const MAX_VIDEOS_DEL_MANTENIMIENTO = 5
const EXTENSIONES_DE_VIDEO = ['mp4', 'mov', 'webm']

/** Lo que acepta el `<input type="file">`: fotos y videos. */
export const ACEPTA_EL_MANTENIMIENTO = [...TIPOS_DE_FOTO_DEL_MANTENIMIENTO, ...TIPOS_DE_VIDEO_DEL_MANTENIMIENTO].join(',')

/** ¿El archivo elegido es un video? */
export function esArchivoDeVideo(archivo: { type: string }): boolean {
  return (TIPOS_DE_VIDEO_DEL_MANTENIMIENTO as readonly string[]).includes(archivo.type)
}

/** ¿La URL (firmada) o la ruta guardada es un video? Por la extensión. */
export function esUrlDeVideo(url: string | null | undefined): boolean {
  if (!url) return false
  const sinConsulta = url.split('?')[0].toLowerCase()
  return EXTENSIONES_DE_VIDEO.some((ext) => sinConsulta.endsWith(`.${ext}`))
}

/** `null` si la foto (o el video) se puede subir; si no, la frase del back. */
export function errorDeLaFoto(foto: { type: string; size: number }): string | null {
  if (esArchivoDeVideo(foto)) {
    return foto.size > MAX_BYTES_DE_UN_VIDEO_DEL_MANTENIMIENTO ? MENSAJES_DEL_MANTENIMIENTO.videoPesado : null
  }
  if (!(TIPOS_DE_FOTO_DEL_MANTENIMIENTO as readonly string[]).includes(foto.type)) {
    return MENSAJES_DEL_MANTENIMIENTO.archivoTipo
  }
  if (foto.size > MAX_BYTES_DE_UNA_FOTO_DEL_MANTENIMIENTO) return MENSAJES_DEL_MANTENIMIENTO.fotoPesada
  return null
}

/**
 * De las fotos que la persona acaba de elegir, las que entran (02-10-2026).
 *
 * Nico: el formulario acepta hasta 30 fotos, el tope del back
 * (`MAX_FOTOS_DEL_MANTENIMIENTO`). Antes el de crear cortaba en 5 por su
 * cuenta. Las que no sirven (tipo o peso) o pasan el tope no entran, y cada una
 * dice por qué con la frase del back; las que sí sirven entran igual.
 */
export function fotosQueEntran(
  yaElegidas: number,
  elegidas: readonly File[],
  videosYaElegidos = 0,
): { entran: File[]; problemas: string[] } {
  const problemas: string[] = []
  const sirven: File[] = []
  let videos = videosYaElegidos
  let sobranVideos = false
  for (const foto of elegidas) {
    const error = errorDeLaFoto(foto)
    if (error) {
      problemas.push(`«${foto.name}»: ${error}`)
      continue
    }
    if (esArchivoDeVideo(foto)) {
      if (videos >= MAX_VIDEOS_DEL_MANTENIMIENTO) {
        sobranVideos = true
        continue
      }
      videos += 1
    }
    sirven.push(foto)
  }
  if (sobranVideos) problemas.push(MENSAJES_DEL_MANTENIMIENTO.videosMaximos)
  const cupo = Math.max(0, MAX_FOTOS_DEL_MANTENIMIENTO - yaElegidas)
  if (sirven.length > cupo) problemas.push(MENSAJES_DEL_MANTENIMIENTO.fotosMaximas)
  return { entran: sirven.slice(0, cupo), problemas }
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
