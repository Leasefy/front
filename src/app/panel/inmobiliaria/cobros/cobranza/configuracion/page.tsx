'use client'

/**
 * Cobranza Config Page — Phase 2 rewrite (docs/front-cobranza-config.md).
 *
 * Wires the 3 sections that map to REAL endpoints the agent runtime reads,
 * plus a 4th purely informative section:
 *
 *   ① Facturación e integraciones → GET/PATCH /api/agency/:id/policy (useAgencyPolicy)
 *   ② Autonomía    → GET/PUT   /api/agency/:id/cobranza/autonomy  (useAutonomy)
 *   ③ Horario y frecuencia → informativo fijo (Ley 2300), sin inputs.
 *   ④ Reporte diario → enlaces + el switch de WhatsApp (mismo PATCH de policy).
 *
 * Lo que YA NO vive acá (2026-08-09, decisión de Nico):
 *   · El acuerdo general se edita en /cobranza/acuerdos — es el acuerdo más
 *     importante de la inmobiliaria, no un ajuste del sistema. Queda un puntero.
 *   · La cadencia de contacto salió del panel (ver nota al pie).
 *
 * Replaces the previous `/policies` (plural, decorative journal) wiring — see
 * docs/front-cobranza-config.md for the bug root cause. `usePoliciesConfig`,
 * `usePolicyVersions` and `usePolicyImpact` are intentionally NOT used here
 * anymore (orphaned — kept only in case a future "historial de cambios" view
 * reconnects the decorative journal).
 *
 * Edit gate: `canAccess('cobranza', 'configure')` (OWNER/ADMIN per backend
 * RBAC). VIEWER/CONTADOR see every section read-only — disabled inputs, no
 * save actions. Page-level access still requires `cobranza:view` (PageGuard),
 * matching the pattern in `compliance/opt-out/page.tsx`.
 *
 * 404 on any of the 3 GETs = onboarding incompleto for that agency — surfaced
 * per-section as a dedicated banner (`notProvisioned`), never a generic error.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Warning, FloppyDisk } from '@phosphor-icons/react'
import { RadioCardGroup, RadioCard } from '@leasefy/cadence'

import { PageGuard } from '@/components/auth/PageGuard'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import {
  useAgencyPolicy,
  type AgencyPolicy,
  type AgencyPolicyPatchBody,
} from '@/lib/hooks/cobranza/use-agency-policy'
import { useAutonomy, type AutonomyLevel } from '@/lib/hooks/cobranza/use-autonomy'
import { CobranzaConfiguracionSkeleton } from '@/components/skeleton/panel/CobranzaConfiguracionSkeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'

// ─── Negotiation draft ──────────────────────────────────────────────────────

const PAYMENT_PLAN_OPTIONS = [1, 3, 6, 9, 12, 18, 24, 36]
const CRM_PROVIDERS = ['wasi', 'domus', 'webprop', 'sinco'] as const
const ERP_PROVIDERS = ['alegra', 'alegra_full', 'siigo_full', 'world_office'] as const
const BILLING_MODELS = ['performance', 'subscription', 'hybrid'] as const

/** El `<select>` mostraba el slug crudo: «performance», «hybrid». */
const BILLING_MODEL_LABELS: Record<(typeof BILLING_MODELS)[number], string> = {
  performance: 'Por resultado',
  subscription: 'Suscripción',
  hybrid: 'Mixto',
}

interface NegotiationDraft {
  maxDiscountPct: number
  maxPlanMonths: number
  minPaymentCop: number
  autoEscalateAfterDays: number
  negotiationMaxAttempts: number
  allowHardshipPath: boolean
  allowedPaymentPlans: number[]
  billingModel: (typeof BILLING_MODELS)[number]
  successFeePct: number
  hybridPct: number
  monthlyMinCop: number
  perDeudorCop: number
  baseFeeCop: number
  crmProvider: (typeof CRM_PROVIDERS)[number]
  erpProvider: (typeof ERP_PROVIDERS)[number]
  siniestroCanonesThreshold: number | null
  dailyReportWhatsappEnabled: boolean
}

