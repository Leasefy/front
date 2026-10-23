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
 *  (2) CREAR ACUERDO — en el cajón de la casa (ronda 26): los campos y, debajo,
 *      la vista previa; «Guardar como propuesta» la deja «Por aprobar».
 *
 * T-323 (caso más sensible): un acuerdo SIEMPRE requiere aprobación humana
 * explícita. Se dice UNA vez, junto al botón del cajón (revisora r25).
 * Nunca se auto-aprueba ni se presiona al inquilino.
 *
 * Estilo: contrato UI-DS-CONTRACT-2026-06-16 — <Button>/<Card>/<Input>/
 * <Select>/<Switch> del DS, cero hex inline, un solo primary CTA por sección,
 * tokens semánticos (primary/success/warning/danger + *-soft, fg/fg-muted,
 * bg-card/surface-muted, border-border).
 */

import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { FileText, Info, Lock, Warning } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from '@/components/ui'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import { cuotasDelAcuerdo, errorDeLaCuotaInicial } from '@/lib/cobranza/cuotas-del-acuerdo'
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
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { MasDetalles } from '@/components/pantalla/MasDetalles'
import { stageDisplayName } from '@/lib/cartera'
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
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { ACUERDO_ESTADO } from '@/lib/cobranza/acuerdo-vocab'

// Etapas donde NO hay superficie de negociación (espejo del backend:
// agency-cobranza-promises.ts NEGOTIATION_UNAVAILABLE_STAGES). En esas etapas el
// motor de planes no propone acuerdo → el deudor no es seleccionable aquí.
const NEGOTIATION_UNAVAILABLE_STAGES = new Set<string>(['S4', 'S5', 'SX'])

// Revisora r25 (Acuerdos, UI): el nombre de la etapa es el de toda la casa
// (`stageDisplayName`); aquí había otro diccionario («Cartera fresca», «Skip / Abandono»).
const nombreDeLaEtapa = (s: CarteraStage) => stageDisplayName(s, 'es')

// ── Helpers ───────────────────────────────────────────────────────────────────

