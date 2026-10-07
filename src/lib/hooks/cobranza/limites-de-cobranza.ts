/**
 * Los topes de los formularios de cobranza, con la misma frase que dice el
 * servidor (02-10-2026, tanda 2 de errores, A6).
 *
 * Lo que el back o el micro rechazan se ataja ANTES de enviar: la persona ve
 * el error debajo del campo sin esperar un 400. Cada bloque dice de dónde sale
 * su número; si el servidor lo cambia, se cambia acá.
 */

// ── Condiciones de cobro (el reglaje) ────────────────────────────────────────
// Espejo de `back/src/inmobiliaria/cobros/secuencia-de-cobranza/calendario.ts`
// (`LIMITES_DEL_REGLAJE`) y de `secuencia-de-cobranza.dto.ts`.

export const LIMITES_DEL_REGLAJE = {
  diaDelRecordatorio: { min: 1, max: 28 },
  diasEntreAvisos: { min: 1, max: 30 },
  maxAvisosConInteres: { min: 0, max: 10 },
} as const

/** El largo máximo de los dos textos propios del reglaje (`@MaxLength(1000)`). */
export const LARGO_DEL_TEXTO_DEL_REGLAJE = 1000

export type CampoDelReglaje =
  | 'diaDelRecordatorio'
  | 'diasEntreAvisos'
  | 'maxAvisosConInteres'
  | 'mensajeDelRecordatorio'
  | 'mensajeDelAviso'

const NOMBRE_DEL_CAMPO_DEL_REGLAJE: Record<keyof typeof LIMITES_DEL_REGLAJE, string> = {
  diaDelRecordatorio: 'El día del recordatorio',
  diasEntreAvisos: 'Los días entre avisos',
  maxAvisosConInteres: 'Los avisos con interés',
}

/**
 * Lo que está mal en el borrador del reglaje, por campo. Vacío = se puede
 * enviar. Sólo mira lo que viaja (las claves del borrador).
 */
export function erroresDelReglaje(borrador: {
  diaDelRecordatorio?: number
  diasEntreAvisos?: number
  maxAvisosConInteres?: number
  mensajeDelRecordatorio?: string | null
  mensajeDelAviso?: string | null
}): Partial<Record<CampoDelReglaje, string>> {
  const errores: Partial<Record<CampoDelReglaje, string>> = {}
  for (const campo of Object.keys(LIMITES_DEL_REGLAJE) as (keyof typeof LIMITES_DEL_REGLAJE)[]) {
    const valor = borrador[campo]
    if (valor === undefined) continue
    const { min, max } = LIMITES_DEL_REGLAJE[campo]
    if (!Number.isInteger(valor) || valor < min || valor > max) {
      errores[campo] = `${NOMBRE_DEL_CAMPO_DEL_REGLAJE[campo]} va de ${min} a ${max}, en números enteros.`
    }
  }
  for (const campo of ['mensajeDelRecordatorio', 'mensajeDelAviso'] as const) {
    const texto = borrador[campo]
    if (typeof texto === 'string' && texto.length > LARGO_DEL_TEXTO_DEL_REGLAJE) {
      errores[campo] = `El texto puede tener hasta ${LARGO_DEL_TEXTO_DEL_REGLAJE.toLocaleString('es-CO')} caracteres.`
    }
  }
  return errores
}

// ── Acuerdo general ──────────────────────────────────────────────────────────
// Espejo de `CreateSchema`/`PatchSchema` y de `incoherencia()` en
// `agent/src/server/routes/agency-cobranza-acuerdos-generales.ts`.

export const LIMITES_DEL_ACUERDO_GENERAL = {
  name: 120,
  conditionEs: 280,
  priority: { min: 0, max: 1000 },
  diasDeMora: { min: 0, max: 3650 },
  montoCop: { min: 0, max: 1_000_000_000_000 },
  discountPct: { min: 0, max: 100 },
  maxInstallments: { min: 0, max: 36 },
  minInitialPct: { min: 0, max: 100 },
} as const

export type CampoDelAcuerdoGeneral =
  | 'name'
  | 'conditionEs'
  | 'priority'
  | 'minDaysOverdue'
  | 'maxDaysOverdue'
  | 'minAmountCop'
  | 'maxAmountCop'
  | 'discountPct'
  | 'maxInstallments'
  | 'minInitialPct'

function fueraDe(valor: number | null, { min, max }: { min: number; max: number }): boolean {
  return valor !== null && (!Number.isInteger(valor) || valor < min || valor > max)
}