function toDraft(policy: AgencyPolicy): NegotiationDraft {
  return {
    maxDiscountPct: policy.maxDiscountPct,
    maxPlanMonths: policy.maxPlanMonths,
    minPaymentCop: policy.minPaymentCop,
    autoEscalateAfterDays: policy.autoEscalateAfterDays,
    negotiationMaxAttempts: policy.negotiationMaxAttempts,
    allowHardshipPath: policy.allowHardshipPath,
    allowedPaymentPlans: policy.allowedPaymentPlans ?? [],
    billingModel: (policy.billingModel as NegotiationDraft['billingModel']) ?? 'performance',
    successFeePct: policy.successFeePct,
    hybridPct: policy.hybridPct,
    monthlyMinCop: policy.monthlyMinCop,
    perDeudorCop: policy.perDeudorCop,
    baseFeeCop: policy.baseFeeCop,
    crmProvider: policy.crmProvider,
    erpProvider: policy.erpProvider,
    siniestroCanonesThreshold: policy.siniestroCanonesThreshold,
    dailyReportWhatsappEnabled: policy.dailyReportWhatsappEnabled,
  }
}

/**
 * Los campos de `NegotiationDraft` viajan en UN solo PATCH, pero NO son una
 * sola cosa. Antes vivían los tres grupos apilados dentro de «Negociación»,
 * así que el CRM y el modelo de facturación quedaban bajo el título «Límites
 * que el agente puede ofrecer al negociar con un deudor».
 */

/** El acuerdo general: lo que el agente puede cerrar sin preguntar. */
const CLAVES_ACUERDO = [
  'maxDiscountPct',
  'maxPlanMonths',
  'minPaymentCop',
  'negotiationMaxAttempts',
  'allowedPaymentPlans',
  'allowHardshipPath',
  'autoEscalateAfterDays',
  'siniestroCanonesThreshold',
] as const satisfies readonly (keyof NegotiationDraft)[]

/** Cómo nos paga la inmobiliaria y con qué sistemas se habla. */
const CLAVES_COMERCIAL = [
  'billingModel',
  'successFeePct',
  'hybridPct',
  'monthlyMinCop',
  'perDeudorCop',
  'baseFeeCop',
  'crmProvider',
  'erpProvider',
] as const satisfies readonly (keyof NegotiationDraft)[]

function difieren(
  saved: NegotiationDraft | null,
  draft: NegotiationDraft | null,
  keys: readonly (keyof NegotiationDraft)[],
): boolean {
  if (!saved || !draft) return false
  return keys.some((k) => JSON.stringify(saved[k]) !== JSON.stringify(draft[k]))
}

const pesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/**
 * El acuerdo, dicho en una frase.
 *
 * Es la parte que hacía falta: con once campos sueltos nadie sabe qué acordó.
 * Leer «hasta 20% de descuento, en 3, 6 o 12 cuotas» es la única forma de
 * revisar de un vistazo si el acuerdo dice lo que uno cree.
 */
function resumenAcuerdo(d: NegotiationDraft): string {
  const partes: string[] = []
  partes.push(
    d.maxDiscountPct > 0
      ? `hasta ${Math.round(d.maxDiscountPct * 100)}% de descuento`
      : 'sin descuento',
  )
  const planes = [...d.allowedPaymentPlans].sort((a, b) => a - b)
  if (planes.length > 0) {
    const enMeses = planes.map(String)
    const ultimo = enMeses.pop()
    partes.push(
      `en ${enMeses.length > 0 ? `${enMeses.join(', ')} o ${ultimo}` : ultimo} ${
        planes.length === 1 && planes[0] === 1 ? 'cuota' : 'cuotas'
      }`,
    )
  } else {
    partes.push('sin plazos a cuotas')
  }
  if (d.minPaymentCop > 0) partes.push(`con un pago mínimo de ${pesos.format(d.minPaymentCop)}`)
  partes.push(`y hasta ${d.negotiationMaxAttempts} ${d.negotiationMaxAttempts === 1 ? 'intento' : 'intentos'}`)
  return `El agente puede cerrar solo: ${partes.join(', ')}.`
}

