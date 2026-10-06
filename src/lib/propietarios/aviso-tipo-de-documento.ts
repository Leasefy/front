/**
 * AVISO-TIPO-DOC (05-10-2026) · el aviso a la inmobiliaria de los propietarios
 * cuyo documento frena la factura por mandato.
 *
 * Nico (04-10 noche, TAL CUAL): la factura por mandato de un propietario sin
 * tipo de documento NO se numera, y se avisa ANTES a las inmobiliarias para que
 * completen la ficha. El freno vive en el back (`bloqueoDeLaFila`, QA-FACT-PROF y
 * QA-FACT-CONTA-95 · B-08) y su espejo acá es `CODIGOS_DEL_DOCUMENTO_DEL_MANDANTE`
 * (`lib/facturacion/por-facturar.ts`). El aviso lo arma el back
 * (`GET /inmobiliaria/facturacion/aviso-tipo-de-documento`): el título, el
 * detalle y la cifra del mes llegan escritos; acá sólo se leen sin inventar.
 *
 * Y la lista de Propietarios filtrada por lo que falta (`?falta=tipo-de-documento`)
 * usa la MISMA regla, en el mismo orden, sobre `datosPendientes` (que el back
 * deriva de los mismos campos): con mandato, sin número → «Falta el documento»;
 * con número y sin tipo → «Falta el tipo»; «CC» con forma de NIT → «Revisa el tipo».
 */
import { CODIGOS_DEL_DOCUMENTO_DEL_MANDANTE } from '@/lib/facturacion/por-facturar'
import {
  QUE_FALTA_EN_PALABRAS,
  RUTA_DE_LOS_QUE_FALTAN,
  type FaltaDelDocumento,
} from '@/lib/propietarios/falta-del-documento'

export {
  FALTA_TIPO_DE_DOCUMENTO,
  PARAMETRO_FALTA,
  QUE_FALTA_EN_PALABRAS,
  RUTA_DE_LOS_QUE_FALTAN,
  faltaDelDocumentoDelPropietario,
  puedeVerElAviso,
  type FaltaDelDocumento,
} from '@/lib/propietarios/falta-del-documento'

export interface PropietarioDelAviso {
  id: string
  nombre: string
  falta: FaltaDelDocumento
  queFalta: string
  facturasDelMes: number
}

export interface AvisoDeTipoDeDocumento {
  mes: string
  nombreDelMes: string
  total: number
  /** `null` = el back no las pudo contar (la lista sigue siendo cierta). */
  facturasDelMes: number | null
  propietarios: PropietarioDelAviso[]
  titulo: string | null
  detalle: string | null
  enlace: string
}

const esTexto = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const esFalta = (v: unknown): v is FaltaDelDocumento =>
  (CODIGOS_DEL_DOCUMENTO_DEL_MANDANTE as readonly unknown[]).includes(v)

/**
 * Lo que mandó el back, o `null` si no se le puede creer. Un total sin título
 * no se pinta: el aviso dice lo que el back escribió, nunca algo armado acá.
 */
export function leerAviso(bruto: unknown): AvisoDeTipoDeDocumento | null {
  if (!bruto || typeof bruto !== 'object') return null
  const a = bruto as Record<string, unknown>
  const total = typeof a.total === 'number' && Number.isFinite(a.total) ? a.total : null
  if (total === null) return null
  const propietarios = Array.isArray(a.propietarios)
    ? a.propietarios.flatMap((p): PropietarioDelAviso[] => {
        const f = (p ?? {}) as Record<string, unknown>
        if (!esTexto(f.id) || !esTexto(f.nombre) || !esFalta(f.falta)) return []
        return [
          {
            id: f.id,
            nombre: f.nombre,
            falta: f.falta,
            queFalta: esTexto(f.queFalta) ? f.queFalta : QUE_FALTA_EN_PALABRAS[f.falta],
            facturasDelMes: typeof f.facturasDelMes === 'number' ? f.facturasDelMes : 0,
          },
        ]
      })
    : []
  return {
    mes: esTexto(a.mes) ? a.mes : '',
    nombreDelMes: esTexto(a.nombreDelMes) ? a.nombreDelMes : '',
    total,
    facturasDelMes: typeof a.facturasDelMes === 'number' ? a.facturasDelMes : null,
    propietarios,
    titulo: esTexto(a.titulo) ? a.titulo : null,
    detalle: esTexto(a.detalle) ? a.detalle : null,
    enlace: esTexto(a.enlace) && a.enlace.startsWith('/panel/') ? a.enlace : RUTA_DE_LOS_QUE_FALTAN,
  }
}

/** ¿Se pinta? Sólo con propietarios y con el título del back. */
export function hayAviso(aviso: AvisoDeTipoDeDocumento | null): aviso is AvisoDeTipoDeDocumento & { titulo: string } {
  return Boolean(aviso && aviso.total > 0 && aviso.titulo)
}
