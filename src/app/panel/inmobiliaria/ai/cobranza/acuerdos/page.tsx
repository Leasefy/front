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

import { useCallback, useMemo, useState } from 'react'
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
  Switch,
  Spinner,
  Badge,
} from '@/components/ui'
import {
  usePaymentsFunnel,
  type PaymentsFunnelItem,
} from '@/lib/hooks/cobranza/use-payments-funnel'
import { useDebtorList } from '@/lib/hooks/cobranza/use-debtor-list'
import {
  useAgreementPropose,
  type AgreementProposalDraft,
  type CarteraStage,
} from '@/lib/hooks/cobranza/use-agreement-propose'
import { usePromises } from '@/lib/hooks/cobranza/use-promises'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@leasefy/cadence'
import {
  AcuerdosTabla,
  type AcuerdoFiltro,
} from '@/components/inmobiliaria/cobranza/AcuerdosTabla'
import {
  componerAcuerdos,
  type AcuerdoRow,
} from '@/lib/cobranza/acuerdo-vocab'
import { AcuerdoDetalleSheet } from '@/components/inmobiliaria/cobranza/AcuerdoDetalleSheet'

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

const BASE = '/panel/inmobiliaria/ai/cobranza'
const PLANES_BASE = '/panel/inmobiliaria/ai/cobranza/pagos/planes'

// ── Helpers ───────────────────────────────────────────────────────────────────

function copFormat(value: number | null | undefined, formatCurrency: (n: number | null | undefined) => string): string {
  return formatCurrency(value ?? 0)
}

/** Reparte un saldo en N cuotas enteras (la primera absorbe el residuo). */
function cuotaMonto(saldo: number, n: number): number {
  if (n <= 0) return 0
  return Math.round(saldo / n)
}

// ── Card de acuerdo de la lista (cross-link al detalle real) ────────────────────

function AcuerdoListaCard({ row }: { row: PaymentsFunnelItem }) {
  const { formatCurrency, formatDate } = useI18n()
  const planId = row.paymentPlanId
  const href = planId ? `${PLANES_BASE}/${planId}` : null

  return (
    <li className="rounded-xl border border-border bg-card p-4 space-y-3">
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
        {href ? (
          <Button asChild size="sm" hideArrow>
            <Link href={href}>
              Revisar y aprobar
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <Button size="sm" variant="outline" hideArrow disabled title="Próximamente">
            Próximamente
          </Button>
        )}
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
  consecuencia,
}: {
  totalAdeudado: number
  cuotaInicial: number
  numCuotas: number
  primerPago: string
  consecuencia: string
}) {
  const { formatCurrency, formatDate } = useI18n()
  const saldo = Math.max(0, totalAdeudado - cuotaInicial)
  const valorCuota = cuotaMonto(saldo, numCuotas)

  const fechaLabel = useMemo(() => {
    if (!primerPago || primerPago.length < 10) return '—'
    const d = new Date(`${primerPago}T00:00:00`)
    return formatDate(d, { day: 'numeric', month: 'short', year: 'numeric' })
  }, [primerPago, formatDate])

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Cabecera con estado */}
      <div className="flex items-center justify-between gap-2 px-5 py-3 bg-surface-muted border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
            <Handshake className="w-4 h-4 text-primary" weight="duotone" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">Acuerdo propuesto</p>
            <p className="text-xs text-fg-muted">Vista previa — ejemplo</p>
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
          <dt className="text-xs text-fg-muted">Pago inicial</dt>
          <dd className="text-sm font-semibold tabular-nums text-success">
            {copFormat(cuotaInicial, formatCurrency)}
          </dd>
        </div>
        <div className="bg-card p-4 space-y-0.5">
          <dt className="text-xs text-fg-muted">Saldo en {numCuotas} cuotas</dt>
          <dd className="text-sm font-semibold tabular-nums text-fg">
            {copFormat(saldo, formatCurrency)}
          </dd>
        </div>
        <div className="bg-card p-4 space-y-0.5">
          <dt className="text-xs text-fg-muted">Valor por cuota</dt>
          <dd className="text-sm font-semibold tabular-nums text-fg">
            {copFormat(valorCuota, formatCurrency)}
          </dd>
        </div>
      </dl>

      {/* Fechas + consecuencia */}
      <div className="px-5 py-4 space-y-2 border-t border-border">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-fg-muted">Primer pago:</span>
          <span className="font-medium text-fg">{fechaLabel}</span>
        </div>
        {consecuencia && (
          <div className="flex items-start gap-2 text-sm">
            <Warning className="w-4 h-4 text-warning shrink-0 mt-0.5" weight="duotone" aria-hidden="true" />
            <span className="text-fg-muted">
              <span className="font-medium text-fg">Si incumple:</span> {consecuencia}
            </span>
          </div>
        )}
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

