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
import type { PlanDePagoItem } from '@/lib/hooks/cobranza/use-payment-plans'

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

function pesosDelAcuerdo(valor: number): string {
  return `$${Math.round(valor).toLocaleString('es-CO')}`
}

/**
 * Un plan de pago (acuerdo con cuotas) → fila de la tabla. `null` = no se
 * muestra (cancelado: ya no es un compromiso de nadie).
 *
 * 🔴 QA-IA-B (04-10-2026): antes esto leía una fila del EMBUDO DE PAGOS, cuyo
 * `paymentPlanId` es una promesa y que no trae ningún plan sin pagos. Ahora lee
 * `GET …/cartera/payment-plans` (la lista real de `agent.payment_plans`).
 *
 * Estados: sin la aprobación de la inmobiliaria, un plan ofrecido o aceptado
 * está «Por aprobar» (ninguno se activa sin que una persona lo apruebe); uno
 * activo es «Vigente»; terminado de pagar, «Cumplido»; incumplido, como tal.
 * Un plan ACTIVO sin aprobación registrada no se esconde: se dice en las
 * condiciones, porque es justo lo que alguien tiene que mirar.
 */
export function filaDePlan(p: PlanDePagoItem): AcuerdoRow | null {
  let estado: AcuerdoEstado
  switch (p.status) {
    case 'cancelled':
      return null
    case 'completed':
      estado = 'cumplido'
      break
    case 'defaulted':
      estado = 'incumplido'
      break
    case 'active':
      estado = 'vigente'
      break
    default:
      // offered | accepted
      estado = p.aprobado ? 'vigente' : 'por_aprobar'
  }
  const partes: string[] = []
  if (p.cuotas > 0) {
    partes.push(`${p.cuotas} ${p.cuotas === 1 ? 'cuota' : 'cuotas'}, ${p.cuotasPagadas} pagada${p.cuotasPagadas === 1 ? '' : 's'}`)
  }
  if (p.initialAmountCop > 0) partes.push(`inicial de ${pesosDelAcuerdo(p.initialAmountCop)}`)
  if (p.discountAppliedPct > 0) partes.push(`${p.discountAppliedPct} % de descuento en intereses`)
  if ((p.status === 'offered' || p.status === 'accepted') && p.aprobado) {
    partes.push('aprobado por la inmobiliaria; falta que el inquilino lo acepte')
  }
  if (p.status === 'active' && !p.aprobado) partes.push('activo sin aprobación de la inmobiliaria registrada')
  return {
    key: `plan-${p.planId}`,
    debtorId: p.debtorId,
    deudor: p.debtorName,
    tipo: 'plan',
    montoCop: p.totalDueCop,
    // `vence` es un DÍA ('2026-11-03'). Leído como fecha suelta, el navegador lo
    // toma como medianoche UTC y en Colombia se pinta el día anterior («2 de
    // nov»): se ancla al mediodía de Bogotá.
    venceEl: p.proximaCuota ? `${p.proximaCuota.vence}T12:00:00-05:00` : null,
    registradoEn: p.offeredAt,
    estado,
    callId: null,
    planId: p.planId,
    canal: null,
    condiciones: partes.length ? partes.join(' · ').replace(/^./, (c) => c.toUpperCase()) + '.' : null,
    resueltoEn: p.status === 'defaulted' ? p.defaultedAt : null,
    cedulaMasked: p.cedulaMasked,
    telefonoMasked: p.phoneMasked,
  }
}

/** Une los dos orígenes y ordena por lo más reciente. */
export function componerAcuerdos(
  promesas: CobranzaPromiseItem[],
  planes: PlanDePagoItem[],
): AcuerdoRow[] {
  const filasDePlanes = planes.map(filaDePlan).filter((f): f is AcuerdoRow => f !== null)
  return [...filasDePlanes, ...promesas.map(filaDePromesa)].sort(
    (a, b) => b.registradoEn.localeCompare(a.registradoEn),
  )
}
