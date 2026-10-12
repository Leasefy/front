'use client'

/**
 * /ai/cobranza/acuerdos — "Acuerdos de pago" (visión #10).
 *
 * Un acuerdo de pago es más estructurado que una promesa: deuda total + pago
 * inicial + saldo en N cuotas con fechas y consecuencia de incumplimiento.
 *
 * Dos partes:
 *  (1) LISTA de acuerdos activos/pendientes — se compone desde la fuente real
 *      de planes de pago (use-payments-funnel: rows con paymentPlanId). Cada
 *      acuerdo cross-linkea al detalle REAL /ai/cobranza/pagos/planes/[planId],
 *      donde vive la aprobación de verdad (Aprobar/Rechazar/Modificar). NO se
 *      duplica esa tabla ni ese detalle.
 *  (2) CREAR ACUERDO — formulario con DS (Input/Select/Switch) + una card de
 *      acuerdo PROPUESTO de ejemplo con sus acciones. Persistir/aprobar desde
 *      esta superficie aún no tiene endpoint → placeholders honestos
 *      "Próximamente" deshabilitados.
 *
 * T-323 (caso más sensible): un acuerdo SIEMPRE requiere aprobación humana
 * explícita; el switch correspondiente está fijo en "Sí" y deshabilitado.
 * Nunca se auto-aprueba ni se presiona al inquilino.
 *
 * Estilo: contrato UI-DS-CONTRACT-2026-06-16 — <Button>/<Card>/<Input>/
 * <Select>/<Switch> del DS, cero hex inline, un solo primary CTA por sección,
 * tokens semánticos (primary/success/warning/danger + *-soft, fg/fg-muted,
 * bg-card/surface-muted, border-border).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle,
  Clock,
  FileText,
  Handshake,
  Info,
  Lock,
  Warning,
} from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { Mask } from '@/components/inmobiliaria/cobranza/Mask'
import { EmptyState } from '@/components/data-display/EmptyState'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Badge,
} from '@/components/ui'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import { cuotasDelAcuerdo } from '@/lib/cobranza/cuotas-del-acuerdo'
import {
  usePaymentsFunnel,
  type PaymentsFunnelItem,
} from '@/lib/hooks/cobranza/use-payments-funnel'
import { useDebtorList } from '@/lib/hooks/cobranza/use-debtor-list'
import { TraerLaCartera } from '@/components/cobranza-manual/TraerLaCartera'
import { usePlazoSinFijar } from '@/lib/hooks/use-plazo-sin-fijar'
import { FIJAR_EL_PLAZO_HREF } from '@/lib/api/cobranza-secuencia.types'
import { useDebtorDetail } from '@/lib/hooks/cobranza/use-debtor-detail'
import { useAgreementOffer } from '@/lib/hooks/cobranza/use-agreement-offer'
import { reformatearMiles, parseMiles, formatMiles } from '@/lib/cobranza/formato-miles'
import {
  type CarteraStage,
} from '@/lib/hooks/cobranza/use-agreement-propose'
import { usePromises } from '@/lib/hooks/cobranza/use-promises'
import { usePaymentPlans } from '@/lib/hooks/cobranza/use-payment-plans'
// El Dialog del ADAPTADOR local (`@/components/ui/dialog`), no el de Cadence
// crudo: es el que usan los otros 21 modales del panel, trae su padding `p-6` y
// frena Lenis mientras está abierto.
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AcuerdosTabla,
  type AcuerdoFiltro,
} from '@/components/inmobiliaria/cobranza/AcuerdosTabla'
import {
  componerAcuerdos,
  type AcuerdoRow,
} from '@/lib/cobranza/acuerdo-vocab'
import { AcuerdoDetalleSheet } from '@/components/inmobiliaria/cobranza/AcuerdoDetalleSheet'
import { AcuerdosGeneralesCard } from '@/components/inmobiliaria/cobranza/AcuerdosGeneralesCard'
import { AcuerdosGeneralesTabla } from '@/components/inmobiliaria/cobranza/AcuerdosGeneralesTabla'
import { CrossFade, Presence } from '@leasefy/cadence'
import { CampoDeDia } from '@/components/contabilidad/CampoDeDia'

// Etapas donde NO hay superficie de negociación (espejo del backend:
// agency-cobranza-promises.ts NEGOTIATION_UNAVAILABLE_STAGES). En esas etapas el
// motor de planes no propone acuerdo → el deudor no es seleccionable aquí.
const NEGOTIATION_UNAVAILABLE_STAGES = new Set<string>(['S4', 'S5', 'SX'])

const STAGE_LABELS_ES: Record<CarteraStage, string> = {
  S0: 'Pre-vencimiento',
  S1: 'Cartera fresca',
  S2: 'Mora administrativa',
  S3: 'Mora pre-jurídica',
  S4: 'Siniestro inmobiliario',
  S5: 'Restitución / jurídico',
  SX: 'Skip / Abandono',
}

const BASE = '/panel/inmobiliaria/pagos/cobranza'
const PLANES_BASE = '/panel/inmobiliaria/pagos/cobranza/pagos/planes'

// ── Helpers ───────────────────────────────────────────────────────────────────

function copFormat(value: number | null | undefined, formatCurrency: (n: number | null | undefined) => string): string {
  return formatCurrency(value ?? 0)
}

// ── Card de acuerdo de la lista (cross-link al detalle real) ────────────────────

/**
 * `row` siempre trae `paymentPlanId`: la lista se filtra por eso antes de
 * llegar acá. La rama sin plan pintaba un botón «Próximamente» deshabilitado
 * que nadie podía ver nunca — código muerto que prometía una función pendiente
 * donde no había ninguna.
 */
