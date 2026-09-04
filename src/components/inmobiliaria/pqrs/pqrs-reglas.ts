/**
 * Reglas y etiquetas de las PQRS de la inmobiliaria — puras, sin React.
 *
 * Viven aparte de los cajones para que la pantalla, «Nueva solicitud» y el
 * detalle digan lo mismo de cada tipo, estado y SLA, y para que se prueben
 * sin montar un Sheet. Las etiquetas van en español clavadas acá a propósito:
 * el dominio PQRS es colombiano (Ley 1755 de 2015) y no se traduce.
 */

import type { PqrsEstado, PqrsSolicitante, PqrsTipo } from '@/lib/api/pqrs-agencia.types'
import { diasParaElSla } from '@/lib/api/pqrs-agencia.types'

export const TIPO_LABEL: Record<PqrsTipo, string> = {
  PETICION: 'Petición',
  QUEJA: 'Queja',
  RECLAMO: 'Reclamo',
  SOLICITUD: 'Solicitud',
}

/** Qué significa cada tipo — para que quien radica no tenga que adivinar. */
export const TIPO_DESCRIPCION: Record<PqrsTipo, string> = {
  PETICION: 'Pide información, un documento o una gestión.',
  QUEJA: 'Inconformidad con la atención o el servicio.',
  RECLAMO: 'Algo que se incumplió y hay que corregir.',
  SOLICITUD: 'Reparación, trámite o cambio sobre el inmueble.',
}

export const SOLICITANTE_LABEL: Record<PqrsSolicitante, string> = {
  INQUILINO: 'Inquilino',
  PROPIETARIO: 'Propietario',
  TERCERO: 'Tercero',
}

export const ESTADO_LABEL: Record<PqrsEstado, string> = {
  RECIBIDA: 'Recibida',
  ASIGNADA: 'Asignada',
  EN_PROCESO: 'En proceso',
  EN_COTIZACION: 'En cotización',
  RESUELTA: 'Resuelta',
  CERRADA: 'Cerrada',
}

/** Una clase por estado, sólo tokens semánticos (nada de hex ni `text-white`). */
export const ESTADO_BADGE: Record<PqrsEstado, string> = {
  RECIBIDA: 'bg-primary/10 text-primary',
  ASIGNADA: 'bg-primary/10 text-primary',
  EN_PROCESO: 'bg-warning-soft text-warning',
  EN_COTIZACION: 'bg-warning-soft text-warning',
  RESUELTA: 'bg-success-soft text-success',
  CERRADA: 'bg-surface-muted text-fg-muted',
}

/** Estados en los que el SLA ya no corre. */
export const ESTADOS_TERMINALES: readonly PqrsEstado[] = ['RESUELTA', 'CERRADA']

/**
 * A qué estados se puede mover desde cada uno. «Asignada» no se elige a mano:
 * la pone el back al asignar. «Cerrada» es el final: de ahí no se sale.
 */
export function estadosSiguientes(estado: PqrsEstado): PqrsEstado[] {
  switch (estado) {
    case 'RECIBIDA':
    case 'ASIGNADA':
    case 'EN_PROCESO':
    case 'EN_COTIZACION':
      return (['EN_PROCESO', 'EN_COTIZACION', 'RESUELTA', 'CERRADA'] as PqrsEstado[]).filter(
        (e) => e !== estado,
      )
    case 'RESUELTA':
      return ['CERRADA']
    case 'CERRADA':
      return []
  }
}

export interface TextoSla {
  texto: string
  vencido: boolean
}

/** Cómo se lee el SLA en una celda o en el detalle. */
export function textoSla(
  slaVenceAt: string,
  estado: PqrsEstado,
  ahora = new Date(),
): TextoSla {
  if (ESTADOS_TERMINALES.includes(estado)) return { texto: '—', vencido: false }
  const dias = diasParaElSla(slaVenceAt, ahora)
  if (dias > 0) return { texto: dias === 1 ? '1 día' : `${dias} días`, vencido: false }
  if (dias === 0) return { texto: 'Hoy', vencido: true }
  const atras = Math.abs(dias)
  return { texto: atras === 1 ? 'Vencido hace 1 día' : `Vencido hace ${atras} días`, vencido: true }
}

/** Lo que se escribe en «Nueva solicitud», tal cual está en los campos. */
export interface PqrsFormulario {
  tipo: PqrsTipo
  solicitanteTipo: PqrsSolicitante
  solicitanteNombre: string
  solicitanteContacto: string
  consignacionId: string
  asignadoAUserId: string
  asunto: string
  descripcion: string
}

export const PQRS_FORMULARIO_VACIO: PqrsFormulario = {
  tipo: 'PETICION',
  solicitanteTipo: 'INQUILINO',
  solicitanteNombre: '',
  solicitanteContacto: '',
  consignacionId: '',
  asignadoAUserId: '',
  asunto: '',
  descripcion: '',
}

export const ASUNTO_MAX = 200
export const DESCRIPCION_MAX = 2000

/** Campo → mensaje. Vacío = se puede radicar. */
export function validarPqrs(form: PqrsFormulario): Record<string, string> {
  const errores: Record<string, string> = {}
  if (!form.solicitanteNombre.trim()) errores.solicitanteNombre = 'Escribí quién la presenta.'
  const asunto = form.asunto.trim()
  if (!asunto) errores.asunto = 'Escribí de qué se trata.'
  else if (asunto.length > ASUNTO_MAX) errores.asunto = `Máximo ${ASUNTO_MAX} caracteres.`
  if (form.descripcion.length > DESCRIPCION_MAX) errores.descripcion = `Máximo ${DESCRIPCION_MAX} caracteres.`
  return errores
}
