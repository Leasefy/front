/**
 * El recorrido de una inmobiliaria en la plataforma, para /admin/onboarding
 * (19-10-2026): se registró → abrió su asistente → eligió plan → resolvió la
 * migración → primer contrato → primer recibo. Lo manda `GET /api/v1/admin/onboarding`
 * en `plataforma`.
 */

export interface RecorridoDeLaInmobiliaria {
  id: string
  nombre: string
  se_registro: string
  asistente: { estado: string; fecha: string | null }
  plan: { tier: string; nombre: string | null; estado: string; desde: string } | null
  migracion: { estado: 'completada' | 'omitida'; fecha: string } | null
  primer_contrato: string | null
  primer_recibo: string | null
  equipo: number
}

export type Paso = 'asistente' | 'plan' | 'migracion' | 'contrato' | 'recibo'

/** Los pasos en el orden en que una inmobiliaria arranca. */
export const PASOS: Array<{ paso: Paso; nombre: string; falta: string }> = [
  { paso: 'asistente', nombre: 'Abrieron su asistente', falta: 'Abrir su asistente' },
  { paso: 'plan', nombre: 'Eligieron plan', falta: 'Elegir un plan' },
  { paso: 'migracion', nombre: 'Resolvieron la migración', falta: 'Migrar sus datos' },
  { paso: 'contrato', nombre: 'Tienen su primer contrato', falta: 'Su primer contrato' },
  { paso: 'recibo', nombre: 'Emitieron su primer recibo', falta: 'Su primer recibo' },
]

/** ¿La inmobiliaria ya dio ese paso? */
export function dioElPaso(r: RecorridoDeLaInmobiliaria, paso: Paso): boolean {
  switch (paso) {
    case 'asistente':
      return r.asistente.estado === 'ACTIVE'
    case 'plan':
      return r.plan !== null
    case 'migracion':
      return r.migracion !== null
    case 'contrato':
      return r.primer_contrato !== null
    case 'recibo':
      return r.primer_recibo !== null
  }
}

/** El primer paso que le falta, o `null` si ya hizo todo. */
export function loQueLeFalta(r: RecorridoDeLaInmobiliaria): (typeof PASOS)[number] | null {
  return PASOS.find((p) => !dioElPaso(r, p.paso)) ?? null
}
