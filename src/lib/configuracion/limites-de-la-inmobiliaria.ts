/**
 * Los topes de la configuración de la inmobiliaria, con las MISMAS cifras y
 * las MISMAS frases que el back (02-10-2026, tanda 2 del sistema de errores).
 *
 * 🔁 Espejo de `back/src/inmobiliaria/agency/dto/limites-de-la-inmobiliaria.ts`
 * (y de `nit-de-la-inmobiliaria.ts` para el NIT). Lo que el back rechazaría se
 * ataja acá ANTES de mandar, con la frase que el back hubiera dicho: si cambias
 * algo allá, cámbialo acá.
 *
 * Sólo se mira lo que la persona CAMBIÓ (`erroresDeLosTopes` recibe el payload
 * de cambios): un dato viejo guardado antes de los topes —un teléfono de 25
 * caracteres migrado— no puede impedir guardar la comisión.
 */

import type { UpdateAgencyPayload } from '@/lib/types/inmobiliaria'

export const MAX_LARGO_NOMBRE_DE_LA_INMOBILIARIA = 200
export const MAX_LARGO_DIRECCION = 300
export const MAX_LARGO_CIUDAD = 50
export const MAX_LARGO_TELEFONO = 20
export const MAX_LARGO_CORREO = 255
export const MAX_LARGO_REPRESENTANTE_LEGAL = 200
export const MAX_LARGO_DOCUMENTO_DEL_REPRESENTANTE = 20
/** `agency_members.invited_name` es `VarChar(120)` (`InviteMemberDto.name`). */
export const MAX_LARGO_NOMBRE_DEL_INVITADO = 120
/** Los montos en pesos que el back guarda en `int4`: $2.000 millones. */
export const MAX_MONTO_EN_PESOS = 2_000_000_000

/**
 * La regla del NIT del registro y del backoffice: de 6 a 10 dígitos y, si
 * viene, el dígito de verificación después del guion. Sin puntos ni espacios
 * (se quitan al escribir: `normalizarNit`).
 */
export const NIT_DE_LA_INMOBILIARIA = /^\d{6,10}(?:-\d)?$/

export const MENSAJE_NIT_INVALIDO =
  'El NIT debe tener entre 6 y 10 dígitos y, si lo incluyes, el dígito de verificación después del guion (900123456-8)'

export const MENSAJES_DE_LA_INMOBILIARIA = {
  nombreLargo: 'El nombre de la inmobiliaria puede tener hasta 200 caracteres.',
  direccionLarga: 'La dirección puede tener hasta 300 caracteres.',
  ciudadLarga: 'La ciudad puede tener hasta 50 caracteres.',
  telefonoLargo: 'El teléfono puede tener hasta 20 caracteres.',
  correoLargo: 'El correo puede tener hasta 255 caracteres.',
  representanteLargo: 'El nombre del representante legal puede tener hasta 200 caracteres.',
  documentoDelRepresentanteLargo: 'El documento del representante legal puede tener hasta 20 caracteres.',
  montoDobleAprobacionMaximo:
    'El monto para pedir doble aprobación no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
  baseMinimaRetefuenteMaxima:
    'La base mínima de retefuente no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
  diaDePagoEntero: 'El día de pago debe ser un número entero, del 1 al 28.',
  diaDeGiroEntero: 'El día de giro debe ser un número entero, del 1 al 28.',
  nombreDelInvitadoLargo: 'El nombre puede tener hasta 120 caracteres.',
} as const

/** «901.234.567-8» y «901 234 567-8» son el mismo NIT: se mandan sin puntos ni espacios. */
export function normalizarNit(nit: string): string {
  return nit.replace(/[.\s]/g, '')
}

/** El error del NIT (ya normalizado o no), o `undefined` si sirve. */
export function errorDelNit(nit: string): string | undefined {
  const limpio = normalizarNit(nit)
  if (!limpio) return undefined
  return NIT_DE_LA_INMOBILIARIA.test(limpio) ? undefined : MENSAJE_NIT_INVALIDO
}

/** Los campos de texto con tope de columna: campo → [tope, frase]. */
const TOPES_DE_TEXTO: ReadonlyArray<readonly [keyof UpdateAgencyPayload, number, string]> = [
  ['name', MAX_LARGO_NOMBRE_DE_LA_INMOBILIARIA, MENSAJES_DE_LA_INMOBILIARIA.nombreLargo],
  ['address', MAX_LARGO_DIRECCION, MENSAJES_DE_LA_INMOBILIARIA.direccionLarga],
  ['city', MAX_LARGO_CIUDAD, MENSAJES_DE_LA_INMOBILIARIA.ciudadLarga],
  ['phone', MAX_LARGO_TELEFONO, MENSAJES_DE_LA_INMOBILIARIA.telefonoLargo],
  ['email', MAX_LARGO_CORREO, MENSAJES_DE_LA_INMOBILIARIA.correoLargo],
  ['legalRepresentative', MAX_LARGO_REPRESENTANTE_LEGAL, MENSAJES_DE_LA_INMOBILIARIA.representanteLargo],
  [
    'legalDocumentNumber',
    MAX_LARGO_DOCUMENTO_DEL_REPRESENTANTE,
    MENSAJES_DE_LA_INMOBILIARIA.documentoDelRepresentanteLargo,
  ],
]

/** El tope de cada campo de texto, para el `maxLength` del input. */
export const LARGO_MAXIMO_DEL_CAMPO: Partial<Record<keyof UpdateAgencyPayload, number>> = Object.fromEntries(
  TOPES_DE_TEXTO.map(([campo, tope]) => [campo, tope]),
)

/**
 * Lo que el back rechazaría de estos cambios, campo por campo (vacío = se
 * puede mandar). Sólo mira las claves presentes en `cambios`.
 */
export function erroresDeLosTopes(cambios: UpdateAgencyPayload): Partial<Record<keyof UpdateAgencyPayload, string>> {
  const errores: Partial<Record<keyof UpdateAgencyPayload, string>> = {}
  for (const [campo, tope, frase] of TOPES_DE_TEXTO) {
    const v = cambios[campo]
    if (typeof v === 'string' && v.length > tope) errores[campo] = frase
  }
  if (typeof cambios.nit === 'string') {
    const e = errorDelNit(cambios.nit)
    if (e) errores.nit = e
  }
  const monto = (campo: 'dispersionMontoDobleAprobacion' | 'baseMinimaRetefuenteCop', frase: string) => {
    const v = cambios[campo]
    if (typeof v === 'number' && v > MAX_MONTO_EN_PESOS) errores[campo] = frase
  }
  monto('dispersionMontoDobleAprobacion', MENSAJES_DE_LA_INMOBILIARIA.montoDobleAprobacionMaximo)
  monto('baseMinimaRetefuenteCop', MENSAJES_DE_LA_INMOBILIARIA.baseMinimaRetefuenteMaxima)
  if (typeof cambios.paymentDueDay === 'number' && !Number.isInteger(cambios.paymentDueDay)) {
    errores.paymentDueDay = MENSAJES_DE_LA_INMOBILIARIA.diaDePagoEntero
  }
  if (typeof cambios.disbursementDay === 'number' && !Number.isInteger(cambios.disbursementDay)) {
    errores.disbursementDay = MENSAJES_DE_LA_INMOBILIARIA.diaDeGiroEntero
  }
  return errores
}