function AcuerdoListaCard({ row }: { row: PaymentsFunnelItem }) {
  const { formatCurrency, formatDate } = useI18n()
  const href = `${PLANES_BASE}/${row.paymentPlanId}`

  return (
    <li className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold text-fg truncate">
            <Mask field="cedula" value={row.debtor.fullName} />
          </p>
          <p className="text-xs text-fg-muted">
            Acuerdo de pago · {formatDate(new Date(row.createdAt), { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        {/* Estado — etiqueta no interactiva (contrato §3) */}
        <Badge variant="warning" className="shrink-0">
          <Clock className="w-3 h-3" aria-hidden="true" />
          Pendiente aprobación
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <div>
          <p className="text-xs text-fg-muted">Monto del acuerdo</p>
          <p className="text-sm font-semibold tabular-nums text-fg">
            {copFormat(row.amount, formatCurrency)}
          </p>
        </div>
        <Button asChild size="sm" hideArrow>
          <Link href={href}>
            Revisar y aprobar
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </li>
  )
}

// ── Card de acuerdo PROPUESTO (ejemplo) ─────────────────────────────────────────

function AcuerdoPropuestoCard({
  totalAdeudado,
  cuotaInicial,
  numCuotas,
  primerPago,
}: {
  totalAdeudado: number
  cuotaInicial: number
  numCuotas: number
  primerPago: string
}) {
  const { formatCurrency, formatDate } = useI18n()
  // Sin cuotas, la inicial ES el total (pago único), como lo guarda el micro.
  const inicial = numCuotas === 0 ? totalAdeudado : cuotaInicial
  const saldo = Math.max(0, totalAdeudado - inicial)
  const cuotas = cuotasDelAcuerdo(saldo, numCuotas, primerPago)
  const valorCuota = cuotas[0]?.valor ?? 0
  const fechaEnPalabras = (f: string | null) =>
    f ? formatDate(new Date(`${f}T12:00:00`), { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Cabecera con estado */}
      <div className="flex items-center justify-between gap-2 px-5 py-3 bg-surface-muted border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
            <Handshake className="w-4 h-4 text-primary" weight="duotone" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">Acuerdo propuesto</p>
            <p className="text-xs text-fg-muted">Lo que se va a guardar</p>
          </div>
        </div>
        <Badge variant="warning" className="shrink-0">
          <Clock className="w-3 h-3" aria-hidden="true" />
          Pendiente aprobación
        </Badge>
      </div>

      {/* Desglose de condiciones */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
        <div className="bg-card p-4 space-y-0.5">
          <dt className="text-xs text-fg-muted">Deuda total</dt>
          <dd className="text-sm font-semibold tabular-nums text-fg">
            {copFormat(totalAdeudado, formatCurrency)}
          </dd>
        </div>
        <div className="bg-card p-4 space-y-0.5">
          <dt className="text-xs text-fg-muted">{numCuotas === 0 ? 'Pago único' : 'Pago inicial'}</dt>
          <dd className="text-sm font-semibold tabular-nums text-success" data-testid="vista-inicial">
            {copFormat(inicial, formatCurrency)}
          </dd>
        </div>
        <div className="bg-card p-4 space-y-0.5">
          <dt className="text-xs text-fg-muted">
            {numCuotas === 0 ? 'Sin cuotas' : `Saldo en ${numCuotas} ${numCuotas === 1 ? 'cuota' : 'cuotas'}`}
          </dt>
          <dd className="text-sm font-semibold tabular-nums text-fg">
            {copFormat(saldo, formatCurrency)}
          </dd>
        </div>
        <div className="bg-card p-4 space-y-0.5">
          <dt className="text-xs text-fg-muted">Valor por cuota</dt>
          <dd className="text-sm font-semibold tabular-nums text-fg">
            {numCuotas === 0 ? '—' : copFormat(valorCuota, formatCurrency)}
          </dd>
        </div>
      </dl>

      {/* Las cuotas con su fecha (CB-05) y qué pasa si incumple (lo que hace el sistema, no un selector). */}
      <div className="px-5 py-4 space-y-2 border-t border-border">
        {cuotas.length > 0 ? (
          <ul className="space-y-1 text-sm" data-testid="vista-cuotas">
            {cuotas.map((c) => (
              <li key={c.numero} className="flex items-center justify-between gap-3">
                <span className="text-fg-muted">
                  Cuota {c.numero} · {fechaEnPalabras(c.vence)}
                </span>
                <span className="font-medium tabular-nums text-fg">{copFormat(c.valor, formatCurrency)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fg-muted">Pago único: se paga entero con el enlace de pago.</p>
        )}
        <div className="flex items-start gap-2 text-sm">
          <Warning className="w-4 h-4 text-warning shrink-0 mt-0.5" weight="duotone" aria-hidden="true" />
          <span className="text-fg-muted">
            <span className="font-medium text-fg">Si incumple:</span> el acuerdo queda incumplido y la deuda vuelve a la cobranza.
          </span>
        </div>
        <p className="text-xs text-fg-muted leading-relaxed">
          Si la etapa tiene un acuerdo general con descuento sobre intereses, al guardar ese descuento baja las cuotas (o el pago único).
        </p>
      </div>

      {/*
        Acá vivían cinco botones deshabilitados —Aprobar, Editar condiciones,
        Enviar al inquilino, Escalar, Rechazar— con la etiqueta «Próximamente».
        Se quitaron porque no eran una función pendiente: **esto todavía no es
        un acuerdo**. `agreements/propose` calcula un borrador y no persiste
        nada, así que no hay qué aprobar, ni qué rechazar, ni qué enviar. Un
        botón «Aprobar» sobre algo que no existe promete un estado que la base
        no tiene.

        El siguiente paso real es ofrecerlo (POST /cartera/payment-plans/offer,
        que sí crea el plan y su link de pago) y aprobarlo en el detalle del
        plan. Ese botón no se agregó acá todavía: crea un plan vivo y genera un
        link de cobro, y es una decisión de producto, no de cableado.
      */}
      <div className="px-5 py-4 border-t border-border bg-surface-muted">
        <p className="text-xs text-fg-muted leading-relaxed">
          Esto es un <span className="font-medium text-fg">borrador calculado</span>: sirve
          para ver las condiciones antes de comprometerlas. Todavía no existe como acuerdo,
          no se le envió nada al inquilino y no genera cobro. Los acuerdos vivos se aprueban
          uno por uno en{' '}
          <Link href={PLANES_BASE} className="text-primary underline underline-offset-2">
            Pagos › Planes
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

// ── Formulario crear acuerdo ────────────────────────────────────────────────────

/**
 * CB-05: 0 = pago único. Hasta 4: el tope del micro (`installmentCount`); lo que
 * permita la política de la etapa lo dice el micro al guardar, bajo el campo.
 */
const NUM_CUOTAS_OPCIONES = [0, 1, 2, 3, 4]
const NOMBRE_DE_LAS_CUOTAS = (n: number) => (n === 0 ? 'Pago único (sin cuotas)' : n === 1 ? '1 cuota' : `${n} cuotas`)

/** Los campos que el micro puede señalar en un 400 (`campos`). */
type CampoDelAcuerdo = 'initialAmountCop' | 'installmentCount' | 'firstDueDate'

function CrearAcuerdoForm({ onCreada }: { onCreada: () => void }) {
  // CONSISTENCIA (04-10-2026, CR-31): sin plazo fijado no hay deudores en
  // cobranza, y el selector tiene que decir POR QUÉ (no un vacío mudo).
  const plazoSinFijar = usePlazoSinFijar()
  const { formatCurrency } = useI18n()

  // Deudor → fuente real de debtorId + etapa (requeridos por el endpoint). Sólo
  // se ofrecen deudores en etapas con superficie de negociación (S0..S3).
  const { pages: debtors, isLoading: debtorsLoading, refetch: releerDeudores } = useDebtorList()
  const debtoresNegociables = useMemo(
    () => debtors.filter((d) => !NEGOTIATION_UNAVAILABLE_STAGES.has(d.currentStage)),
    [debtors],
  )

  const [debtorId, setDebtorId] = useState<string>('')
  const [totalAdeudado, setTotalAdeudado] = useState<string>('')
  const [intereses, setIntereses] = useState<string>('')
  const [cuotaInicial, setCuotaInicial] = useState<string>('')
  const [numCuotas, setNumCuotas] = useState<string>('0')
  const [primerPago, setPrimerPago] = useState<string>('')
  // CB-05 (QA-PAGOS-95 r2): «Método de pago», «Consecuencia si incumple» y
  // «Notificar al propietario» se quitaron: el acuerdo no tiene dónde
  // guardarlos y nada los leía (el plan se paga con su enlace o un recibo, y al
  // incumplir vuelve a la cobranza). Un control que no se guarda miente.

  // El POST que SÍ persiste la propuesta (status 'offered', pendiente de
  // aprobación). Antes «Guardar» llamaba a propose y nada quedaba en la base.
  const { offer, isSubmitting, error, fallo, notDeployed, reset } = useAgreementOffer()
  // CB-05: lo que el micro frena va BAJO su campo; lo demás, al aviso de abajo.
  const reparto = fallo
    ? repartirErroresDelServidor<CampoDelAcuerdo>(fallo, {
        campos: ['initialAmountCop', 'installmentCount', 'firstDueDate'],
        porDefecto: 'No pudimos guardar la propuesta.',
        accion: 'guardar la propuesta',
      })
    : null
  const errorGeneral = reparto ? (reparto.sueltos.length > 0 ? reparto.sueltos.join(' · ') : null) : error

  // La deuda REAL del deudor: al elegirlo, se autocompleta «Valor total
  // adeudado» con lo que dice la base (kpis.totalOwed). El usuario puede
  // sobreescribirlo; el resto de condiciones las pone él.
  const { data: detalleDeudor } = useDebtorDetail({ debtorId })
  const deudaReal =
    debtorId !== '' && detalleDeudor?.id === debtorId
      ? (detalleDeudor.kpis?.totalOwed ?? null)
      : null

  const total = parseMiles(totalAdeudado) ?? 0
  const interesesNum = parseMiles(intereses) ?? 0
  const inicial = parseMiles(cuotaInicial) ?? 0
  const cuotas = Number(numCuotas) || 0

  const selectedDebtor = useMemo(
    () => debtoresNegociables.find((d) => d.id === debtorId) ?? null,
    [debtoresNegociables, debtorId],
  )

  // Autocompleta el total con la deuda real UNA vez por deudor: si el usuario
  // luego lo edita, no se lo volvemos a pisar (se recuerda el último deudor
  // autocompletado). Cambiar de deudor vuelve a traer su deuda.
  const [autoLlenadoPara, setAutoLlenadoPara] = useState<string | null>(null)
  useEffect(() => {
    if (deudaReal != null && deudaReal > 0 && autoLlenadoPara !== debtorId) {
      setTotalAdeudado(formatMiles(deudaReal))
      setAutoLlenadoPara(debtorId)
    }
  }, [deudaReal, debtorId, autoLlenadoPara])

  const hasPreview = total > 0
  // Con cuotas hacen falta la inicial y la fecha de la primera (lo que se ve es
  // lo que se guarda); sin cuotas, la inicial es el total.
  const faltaLoDeLasCuotas = cuotas > 0 && (inicial <= 0 || primerPago.length < 10)
  // Se puede guardar la propuesta cuando hay deudor + deuda total válida y los
  // intereses no superan el total (regla del motor).
  const canSubmit =
    debtorId !== '' && total > 0 && interesesNum >= 0 && interesesNum <= total && !faltaLoDeLasCuotas

  async function handleSubmit() {
    if (!selectedDebtor || total <= 0) return
    const result = await offer({
      debtorId: selectedDebtor.id,
      stage: selectedDebtor.currentStage,
      totalDueCop: Math.round(total),
      interestsCop: Math.round(interesesNum),
      // CB-05: lo que se ve en la vista previa es lo que se guarda. Sin cuotas
      // no se manda la inicial: el micro pone el total ya descontado.
      installmentCount: cuotas,
      ...(cuotas > 0 ? { initialAmountCop: Math.round(inicial), firstDueDate: primerPago } : {}),
    })
    // Persistió: el plan queda 'offered' (pendiente aprobación). Se cierra el
    // modal y se recarga la lista para que la propuesta aparezca ahí.
    if (result) onCreada()
  }

  // Al editar cualquier condición clave, limpiamos los avisos previos.
  function clearFeedback() {
    if (error || notDeployed) reset()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Columna izquierda — formulario */}
      <form
        className="rounded-lg border border-border bg-card p-5 space-y-5"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-fg">Condiciones del acuerdo</h3>
          <p className="text-sm text-fg-muted">
            Define la estructura del acuerdo. Nada se envía al inquilino hasta que un humano lo apruebe.
          </p>
        </div>

        {/* Deudor — fuente real de debtorId + etapa (requeridos por el motor). */}
        <div className="space-y-1.5">
          <label htmlFor="acuerdo-deudor" className="text-sm font-medium text-fg">
            Deudor
          </label>
          <Select
            value={debtorId}
            onValueChange={(v) => {
              setDebtorId(v)
              clearFeedback()
            }}
            disabled={debtorsLoading || debtoresNegociables.length === 0}
          >
            <SelectTrigger id="acuerdo-deudor" aria-label="Deudor">
              <SelectValue
                placeholder={
                  debtorsLoading
                    ? 'Cargando deudores…'
                    : debtoresNegociables.length === 0
                      ? plazoSinFijar
                        ? 'Sin días de plazo fijados no hay deudores en cobranza'
                        : 'Todavía no hay deudores en Cobranza'
                      : 'Selecciona un deudor'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {debtoresNegociables.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.fullName} · {STAGE_LABELS_ES[d.currentStage]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedDebtor && (
            <p className="text-xs text-fg-muted">
              Etapa actual: {STAGE_LABELS_ES[selectedDebtor.currentStage]}
            </p>
          )}
          {/* COBRANZA-MANUAL (04-10-2026): los deudores salen de la cartera de
              los contratos; si todavía no llegaron, se traen desde aquí. */}
          {!debtorsLoading && debtoresNegociables.length === 0 && !plazoSinFijar && (
            <div className="space-y-2" data-testid="acuerdo-sin-deudores">
              <p className="text-sm text-fg-muted">
                Los deudores salen solos de la cartera de los contratos (quien pasa sus días de plazo sin pagar).
              </p>
              <TraerLaCartera compacto onTraida={() => void releerDeudores()} />
            </div>
          )}
          {!debtorsLoading && debtoresNegociables.length === 0 && plazoSinFijar && (
            <p className="text-sm text-fg-muted" data-testid="acuerdo-sin-plazo">
              Las cuotas vencidas entran a la cobranza cuando la inmobiliaria fija sus días de plazo.{' '}
              <Link href={FIJAR_EL_PLAZO_HREF} className="font-medium text-primary hover:underline">
                Fijar los días de plazo
              </Link>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="acuerdo-total" className="text-sm font-medium text-fg">
              Valor total adeudado
            </label>
            <Input
              id="acuerdo-total"
              type="text"
              inputMode="numeric"
              placeholder="Ej. 2.400.000"
              value={totalAdeudado}
              onChange={(e) => {
                setTotalAdeudado(reformatearMiles(e.target.value))
                clearFeedback()
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="acuerdo-intereses" className="text-sm font-medium text-fg">
              Intereses incluidos
            </label>
            <Input
              id="acuerdo-intereses"
              type="text"
              inputMode="numeric"
              placeholder="Ej. 180.000"
              value={intereses}
              onChange={(e) => {
                setIntereses(reformatearMiles(e.target.value))
                clearFeedback()
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="acuerdo-inicial" className="text-sm font-medium text-fg">
              Cuota inicial
            </label>
            <Input
              id="acuerdo-inicial"
              type="text"
              inputMode="numeric"
              placeholder={cuotas === 0 ? 'Sin cuotas: es el total' : 'Ej. 600.000'}
              value={cuotas === 0 ? (total > 0 ? formatMiles(total) : '') : cuotaInicial}
              disabled={cuotas === 0}
              aria-invalid={reparto?.porCampo.initialAmountCop ? true : undefined}
              aria-describedby={reparto?.porCampo.initialAmountCop ? 'acuerdo-inicial-error' : undefined}
              onChange={(e) => {
                setCuotaInicial(reformatearMiles(e.target.value))
                clearFeedback()
              }}
            />
            <ErrorDelCampo id="acuerdo-inicial-error" mensaje={reparto?.porCampo.initialAmountCop} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="acuerdo-cuotas" className="text-sm font-medium text-fg">
              Número de cuotas
            </label>
            <Select
              value={numCuotas}
              onValueChange={(v) => {
                setNumCuotas(v)
                clearFeedback()
              }}
            >
              <SelectTrigger
                id="acuerdo-cuotas"
                aria-label="Número de cuotas"
                aria-invalid={reparto?.porCampo.installmentCount ? true : undefined}
                aria-describedby={reparto?.porCampo.installmentCount ? 'acuerdo-cuotas-error' : undefined}
              >
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {NUM_CUOTAS_OPCIONES.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {NOMBRE_DE_LAS_CUOTAS(n)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ErrorDelCampo id="acuerdo-cuotas-error" mensaje={reparto?.porCampo.installmentCount} />
          </div>

          {cuotas > 0 && (
            <div className="space-y-1.5">
              <label htmlFor="acuerdo-fecha" className="text-sm font-medium text-fg">
                Fecha de la primera cuota
              </label>
              <CampoDeDia
                id="acuerdo-fecha"
                value={primerPago}
                onChange={(v) => {
                  setPrimerPago(v)
                  clearFeedback()
                }}
                invalido={Boolean(reparto?.porCampo.firstDueDate)}
                describedBy={reparto?.porCampo.firstDueDate ? 'acuerdo-fecha-error' : undefined}
              />
              <ErrorDelCampo id="acuerdo-fecha-error" mensaje={reparto?.porCampo.firstDueDate} />
            </div>
          )}
        </div>

        {faltaLoDeLasCuotas && (
          <p className="text-xs text-fg-muted" data-testid="acuerdo-falta">
            Con cuotas, escribe la cuota inicial y la fecha de la primera cuota.
          </p>
        )}

        {/* Switches */}
        <div className="space-y-3 border-t border-border pt-4">
          {/*
            Esto NO es un interruptor: no hay nada que elegir (T-323, la
            aprobación humana es obligatoria). Y como interruptor mentía: un
            Switch `checked` + `disabled` se pinta GRIS —igual que uno apagado—
            mientras el de al lado, encendido y habilitado, se pinta azul. Medido
            en pantalla: gris rgb(213,209,202) vs azul rgb(26,64,255), ambos con
            aria-checked="true". Justo en el control de seguridad de la pantalla,
            leerlo como «apagado» es el peor error posible.
          */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-medium text-fg">Requiere aprobación humana</p>
              <p className="text-xs text-fg-muted">
                Ningún acuerdo se activa sin la aprobación explícita de una persona.
              </p>
            </div>
            <Badge variant="success" className="shrink-0 mt-0.5">
              <Lock className="w-3 h-3" weight="fill" aria-hidden="true" />
              Siempre
            </Badge>
          </div>

        </div>

        {/* Aviso T-323 */}
        <div className="flex items-start gap-2 rounded-lg bg-primary-soft p-3">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" weight="duotone" aria-hidden="true" />
          <p className="text-xs text-primary leading-relaxed">
            Al guardar, el acuerdo queda como propuesta en estado &quot;Pendiente aprobación&quot;.
            Un humano debe aprobarlo antes de enviarlo al inquilino.
          </p>
        </div>

        {/* Aviso suave si el backend aún no está desplegado (404). Form intacto. */}
        <Presence
            show={notDeployed}
            role="status"
            className="flex items-start gap-2 rounded-lg bg-surface-muted p-3 ring-1 ring-border"
          >
            <Info className="w-4 h-4 text-fg-muted shrink-0 mt-0.5" weight="duotone" aria-hidden="true" />
            <p className="text-xs text-fg-muted leading-relaxed">
              La creación de propuestas estará disponible muy pronto. Por ahora puedes
              armar las condiciones; el envío quedó guardado para cuando se habilite.
            </p>
        </Presence>

        {/* Error de validación / permiso / red: entra y sale con `Presence`. */}
        <Presence
            show={Boolean(errorGeneral)}
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-danger-soft p-3 ring-1 ring-danger/30"
          >
            <Warning className="w-4 h-4 text-danger shrink-0 mt-0.5" weight="fill" aria-hidden="true" />
            <p className="text-xs text-danger leading-relaxed">{errorGeneral}</p>
        </Presence>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          {/* Único primary CTA de la sección (contrato §2). */}
          <Button
            type="button"
            hideArrow
            isLoading={isSubmitting}
            disabled={!canSubmit || isSubmitting}
            onClick={() => void handleSubmit()}
          >
            Guardar como propuesta
          </Button>
        </div>
      </form>

      {/* Columna derecha — vista previa local mientras se arma el acuerdo. */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-fg">Vista previa</h3>
        {/* «Completa las condiciones» ⇄ la vista previa: la una sale y la otra
            entra al llenar (o vaciar) lo que falta. */}
        <CrossFade swapKey={hasPreview ? 'vista-previa' : 'faltan-datos'}>
        {hasPreview ? (
          <AcuerdoPropuestoCard
            totalAdeudado={total}
            cuotaInicial={inicial}
            numCuotas={cuotas}
            primerPago={primerPago}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-surface-muted p-8 text-center">
            <FileText className="w-8 h-8 mx-auto text-fg-muted mb-3" weight="duotone" aria-hidden="true" />
            <p className="text-sm font-medium text-fg">Completa las condiciones</p>
            <p className="text-xs text-fg-muted mt-1 max-w-xs mx-auto">
              Selecciona un deudor e ingresa el valor adeudado para crear la propuesta.
            </p>
          </div>
        )}
        </CrossFade>
      </div>
    </div>
  )
}

// ── Sección lista de acuerdos ───────────────────────────────────────────────────

function AcuerdosLista() {
  const { formatCurrency } = useI18n()
  // Acuerdos activos/pendientes = planes de pago pendientes de aprobación
  // (rows con paymentPlanId). Reusa la fuente real del funnel de pagos.
  const { rows, kpis, isLoading, error, refetch } = usePaymentsFunnel({
    status: 'pending',
    sort: 'created_at',
  })

  const acuerdos = useMemo(
    () => rows.filter((r) => r.paymentPlanId != null),
    [rows],
  )

  if (isLoading && rows.length === 0 && !error) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="md" />
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-fg">Acuerdos activos y pendientes</h2>
          <p className="text-sm text-fg-muted">
            Planes de pago en curso o esperando aprobación.
          </p>
        </div>
        <Button asChild variant="link" size="sm" hideArrow className="shrink-0 px-0">
          <Link href={`${BASE}/pagos`}>Ver todos los pagos</Link>
        </Button>
      </div>

      {/* Resumen — conteo + monto pendiente (datos reales del funnel) */}
      {kpis && acuerdos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
              Pendientes de aprobación
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-fg">
              {acuerdos.length}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
              Recaudado (período)
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-fg">
              {copFormat(kpis.totalRecaudadoCop, formatCurrency)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
              Aprobados (período)
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-fg">
              {kpis.approvedCount}
            </p>
          </div>
        </div>
      )}

      {/* Error parcial — solo si nada rindió */}
      {error && acuerdos.length === 0 && (
        <div
          role="alert"
          className="rounded-lg bg-danger-soft border border-danger/30 p-3 text-sm text-danger flex items-center justify-between gap-3"
        >
          <span className="flex items-center gap-2 min-w-0">
            <Warning className="w-4 h-4 shrink-0" weight="fill" aria-hidden="true" />
            <span className="truncate">No se pudieron cargar los acuerdos: {error}</span>
          </span>
          <Button variant="outline" size="sm" hideArrow onClick={() => void refetch()} className="shrink-0">
            Reintentar
          </Button>
        </div>
      )}

      {/* Lista o empty state */}
      {acuerdos.length > 0 ? (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3" aria-label="Acuerdos activos y pendientes">
          {acuerdos.map((row) => (
            <AcuerdoListaCard key={row.id} row={row} />
          ))}
        </ul>
      ) : (
        !error && (
          <EmptyState
            icon={Handshake}
            title="Sin acuerdos pendientes"
            description="Cuando un inquilino acepte un plan de pago, aparecerá aquí esperando tu aprobación. También puedes proponer uno nuevo abajo."
            primaryCta={{
              label: 'Ver deudores',
              href: `${BASE}/deudores`,
            }}
          />
        )
      )}
    </section>
  )
}

// ── Página ───────────────────────────────────────────────────────────────────

function AcuerdosContent() {
  // Disponibilidad del flujo de aprobación real (gate de cobranza por permiso).
  const { canAccess } = usePermissionsContext()
  const canApprove = canAccess('cobranza', 'approve')

  const [filtro, setFiltro] = useState<AcuerdoFiltro>('todos')
  const [crearAbierto, setCrearAbierto] = useState(false)
  const [detalle, setDetalle] = useState<AcuerdoRow | null>(null)

  // Los DOS orígenes del mismo concepto. Ver `acuerdo-vocab.ts`.
  const {
    promises,
    isLoading: cargandoPromesas,
    error: errorPromesas,
    refetch: recargarPromesas,
  } = usePromises({ limit: 200 })
  // 🔴 QA-IA-B (04-10-2026): los planes salen de la lista REAL de planes de
  // pago. Antes salían del embudo de pagos (sólo filas de `agent.payments`), y
  // un plan sin pagos —todos los recién ofrecidos— no aparecía nunca.
  const {
    planes,
    isLoading: cargandoPlanes,
    error: errorPlanes,
    refetch: recargarPlanes,
  } = usePaymentPlans()

  const acuerdos = useMemo(
    () => componerAcuerdos(promises, planes),
    [promises, planes],
  )

  const cargando = cargandoPromesas || cargandoPlanes
  // Un origen caído no puede tapar lo que el otro sí trajo.
  const error = errorPromesas ?? errorPlanes ?? null

  const recargar = useCallback(() => {
    void recargarPromesas()
    void recargarPlanes()
  }, [recargarPromesas, recargarPlanes])

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-h2 text-fg">
            Acuerdos de pago
          </h1>
          <p className="text-sm text-fg-muted max-w-2xl line-clamp-2">
            Lo que cada deudor se comprometió a pagar: los compromisos que el
            agente toma en una llamada y los planes de cuotas que armes acá.
            Ningún plan se activa sin que una persona lo apruebe.
          </p>
        </div>
        <Button
          hideArrow
          onClick={() => setCrearAbierto(true)}
          className="shrink-0"
          data-testid="acuerdo-nuevo"
        >
          Nuevo acuerdo
        </Button>
      </header>

      {/* Aviso si el usuario no puede aprobar (la aprobación vive en el detalle real) */}
      {!canApprove && (
        <div className="flex items-start gap-2 rounded-lg bg-surface-muted p-3 ring-1 ring-border">
          <Info className="w-4 h-4 text-fg-muted shrink-0 mt-0.5" weight="duotone" aria-hidden="true" />
          <p className="text-xs text-fg-muted leading-relaxed">
            Puedes proponer acuerdos, pero la aprobación final requiere permiso de cobranza.
            Un compañero con permiso podrá aprobarlos desde el detalle del plan.
          </p>
        </div>
      )}

      {/* Dos cosas distintas, en este orden a propósito:
          1. Los LÍMITES — el techo que el agente no puede pasar nunca.
          2. Los ACUERDOS GENERALES — las reglas que la inmobiliaria escribe y
             que el agente cierra solo, siempre recortadas por (1).
          Antes las dos se llamaban «acuerdo general» y (2) ni existía. */}
      <AcuerdosGeneralesCard />
      <AcuerdosGeneralesTabla />

      {/* Cargando → la tabla: entra con su fundido. */}
      <CrossFade swapKey={cargando && acuerdos.length === 0 && !error ? 'cargando' : 'tabla'}>
      {cargando && acuerdos.length === 0 && !error ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="md" />
        </div>
      ) : (
        <AcuerdosTabla
          acuerdos={acuerdos}
          filtro={filtro}
          onFiltro={setFiltro}
          onAbrir={setDetalle}
          error={error}
          onReintentar={recargar}
        />
      )}
      </CrossFade>

      <AcuerdoDetalleSheet acuerdo={detalle} onClose={() => setDetalle(null)} />

      {/* Crear — en modal: la pantalla es para MIRAR los acuerdos; armar uno es
          una tarea puntual que no tiene por qué ocupar media pantalla siempre. */}
      <Dialog open={crearAbierto} onOpenChange={setCrearAbierto}>
        <DialogContent size="xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Nuevo acuerdo de pago</DialogTitle>
          </DialogHeader>
          <CrearAcuerdoForm
            onCreada={() => {
              setCrearAbierto(false)
              recargar()
            }}
          />

          {/* Acá vivía un enlace a Configuración §Negociación para «crear un
              acuerdo general». Se sacó: armar el marco de los acuerdos no es un
              ajuste del sistema, y mandaba fuera de Acuerdos justo cuando el
              usuario estaba armando uno. Ahora se hace en la sección «Acuerdos
              generales» de esta misma pantalla, con su propia tabla y su nivel
              interno de navegación (`acuerdos/generales/nuevo`).

              El ancla `#heading-negociacion` que apuntaba ya ni existía: esa
              sección de Configuración se desarmó en `fcc3ec92`. */}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AcuerdosPage() {
  return (
    <PageGuard module="cobranza">
      <AcuerdosContent />
    </PageGuard>
  )
}