/**
 * Incoherencias que hacen que el acuerdo no diga lo que aparenta.
 *
 * `maxPlanMonths` y `allowedPaymentPlans` NO son el mismo campo: el primero es
 * el tope que usa `calculatePaymentPlan` para armar el cronograma; el segundo
 * es la lista blanca que decide si la oferta se cierra sola o se escala. Se
 * pueden contradecir, y hoy en todos los tenants se contradicen.
 */
function avisosDelAcuerdo(d: NegotiationDraft): string[] {
  const avisos: string[] = []
  const planes = [...d.allowedPaymentPlans].sort((a, b) => a - b)
  const mayor = planes[planes.length - 1]

  if (d.maxPlanMonths < 1 && planes.length > 0) {
    avisos.push(
      `El plazo máximo está en ${d.maxPlanMonths}, así que el agente no puede armar ningún cronograma —aunque abajo estén marcados ${planes.join(', ')} meses. Subilo a ${mayor} para que los plazos marcados sirvan.`,
    )
  } else if (mayor !== undefined && d.maxPlanMonths > 0 && mayor > d.maxPlanMonths) {
    avisos.push(
      `Están marcados ${mayor} meses, pero el plazo máximo es ${d.maxPlanMonths}: un deudor que pida ${mayor} cuotas te lo va a escalar en vez de cerrarlo.`,
    )
  }

  if (d.maxDiscountPct === 0 && planes.length === 0) {
    avisos.push('Sin descuento y sin plazos, el agente no tiene nada que ofrecer: todo termina escalado.')
  }

  return avisos
}

/** Partial diff — only keys that actually changed travel to the network. */
function diffPatch(saved: NegotiationDraft, draft: NegotiationDraft): AgencyPolicyPatchBody {
  const patch: Record<string, unknown> = {}
  ;(Object.keys(draft) as (keyof NegotiationDraft)[]).forEach((key) => {
    const a = saved[key]
    const b = draft[key]
    const changed =
      Array.isArray(a) && Array.isArray(b)
        ? JSON.stringify([...a].sort((x, y) => x - y)) !== JSON.stringify([...b].sort((x, y) => x - y))
        : a !== b
    if (changed) patch[key] = b
  })
  return patch as AgencyPolicyPatchBody
}

const AUTONOMY_OPTIONS: { value: AutonomyLevel; label: string; description: string }[] = [
  {
    value: 'sugerir',
    label: 'Sugerir',
    description: 'El agente propone la acción; un humano decide y la ejecuta manualmente.',
  },
  {
    value: 'aprobar',
    label: 'Aprobar',
    description: 'El agente prepara la acción; requiere aprobación humana antes de contactar al deudor.',
  },
  {
    value: 'automatico_controlado',
    label: 'Automático controlado',
    description: 'El agente actúa solo dentro de límites estrictos, con revisión humana posterior.',
  },
  {
    value: 'automatico_completo',
    label: 'Automático completo',
    description: 'El agente actúa sin intervención humana, siempre bajo las guardas de Ley 2300 / habeas data.',
  },
]

// ─── Shared small components ────────────────────────────────────────────────

/**
 * Campo de porcentaje.
 *
 * El valor viaja como fracción (0.08) porque así lo guarda la política, pero
 * se escribe en % — antes la etiqueta decía «% éxito» y el campo mostraba
 * `0,08`, que se lee como «0,08 %» y es cien veces menos.
 */
function PorcentajeField({
  id,
  testId,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string
  testId?: string
  label: string
  value: number
  disabled: boolean
  onChange: (fraccion: number) => void
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          data-testid={testId ?? `field-${id}`}
          type="number"
          min={0}
          max={50}
          step={1}
          className="min-h-[44px] pr-8"
          disabled={disabled}
          value={Math.round(value * 100)}
          onChange={(e) => onChange(Math.min(50, Math.max(0, Number(e.target.value))) / 100)}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-fg-muted">
          %
        </span>
      </div>
    </div>
  )
}