function copFormat(value: number | null | undefined, formatCurrency: (n: number | null | undefined) => string): string {
  return formatCurrency(value ?? 0)
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
        <div className="min-w-0">
          <p className="text-body-sm font-medium text-fg">Acuerdo propuesto</p>
          <p className="text-caption text-fg-muted">Lo que se va a guardar</p>
        </div>
        <Badge variant="warning" className="shrink-0">
          Por aprobar
        </Badge>
      </div>

      {/* Desglose de condiciones */}
      {/* 2 × 2: la vista previa es media columna del diálogo; en 4 columnas
          «$ 4.200.000» se cortaba («$ 4.200.00»). */}
      <dl className="grid grid-cols-2 gap-px bg-border">
        <div className="bg-card p-4 space-y-0.5">
          <dt className="text-caption text-fg-muted">Deuda total</dt>
          <dd className="font-mono text-body-sm tabular-nums text-fg">
            {copFormat(totalAdeudado, formatCurrency)}
          </dd>
        </div>
        <div className="bg-card p-4 space-y-0.5">
          <dt className="text-caption text-fg-muted">{numCuotas === 0 ? 'Pago único' : 'Pago inicial'}</dt>
          <dd className="font-mono text-body-sm tabular-nums text-success" data-testid="vista-inicial">
            {copFormat(inicial, formatCurrency)}
          </dd>
        </div>
        <div className="bg-card p-4 space-y-0.5">
          <dt className="text-caption text-fg-muted">
            {numCuotas === 0 ? 'Sin cuotas' : `Saldo en ${numCuotas} ${numCuotas === 1 ? 'cuota' : 'cuotas'}`}
          </dt>
          <dd className="font-mono text-body-sm tabular-nums text-fg">
            {copFormat(saldo, formatCurrency)}
          </dd>
        </div>
        <div className="bg-card p-4 space-y-0.5">
          <dt className="text-caption text-fg-muted">Valor por cuota</dt>
          <dd className="font-mono text-body-sm tabular-nums text-fg">
            {numCuotas === 0 ? '—' : copFormat(valorCuota, formatCurrency)}
          </dd>
        </div>
      </dl>

      {/* Las cuotas con su fecha (CB-05) y qué pasa si incumple (lo que hace el sistema, no un selector). */}
      <div className="px-5 py-4 space-y-2 border-t border-border">
        {cuotas.length > 0 ? (
          <ul className="space-y-1 text-body-sm" data-testid="vista-cuotas">
            {cuotas.map((c) => (
              <li key={c.numero} className="flex items-center justify-between gap-3">
                <span className="text-fg-muted">
                  Cuota {c.numero} · {fechaEnPalabras(c.vence)}
                </span>
                <span className="font-mono tabular-nums text-fg">{copFormat(c.valor, formatCurrency)}</span>
              </li>
            ))}
          </ul>
        ) : numCuotas > 0 ? (
          <p className="text-body-sm text-fg-muted">La cuota inicial ya cubre toda la deuda: no queda nada para las cuotas.</p>
        ) : (
          <p className="text-body-sm text-fg-muted">Pago único: se paga entero con el enlace de pago.</p>
        )}
        <div className="flex items-start gap-2 text-body-sm">
          <Warning className="w-4 h-4 text-warning shrink-0 mt-0.5" weight="duotone" aria-hidden="true" />
          <span className="text-fg-muted">
            <span className="font-medium text-fg">Si incumple:</span> el acuerdo queda incumplido y la deuda vuelve a la cobranza.
          </span>
        </div>
        <p className="text-caption text-fg-muted leading-relaxed">
          Si la etapa tiene un acuerdo general con descuento sobre intereses, al guardar ese descuento baja las cuotas (o el pago único).
        </p>
      </div>

      {/* Revisora r25 (bloqueante): aquí iba un pie que repetía por quinta vez que el acuerdo espera aprobación y
          enlazaba a «Pagos › Planes», una ruta sin página (404). La aprobación se dice una vez, junto al botón. */}
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

function CrearAcuerdoForm({ onCreada, onCancelar }: { onCreada: () => void; onCancelar: () => void }) {
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
  const inicialQueNoCabe = errorDeLaCuotaInicial({ inicial, total, cuotas, plata: (n) => copFormat(n, formatCurrency) })
  // Se puede guardar la propuesta cuando hay deudor + deuda total válida y los
  // intereses no superan el total (regla del motor).
  const canSubmit =
    debtorId !== '' && total > 0 && interesesNum >= 0 && interesesNum <= total && !faltaLoDeLasCuotas && !inicialQueNoCabe

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

  // Revisora r25 (Acuerdos #3): era un modal `xl` de dos columnas, 3+ pantallas
  // de alto a 390. Ahora es el cajón de la casa: los campos y, debajo, la vista
  // previa en una sola columna; el botón, fijo en el pie. El `<form>` va con
  // `contents` para que cuerpo y pie sigan siendo hijos directos del cajón.
  return (
    <form
      className="contents"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSubmit && !isSubmitting) void handleSubmit()
      }}
    >
      <CajonCuerpo className="space-y-5">

        {/* Deudor — fuente real de debtorId + etapa (requeridos por el motor). */}
        <div className="space-y-1.5">
          <label htmlFor="acuerdo-deudor" className="text-body-sm font-medium text-fg">
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
                  {d.fullName} · {nombreDeLaEtapa(d.currentStage)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedDebtor && (
            <p className="text-caption text-fg-muted">
              Etapa actual: {nombreDeLaEtapa(selectedDebtor.currentStage)}
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
            <label htmlFor="acuerdo-total" className="text-body-sm font-medium text-fg">
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
            <label htmlFor="acuerdo-intereses" className="text-body-sm font-medium text-fg">
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
            <label htmlFor="acuerdo-inicial" className="text-body-sm font-medium text-fg">
              Cuota inicial
            </label>
            <Input
              id="acuerdo-inicial"
              type="text"
              inputMode="numeric"
              placeholder={cuotas === 0 ? 'Sin cuotas: es el total' : 'Ej. 600.000'}
              value={cuotas === 0 ? (total > 0 ? formatMiles(total) : '') : cuotaInicial}
              disabled={cuotas === 0}
              aria-invalid={reparto?.porCampo.initialAmountCop || inicialQueNoCabe ? true : undefined}
              aria-describedby={reparto?.porCampo.initialAmountCop || inicialQueNoCabe ? 'acuerdo-inicial-error' : undefined}
              onChange={(e) => {
                setCuotaInicial(reformatearMiles(e.target.value))
                clearFeedback()
              }}
            />
            <ErrorDelCampo id="acuerdo-inicial-error" mensaje={reparto?.porCampo.initialAmountCop ?? inicialQueNoCabe ?? undefined} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="acuerdo-cuotas" className="text-body-sm font-medium text-fg">
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
              <label htmlFor="acuerdo-fecha" className="text-body-sm font-medium text-fg">
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
          <p className="text-caption text-fg-muted" data-testid="acuerdo-falta">
            Con cuotas, escribe la cuota inicial y la fecha de la primera cuota.
          </p>
        )}

        {/* Aviso suave si el backend aún no está desplegado (404). Form intacto. */}
        <Presence
            show={notDeployed}
            role="status"
            className="flex items-start gap-2 rounded-lg bg-surface-muted p-3 ring-1 ring-border"
          >
            <Info className="w-4 h-4 text-fg-muted shrink-0 mt-0.5" weight="duotone" aria-hidden="true" />
            <p className="text-caption text-fg-muted leading-relaxed">
              No se guardó: el asistente de Leasefy todavía no tiene esta función. Lo que
              escribiste sigue aquí.
            </p>
        </Presence>

        {/* Error de validación / permiso / red: entra y sale con `Presence`. */}
        <Presence
            show={Boolean(errorGeneral)}
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-danger-soft p-3 ring-1 ring-danger/30"
          >
            <Warning className="w-4 h-4 text-danger shrink-0 mt-0.5" weight="fill" aria-hidden="true" />
            <p className="text-caption text-danger leading-relaxed">{errorGeneral}</p>
        </Presence>

      {/* La vista previa, debajo de los campos: lo que se ve es lo que se guarda. */}
      <section className="space-y-3 border-t border-border pt-5" aria-labelledby="acuerdo-vista-previa">
        <h3 id="acuerdo-vista-previa" className="text-body font-normal text-fg">Vista previa</h3>
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
            <p className="text-body-sm font-medium text-fg">Completa las condiciones</p>
            <p className="text-caption text-fg-muted mt-1 max-w-xs mx-auto">
              Elige un deudor y escribe el valor adeudado para ver el acuerdo.
            </p>
          </div>
        )}
        </CrossFade>
      </section>
      </CajonCuerpo>

      {/* La aprobación de una persona se dice UNA vez (revisora r25, Acuerdos #4),
          junto al botón: antes iba en la descripción, en la intro del formulario,
          en una fila con «Siempre», en un aviso azul y al pie de la vista previa. */}
      <CajonPie
        ayuda={
          <span className="inline-flex items-center gap-1.5" data-testid="acuerdo-requiere-aprobacion">
            <Lock className="h-3.5 w-3.5 shrink-0" weight="fill" aria-hidden="true" />
            Queda «Por aprobar»: una persona lo aprueba antes de que le llegue al inquilino.
          </span>
        }
      >
        <Button type="button" variant="outline" hideArrow onClick={onCancelar}>
          Cancelar
        </Button>
        <Button
          type="submit"
          hideArrow
          isLoading={isSubmitting}
          disabled={!canSubmit || isSubmitting}
          data-testid="acuerdo-guardar"
        >
          Guardar como propuesta
        </Button>
      </CajonPie>
    </form>
  )
}

