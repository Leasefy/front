/**
 * Las preferencias del inquilino (paso 2 del registro), validadas con las
 * MISMAS reglas y frases que el back (02-10-2026).
 *
 * 🔴 El caso de QA: un presupuesto de once cifras pasaba el paso (sólo se
 * pedía «mayor que cero» y «máximo ≥ mínimo»), el back lo dejaba llegar a
 * `tenant_preferences.max_budget` (`int4`) y respondía 500 P2020; la pantalla
 * decía «Revisa tu conexión». Ahora el cliente lo ataja ANTES, con la frase
 * del back, y el back lo rechaza igual si llegara (400 `DATOS_INVALIDOS`).
 *
 * 🔁 Espejo de `back/src/users/dto/limites-del-perfil.ts`: mismos números y
 * mismas frases. Si cambia uno, cambia el otro.
 */

import { z } from 'zod'

/**
 * El tope del presupuesto MENSUAL del inquilino: $100.000.000 (Nico, 02-10-2026).
 * Regla del negocio, no de la columna (`int4`, 2.147.483.647): una cifra más
 * alta es casi siempre un cero de más.
 */
export const PRESUPUESTO_MAXIMO_COP = 100_000_000
export const MAX_ZONAS = 10
export const MAX_LARGO_ZONA = 80
export const MAX_AMENIDADES = 30
export const MAX_LARGO_AMENIDAD = 40
export const MAX_LARGO_MASCOTAS = 500
export const FECHA_DE_MUDANZA_DESDE = '2000-01-01'
export const FECHA_DE_MUDANZA_HASTA = '2100-12-31'

export const MENSAJES_DEL_PERFIL = {
  /** Sólo del front: el paso pide presupuesto (el back lo deja opcional). */
  faltaPresupuesto: 'Ingresa tu presupuesto mínimo y máximo para continuar',
  presupuestoEntero: 'El presupuesto debe ser un número entero de pesos, sin decimales.',
  presupuestoNegativo: 'El presupuesto no puede ser negativo.',
  presupuestoMaximo: 'El presupuesto no puede pasar de $100.000.000 al mes. Revisa que no sobren ceros.',
  maximoMenorQueMinimo: 'El máximo no puede ser menor que el mínimo.',
  fechaDeMudanza: 'Elige una fecha de mudanza válida.',
  fechaDeMudanzaFueraDeRango: 'La fecha de mudanza debe estar entre el año 2000 y el 2100.',
  zonasMaximas: 'Puedes elegir hasta 10 ciudades o zonas.',
  zonaLarga: 'Cada ciudad o zona puede tener hasta 80 caracteres.',
  amenidadesMaximas: 'Puedes elegir hasta 30 amenidades.',
  amenidadLarga: 'Cada amenidad puede tener hasta 40 caracteres.',
  mascotasLargo: 'La descripción de tus mascotas puede tener hasta 500 caracteres.',
} as const

/** Un día real del calendario en AAAA-MM-DD (lo mismo que `EsDiaDelCalendario` del back). */
export function esDiaDelCalendario(valor: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(valor.trim())
  if (!m) return false
  const fecha = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`)
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === `${m[1]}-${m[2]}-${m[3]}`
}

const presupuesto = z
  .number({ required_error: MENSAJES_DEL_PERFIL.faltaPresupuesto, invalid_type_error: MENSAJES_DEL_PERFIL.presupuestoEntero })
  .int(MENSAJES_DEL_PERFIL.presupuestoEntero)
  .min(0, MENSAJES_DEL_PERFIL.presupuestoNegativo)
  .max(PRESUPUESTO_MAXIMO_COP, MENSAJES_DEL_PERFIL.presupuestoMaximo)

/**
 * El paso 2. Los nombres son los del borrador (`TenantOnboardingDraft`), que
 * son los mismos que manda el submit al back (`budgetMin`, `moveInDate`, …).
 */
export const esquemaDePreferenciasDelInquilino = z
  .object({
    budgetMin: presupuesto.refine((n) => n > 0, MENSAJES_DEL_PERFIL.faltaPresupuesto),
    budgetMax: presupuesto,
    preferredZones: z
      .array(z.string().max(MAX_LARGO_ZONA, MENSAJES_DEL_PERFIL.zonaLarga))
      .max(MAX_ZONAS, MENSAJES_DEL_PERFIL.zonasMaximas)
      .optional(),
    preferredAmenities: z
      .array(z.string().max(MAX_LARGO_AMENIDAD, MENSAJES_DEL_PERFIL.amenidadLarga))
      .max(MAX_AMENIDADES, MENSAJES_DEL_PERFIL.amenidadesMaximas)
      .optional(),
    moveInDate: z
      .string()
      .optional()
      .refine((v) => !v || esDiaDelCalendario(v), MENSAJES_DEL_PERFIL.fechaDeMudanza)
      .refine(
        (v) => !v || !esDiaDelCalendario(v) || (v.slice(0, 10) >= FECHA_DE_MUDANZA_DESDE && v.slice(0, 10) <= FECHA_DE_MUDANZA_HASTA),
        MENSAJES_DEL_PERFIL.fechaDeMudanzaFueraDeRango,
      ),
    petDetails: z.string().max(MAX_LARGO_MASCOTAS, MENSAJES_DEL_PERFIL.mascotasLargo).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.budgetMax < d.budgetMin) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['budgetMax'], message: MENSAJES_DEL_PERFIL.maximoMenorQueMinimo })
    }
  })

/** Los campos del paso 2 que pueden tener un error. */
export type CampoDePreferencias = 'budgetMin' | 'budgetMax' | 'preferredZones' | 'preferredAmenities' | 'moveInDate' | 'petDetails'

export type ErroresDePreferencias = Partial<Record<CampoDePreferencias, string>>

export interface DatosDePreferencias {
  budgetMin?: number
  budgetMax?: number
  preferredZones?: string[]
  preferredAmenities?: string[]
  moveInDate?: string
  hasPets?: boolean
  petDetails?: string
}

/** Qué falta o está mal en el paso 2. Vacío = se puede enviar. */
export function revisarPreferenciasDelInquilino(datos: DatosDePreferencias): ErroresDePreferencias {
  const r = esquemaDePreferenciasDelInquilino.safeParse({
    budgetMin: datos.budgetMin,
    budgetMax: datos.budgetMax,
    preferredZones: datos.preferredZones,
    preferredAmenities: datos.preferredAmenities,
    moveInDate: datos.moveInDate || undefined,
    // Sin mascotas, la descripción no viaja (el submit la manda vacía → undefined).
    petDetails: datos.hasPets ? datos.petDetails || undefined : undefined,
  })
  if (r.success) return {}
  const errores: ErroresDePreferencias = {}
  for (const issue of r.error.issues) {
    const campo = issue.path[0] as CampoDePreferencias | undefined
    if (campo && errores[campo] === undefined) errores[campo] = issue.message
  }
  return errores
}