function NotProvisionedBanner({ testId }: { testId: string }) {
  return (
    <div
      data-testid={testId}
      className="rounded-md border border-warning/30 bg-warning-soft p-3 flex items-start gap-2"
    >
      <Warning weight="fill" className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
      <p className="text-sm text-foreground">
        Configuración no disponible — onboarding incompleto para esta agencia.
      </p>
    </div>
  )
}

function SectionErrorBanner({ testId, onRetry }: { testId: string; onRetry: () => void }) {
  return (
    <div
      data-testid={testId}
      className="rounded-md border border-danger/30 bg-danger-soft p-3 flex items-start gap-2"
    >
      <Warning weight="fill" className="h-5 w-5 text-danger mt-0.5 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <p className="text-sm text-danger">No pudimos cargar esta sección.</p>
        <Button variant="outline" size="sm" className="min-h-[44px]" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    </div>
  )
}

// ─── Main content ───────────────────────────────────────────────────────────

const COBRANZA_BASE = '/panel/inmobiliaria/cobros/cobranza'

function CobranzaConfiguracionContent() {
  // De dónde vino la persona, para poder devolverla.
  const volverA = useSearchParams().get('volver')
  const { canAccess } = usePermissionsContext()
  const canEdit = canAccess('cobranza', 'configure')

  const policy = useAgencyPolicy()
  const autonomy = useAutonomy()

  // ── Negotiation local draft ────────────────────────────────────────────
  const [negDraft, setNegDraft] = useState<NegotiationDraft | null>(null)
  const negSavedRef = useRef<NegotiationDraft | null>(null)
  const [negSaving, setNegSaving] = useState(false)
  const [negError, setNegError] = useState<string | null>(null)

  useEffect(() => {
    if (policy.data) {
      const d = toDraft(policy.data)
      setNegDraft(d)
      negSavedRef.current = d
    }
  }, [policy.data])

  const negDirty =
    !!negDraft && !!negSavedRef.current && JSON.stringify(negDraft) !== JSON.stringify(negSavedRef.current)

  // Cada bloque se guarda por su cuenta. El PATCH sigue siendo uno solo (viaja
  // el diff de TODO lo cambiado), pero un botón que se enciende porque tocaste
  // algo de otra tarjeta no se entiende.
  const acuerdoDirty = difieren(negSavedRef.current, negDraft, CLAVES_ACUERDO)
  const comercialDirty = difieren(negSavedRef.current, negDraft, CLAVES_COMERCIAL)
  const avisoDirty = difieren(negSavedRef.current, negDraft, ['dailyReportWhatsappEnabled'])

  const updateNeg = useCallback(
    <K extends keyof NegotiationDraft>(key: K, value: NegotiationDraft[K]) => {
      setNegDraft((prev) => (prev ? { ...prev, [key]: value } : prev))
    },
    [],
  )

  const toggleAllowedPlan = useCallback((months: number, checked: boolean) => {
    setNegDraft((prev) => {
      if (!prev) return prev
      const next = checked
        ? [...prev.allowedPaymentPlans, months]
        : prev.allowedPaymentPlans.filter((m) => m !== months)
      return { ...prev, allowedPaymentPlans: Array.from(new Set(next)).sort((a, b) => a - b) }
    })
  }, [])

  const handleSaveNegotiation = useCallback(async () => {
    if (!negDraft || !negSavedRef.current) return
    const patch = diffPatch(negSavedRef.current, negDraft)
    if (Object.keys(patch).length === 0) return
    setNegSaving(true)
    setNegError(null)
    try {
      await policy.patchPolicy(patch)
      negSavedRef.current = negDraft
    } catch {
      setNegError('No pudimos guardar los cambios de negociación. Intenta de nuevo.')
    } finally {
      setNegSaving(false)
    }
  }, [negDraft, policy])

  const handleCancelNegotiation = useCallback(() => {
    if (negSavedRef.current) setNegDraft(negSavedRef.current)
  }, [])

  // ── Autonomy ────────────────────────────────────────────────────────────
  const [autonomySaving, setAutonomySaving] = useState(false)
  const [autonomyError, setAutonomyError] = useState<string | null>(null)

  const handleSelectAutonomy = useCallback(
    async (level: AutonomyLevel) => {
      if (!canEdit || autonomy.data?.autonomyLevel === level) return
      setAutonomySaving(true)
      setAutonomyError(null)
      try {
        await autonomy.saveAutonomy(level)
      } catch {
        setAutonomyError('No pudimos guardar el nivel de autonomía. Intenta de nuevo.')
      } finally {
        setAutonomySaving(false)
      }
    },
    [autonomy, canEdit],
  )

  // ── Full-page skeleton while the 2 resources settle ────────────────────
  const policySettled = !policy.isLoading || !!policy.data || policy.notProvisioned
  const autonomySettled = !autonomy.isLoading || !!autonomy.data || autonomy.notProvisioned

  if (!policySettled || !autonomySettled) {
    return <CobranzaConfiguracionSkeleton />
  }

  return (
    <main className="p-4 md:p-6 space-y-6 pb-24">
      <div>
        {/* Vuelta al origen. Se llega acá desde «Ajustar» en Acuerdos de pago y
            no había cómo volver: el flujo quedaba cortado en una pantalla de
            configuración larga. El enlace sólo aparece si de verdad venís de
            ahí (`?volver=acuerdos`), para no inventar una vuelta que no existe
            cuando entraste por el menú. */}
        {volverA === 'acuerdos' && (
          <Button asChild variant="ghost" size="sm" hideArrow className="-ml-2 mb-2">
            <Link href={`${COBRANZA_BASE}/acuerdos`}>
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Volver a Acuerdos de pago
            </Link>
          </Button>
        )}
        <h1 className="text-h2 text-fg">
          Configuración de cobranza
        </h1>
        {!canEdit && (
          <p className="mt-1 text-sm text-fg-muted line-clamp-2 max-w-2xl" data-testid="readonly-banner">
            Tu rol solo tiene acceso de lectura a esta configuración.
          </p>
        )}
      </div>

      {/* El acuerdo general NO vive acá — ni siquiera como puntero. Se arma en
          /cobranza/acuerdos, junto a los acuerdos puntuales. Dejar una tarjeta
          con el título «Acuerdo general» acá seguía diciendo que esto era su
          lugar. Ver la nota al pie del archivo. */}

      {/* ① Facturación e integraciones ──────────────────────────────────────
          Vivían dentro de «Negociación», bajo el subtítulo «Límites que el
          agente puede ofrecer al negociar con un deudor». No son eso: son cómo
          nos paga la inmobiliaria y con qué sistemas hablamos. Comparten el
          mismo PATCH de policy, no la misma pregunta. */}
      {!policy.notProvisioned && negDraft && (
        <section
          data-testid="section-comercial"
          className="rounded-lg border border-border bg-card p-6 space-y-4"
          aria-labelledby="heading-comercial"
        >
          <div>
            <h2 id="heading-comercial" className="text-xl font-semibold text-foreground">
              Facturación e integraciones
            </h2>
            <p className="text-sm text-fg-muted mt-1">
              Cómo se cobra el servicio y con qué sistemas de la inmobiliaria se sincroniza.
            </p>
          </div>
          <div className="border-t border-border-faint" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="billingModel" className="text-sm">
                Modelo de facturación
              </Label>
              <select
                id="billingModel"
                data-testid="field-billingModel"
                className="w-full rounded-md border border-border bg-card px-3 min-h-[44px] text-sm"
                disabled={!canEdit}
                value={negDraft.billingModel}
                onChange={(e) => updateNeg('billingModel', e.target.value as NegotiationDraft['billingModel'])}
              >
                {BILLING_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {BILLING_MODEL_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="crmProvider" className="text-sm">
                CRM
              </Label>
              <select
                id="crmProvider"
                data-testid="field-crmProvider"
                className="w-full rounded-md border border-border bg-card px-3 min-h-[44px] text-sm"
                disabled={!canEdit}
                value={negDraft.crmProvider}
                onChange={(e) => updateNeg('crmProvider', e.target.value as NegotiationDraft['crmProvider'])}
              >
                {CRM_PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="erpProvider" className="text-sm">
                ERP
              </Label>
              <select
                id="erpProvider"
                data-testid="field-erpProvider"
                className="w-full rounded-md border border-border bg-card px-3 min-h-[44px] text-sm"
                disabled={!canEdit}
                value={negDraft.erpProvider}
                onChange={(e) => updateNeg('erpProvider', e.target.value as NegotiationDraft['erpProvider'])}
              >
                {ERP_PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {negDraft.billingModel === 'performance' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PorcentajeField
                id="successFeePct"
                label="Comisión de éxito"
                value={negDraft.successFeePct}
                disabled={!canEdit}
                onChange={(v) => updateNeg('successFeePct', v)}
              />
            </div>
          )}

          {negDraft.billingModel === 'subscription' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="monthlyMinCop" className="text-sm">
                  Mínimo mensual (COP)
                </Label>
                <Input
                  id="monthlyMinCop"
                  data-testid="field-monthlyMinCop"
                  type="number"
                  min={0}
                  className="min-h-[44px]"
                  disabled={!canEdit}
                  value={negDraft.monthlyMinCop}
                  onChange={(e) => updateNeg('monthlyMinCop', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="perDeudorCop" className="text-sm">
                  Por deudor (COP)
                </Label>
                <Input
                  id="perDeudorCop"
                  data-testid="field-perDeudorCop"
                  type="number"
                  min={0}
                  className="min-h-[44px]"
                  disabled={!canEdit}
                  value={negDraft.perDeudorCop}
                  onChange={(e) => updateNeg('perDeudorCop', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="baseFeeCop" className="text-sm">
                  Tarifa base (COP)
                </Label>
                <Input
                  id="baseFeeCop"
                  data-testid="field-baseFeeCop"
                  type="number"
                  min={0}
                  className="min-h-[44px]"
                  disabled={!canEdit}
                  value={negDraft.baseFeeCop}
                  onChange={(e) => updateNeg('baseFeeCop', Number(e.target.value))}
                />
              </div>
            </div>
          )}

          {negDraft.billingModel === 'hybrid' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PorcentajeField
                id="successFeePctHybrid"
                testId="field-successFeePct"
                label="Comisión de éxito"
                value={negDraft.successFeePct}
                disabled={!canEdit}
                onChange={(v) => updateNeg('successFeePct', v)}
              />
              <PorcentajeField
                id="hybridPct"
                label="Porcentaje híbrido"
                value={negDraft.hybridPct}
                disabled={!canEdit}
                onChange={(v) => updateNeg('hybridPct', v)}
              />
              <div className="space-y-1">
                <Label htmlFor="baseFeeCopHybrid" className="text-sm">
                  Tarifa base (COP)
                </Label>
                <Input
                  id="baseFeeCopHybrid"
                  data-testid="field-baseFeeCop"
                  type="number"
                  min={0}
                  className="min-h-[44px]"
                  disabled={!canEdit}
                  value={negDraft.baseFeeCop}
                  onChange={(e) => updateNeg('baseFeeCop', Number(e.target.value))}
                />
              </div>
            </div>
          )}

          {canEdit && (
            <div className="flex items-center justify-end gap-2 pt-1">
              {comercialDirty && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-[44px]"
                  onClick={handleCancelNegotiation}
                  data-testid="cancel-comercial"
                >
                  Descartar
                </Button>
              )}
              <Button
                size="sm"
                className="min-h-[44px]"
                data-testid="save-comercial"
                disabled={!comercialDirty || negSaving}
                onClick={() => void handleSaveNegotiation()}
              >
                {negSaving ? (
                  <Spinner size="sm" variant="current" className="mr-1" />
                ) : (
                  <FloppyDisk className="h-4 w-4 mr-1" />
                )}
                Guardar facturación
              </Button>
            </div>
          )}
        </section>
      )}

      {/* ② Autonomía ────────────────────────────────────────────────────── */}
      <section
        data-testid="section-autonomia"
        className="rounded-lg border border-border bg-card p-6 space-y-4"
        aria-labelledby="heading-autonomia"
      >
        <div>
          <h2 id="heading-autonomia" className="text-xl font-semibold text-foreground">
            Autonomía
          </h2>
          <p className="text-sm text-fg-muted mt-1">
            Cuánto del ciclo de cobranza corre sin intervención humana.
          </p>
        </div>
        <div className="border-t border-border-faint" />

        {autonomy.notProvisioned && <NotProvisionedBanner testId="autonomia-not-provisioned" />}

        {!autonomy.notProvisioned && autonomy.error && !autonomy.data && (
          <SectionErrorBanner testId="autonomia-error" onRetry={() => void autonomy.refetch()} />
        )}

        {!autonomy.notProvisioned && autonomy.data && (
          <>
            <RadioCardGroup
              orientation="vertical"
              className="space-y-2"
              value={autonomy.data.autonomyLevel}
              onValueChange={(v) => void handleSelectAutonomy(v as AutonomyLevel)}
            >
              {AUTONOMY_OPTIONS.map((opt) => (
                <RadioCard
                  key={opt.value}
                  value={opt.value}
                  label={opt.label}
                  description={opt.description}
                  disabled={!canEdit || autonomySaving}
                  data-testid={`autonomy-option-${opt.value}`}
                />
              ))}
            </RadioCardGroup>

            <div className="flex items-center gap-2 text-sm">
              {autonomy.data.requiresHumanApproval ? (
                <Badge variant="warning">Requiere aprobación humana</Badge>
              ) : (
                <Badge variant="success">Despacho automático</Badge>
              )}
              {autonomySaving && <Spinner size="sm" variant="muted" data-testid="autonomy-saving" />}
            </div>

            {autonomyError && (
              <p className="text-sm text-danger" data-testid="autonomia-save-error">
                {autonomyError}
              </p>
            )}
          </>
        )}
      </section>

      {/* ③ Cadencia de contacto — SACADA del panel (ver nota al pie).
          Cuándo y por qué canal contacta el agente lo afinamos nosotros, no la
          inmobiliaria: misma decisión que sacó a Playbooks. Lo que a ella sí le
          toca de horarios (Ley 2300) es la sección de abajo, informativa. */}

      {/* ④ Horario y frecuencia — informativo, Ley 2300, sin inputs ──────── */}
      <section
        data-testid="section-horario"
        className="rounded-lg border border-border bg-card p-6 space-y-3"
        aria-labelledby="heading-horario"
      >
        <div>
          <h2 id="heading-horario" className="text-xl font-semibold text-foreground">
            Horario y frecuencia
          </h2>
          <p className="text-sm text-fg-muted mt-1">
            Definido por Ley 2300 — sin excepciones configurables por la agencia.
          </p>
        </div>
        <div className="border-t border-border-faint" />
        <ul className="text-sm text-foreground list-disc pl-5 space-y-1">
          <li>Lunes a viernes: 07:00–19:00</li>
          <li>Sábados: 08:00–15:00</li>
          <li>Sin contacto domingos ni festivos</li>
          <li>Máximo 1 contacto por día</li>
          <li>Máximo 1 contacto por canal por semana</li>
        </ul>
      </section>

      {/*
        Reporte diario — su pantalla salió del menú porque lo que había que
        mirar (alertas y deudores que más pesan) subió al Resumen. Pero los
        umbrales y la suscripción son configuración de la inmobiliaria, de la
        misma familia que los acuerdos de arriba, así que su puerta vive acá.
        Sin esto quedaban sólo alcanzables escribiendo la URL.
      */}
      <section
        data-testid="section-reporte"
        className="rounded-lg border border-border bg-card p-6 space-y-3"
        aria-labelledby="heading-reporte"
      >
        <div>
          <h2 id="heading-reporte" className="text-xl font-semibold text-foreground">
            Reporte diario
          </h2>
          <p className="text-sm text-fg-muted mt-1">
            Cuándo avisarte y a quién. Lo que hay que mirar cada día ya aparece
            en el resumen de Cobranza.
          </p>
        </div>
        <div className="border-t border-border-faint" />

        {/* Este switch vivía dentro de «Negociación», entre el CRM y el ERP.
            Es del reporte diario: vive acá. Guarda en el mismo PATCH de policy,
            por eso tiene su propio botón en vez de compartir el del acuerdo. */}
        {!policy.notProvisioned && negDraft && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
            <Label htmlFor="dailyReportWhatsappEnabled" className="text-sm cursor-pointer">
              Enviar el reporte diario por WhatsApp
            </Label>
            <div className="flex items-center gap-3 shrink-0">
              {canEdit && avisoDirty && (
                <Button
                  size="sm"
                  variant="secondary"
                  hideArrow
                  data-testid="save-aviso"
                  disabled={negSaving}
                  onClick={() => void handleSaveNegotiation()}
                >
                  Guardar
                </Button>
              )}
              <Switch
                id="dailyReportWhatsappEnabled"
                data-testid="field-dailyReportWhatsappEnabled"
                checked={negDraft.dailyReportWhatsappEnabled}
                disabled={!canEdit}
                onCheckedChange={(checked) => updateNeg('dailyReportWhatsappEnabled', checked)}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary" size="sm" hideArrow>
            <Link href="/panel/inmobiliaria/cobros/cobranza/reporte/thresholds">
              Umbrales de alerta
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm" hideArrow>
            <Link href="/panel/inmobiliaria/cobros/cobranza/reporte/suscripcion">
              Suscripción
            </Link>
          </Button>
          <Button asChild variant="link" size="sm" hideArrow className="px-1">
            <Link href="/panel/inmobiliaria/cobros/cobranza/reporte">
              Ver histórico y exportar CSV
            </Link>
          </Button>
        </div>
      </section>
    </main>
  )
}

/**
 * NOTA — «Cadencia de contacto» fuera del panel (2026-08-09, decisión de Nico).
 *
 * Era un editor por etapa de cartera (S0…SX) para elegir día, canal y motivo de
 * cada toque. Cuándo y por qué canal contacta el agente lo afinamos nosotros,
 * no la inmobiliaria — la misma decisión que sacó a Playbooks del panel: qué
 * dice y cuándo habla el agente lo define Leasefy.
 *
 * Lo que a la inmobiliaria SÍ le toca de horarios es la Ley 2300, y eso sigue
 * en «Horario y frecuencia», que es informativo y no se edita.
 *
 * Se quitó el JSX y TODA su maquinaria (hook `useCadence`, borrador, handlers,
 * `STAGE_LABELS`, `CHANNEL_LABELS`). Dejar el hook habría seguido pidiendo
 * `GET /cobranza/cadence` en cada carga para una UI que ya no existe.
 * El endpoint y `use-cadence.ts` quedan intactos: el agente los sigue leyendo.
 */

/**
 * NOTA — «Acuerdo general» mudado a Acuerdos de pago (2026-08-09).
 *
 * Vivía acá como §Negociación y el enlace desde Acuerdos traía hasta esta
 * pantalla. Pero el marco general —«si el deudor cabe en estas condiciones,
 * cerralo»— no es un ajuste del sistema: es el acuerdo más importante que tiene
 * la inmobiliaria, y se arma junto a los acuerdos puntuales. Ahora se edita en
 * `AcuerdosGeneralesCard`, plegado hasta que hace falta, con el acuerdo dicho
 * en una frase arriba. Acá queda un puntero para quien lo busque en el lugar
 * viejo.
 *
 * Lo que se quedó son los campos que de verdad son configuración: facturación,
 * CRM/ERP, autonomía, horario y reporte diario.
 */

export default function CobranzaConfiguracionPage() {
  return (
    <PageGuard module="cobranza" action="view">
      <CobranzaConfiguracionContent />
    </PageGuard>
  )
}