function cifra(n: number): string {
  return n.toLocaleString('es-CO')
}

/**
 * Lo que el micro rechazaría del acuerdo general, por campo. Vacío = se puede
 * enviar. Las frases de los rangos al revés son las del micro, tal cual.
 */
export function erroresDelAcuerdoGeneral(a: {
  name: string
  conditionEs: string
  priority: number
  active: boolean
  minDaysOverdue: number | null
  maxDaysOverdue: number | null
  minAmountCop: number | null
  maxAmountCop: number | null
  discountPct: number
  maxInstallments: number
  minInitialPct: number
}): Partial<Record<CampoDelAcuerdoGeneral, string>> {
  const L = LIMITES_DEL_ACUERDO_GENERAL
  const e: Partial<Record<CampoDelAcuerdoGeneral, string>> = {}
  if (a.name.trim().length > L.name) e.name = `El nombre puede tener hasta ${L.name} caracteres.`
  if (a.conditionEs.trim().length > L.conditionEs) {
    e.conditionEs = `La condición puede tener hasta ${L.conditionEs} caracteres.`
  }
  if (fueraDe(a.priority, L.priority)) {
    e.priority = `La prioridad va de ${L.priority.min} a ${cifra(L.priority.max)}.`
  }
  for (const campo of ['minDaysOverdue', 'maxDaysOverdue'] as const) {
    if (fueraDe(a[campo], L.diasDeMora)) {
      e[campo] = `Los días de mora van de ${L.diasDeMora.min} a ${cifra(L.diasDeMora.max)}.`
    }
  }
  for (const campo of ['minAmountCop', 'maxAmountCop'] as const) {
    if (fueraDe(a[campo], L.montoCop)) {
      e[campo] = `La deuda va de $0 a $${cifra(L.montoCop.max)}.`
    }
  }
  if (fueraDe(a.discountPct, L.discountPct)) e.discountPct = 'El descuento va de 0 a 100 %.'
  if (fueraDe(a.maxInstallments, L.maxInstallments)) {
    e.maxInstallments = `Las cuotas van de ${L.maxInstallments.min} a ${L.maxInstallments.max}.`
  }
  if (fueraDe(a.minInitialPct, L.minInitialPct)) e.minInitialPct = 'El pago inicial va de 0 a 100 %.'

  // La coherencia se exige al PRENDERLO, como en el micro: apagado se guarda.
  if (a.active) {
    if (
      !e.minDaysOverdue &&
      !e.maxDaysOverdue &&
      a.minDaysOverdue !== null &&
      a.maxDaysOverdue !== null &&
      a.minDaysOverdue > a.maxDaysOverdue
    ) {
      e.maxDaysOverdue = 'El rango de días de mora está al revés: el mínimo es mayor que el máximo.'
    }
    if (
      !e.minAmountCop &&
      !e.maxAmountCop &&
      a.minAmountCop !== null &&
      a.maxAmountCop !== null &&
      a.minAmountCop > a.maxAmountCop
    ) {
      e.maxAmountCop = 'El rango de monto está al revés: el mínimo es mayor que el máximo.'
    }
  }
  return e
}

// ── Política de negociación (el techo de todo acuerdo) ───────────────────────
// Espejo de `PatchBodySchema` en `agent/src/server/routes/agency-policy.ts`.

export const LIMITES_DE_LA_POLITICA = {
  maxDiscountPct: { min: 0, max: 0.5 },
  maxPlanMonths: { min: 1, max: 24 },
  minPaymentCop: { min: 0, max: 1_000_000_000 },
  negotiationMaxAttempts: { min: 1, max: 10 },
  autoEscalateAfterDays: { min: 1, max: 365 },
} as const

export type CampoDeLaPolitica = keyof typeof LIMITES_DE_LA_POLITICA

