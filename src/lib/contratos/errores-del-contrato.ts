/**
 * Lo que el back rechaza de un contrato, en su campo (02-10-2026).
 *
 * Crear y editar un contrato mandan los mismos términos, y el back responde
 * con el mismo sobre: 400 `DATOS_INVALIDOS` con `campos: [{ campo, mensaje }]`
 * (el DTO topado, `back/src/contracts/dto/limites-del-contrato.ts`) o el 400
 * de «la fecha de fin debe ser posterior» con `campo: 'endDate'`. Antes las
 * dos pantallas juntaban todo en un renglón rojo al pie del formulario y la
 * persona tenía que adivinar cuál de los seis campos era.
 *
 * Esto reparte cada mensaje a SU campo (`repartirErroresDelServidor`), dice
 * qué id tiene cada campo en pantalla para darle el foco al primero, y deja
 * en `sueltos` sólo lo que no tiene dónde ir (un 409, un 5xx, la red).
 */

import { mensajeDeDocumentoFaltante } from '@/lib/errores/documento-del-propietario'
import { repartirErroresDelServidor, type ErroresRepartidos } from '@/lib/errores/errores-en-el-formulario'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'

/**
 * Los campos de los formularios de contrato que pueden recibir un error del
 * servidor. Los del bloque «partes» (contrato manual) llevan el nombre que usa
 * `PartesDelContratoManual`: el back manda `inquilino.nombre` y la hoja
 * (`nombre`) es la que se busca.
 */
export type CampoDelContrato =
  | 'startDate'
  | 'endDate'
  | 'fechaDeCartera'
  | 'monthlyRent'
  | 'deposit'
  | 'paymentDay'
  | 'diasDePlazo'
  | 'pdfFile'
  | 'propertyId'
  | 'tenantId'
  | 'nombre'
  | 'documento'
  | 'correo'

export const CAMPOS_DEL_CONTRATO: readonly CampoDelContrato[] = [
  'startDate',
  'endDate',
  'fechaDeCartera',
  'monthlyRent',
  'deposit',
  'paymentDay',
  'diasDePlazo',
  'pdfFile',
  'propertyId',
  'tenantId',
  'nombre',
  'documento',
  'correo',
]

/**
 * Nombre del servidor → campo del formulario. `customClauses` no tiene campo
 * propio en pantalla (es el respaldo del arriendo): su error va a `sueltos`.
 */
const MAPA_DEL_SERVIDOR: Partial<Record<string, CampoDelContrato | null>> = {
  uploadedPdfPath: 'pdfFile',
  customClauses: null,
  title: null,
  content: null,
}

/** El id en pantalla de cada término (`<label htmlFor>`, foco y `aria-describedby`). */
export function idDelCampoDelContrato(campo: CampoDelContrato): string {
  return `contrato-${campo}`
}

export function repartirErroresDelContrato(
  error: unknown,
  opciones: { porDefecto?: string; accion?: string } = {},
): ErroresRepartidos<CampoDelContrato> {
  return repartirErroresDelServidor<CampoDelContrato>(error, {
    campos: CAMPOS_DEL_CONTRATO,
    mapa: MAPA_DEL_SERVIDOR,
    ...opciones,
  })
}

/**
 * Le da el foco al campo (si está en pantalla). Los del bloque «partes» no
 * tienen un id nuestro: ahí el error se ve debajo del campo sin moverse.
 */
export function enfocarCampoDelContrato(campo: CampoDelContrato | undefined): void {
  if (!campo || typeof document === 'undefined') return
  const el = document.getElementById(idDelCampoDelContrato(campo))
  if (el && typeof (el as HTMLElement).focus === 'function') (el as HTMLElement).focus()
}

/**
 * El motivo de un fallo al crear o editar un contrato, con la regla de oro:
 * el propietario sin documento (T-0128) primero; después el traductor, con lo
 * que se estaba haciendo para que un 5xx diga «No pudimos crear el contrato:
 * algo falló de nuestro lado…» con la referencia.
 */
export function motivoDelFalloDelContrato(
  error: unknown,
  { porDefecto, accion }: { porDefecto: string; accion: string },
): string {
  return mensajeDeDocumentoFaltante(error) ?? mensajeParaLaPersona(error, { porDefecto, accion })
}

/** Los atributos de accesibilidad del control de un término. */
export function ariaDelCampoDelContrato(campo: CampoDelContrato, error: string | undefined) {
  const id = idDelCampoDelContrato(campo)
  return {
    id,
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
  }
}
