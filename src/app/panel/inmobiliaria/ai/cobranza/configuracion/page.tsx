'use client'

/**
 * Cobranza Config Page — Phase 2 rewrite (docs/front-cobranza-config.md).
 *
 * Wires the 3 sections that map to REAL endpoints the agent runtime reads,
 * plus a 4th purely informative section:
 *
 *   ① Negociación  → GET/PATCH /api/agency/:id/policy            (useAgencyPolicy)
 *   ② Autonomía    → GET/PUT   /api/agency/:id/cobranza/autonomy  (useAutonomy)
 *   ③ Cadencia     → GET/PUT   /api/agency/:id/cobranza/cadence   (useCadence)
 *   ④ Horario y frecuencia → informativo fijo (Ley 2300), sin inputs.
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
import { Plus, Trash, Warning, FloppyDisk } from '@phosphor-icons/react'
import { RadioCardGroup, RadioCard } from '@leasefy/cadence'

import { PageGuard } from '@/components/auth/PageGuard'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import {
  useAgencyPolicy,
  type AgencyPolicy,
  type AgencyPolicyPatchBody,
} from '@/lib/hooks/cobranza/use-agency-policy'
import { useCadence, type CadenceConfig } from '@/lib/hooks/cobranza/use-cadence'
import { useAutonomy, type AutonomyLevel } from '@/lib/hooks/cobranza/use-autonomy'
import { CobranzaConfiguracionSkeleton } from '@/components/skeleton/panel/CobranzaConfiguracionSkeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'

// ─── Cadence stages ─────────────────────────────────────────────────────────

const CADENCE_STAGES = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'SX'] as const
type CadenceStage = (typeof CADENCE_STAGES)[number]
type CadenceEntry = CadenceConfig[CadenceStage][number]

const STAGE_LABELS: Record<CadenceStage, string> = {
  S0: 'S0 · Recordatorio previo al vencimiento',
  S1: 'S1 · Vencido reciente',
  S2: 'S2 · Mora temprana',
  S3: 'S3 · Mora media',
  S4: 'S4 · Mora avanzada',
  S5: 'S5 · Mora crítica',
  SX: 'SX · Excepción / vía legal',
}

const CHANNEL_LABELS: Record<CadenceEntry['channel'], string> = {
  voice: 'Llamada',
  whatsapp: 'WhatsApp',
  email: 'Correo',
}

function emptyCadence(): CadenceConfig {
  return { S0: [], S1: [], S2: [], S3: [], S4: [], S5: [], SX: [] }
}

// ─── Negotiation draft ──────────────────────────────────────────────────────

const PAYMENT_PLAN_OPTIONS = [1, 3, 6, 9, 12, 18, 24, 36]
const CRM_PROVIDERS = ['wasi', 'domus', 'webprop', 'sinco'] as const
const ERP_PROVIDERS = ['alegra', 'alegra_full', 'siigo_full', 'world_office'] as const
const BILLING_MODELS = ['performance', 'subscription', 'hybrid'] as const

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

function CobranzaConfiguracionContent() {
  const { canAccess } = usePermissionsContext()
  const canEdit = canAccess('cobranza', 'configure')

  const policy = useAgencyPolicy()
  const cadence = useCadence()
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

  // ── Cadence ─────────────────────────────────────────────────────────────
  const [cadenceDraft, setCadenceDraft] = useState<CadenceConfig | null>(null)
  const cadenceSavedRef = useRef<CadenceConfig | null>(null)
  const [cadenceSaving, setCadenceSaving] = useState(false)
  const [cadenceError, setCadenceError] = useState<string | null>(null)

  useEffect(() => {
    if (cadence.effectiveConfig) {
      setCadenceDraft(cadence.effectiveConfig)
      cadenceSavedRef.current = cadence.effectiveConfig
    }
  }, [cadence.effectiveConfig])

  const cadenceDirty =
    !!cadenceDraft &&
    !!cadenceSavedRef.current &&
    JSON.stringify(cadenceDraft) !== JSON.stringify(cadenceSavedRef.current)

  const addCadenceEntry = useCallback((stage: CadenceStage) => {
    setCadenceDraft((prev) => {
      const base = prev ?? emptyCadence()
      return {
        ...base,
        [stage]: [
          ...base[stage],
          { dayOffset: 0, channel: 'whatsapp', reason: '', retryUntilConnect: false },
        ],
      }
    })
  }, [])

  const removeCadenceEntry = useCallback((stage: CadenceStage, idx: number) => {
    setCadenceDraft((prev) => {
      if (!prev) return prev
      return { ...prev, [stage]: prev[stage].filter((_, i) => i !== idx) }
    })
  }, [])

  const updateCadenceEntry = useCallback(
    (stage: CadenceStage, idx: number, patch: Partial<CadenceEntry>) => {
      setCadenceDraft((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          [stage]: prev[stage].map((entry, i) => (i === idx ? { ...entry, ...patch } : entry)),
        }
      })
    },
    [],
  )

  const handleSaveCadence = useCallback(async () => {
    if (!cadenceDraft) return
    setCadenceSaving(true)
    setCadenceError(null)
    try {
      await cadence.saveCadence(cadenceDraft)
    } catch {
      setCadenceError('No pudimos guardar la cadencia. Intenta de nuevo.')
    } finally {
      setCadenceSaving(false)
    }
  }, [cadenceDraft, cadence])

  const handleCancelCadence = useCallback(() => {
    if (cadenceSavedRef.current) setCadenceDraft(cadenceSavedRef.current)
  }, [])

  // ── Full-page skeleton while the 3 resources settle ────────────────────
  const policySettled = !policy.isLoading || !!policy.data || policy.notProvisioned
  const cadenceSettled = !cadence.isLoading || !!cadence.effectiveConfig || cadence.notProvisioned
  const autonomySettled = !autonomy.isLoading || !!autonomy.data || autonomy.notProvisioned

  if (!policySettled || !cadenceSettled || !autonomySettled) {
    return <CobranzaConfiguracionSkeleton />
  }

  return (
    <main className="p-4 md:p-6 space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-semibold font-heading text-foreground">
          Configuración de cobranza
        </h1>
        {!canEdit && (
          <p className="mt-1 text-sm text-fg-muted" data-testid="readonly-banner">
            Tu rol solo tiene acceso de lectura a esta configuración.
          </p>
        )}
      </div>

      {/* ① Negociación ──────────────────────────────────────────────────── */}
      <section
        data-testid="section-negociacion"
        className="rounded-xl border border-border bg-card p-6 space-y-4"
        aria-labelledby="heading-negociacion"
      >
        <div>
          <h2 id="heading-negociacion" className="text-xl font-semibold text-foreground">
            Negociación
          </h2>
          <p className="text-sm text-fg-muted mt-1">
            Límites que el agente puede ofrecer al negociar con un deudor.
          </p>
        </div>
        <div className="border-t border-border-faint" />

        {policy.notProvisioned && <NotProvisionedBanner testId="negociacion-not-provisioned" />}

        {!policy.notProvisioned && policy.error && !policy.data && (
          <SectionErrorBanner testId="negociacion-error" onRetry={() => void policy.refetch()} />
        )}

        {!policy.notProvisioned && negDraft && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="maxDiscountPct" className="text-sm">
                  Descuento máximo (0 a 0.5)
                </Label>
                <Input
                  id="maxDiscountPct"
                  data-testid="field-maxDiscountPct"
                  type="number"
                  min={0}
                  max={0.5}
                  step={0.01}
                  className="min-h-[44px]"
                  disabled={!canEdit}
                  value={negDraft.maxDiscountPct}
                  onChange={(e) => updateNeg('maxDiscountPct', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="maxPlanMonths" className="text-sm">
                  Plan de pago máximo (meses)
                </Label>
                <Input
                  id="maxPlanMonths"
                  data-testid="field-maxPlanMonths"
                  type="number"
                  min={1}
                  max={24}
                  className="min-h-[44px]"
                  disabled={!canEdit}
                  value={negDraft.maxPlanMonths}
                  onChange={(e) => updateNeg('maxPlanMonths', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="minPaymentCop" className="text-sm">
                  Pago mínimo (COP)
                </Label>
                <Input
                  id="minPaymentCop"
                  data-testid="field-minPaymentCop"
                  type="number"
                  min={0}
                  className="min-h-[44px]"
                  disabled={!canEdit}
                  value={negDraft.minPaymentCop}
                  onChange={(e) => updateNeg('minPaymentCop', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="autoEscalateAfterDays" className="text-sm">
                  Días antes de escalar
                </Label>
                <Input
                  id="autoEscalateAfterDays"
                  data-testid="field-autoEscalateAfterDays"
                  type="number"
                  min={1}
                  max={365}
                  className="min-h-[44px]"
                  disabled={!canEdit}
                  value={negDraft.autoEscalateAfterDays}
                  onChange={(e) => updateNeg('autoEscalateAfterDays', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="negotiationMaxAttempts" className="text-sm">
                  Intentos de negociación
                </Label>
                <Input
                  id="negotiationMaxAttempts"
                  data-testid="field-negotiationMaxAttempts"
                  type="number"
                  min={1}
                  max={10}
                  className="min-h-[44px]"
                  disabled={!canEdit}
                  value={negDraft.negotiationMaxAttempts}
                  onChange={(e) => updateNeg('negotiationMaxAttempts', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="siniestroCanonesThreshold" className="text-sm">
                  Cánones para siniestro (opcional)
                </Label>
                <Input
                  id="siniestroCanonesThreshold"
                  data-testid="field-siniestroCanonesThreshold"
                  type="number"
                  min={1}
                  max={12}
                  className="min-h-[44px]"
                  disabled={!canEdit}
                  value={negDraft.siniestroCanonesThreshold ?? ''}
                  onChange={(e) =>
                    updateNeg(
                      'siniestroCanonesThreshold',
                      e.target.value === '' ? null : Number(e.target.value),
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Planes de pago permitidos (meses)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PAYMENT_PLAN_OPTIONS.map((months) => (
                  <div key={months} className="flex items-center gap-2 min-h-[44px]">
                    <Checkbox
                      id={`allowedPlan-${months}`}
                      data-testid={`field-allowedPaymentPlans-${months}`}
                      checked={negDraft.allowedPaymentPlans.includes(months)}
                      disabled={!canEdit}
                      onCheckedChange={(checked) => toggleAllowedPlan(months, !!checked)}
                    />
                    <Label htmlFor={`allowedPlan-${months}`} className="text-sm cursor-pointer">
                      {months} {months === 1 ? 'mes' : 'meses'}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between min-h-[44px]">
              <Label htmlFor="allowHardshipPath" className="text-sm cursor-pointer">
                Permitir ruta de dificultad económica
              </Label>
              <Switch
                id="allowHardshipPath"
                data-testid="field-allowHardshipPath"
                checked={negDraft.allowHardshipPath}
                disabled={!canEdit}
                onCheckedChange={(checked) => updateNeg('allowHardshipPath', checked)}
              />
            </div>

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
                      {m}
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
                <div className="space-y-1">
                  <Label htmlFor="successFeePct" className="text-sm">
                    % éxito
                  </Label>
                  <Input
                    id="successFeePct"
                    data-testid="field-successFeePct"
                    type="number"
                    step={0.01}
                    min={0}
                    max={0.5}
                    className="min-h-[44px]"
                    disabled={!canEdit}
                    value={negDraft.successFeePct}
                    onChange={(e) => updateNeg('successFeePct', Number(e.target.value))}
                  />
                </div>
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
                <div className="space-y-1">
                  <Label htmlFor="successFeePctHybrid" className="text-sm">
                    % éxito
                  </Label>
                  <Input
                    id="successFeePctHybrid"
                    data-testid="field-successFeePct"
                    type="number"
                    step={0.01}
                    min={0}
                    max={0.5}
                    className="min-h-[44px]"
                    disabled={!canEdit}
                    value={negDraft.successFeePct}
                    onChange={(e) => updateNeg('successFeePct', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="hybridPct" className="text-sm">
                    % híbrido
                  </Label>
                  <Input
                    id="hybridPct"
                    data-testid="field-hybridPct"
                    type="number"
                    step={0.01}
                    min={0}
                    max={0.5}
                    className="min-h-[44px]"
                    disabled={!canEdit}
                    value={negDraft.hybridPct}
                    onChange={(e) => updateNeg('hybridPct', Number(e.target.value))}
                  />
                </div>
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

            <div className="flex items-center justify-between min-h-[44px]">
              <Label htmlFor="dailyReportWhatsappEnabled" className="text-sm cursor-pointer">
                Enviar reporte diario por WhatsApp
              </Label>
              <Switch
                id="dailyReportWhatsappEnabled"
                data-testid="field-dailyReportWhatsappEnabled"
                checked={negDraft.dailyReportWhatsappEnabled}
                disabled={!canEdit}
                onCheckedChange={(checked) => updateNeg('dailyReportWhatsappEnabled', checked)}
              />
            </div>

            {negError && (
              <p className="text-sm text-danger" data-testid="negociacion-save-error">
                {negError}
              </p>
            )}

            {canEdit && (
              <div className="flex items-center justify-end gap-2 pt-2">
                {negDirty && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-[44px]"
                    onClick={handleCancelNegotiation}
                    data-testid="cancel-negociacion"
                  >
                    Descartar
                  </Button>
                )}
                <Button
                  size="sm"
                  className="min-h-[44px]"
                  data-testid="save-negociacion"
                  disabled={!negDirty || negSaving}
                  onClick={() => void handleSaveNegotiation()}
                >
                  {negSaving ? (
                    <Spinner size="sm" variant="current" className="mr-1" />
                  ) : (
                    <FloppyDisk className="h-4 w-4 mr-1" />
                  )}
                  Guardar negociación
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ② Autonomía ────────────────────────────────────────────────────── */}
      <section
        data-testid="section-autonomia"
        className="rounded-xl border border-border bg-card p-6 space-y-4"
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

      {/* ③ Cadencia ─────────────────────────────────────────────────────── */}
      <section
        data-testid="section-cadencia"
        className="rounded-xl border border-border bg-card p-6 space-y-4"
        aria-labelledby="heading-cadencia"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 id="heading-cadencia" className="text-xl font-semibold text-foreground">
              Cadencia de contacto
            </h2>
            <p className="text-sm text-fg-muted mt-1">
              Toques por etapa de cartera — día, canal y motivo de cada contacto.
            </p>
          </div>
          <Badge variant="secondary" data-testid="cadence-source-chip">
            {cadence.source === 'agency' ? 'Configuración de la agencia' : 'Configuración por defecto'}
          </Badge>
        </div>
        <div className="border-t border-border-faint" />

        {cadence.notProvisioned && <NotProvisionedBanner testId="cadencia-not-provisioned" />}

        {!cadence.notProvisioned && cadence.error && !cadence.effectiveConfig && (
          <SectionErrorBanner testId="cadencia-error" onRetry={() => void cadence.refetch()} />
        )}

        {!cadence.notProvisioned && cadenceDraft && (
          <>
            <Accordion type="multiple" defaultValue={[...CADENCE_STAGES]} className="w-full">
              {CADENCE_STAGES.map((stage) => (
                <AccordionItem key={stage} value={stage}>
                  <AccordionTrigger data-testid={`cadence-stage-trigger-${stage}`}>
                    {STAGE_LABELS[stage]}{' '}
                    <span className="ml-2 text-xs text-fg-muted font-mono tabular-nums">
                      ({cadenceDraft[stage].length})
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {cadenceDraft[stage].map((entry, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-1 md:grid-cols-[100px_140px_1fr_auto_auto] gap-2 items-center rounded-md border border-border-faint p-2"
                        >
                          <Input
                            type="number"
                            aria-label={`Día — ${STAGE_LABELS[stage]} #${idx + 1}`}
                            data-testid={`cadence-entry-${stage}-${idx}-dayOffset`}
                            disabled={!canEdit}
                            value={entry.dayOffset}
                            onChange={(e) =>
                              updateCadenceEntry(stage, idx, { dayOffset: Number(e.target.value) })
                            }
                          />
                          <select
                            aria-label={`Canal — ${STAGE_LABELS[stage]} #${idx + 1}`}
                            data-testid={`cadence-entry-${stage}-${idx}-channel`}
                            className="w-full rounded-md border border-border bg-card px-3 min-h-[44px] text-sm"
                            disabled={!canEdit}
                            value={entry.channel}
                            onChange={(e) =>
                              updateCadenceEntry(stage, idx, {
                                channel: e.target.value as CadenceEntry['channel'],
                              })
                            }
                          >
                            {(Object.keys(CHANNEL_LABELS) as CadenceEntry['channel'][]).map((ch) => (
                              <option key={ch} value={ch}>
                                {CHANNEL_LABELS[ch]}
                              </option>
                            ))}
                          </select>
                          <Input
                            aria-label={`Motivo — ${STAGE_LABELS[stage]} #${idx + 1}`}
                            data-testid={`cadence-entry-${stage}-${idx}-reason`}
                            disabled={!canEdit}
                            maxLength={120}
                            value={entry.reason}
                            onChange={(e) => updateCadenceEntry(stage, idx, { reason: e.target.value })}
                          />
                          <div className="flex items-center gap-1.5 min-h-[44px]">
                            <Checkbox
                              data-testid={`cadence-entry-${stage}-${idx}-retry`}
                              disabled={!canEdit}
                              checked={!!entry.retryUntilConnect}
                              onCheckedChange={(checked) =>
                                updateCadenceEntry(stage, idx, { retryUntilConnect: !!checked })
                              }
                            />
                            <span className="text-xs text-fg-muted">Reintentar</span>
                          </div>
                          {canEdit && (
                            <button
                              type="button"
                              aria-label={`Quitar toque — ${STAGE_LABELS[stage]} #${idx + 1}`}
                              data-testid={`cadence-entry-${stage}-${idx}-remove`}
                              className="p-2 text-fg-muted hover:text-danger"
                              onClick={() => removeCadenceEntry(stage, idx)}
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-[44px]"
                          data-testid={`cadence-add-${stage}`}
                          onClick={() => addCadenceEntry(stage)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Agregar toque
                        </Button>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {cadenceError && (
              <p className="text-sm text-danger" data-testid="cadencia-save-error">
                {cadenceError}
              </p>
            )}

            {canEdit && (
              <div className="flex items-center justify-end gap-2 pt-2">
                {cadenceDirty && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-[44px]"
                    onClick={handleCancelCadence}
                    data-testid="cancel-cadencia"
                  >
                    Descartar
                  </Button>
                )}
                <Button
                  size="sm"
                  className="min-h-[44px]"
                  data-testid="save-cadencia"
                  disabled={!cadenceDirty || cadenceSaving}
                  onClick={() => void handleSaveCadence()}
                >
                  {cadenceSaving ? (
                    <Spinner size="sm" variant="current" className="mr-1" />
                  ) : (
                    <FloppyDisk className="h-4 w-4 mr-1" />
                  )}
                  Guardar cadencia
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ④ Horario y frecuencia — informativo, Ley 2300, sin inputs ──────── */}
      <section
        data-testid="section-horario"
        className="rounded-xl border border-border bg-card p-6 space-y-3"
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
    </main>
  )
}

export default function CobranzaConfiguracionPage() {
  return (
    <PageGuard module="cobranza" action="view">
      <CobranzaConfiguracionContent />
    </PageGuard>
  )
}
