/**
 * Lo que el back rechaza de un codeudor, en su campo (02-10-2026).
 *
 * `POST/PATCH /contracts/:id/codeudores` responde dos clases de 4xx:
 *  · 400 `DATOS_INVALIDOS` del DTO (`codeudor.dto.ts`) con `campos`;
 *  · dos códigos propios SIN `campos`: `CELULAR_INVALIDO` (400, el celular no
 *    es un móvil colombiano) y `CODEUDOR_DUPLICADO` (409, ese documento ya está
 *    en el contrato). Decide el `code`, nunca el texto: van al campo que nombran.
 *
 * Lo que no tiene campo (un `PAGARE_EN_CURSO`, un 5xx, la red) queda en
 * `sueltos`, con la regla de oro del traductor.
 */

import { repartirErroresDelServidor, type ErroresRepartidos } from '@/lib/errores/errores-en-el-formulario'
import { leerFallo, mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'

export type CampoDelCodeudor = 'nombre' | 'tipoDeDocumento' | 'documento' | 'email' | 'celular'

export const CAMPOS_DEL_CODEUDOR: readonly CampoDelCodeudor[] = [
  'nombre',
  'tipoDeDocumento',
  'documento',
  'email',
  'celular',
]

/** Los códigos propios del servicio de codeudores que señalan un campo. */
const CAMPO_DEL_CODIGO: Record<string, CampoDelCodeudor> = {
  CELULAR_INVALIDO: 'celular',
  CODEUDOR_DUPLICADO: 'documento',
}

/** El id en pantalla de cada campo del formulario del codeudor. */
export function idDelCampoDelCodeudor(campo: CampoDelCodeudor): string {
  return `codeudor-${campo}`
}

export function repartirErroresDelCodeudor(error: unknown): ErroresRepartidos<CampoDelCodeudor> {
  const opciones = { porDefecto: 'No se pudo guardar el codeudor.', accion: 'guardar el codeudor' }
  const reparto = repartirErroresDelServidor<CampoDelCodeudor>(error, { campos: CAMPOS_DEL_CODEUDOR, ...opciones })
  if (reparto.orden.length > 0) return reparto
  const { code } = leerFallo(error)
  const campo = code ? CAMPO_DEL_CODIGO[code] : undefined
  if (!campo) return reparto
  return {
    porCampo: { [campo]: mensajeParaLaPersona(error, opciones) },
    orden: [campo],
    sueltos: [],
    delServidor: reparto.delServidor,
  }
}