// ── Página ───────────────────────────────────────────────────────────────────

function AcuerdosContent() {
  // Disponibilidad del flujo de aprobación real (gate de cobranza por permiso).
  const { canAccess } = usePermissionsContext()
  const canApprove = canAccess('cobranza', 'approve')

  // C8 (revisora r25): lo pendiente va primero y el filtro vive en la URL (`?estado=por_aprobar`), así un
  // enlace —el de las promesas viejas, uno compartido— abre donde tiene que abrir.
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const estadoDeLaUrl = searchParams?.get('estado') ?? null
  const filtroDeLaUrl: AcuerdoFiltro | null =
    estadoDeLaUrl && (['todos', ...Object.keys(ACUERDO_ESTADO)] as string[]).includes(estadoDeLaUrl)
      ? (estadoDeLaUrl as AcuerdoFiltro)
      : null
  const [filtroElegido, setFiltroElegido] = useState<AcuerdoFiltro | null>(filtroDeLaUrl)
  const setFiltro = useCallback(
    (f: AcuerdoFiltro) => {
      setFiltroElegido(f)
      const qs = new URLSearchParams(searchParams?.toString() ?? '')
      qs.set('estado', f)
      router.replace(`${pathname}?${qs.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams],
  )
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
  const hayPorAprobar = acuerdos.some((a) => a.estado === 'por_aprobar')
  const filtro: AcuerdoFiltro = filtroElegido ?? (hayPorAprobar ? 'por_aprobar' : 'todos')

  const cargando = cargandoPromesas || cargandoPlanes
  // Un origen caído no puede tapar lo que el otro sí trajo.
  const error = errorPromesas ?? errorPlanes ?? null

  const recargar = useCallback(() => {
    void recargarPromesas()
    void recargarPlanes()
  }, [recargarPromesas, recargarPlanes])

  // LA RESPUESTA: cuánto está comprometido en los acuerdos que siguen abiertos,
  // partido por estado (lo que espera una aprobación primero). Sale de la misma
  // lista de la tabla: no hay otra llamada.
  const { formatCurrency } = useI18n()
  const abiertos = useMemo(
    () => acuerdos.filter((a) => a.estado !== 'cumplido'),
    [acuerdos],
  )
  const tramos = useMemo(() => {
    const suma = (e: AcuerdoRow['estado']) =>
      acuerdos.filter((a) => a.estado === e).reduce((s, a) => s + Math.max(0, a.montoCop), 0)
    const tono = { por_aprobar: 'aviso', vigente: 'neutro', parcial: 'neutro', incumplido: 'critico' } as const
    return (['por_aprobar', 'vigente', 'parcial', 'incumplido'] as const).map((e) => ({
      clave: e,
      // C3 (r25): el tramo dice la PLATA; el conteo vive en la pestaña. Antes
      // «Por aprobar · 3» repetía «Por aprobar 3» de la tabla.
      etiqueta: ACUERDO_ESTADO[e].label,
      monto: suma(e),
      tono: tono[e],
      'data-testid': `acuerdos-tramo-${e}`,
      cifra: (
        <button
          type="button"
          onClick={() => setFiltro(e)}
          className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Ver los acuerdos ${ACUERDO_ESTADO[e].label.toLowerCase()}`}
        >
          {formatCurrency(suma(e))}
        </button>
      ),
    }))
  }, [acuerdos, formatCurrency, setFiltro])
  const comprometido = tramos.reduce((s, t) => s + t.monto, 0)

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <EncabezadoDePantalla
        seccion="Cobranza"
        titulo="Acuerdos de pago"
        descripcion="Lo que cada deudor se comprometió a pagar: lo que promete en una llamada y los planes de cuotas."
        ayuda={
          <ParaEntenderMas
            etiqueta="Cómo funcionan"
            titulo="Cómo funcionan los acuerdos de pago"
            variante="secundario"
          >
            <div className="space-y-3 text-body-sm text-fg-muted">
              <p>
                Aquí ves los dos tipos de compromiso: lo que el agente registra en una llamada y
                los planes de cuotas que armes con «Nuevo acuerdo».
              </p>
              <p>
                Un plan de cuotas siempre espera la aprobación de una persona con permiso de
                cobranza; se aprueba desde su detalle.
              </p>
              <p>
                Al final de la pantalla están los límites del agente y los acuerdos generales: lo
                que el agente puede cerrar solo, sin preguntarte.
              </p>
            </div>
          </ParaEntenderMas>
        }
        accionPrincipal={
          <Button
            size="sm"
            hideArrow
            onClick={() => setCrearAbierto(true)}
            className="shrink-0"
            data-testid="acuerdo-nuevo"
          >
            Nuevo acuerdo
          </Button>
        }
      />

      {/* Aviso si el usuario no puede aprobar (la aprobación vive en el detalle real) */}
      {/* Revisora r27 (Acuerdos): UNA línea gris, no un bloque entero. */}
      {!canApprove && (
        <p className="-mt-3 flex items-center gap-1.5 text-caption text-fg-muted">
          <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          Puedes proponer acuerdos; los aprueba un compañero con permiso de cobranza, desde el detalle del plan.
        </p>
      )}

      {/* Cargando → la tabla: entra con su fundido. */}
      <CrossFade swapKey={cargando && acuerdos.length === 0 && !error ? 'cargando' : 'tabla'}>
      {cargando && acuerdos.length === 0 && !error ? (
        // C6 (r25): esqueleto con la forma de la tabla, no una rueda.
        <div className="overflow-hidden rounded-lg border border-border bg-card" aria-busy="true">
          <EsqueletoTabla columnas={5} filas={5} />
        </div>
      ) : (
        <AcuerdosTabla
          // C3 (r25): LA RESPUESTA va DENTRO de la tarjeta, encima de las
          // pestañas, como «Deuda del mes»: los tramos son plata, las pestañas
          // son conteos. Sin acuerdos abiertos no se pinta.
          cabeza={
            abiertos.length > 0 ? (
              <CifraHeroe
                className="border-b border-border px-5 pb-5 pt-5 sm:px-6"
                data-testid="acuerdos-comprometido"
                rotulo="Comprometido en acuerdos abiertos"
                cifra={formatCurrency(comprometido)}
                contexto={abiertos.length === 1 ? 'en 1 acuerdo' : `en ${abiertos.length} acuerdos`}
                total={comprometido}
                tramos={tramos}
              />
            ) : null
          }
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

      {/* Lo que se consulta va después del trabajo, en este orden a propósito:
          1. Los LÍMITES — el techo que el agente no puede pasar nunca.
          2. Los ACUERDOS GENERALES — las reglas que la inmobiliaria escribe y
             que el agente cierra solo, siempre recortadas por (1). */}
      {/* Revisora r25 (Acuerdos #5): es de consulta, va plegado como los límites. */}
      <MasDetalles
        etiqueta="Lo que el agente puede cerrar solo"
        etiquetaAbierto="Ocultar lo que el agente puede cerrar solo"
        data-testid="acuerdos-lo-que-cierra-solo"
      >
        <section className="space-y-4" aria-label="Lo que el agente puede cerrar solo">
          <AcuerdosGeneralesCard />
          <AcuerdosGeneralesTabla />
        </section>
      </MasDetalles>

      {/* Crear — en el cajón de la casa (revisora r25, Acuerdos #3; lo mismo que
          se decidió para el Cotizador del admin): la pantalla es para MIRAR los
          acuerdos; armar uno es una tarea puntual. El acuerdo GENERAL sigue en su
          propia página (`acuerdos/generales/nuevo`). */}
      <Cajon abierto={crearAbierto} onOpenChange={setCrearAbierto} tamano="lg" data-testid="acuerdo-nuevo-cajon">
        <CajonCabecera
          titulo="Nuevo acuerdo de pago"
          descripcion="El deudor, cuánto debe y cómo lo va a pagar."
        />
        {crearAbierto ? (
          <CrearAcuerdoForm
            onCancelar={() => setCrearAbierto(false)}
            onCreada={() => {
              setCrearAbierto(false)
              recargar()
            }}
          />
        ) : null}
      </Cajon>
    </div>
  )
}

export default function AcuerdosPage() {
  return (
    <PageGuard module="cobranza">
      <Suspense fallback={null}>
        <AcuerdosContent />
      </Suspense>
    </PageGuard>
  )
}