const METODOS_PAGO = [
  { value: 'wompi', label: 'Link de pago (Wompi)' },
  { value: 'pse', label: 'PSE' },
  { value: 'transferencia', label: 'Transferencia bancaria' },
  { value: 'efectivo', label: 'Efectivo / ventanilla' },
]

const CONSECUENCIAS = [
  { value: 'reactivar_cobranza', label: 'Reactivar gestión de cobranza' },
  { value: 'reportar_centrales', label: 'Reporte a centrales de riesgo' },
  { value: 'escalar_prejuridico', label: 'Escalar a etapa prejurídica' },
  { value: 'activar_siniestro', label: 'Activar siniestro de la póliza' },
]

const NUM_CUOTAS_OPCIONES = [2, 3, 4, 6, 9, 12]

function CrearAcuerdoForm() {
  const { formatCurrency } = useI18n()

  // Deudor → fuente real de debtorId + etapa (requeridos por el endpoint). Sólo
  // se ofrecen deudores en etapas con superficie de negociación (S0..S3).
  const { pages: debtors, isLoading: debtorsLoading } = useDebtorList()
  const debtoresNegociables = useMemo(
    () => debtors.filter((d) => !NEGOTIATION_UNAVAILABLE_STAGES.has(d.currentStage)),
    [debtors],
  )

  const [debtorId, setDebtorId] = useState<string>('')
  const [totalAdeudado, setTotalAdeudado] = useState<string>('')
  const [intereses, setIntereses] = useState<string>('')
  const [cuotaInicial, setCuotaInicial] = useState<string>('')
  const [numCuotas, setNumCuotas] = useState<string>('3')
  const [primerPago, setPrimerPago] = useState<string>('')
  const [metodoPago, setMetodoPago] = useState<string>('wompi')
  const [consecuencia, setConsecuencia] = useState<string>('reactivar_cobranza')
  // T-323: un acuerdo SIEMPRE requiere aprobación humana. No es un ajuste, es
  // una invariante — por eso se enuncia, no se ofrece como interruptor.
  const [notificarPropietario, setNotificarPropietario] = useState<boolean>(true)

  // POST de la propuesta + borrador devuelto por el motor de planes.
  const { propose, isSubmitting, error, notDeployed, reset } = useAgreementPropose()
  const [draft, setDraft] = useState<AgreementProposalDraft | null>(null)

  const total = Number(totalAdeudado) || 0
  const interesesNum = Number(intereses) || 0
  const inicial = Number(cuotaInicial) || 0
  const cuotas = Number(numCuotas) || 0

  const consecuenciaLabel =
    CONSECUENCIAS.find((c) => c.value === consecuencia)?.label ?? ''

  const selectedDebtor = useMemo(
    () => debtoresNegociables.find((d) => d.id === debtorId) ?? null,
    [debtoresNegociables, debtorId],
  )

  const hasPreview = total > 0 && cuotas > 0
  // Se puede guardar la propuesta cuando hay deudor + deuda total válida y los
  // intereses no superan el total (regla del motor).
  const canSubmit =
    debtorId !== '' && total > 0 && interesesNum >= 0 && interesesNum <= total

  async function handleSubmit() {
    if (!selectedDebtor || total <= 0) return
    setDraft(null)
    const result = await propose({
      debtorId: selectedDebtor.id,
      stage: selectedDebtor.currentStage,
      totalDueCop: Math.round(total),
      interestsCop: Math.round(interesesNum),
    })
    if (result) setDraft(result)
  }

  // Al editar cualquier condición clave, limpiamos el resultado/avisos previos.
  function clearFeedback() {
    if (draft) setDraft(null)
    if (error || notDeployed) reset()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Columna izquierda — formulario */}
      <form
        className="rounded-xl border border-border bg-card p-5 space-y-5"
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
                      ? 'No hay deudores con acuerdo disponible'
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="acuerdo-total" className="text-sm font-medium text-fg">
              Valor total adeudado
            </label>
            <Input
              id="acuerdo-total"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Ej. 2.400.000"
              value={totalAdeudado}
              onChange={(e) => {
                setTotalAdeudado(e.target.value)
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
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Ej. 180.000"
              value={intereses}
              onChange={(e) => {
                setIntereses(e.target.value)
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
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Ej. 600.000"
              value={cuotaInicial}
              onChange={(e) => setCuotaInicial(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="acuerdo-cuotas" className="text-sm font-medium text-fg">
              Número de cuotas
            </label>
            <Select value={numCuotas} onValueChange={setNumCuotas}>
              <SelectTrigger id="acuerdo-cuotas" aria-label="Número de cuotas">
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {NUM_CUOTAS_OPCIONES.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} cuotas
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="acuerdo-fecha" className="text-sm font-medium text-fg">
              Fecha del primer pago
            </label>
            <Input
              id="acuerdo-fecha"
              type="date"
              value={primerPago}
              onChange={(e) => setPrimerPago(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="acuerdo-metodo" className="text-sm font-medium text-fg">
              Método de pago
            </label>
            <Select value={metodoPago} onValueChange={setMetodoPago}>
              <SelectTrigger id="acuerdo-metodo" aria-label="Método de pago">
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {METODOS_PAGO.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="acuerdo-consecuencia" className="text-sm font-medium text-fg">
              Consecuencia si incumple
            </label>
            <Select value={consecuencia} onValueChange={setConsecuencia}>
              <SelectTrigger id="acuerdo-consecuencia" aria-label="Consecuencia si incumple">
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {CONSECUENCIAS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

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

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-medium text-fg">Notificar al propietario</p>
              <p className="text-xs text-fg-muted">
                Enviar un resumen del acuerdo al propietario del inmueble cuando se apruebe.
              </p>
            </div>
            <Switch
              checked={notificarPropietario}
              onCheckedChange={setNotificarPropietario}
              aria-label="Notificar al propietario"
              className="shrink-0 mt-0.5"
            />
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
        {notDeployed && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-lg bg-surface-muted p-3 ring-1 ring-border"
          >
            <Info className="w-4 h-4 text-fg-muted shrink-0 mt-0.5" weight="duotone" aria-hidden="true" />
            <p className="text-xs text-fg-muted leading-relaxed">
              La creación de propuestas estará disponible muy pronto. Por ahora puedes
              armar las condiciones; el envío quedó guardado para cuando se habilite.
            </p>
          </div>
        )}

        {/* Error de validación / permiso / red. */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-danger-soft p-3 ring-1 ring-danger/30"
          >
            <Warning className="w-4 h-4 text-danger shrink-0 mt-0.5" weight="fill" aria-hidden="true" />
            <p className="text-xs text-danger leading-relaxed">{error}</p>
          </div>
        )}

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

      {/* Columna derecha — borrador real (tras guardar) o vista previa local */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-fg">
          {draft ? 'Propuesta guardada' : 'Vista previa'}
        </h3>
        {draft ? (
          <DraftGuardadoCard draft={draft} />
        ) : hasPreview ? (
          <AcuerdoPropuestoCard
            totalAdeudado={total}
            cuotaInicial={inicial}
            numCuotas={cuotas}
            primerPago={primerPago}
            consecuencia={consecuenciaLabel}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-surface-muted p-8 text-center">
            <FileText className="w-8 h-8 mx-auto text-fg-muted mb-3" weight="duotone" aria-hidden="true" />
            <p className="text-sm font-medium text-fg">Completa las condiciones</p>
            <p className="text-xs text-fg-muted mt-1 max-w-xs mx-auto">
              Selecciona un deudor e ingresa el valor adeudado para crear la propuesta.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Card de borrador guardado (resultado real del motor de planes) ──────────────

function DraftGuardadoCard({ draft }: { draft: AgreementProposalDraft }) {
  const { formatCurrency, formatDate } = useI18n()

  const discountLabel =
    draft.discountKind === 'intereses_total'
      ? 'Condonación total de intereses'
      : draft.discountKind === 'intereses_parcial'
        ? 'Condonación parcial de intereses'
        : 'Sin descuento'

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Cabecera de éxito */}
      <div className="flex items-center justify-between gap-2 px-5 py-3 bg-success-soft border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-card flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4 text-success" weight="duotone" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">Propuesta creada</p>
            <p className="text-xs text-fg-muted">Pendiente de aprobación humana</p>
          </div>
        </div>
        <Badge variant="warning" className="shrink-0">
          <Clock className="w-3 h-3" aria-hidden="true" />
          Pendiente aprobación
        </Badge>
      </div>

      {/* Desglose calculado por el motor */}
      <dl className="grid grid-cols-2 gap-px bg-border">
        <div className="bg-card p-4 space-y-0.5">
          <dt className="text-xs text-fg-muted">Total efectivo</dt>
          <dd className="text-sm font-semibold tabular-nums text-fg">
            {copFormat(draft.effectiveTotalCop, formatCurrency)}
          </dd>
        </div>
        <div className="bg-card p-4 space-y-0.5">
          <dt className="text-xs text-fg-muted">Pago inicial</dt>
          <dd className="text-sm font-semibold tabular-nums text-success">
            {copFormat(draft.initialAmountCop, formatCurrency)}
          </dd>
        </div>
        <div className="bg-card p-4 space-y-0.5">
          <dt className="text-xs text-fg-muted">Descuento aplicado</dt>
          <dd className="text-sm font-semibold tabular-nums text-fg">
            {draft.discountAppliedPct}%
          </dd>
        </div>
        <div className="bg-card p-4 space-y-0.5">
          <dt className="text-xs text-fg-muted">Ahorro</dt>
          <dd className="text-sm font-semibold tabular-nums text-fg">
            {copFormat(draft.discountAmountCop, formatCurrency)}
          </dd>
        </div>
      </dl>

      {/* Tipo de descuento + cuotas calculadas */}
      <div className="px-5 py-4 space-y-3 border-t border-border">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-fg-muted">Descuento:</span>
          <span className="font-medium text-fg">{discountLabel}</span>
        </div>
        {draft.installments.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
              Plan de cuotas
            </p>
            <ul className="space-y-1">
              {draft.installments.map((cuota) => (
                <li
                  key={cuota.number}
                  className="flex items-center justify-between text-sm border-b border-border last:border-0 py-1"
                >
                  <span className="text-fg-muted">
                    Cuota {cuota.number} ·{' '}
                    {formatDate(new Date(cuota.dueDate), {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="font-medium tabular-nums text-fg">
                    {copFormat(cuota.amountCop, formatCurrency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Cross-link a la aprobación real (T-323: aquí NO se aprueba ni activa). */}
      <div className="flex items-start gap-2 px-5 py-4 border-t border-border bg-surface-muted">
        <Info className="w-4 h-4 text-fg-muted shrink-0 mt-0.5" weight="duotone" aria-hidden="true" />
        <p className="text-xs text-fg-muted leading-relaxed">
          La propuesta quedó pendiente de aprobación. La aprobación final se realiza desde el{' '}
          <Link
            href={`${BASE}/pagos`}
            className="text-primary underline-offset-4 hover:underline font-medium"
          >
            detalle del plan de pago
          </Link>
          , donde un humano la revisa y la activa.
        </p>
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
          className="rounded-xl bg-danger-soft border border-danger/30 p-3 text-sm text-danger flex items-center justify-between gap-3"
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
  const {
    rows,
    isLoading: cargandoPlanes,
    error: errorPlanes,
    refetch: recargarPlanes,
  } = usePaymentsFunnel({ status: 'pending', sort: 'created_at' })

  const planes = useMemo(() => rows.filter((r) => r.paymentPlanId != null), [rows])
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
    <main className="p-6 lg:p-8 space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Acuerdos de pago
          </h1>
          <p className="text-sm text-fg-muted max-w-2xl">
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

      <AcuerdoDetalleSheet acuerdo={detalle} onClose={() => setDetalle(null)} />

      {/* Crear — en modal: la pantalla es para MIRAR los acuerdos; armar uno es
          una tarea puntual que no tiene por qué ocupar media pantalla siempre. */}
      <Dialog open={crearAbierto} onOpenChange={setCrearAbierto}>
        <DialogContent className="md:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Nuevo acuerdo de pago</DialogTitle>
          </DialogHeader>
          <div
            data-lenis-prevent
            className="max-h-[75vh] overflow-y-auto pr-1"
          >
            <CrearAcuerdoForm />
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}

export default function AcuerdosPage() {
  return (
    <PageGuard module="cobranza">
      <AcuerdosContent />
    </PageGuard>
  )
}
