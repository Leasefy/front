/**
 * acuerdo-vocab.ts — el modelo ÚNICO de «acuerdo de pago» de la pantalla.
 *
 * Por qué existe: el panel tenía dos superficies para lo mismo. «Promesas de
 * pago» (49 filas, lo que el agente registra en la llamada: un monto y una
 * fecha) y «Acuerdos de pago» (0 filas, planes con cuotas que arma una persona).
 * Para quien cobra es UNA sola pregunta —¿qué se comprometió a pagar este
 * deudor?— y tener que adivinar en cuál de dos pestañas buscarlo no ayuda a
 * nadie.
 *
 * Acá se funden en un solo modelo. La columna `tipo` conserva la diferencia
 * real (viene de una llamada vs. es un plan estructurado); no se borra, se
 * muestra.
 *
 * Mismo rol que `call-vocab.ts` y `dispute-vocab.ts`: traducir y no pintar
 * nunca un slug crudo.
 */

import type { BadgeProps } from '@/components/ui'
import type { CobranzaPromiseItem } from '@/lib/hooks/cobranza/use-promises'
import type { PaymentsFunnelItem } from '@/lib/hooks/cobranza/use-payments-funnel'

/**
 * Variantes del ADAPTADOR local (`@/components/ui`), no las de Cadence crudo.
 * Es lo que usan las demás tablas del panel (Pagos): `size` fijo en `md`
 * —h-6, 13px— mientras que el Badge crudo con `size="sm"` da h-5/11px y se ve
 * más chico que el resto. Además el variant `info` del DS está escrito con hex
 * crudo (`bg-[#E6F0FA]`), así que NO sigue el modo oscuro; `default` sí, porque
 * mapea a `primary` con tokens.
 */
type BadgeVariant = NonNullable<BadgeProps['variant']>

/** De dónde salió el compromiso. */
export type AcuerdoTipo = 'llamada' | 'plan'

/** Estado unificado. Los dos orígenes desembocan acá. */
export type AcuerdoEstado =
  | 'vigente'
  | 'por_aprobar'
  | 'parcial'
  | 'incumplido'
  | 'cumplido'

export const ACUERDO_ESTADO: Record<
  AcuerdoEstado,
  { variant: BadgeVariant; label: string }
> = {
  vigente: { variant: 'default', label: 'Vigente' },
  por_aprobar: { variant: 'warning', label: 'Por aprobar' },
  parcial: { variant: 'warning', label: 'Parcial' },
  incumplido: { variant: 'destructive', label: 'Incumplido' },
  cumplido: { variant: 'success', label: 'Cumplido' },
}

export const ACUERDO_TIPO_LABEL: Record<AcuerdoTipo, string> = {
  llamada: 'De llamada',
  plan: 'Plan de pago',
}

/** Una fila de la tabla, venga de donde venga. */
export interface AcuerdoRow {
  key: string
  debtorId: string
  deudor: string
  tipo: AcuerdoTipo
  montoCop: number
  /** Fecha de vencimiento. `null` cuando el origen no la expone. */
  venceEl: string | null
  /** Cuándo se registró (para ordenar y para el «hace N días»). */
  registradoEn: string
  estado: AcuerdoEstado

  // ── Lo que hace falta para el detalle ────────────────────────────────────
  /** Llamada donde se tomó el compromiso. Habilita «Escuchar la llamada». */
  callId: string | null
  /** Plan de pago. Habilita «Revisar y aprobar» en su detalle real. */
  planId: string | null
  /** Canal por el que se tomó (voice/whatsapp/sms). */
  canal: string | null
  /** Condiciones pactadas, si el origen las guardó. */
  condiciones: string | null
  /** Cuándo se cerró (cumplida/incumplida). */
  resueltoEn: string | null
  cedulaMasked: string | null
  telefonoMasked: string | null
}

/**
 * `derivedStatus` de una promesa → estado unificado.
 *
 * `activa` y `por_vencer` colapsan en «vigente»: para quien mira la tabla, las
 * dos significan «todavía no venció». La urgencia se lee en la fecha.
 */
function estadoDePromesa(d: CobranzaPromiseItem['derivedStatus']): AcuerdoEstado {
  switch (d) {
    case 'cumplida':
      return 'cumplido'
    case 'incumplida':
      return 'incumplido'
    case 'parcial':
      return 'parcial'
    case 'activa':
    case 'por_vencer':
    default:
      return 'vigente'
  }
}

export function filaDePromesa(p: CobranzaPromiseItem): AcuerdoRow {
  return {
    key: `promesa-${p.id}`,
    debtorId: p.debtorId,
    deudor: p.debtorName,
    tipo: 'llamada',
    montoCop: p.amount,
    venceEl: p.dueDate,
    registradoEn: p.createdAt,
    estado: estadoDePromesa(p.derivedStatus),
    callId: p.callId,
    planId: null,
    canal: p.channel,
    condiciones: p.conditions,
    resueltoEn: p.resolvedAt,
    cedulaMasked: p.cedulaMasked,
    telefonoMasked: p.phoneMasked,
  }
}

/**
 * Un plan de pago pendiente de aprobación.
 *
 * ⚠️ El payload del funnel de pagos NO trae la fecha de vencimiento ni el
 * número de cuotas del plan, así que `venceEl` va en null y la tabla muestra
 * «—». Inventar una fecha acá sería peor que no tenerla.
 */
export function filaDePlan(r: PaymentsFunnelItem): AcuerdoRow {
  return {
    key: `plan-${r.paymentPlanId ?? r.id}`,
    debtorId: r.debtor.id,
    deudor: r.debtor.fullName,
    tipo: 'plan',
    montoCop: r.amount,
    venceEl: null,
    registradoEn: r.createdAt,
    estado: 'por_aprobar',
    callId: null,
    planId: r.paymentPlanId,
    canal: null,
    condiciones: null,
    resueltoEn: null,
    cedulaMasked: r.debtor.cedulaMasked,
    telefonoMasked: r.debtor.phoneMasked,
  }
}

/** Une los dos orígenes y ordena por lo más reciente. */
export function componerAcuerdos(
  promesas: CobranzaPromiseItem[],
  planes: PaymentsFunnelItem[],
): AcuerdoRow[] {
  return [...planes.map(filaDePlan), ...promesas.map(filaDePromesa)].sort(
    (a, b) => b.registradoEn.localeCompare(a.registradoEn),
  )
}
