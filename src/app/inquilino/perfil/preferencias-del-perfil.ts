/**
 * Las preferencias de vivienda del perfil del inquilino, revisadas ANTES de
 * mandarlas con las MISMAS reglas y frases que el back (02-10-2026, Nico,
 * pregunta 2).
 *
 * El caso: el onboarding ya atajaba un presupuesto de once cifras, pero esta
 * tarjeta del perfil (`PATCH /users/me/preferences`) lo dejaba salir, y un
 * negativo o un decimal se perdían en silencio (`parseBudget` los descartaba
 * y el PATCH de reemplazo completo BORRABA el presupuesto guardado).
 *
 * 🔁 Los números y las frases NO se copian: salen de
 * `lib/onboarding/preferencias-del-inquilino.ts`, el espejo de
 * `back/src/users/dto/limites-del-perfil.ts`. Lo único distinto del
 * onboarding es que acá el presupuesto es opcional (vacío = sin presupuesto).
 */

import {
  FECHA_DE_MUDANZA_DESDE,
  FECHA_DE_MUDANZA_HASTA,
  MAX_AMENIDADES,
  MAX_LARGO_AMENIDAD,
  MAX_LARGO_MASCOTAS,
  MAX_LARGO_ZONA,
  MAX_ZONAS,
  MENSAJES_DEL_PERFIL,
  PRESUPUESTO_MAXIMO_COP,
  esDiaDelCalendario,
} from '@/lib/onboarding/preferencias-del-inquilino'
import type { PreferencesFormData } from '@/lib/api/tenant-preferences.service'

/** Los campos de la tarjeta (los mismos nombres que el cuerpo del PATCH). */
export const CAMPOS_DE_PREFERENCIAS = [
  'minBudget',
  'maxBudget',
  'preferredCities',
  'preferredAmenities',
  'moveInDate',
  'preferredContact',
  'petDetails',
] as const

export type CampoDePreferencia = (typeof CAMPOS_DE_PREFERENCIAS)[number]

export type ErroresDePreferencia = Partial<Record<CampoDePreferencia, string>>

function lista(valor: string): string[] {
  return valor
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** El error de un presupuesto escrito (vacío = sin presupuesto, vale). */
function errorDelPresupuesto(valor: string): string | undefined {
  const t = valor.trim()
  if (t === '') return undefined
  const n = Number(t)
  if (!Number.isFinite(n) || !Number.isInteger(n)) return MENSAJES_DEL_PERFIL.presupuestoEntero
  if (n < 0) return MENSAJES_DEL_PERFIL.presupuestoNegativo
  if (n > PRESUPUESTO_MAXIMO_COP) return MENSAJES_DEL_PERFIL.presupuestoMaximo
  return undefined
}

/** Qué está mal en la tarjeta. Vacío = se puede guardar. */
export function revisarPreferenciasDelPerfil(form: PreferencesFormData): ErroresDePreferencia {
  const errores: ErroresDePreferencia = {}

  const min = errorDelPresupuesto(form.minBudget)
  if (min) errores.minBudget = min
  const max = errorDelPresupuesto(form.maxBudget)
  if (max) errores.maxBudget = max
  if (!min && !max && form.minBudget.trim() !== '' && form.maxBudget.trim() !== '') {
    if (Number(form.maxBudget) < Number(form.minBudget)) {
      errores.maxBudget = MENSAJES_DEL_PERFIL.maximoMenorQueMinimo
    }
  }

  const zonas = lista(form.preferredCities)
  if (zonas.length > MAX_ZONAS) errores.preferredCities = MENSAJES_DEL_PERFIL.zonasMaximas
  else if (zonas.some((z) => z.length > MAX_LARGO_ZONA)) errores.preferredCities = MENSAJES_DEL_PERFIL.zonaLarga

  const amenidades = lista(form.preferredAmenities)
  if (amenidades.length > MAX_AMENIDADES) errores.preferredAmenities = MENSAJES_DEL_PERFIL.amenidadesMaximas
  else if (amenidades.some((a) => a.length > MAX_LARGO_AMENIDAD)) {
    errores.preferredAmenities = MENSAJES_DEL_PERFIL.amenidadLarga
  }

  if (form.moveInDate) {
    if (!esDiaDelCalendario(form.moveInDate)) errores.moveInDate = MENSAJES_DEL_PERFIL.fechaDeMudanza
    else {
      const dia = form.moveInDate.slice(0, 10)
      if (dia < FECHA_DE_MUDANZA_DESDE || dia > FECHA_DE_MUDANZA_HASTA) {
        errores.moveInDate = MENSAJES_DEL_PERFIL.fechaDeMudanzaFueraDeRango
      }
    }
  }

  if (form.petFriendly && form.petDetails.trim().length > MAX_LARGO_MASCOTAS) {
    errores.petDetails = MENSAJES_DEL_PERFIL.mascotasLargo
  }

  return errores
}
