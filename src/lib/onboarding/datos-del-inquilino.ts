/**
 * Los datos del inquilino en su registro (paso 1): nombre, documento y celular.
 *
 * Nico, 01-10-2026: «¿el número de documento por qué no tiene tipo de
 * documento y número? ¿y el número por qué no tiene indicador y todas las
 * validaciones que tenemos en los números de celular en otros lados?», y
 * «saltar por ahora no debería existir porque él debe llenar esa información».
 *
 * Así que los tres son obligatorios y se revisan con las MISMAS reglas que el
 * resto de la plataforma:
 *  - el documento con `revisarDocumentoDelTitular` (largos por tipo: CC 6–10,
 *    CE 5–10, PPT 5–15; pasaporte letras y números) — el de propietarios y
 *    titulares;
 *  - el celular con `errorTelefono`/`normalizarTelefono` (`lib/phone`), el de
 *    `PhoneField`: 10 dígitos, empieza por 3, y se manda en E.164, que es lo
 *    que el back acepta (`^(\+57)?3\d{9}$`).
 *
 * Tipos: los de una PERSONA que arrienda. Sin NIT (eso es una empresa) ni
 * tarjeta de identidad (un menor no firma un contrato de arriendo).
 */

import { revisarDocumentoDelTitular } from '@/lib/propietarios/titular-de-la-cuenta'
import { errorTelefono, normalizarTelefono } from '@/lib/phone/countries'

export type TipoDeDocumentoDelInquilino = 'CC' | 'CE' | 'PPT' | 'PASSPORT'

export const TIPO_DE_DOCUMENTO_POR_DEFECTO: TipoDeDocumentoDelInquilino = 'CC'

export const TIPOS_DE_DOCUMENTO_DEL_INQUILINO: ReadonlyArray<{
  value: TipoDeDocumentoDelInquilino
  label: string
  ejemplo: string
}> = [
  { value: 'CC', label: 'Cédula de ciudadanía', ejemplo: 'Ej: 1090525663' },
  { value: 'CE', label: 'Cédula de extranjería', ejemplo: 'Ej: 123456' },
  { value: 'PPT', label: 'Permiso por Protección Temporal (PPT)', ejemplo: 'Ej: 4829107' },
  { value: 'PASSPORT', label: 'Pasaporte', ejemplo: 'Ej: AB123456' },
]

export function esTipoDeDocumentoDelInquilino(v: unknown): v is TipoDeDocumentoDelInquilino {
  return TIPOS_DE_DOCUMENTO_DEL_INQUILINO.some((t) => t.value === v)
}

export interface DatosDelInquilino {
  displayName?: string
  documentType?: string
  rut?: string
  phone?: string
}

export interface ErroresDelInquilino {
  nombre?: string
  documento?: string
  telefono?: string
}

/**
 * Qué falta o está mal. Vacío = el paso se puede enviar.
 *
 * `documentoBloqueado`: el documento ya está en el back y no se puede cambiar
 * desde acá (se cambia con soporte), así que no se le vuelve a revisar el
 * formato: un documento viejo con otro formato no puede trancar el registro.
 */
export function revisarDatosDelInquilino(
  datos: DatosDelInquilino,
  { documentoBloqueado = false }: { documentoBloqueado?: boolean } = {},
): ErroresDelInquilino {
  const errores: ErroresDelInquilino = {}

  if (!(datos.displayName ?? '').trim()) errores.nombre = 'Ingresa tu nombre para continuar'

  if (!documentoBloqueado) {
    const tipo = esTipoDeDocumentoDelInquilino(datos.documentType)
      ? datos.documentType
      : TIPO_DE_DOCUMENTO_POR_DEFECTO
    const revision = revisarDocumentoDelTitular(tipo, datos.rut)
    if (!revision.ok) {
      switch (revision.motivo) {
        case 'vacio':
          errores.documento = 'Escribe tu número de documento.'
          break
        case 'soloNumeros':
          errores.documento = 'Este documento lleva sólo números, sin puntos ni letras.'
          break
        case 'largo':
          errores.documento = `Debe tener entre ${revision.min} y ${revision.max} dígitos.`
          break
        case 'pasaporte':
          errores.documento = 'El pasaporte lleva sólo letras y números, entre 5 y 20.'
          break
        default:
          errores.documento = 'Revisa el número de documento.'
      }
    }
  }

  const telefono = errorTelefono(datos.phone ?? '')
  if (telefono) errores.telefono = telefono

  return errores
}

export function datosDelInquilinoCompletos(
  datos: DatosDelInquilino,
  opciones?: { documentoBloqueado?: boolean },
): boolean {
  return Object.keys(revisarDatosDelInquilino(datos, opciones)).length === 0
}

/**
 * Lo que va al back: el número limpio (sin puntos ni espacios), su tipo y el
 * celular en E.164. Con el documento bloqueado el número viaja como estaba
 * (el back lo escribe una sola vez y lo ignora) y el tipo NO: no lo sabemos, y
 * mandar «CC» por defecto podría escribir un tipo que nadie eligió.
 */
export function documentoYCelularParaElBack(
  datos: DatosDelInquilino,
  { documentoBloqueado = false }: { documentoBloqueado?: boolean } = {},
): { rut?: string; documentType?: TipoDeDocumentoDelInquilino; phone?: string } {
  const salida: { rut?: string; documentType?: TipoDeDocumentoDelInquilino; phone?: string } = {}
  if (documentoBloqueado) {
    const rut = (datos.rut ?? '').trim()
    if (rut) salida.rut = rut
  } else {
    const tipo = esTipoDeDocumentoDelInquilino(datos.documentType)
      ? datos.documentType
      : TIPO_DE_DOCUMENTO_POR_DEFECTO
    const revision = revisarDocumentoDelTitular(tipo, datos.rut)
    if (revision.ok) {
      salida.rut = revision.numero
      salida.documentType = tipo
    }
  }
  const telefono = normalizarTelefono(datos.phone ?? '')
  if (telefono) salida.phone = telefono
  return salida
}
