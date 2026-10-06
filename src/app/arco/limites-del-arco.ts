/**
 * La solicitud ARCO (Habeas Data), validada con las MISMAS reglas y frases que
 * el micro (02-10-2026, sistema de errores).
 *
 * 🔁 Espejo de `MENSAJES_DEL_ARCO` + `ArcoSubmitSchema` en
 * `agent/src/server/routes/arco-public.ts`. Si cambia uno, cambia el otro.
 * El formulario es más estricto en dos cosas a propósito: la cédula sólo en
 * dígitos y la descripción hasta 1.000 caracteres (el micro acepta 2.000).
 */

export const MENSAJES_DEL_ARCO = {
  nombreFalta: 'Escribe tu nombre completo.',
  nombreLargo: 'El nombre puede tener hasta 200 caracteres.',
  correo: 'Revisa tu correo: debe tener la forma nombre@dominio.com.',
  cedulaCorta: 'La cédula debe tener al menos 4 dígitos.',
  cedulaLarga: 'La cédula puede tener hasta 20 dígitos.',
  tipo: 'Elige el tipo de solicitud.',
  descripcionLarga: 'La descripción puede tener hasta 2.000 caracteres.',
} as const

/** Los nombres son los del cuerpo que se manda (los mismos `campo` del 400). */
export type CampoDelArco = 'requester_name' | 'requester_email' | 'requester_cedula' | 'type' | 'description'

export const CAMPOS_DEL_ARCO: readonly CampoDelArco[] = [
  'requester_name',
  'requester_email',
  'requester_cedula',
  'type',
  'description',
]

export interface DatosDelArco {
  requester_name: string
  requester_email: string
  requester_cedula: string
  type: string
  description: string
}

/** Lo mismo que `z.string().email()` deja pasar, sin ponerse quisquilloso. */
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Qué está mal, por campo. Vacío = se puede mandar. */
export function revisarSolicitudArco(d: DatosDelArco): Partial<Record<CampoDelArco, string>> {
  const errores: Partial<Record<CampoDelArco, string>> = {}
  const nombre = d.requester_name.trim()
  if (nombre.length < 2) errores.requester_name = MENSAJES_DEL_ARCO.nombreFalta
  else if (nombre.length > 200) errores.requester_name = MENSAJES_DEL_ARCO.nombreLargo
  if (!CORREO.test(d.requester_email.trim())) errores.requester_email = MENSAJES_DEL_ARCO.correo
  const cedula = d.requester_cedula.trim()
  if (cedula.length < 4) errores.requester_cedula = MENSAJES_DEL_ARCO.cedulaCorta
  else if (cedula.length > 20) errores.requester_cedula = MENSAJES_DEL_ARCO.cedulaLarga
  if (!['acceso', 'rectificacion', 'cancelacion', 'oposicion'].includes(d.type)) errores.type = MENSAJES_DEL_ARCO.tipo
  if (d.description.length > 2000) errores.description = MENSAJES_DEL_ARCO.descripcionLarga
  return errores
}