/** Lo que el micro rechazaría de la política, por campo. Vacío = se puede enviar. */
export function erroresDeLaPolitica(
  p: Partial<Record<CampoDeLaPolitica, number>>,
): Partial<Record<CampoDeLaPolitica, string>> {
  const L = LIMITES_DE_LA_POLITICA
  const e: Partial<Record<CampoDeLaPolitica, string>> = {}
  const fuera = (v: number | undefined, { min, max }: { min: number; max: number }, entero = true) =>
    v !== undefined && (!Number.isFinite(v) || (entero && !Number.isInteger(v)) || v < min || v > max)
  if (fuera(p.maxDiscountPct, L.maxDiscountPct, false)) e.maxDiscountPct = 'El descuento máximo va de 0 a 50 %.'
  if (fuera(p.maxPlanMonths, L.maxPlanMonths)) e.maxPlanMonths = 'El plazo máximo va de 1 a 24 meses.'
  if (fuera(p.minPaymentCop, L.minPaymentCop)) {
    e.minPaymentCop = `El pago mínimo va de $0 a $${cifra(L.minPaymentCop.max)}, sin decimales.`
  }
  if (fuera(p.negotiationMaxAttempts, L.negotiationMaxAttempts)) {
    e.negotiationMaxAttempts = 'Los intentos de negociación van de 1 a 10.'
  }
  if (fuera(p.autoEscalateAfterDays, L.autoEscalateAfterDays)) {
    e.autoEscalateAfterDays = 'Los días antes de escalar van de 1 a 365.'
  }
  return e
}

// ── Umbrales del reporte diario ──────────────────────────────────────────────
// Espejo de `ThresholdsBodySchema` en
// `agent/src/server/routes/agency-cobranza-daily-report.ts`. Las dos cuentas
// («violaciones», «llamadas fuera de horario») no tienen tope en el micro y su
// columna es un `Int`: se topan acá en una cifra que se lea, para que un número
// de once cifras no termine en un 500.

export const LIMITES_DE_LOS_UMBRALES = {
  topN: { min: 1, max: 50 },
  cortesDeMora: { min: 1, max: 10 },
  porcentaje: { min: 0, max: 100 },
  conteo: { min: 0, max: 100_000 },
} as const

export type CampoDeLosUmbrales =
  | 'top_n_debtors_in_report'
  | 'mora_dias_bucket_boundaries'
  | 'pkr_pct_alert_below'
  | 'indice_morosidad_pct_alert_above'
  | 'compliance_violations_critical_at_least'
  | 'calls_outside_window_critical_at_least'

/**
 * Lo que está mal en los umbrales, por campo (en español). `cortes` es `null`
 * si el texto no se pudo leer como números separados por comas.
 */
export function erroresDeLosUmbrales(u: {
  top_n_debtors_in_report: number
  mora_dias_bucket_boundaries: number[] | null
  pkr_pct_alert_below: number
  indice_morosidad_pct_alert_above: number
  compliance_violations_critical_at_least: number
  calls_outside_window_critical_at_least: number
}): Partial<Record<CampoDeLosUmbrales, string>> {
  const L = LIMITES_DE_LOS_UMBRALES
  const e: Partial<Record<CampoDeLosUmbrales, string>> = {}
  const entero = (v: number, { min, max }: { min: number; max: number }) =>
    Number.isInteger(v) && v >= min && v <= max
  const decimal = (v: number, { min, max }: { min: number; max: number }) =>
    Number.isFinite(v) && v >= min && v <= max

  if (!entero(u.top_n_debtors_in_report, L.topN)) {
    e.top_n_debtors_in_report = `Van de ${L.topN.min} a ${L.topN.max} deudores, en números enteros.`
  }
  const cortes = u.mora_dias_bucket_boundaries
  if (cortes === null || cortes.some((n) => !Number.isInteger(n) || n < 0)) {
    e.mora_dias_bucket_boundaries =
      'Escribe días enteros separados por comas, por ejemplo 0,8,31,91.'
  } else if (cortes.length < L.cortesDeMora.min || cortes.length > L.cortesDeMora.max) {
    e.mora_dias_bucket_boundaries = `Van de ${L.cortesDeMora.min} a ${L.cortesDeMora.max} cortes.`
  } else if (!cortes.every((v, i) => i === 0 || v > cortes[i - 1]!)) {
    e.mora_dias_bucket_boundaries = 'Cada corte tiene que ser mayor que el anterior.'
  }
  if (!decimal(u.pkr_pct_alert_below, L.porcentaje)) {
    e.pkr_pct_alert_below = 'El porcentaje va de 0 a 100.'
  }
  if (!decimal(u.indice_morosidad_pct_alert_above, L.porcentaje)) {
    e.indice_morosidad_pct_alert_above = 'El porcentaje va de 0 a 100.'
  }
  for (const campo of [
    'compliance_violations_critical_at_least',
    'calls_outside_window_critical_at_least',
  ] as const) {
    if (!entero(u[campo], L.conteo)) {
      e[campo] = `Va de 0 a ${cifra(L.conteo.max)}, en números enteros.`
    }
  }
  return e
}
