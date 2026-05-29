'use client'

/**
 * Policies Config Page — Phase 36 plan 36-11 (COTI-UI-11, XR-03, XR-05).
 *
 * 4 policy sections: Cadencia de contacto, Negociación, Escalación, Compliance.
 * Sticky save footer with dirty-state indicator.
 * Impact simulator trigger → result card (Recharts BarChart + mandatory disclaimer D-36-08).
 * Policy version history table with "Restaurar" AlertDialog (D-36-09).
 * Locked compliance toggles (RNE + IA disclosure) with Tooltip (T-36-11-04 mitigation).
 *
 * Hooks consumed (from 36-07):
 *   - usePoliciesConfig  — GET/PUT /api/agency/:id/cobranza/policy
 *   - usePolicyVersions  — GET /api/agency/:id/cobranza/policy-versions
 *   - usePolicyImpact    — POST /api/agency/:id/cobranza/policy/simulate
 *
 * XR-03: all interactive elements min-h-[44px].
 * XR-05: all strings via t() — no hardcoded Spanish.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  ChartBar,
  FloppyDisk,
  ArrowCounterClockwise,
  CircleNotch,
  X,
  Warning,
} from '@phosphor-icons/react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts'

import { useI18n } from '@/lib/i18n'
import { usePoliciesConfig } from '@/lib/hooks/cobranza/use-policies-config'
import { usePolicyVersions, type PolicyVersionRow } from '@/lib/hooks/cobranza/use-policy-versions'
import { usePolicyImpact } from '@/lib/hooks/cobranza/use-policy-impact'
import { NoDataYetBadge } from '@/components/data-display/no-data-yet-badge'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ─── Policy shape (typed, matching PolicyConfig from interfaces block) ─────────

interface PolicyConfig {
  cadencia: {
    maxCallsPerWeek: number
    maxWhatsappPerWeek: number
    contactStartHour: string
    contactEndHour: string
    blockedDays: string[]
  }
  negociacion: {
    maxDiscountTier: number
    maxPaymentPlanMonths: number
    minPromiseAmountCop: number
  }
  escalacion: {
    maxDaysBeforeEscalation: number
    brokenPromisesThreshold: number
    autoEscalateToLegal: boolean
  }
  compliance: {
    verifyRneBeforeCall: boolean
    aiDisclosure: boolean
    callRecording: boolean
  }
}

const BLOCKED_DAY_OPTIONS = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
  'festivos',
] as const

const DISCOUNT_TIER_LABELS: Record<number, string> = {
  1: 'Ninguno',
  2: 'Hasta 5%',
  3: 'Hasta 10%',
  4: 'Hasta 20%',
  5: 'Máximo 30%',
}

const DEFAULT_POLICY: PolicyConfig = {
  cadencia: {
    maxCallsPerWeek: 3,
    maxWhatsappPerWeek: 5,
    contactStartHour: '08:00',
    contactEndHour: '18:00',
    blockedDays: ['sabado', 'domingo', 'festivos'],
  },
  negociacion: {
    maxDiscountTier: 1,
    maxPaymentPlanMonths: 12,
    minPromiseAmountCop: 50000,
  },
  escalacion: {
    maxDaysBeforeEscalation: 30,
    brokenPromisesThreshold: 3,
    autoEscalateToLegal: false,
  },
  compliance: {
    verifyRneBeforeCall: true,
    aiDisclosure: true,
    callRecording: true,
  },
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6 space-y-4 animate-pulse">
      <div className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3" />
      <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-2/3" />
      <div className="border-t border-neutral-100 dark:border-neutral-800" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-11 bg-neutral-100 dark:bg-neutral-800 rounded" />
        <div className="h-11 bg-neutral-100 dark:bg-neutral-800 rounded" />
        <div className="h-11 bg-neutral-100 dark:bg-neutral-800 rounded" />
        <div className="h-11 bg-neutral-100 dark:bg-neutral-800 rounded" />
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CobranzaConfiguracionPage() {
  const { t } = useI18n()

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const {
    data: configData,
    isLoading,
    error: configError,
    refetch: refetchConfig,
    savePolicy,
  } = usePoliciesConfig()

  const {
    data: versionsData,
    isLoading: versionsLoading,
    refetch: refetchVersions,
  } = usePolicyVersions()

  const { data: simulatorData, isSimulating, simulate } = usePolicyImpact()

  // ── Local state ────────────────────────────────────────────────────────────
  const [localPolicy, setLocalPolicy] = useState<PolicyConfig>(DEFAULT_POLICY)
  const [simulatorOpen, setSimulatorOpen] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [rollbackTarget, setRollbackTarget] = useState<PolicyVersionRow | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [rollbackError, setRollbackError] = useState<string | null>(null)

  // Saved snapshot for dirty detection
  const savedPolicyRef = useRef<string>(JSON.stringify(DEFAULT_POLICY))

  // Initialise localPolicy from fetched data
  useEffect(() => {
    if (configData?.policy) {
      const fetched = configData.policy as unknown as PolicyConfig
      setLocalPolicy(fetched)
      savedPolicyRef.current = JSON.stringify(fetched)
    }
  }, [configData])

  const isDirty = JSON.stringify(localPolicy) !== savedPolicyRef.current

  // ── Field updaters ─────────────────────────────────────────────────────────

  const updateCadencia = useCallback(
    <K extends keyof PolicyConfig['cadencia']>(key: K, value: PolicyConfig['cadencia'][K]) => {
      setLocalPolicy((prev) => ({
        ...prev,
        cadencia: { ...prev.cadencia, [key]: value },
      }))
    },
    [],
  )

  const updateNegociacion = useCallback(
    <K extends keyof PolicyConfig['negociacion']>(
      key: K,
      value: PolicyConfig['negociacion'][K],
    ) => {
      setLocalPolicy((prev) => ({
        ...prev,
        negociacion: { ...prev.negociacion, [key]: value },
      }))
    },
    [],
  )

  const updateEscalacion = useCallback(
    <K extends keyof PolicyConfig['escalacion']>(key: K, value: PolicyConfig['escalacion'][K]) => {
      setLocalPolicy((prev) => ({
        ...prev,
        escalacion: { ...prev.escalacion, [key]: value },
      }))
    },
    [],
  )

  const updateCompliance = useCallback(
    <K extends keyof PolicyConfig['compliance']>(key: K, value: PolicyConfig['compliance'][K]) => {
      setLocalPolicy((prev) => ({
        ...prev,
        compliance: { ...prev.compliance, [key]: value },
      }))
    },
    [],
  )

  const toggleBlockedDay = useCallback((day: string, checked: boolean) => {
    setLocalPolicy((prev) => ({
      ...prev,
      cadencia: {
        ...prev.cadencia,
        blockedDays: checked
          ? [...prev.cadencia.blockedDays, day]
          : prev.cadencia.blockedDays.filter((d) => d !== day),
      },
    }))
  }, [])

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleCancel = useCallback(() => {
    if (configData?.policy) {
      setLocalPolicy(configData.policy as unknown as PolicyConfig)
    } else {
      setLocalPolicy(DEFAULT_POLICY)
    }
    setSimulatorOpen(false)
  }, [configData])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setSaveError(null)
    try {
      await savePolicy(localPolicy as unknown as Record<string, unknown>)
      savedPolicyRef.current = JSON.stringify(localPolicy)
      await Promise.all([refetchConfig(), refetchVersions()])
      setSaveDialogOpen(false)
    } catch {
      setSaveError(t('inmobiliaria.ai.policies.error.save'))
    } finally {
      setIsSaving(false)
    }
  }, [localPolicy, savePolicy, refetchConfig, refetchVersions, t])

  const handleRollback = useCallback(async () => {
    if (!rollbackTarget) return
    setRollbackError(null)
    try {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      const agencyId = (configData as unknown as { agencyId?: string })?.agencyId
      if (agentUrl && agencyId) {
        await globalThis.fetch(
          `${agentUrl}/api/agency/${agencyId}/cobranza/policy-versions/${rollbackTarget.versionNumber}/rollback`,
          { method: 'POST', credentials: 'include' },
        )
      }
      await Promise.all([refetchConfig(), refetchVersions()])
      setRollbackTarget(null)
    } catch {
      setRollbackError(t('inmobiliaria.ai.policies.error.rollback'))
    }
  }, [rollbackTarget, configData, refetchConfig, refetchVersions, t])

  const runSimulator = useCallback(async () => {
    await simulate(localPolicy as unknown as object)
    setSimulatorOpen(true)
  }, [simulate, localPolicy])

  // ─────────────────────────────────────────────────────────────────────────────
  // Render — loading state
  // ─────────────────────────────────────────────────────────────────────────────

  if (isLoading && !configData) {
    return (
      <main className="p-4 md:p-6 space-y-6">
        <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-64 animate-pulse" />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </main>
    )
  }

  if (configError && !configData) {
    return (
      <main className="p-4 md:p-6">
        <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-4 flex items-start gap-3">
          <Warning weight="fill" className="h-5 w-5 text-rose-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <p className="text-sm text-rose-800 dark:text-rose-200">
              {t('inmobiliaria.ai.policies.error.load')}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              onClick={() => void refetchConfig()}
            >
              {t('inmobiliaria.ai.policies.error.retry')}
            </Button>
          </div>
        </div>
      </main>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Render — versions data
  // ─────────────────────────────────────────────────────────────────────────────

  const versions = versionsData?.versions ?? []
  const activeVersionNumber = versionsData?.activeVersionNumber ?? null

  // ─────────────────────────────────────────────────────────────────────────────
  // Render — main page
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <main className="p-4 md:p-6 space-y-6 pb-24">
        {/* Page heading */}
        <h1 className="text-3xl font-semibold font-[Manrope,sans-serif] text-foreground">
          {t('inmobiliaria.ai.policies.title')}
        </h1>

        {/* ─── Section 1: Cadencia de contacto ─────────────────────────────── */}
        <section
          className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6 space-y-4"
          aria-labelledby="section-cadencia"
        >
          <div>
            <h2 id="section-cadencia" className="text-xl font-semibold text-foreground">
              {t('inmobiliaria.ai.policies.cadencia.title')}
            </h2>
            <p className="text-sm text-neutral-500 mt-1">
              {t('inmobiliaria.ai.policies.cadencia.description')}
            </p>
          </div>
          <div className="border-t border-neutral-100 dark:border-neutral-800" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* maxCallsPerWeek */}
            <div className="space-y-1">
              <Label htmlFor="maxCallsPerWeek" className="text-sm">
                {t('inmobiliaria.ai.policies.fields.maxCallsPerWeek')}
              </Label>
              <Input
                id="maxCallsPerWeek"
                name="maxCallsPerWeek"
                type="number"
                min={0}
                max={14}
                className="min-h-[44px]"
                value={localPolicy.cadencia.maxCallsPerWeek}
                onChange={(e) => updateCadencia('maxCallsPerWeek', Number(e.target.value))}
              />
            </div>
            {/* maxWhatsappPerWeek */}
            <div className="space-y-1">
              <Label htmlFor="maxWhatsappPerWeek" className="text-sm">
                {t('inmobiliaria.ai.policies.fields.maxWaPerWeek')}
              </Label>
              <Input
                id="maxWhatsappPerWeek"
                name="maxWhatsappPerWeek"
                type="number"
                min={0}
                max={14}
                className="min-h-[44px]"
                value={localPolicy.cadencia.maxWhatsappPerWeek}
                onChange={(e) => updateCadencia('maxWhatsappPerWeek', Number(e.target.value))}
              />
            </div>
            {/* contactStartHour */}
            <div className="space-y-1">
              <Label htmlFor="contactStartHour" className="text-sm">
                {t('inmobiliaria.ai.policies.fields.contactStartTime')}
              </Label>
              <Input
                id="contactStartHour"
                type="time"
                className="min-h-[44px]"
                value={localPolicy.cadencia.contactStartHour}
                onChange={(e) => updateCadencia('contactStartHour', e.target.value)}
              />
            </div>
            {/* contactEndHour */}
            <div className="space-y-1">
              <Label htmlFor="contactEndHour" className="text-sm">
                {t('inmobiliaria.ai.policies.fields.contactEndTime')}
              </Label>
              <Input
                id="contactEndHour"
                type="time"
                className="min-h-[44px]"
                value={localPolicy.cadencia.contactEndHour}
                onChange={(e) => updateCadencia('contactEndHour', e.target.value)}
              />
            </div>
          </div>
          {/* blockedDays checkboxes */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {t('inmobiliaria.ai.policies.fields.blockDays')}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BLOCKED_DAY_OPTIONS.map((day) => (
                <div key={day} className="flex items-center gap-2 min-h-[44px]">
                  <Checkbox
                    id={`blocked-${day}`}
                    checked={localPolicy.cadencia.blockedDays.includes(day)}
                    onCheckedChange={(checked) => toggleBlockedDay(day, !!checked)}
                  />
                  <Label htmlFor={`blocked-${day}`} className="text-sm capitalize cursor-pointer">
                    {day}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Section 2: Negociación ──────────────────────────────────────── */}
        <section
          className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6 space-y-4"
          aria-labelledby="section-negociacion"
        >
          <div>
            <h2 id="section-negociacion" className="text-xl font-semibold text-foreground">
              {t('inmobiliaria.ai.policies.negociacion.title')}
            </h2>
            <p className="text-sm text-neutral-500 mt-1">
              {t('inmobiliaria.ai.policies.negociacion.description')}
            </p>
          </div>
          <div className="border-t border-neutral-100 dark:border-neutral-800" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* maxDiscountTier */}
            <div className="space-y-1">
              <Label htmlFor="maxDiscountTier" className="text-sm">
                {t('inmobiliaria.ai.policies.fields.maxDiscountTier')}
              </Label>
              <Select
                value={String(localPolicy.negociacion.maxDiscountTier)}
                onValueChange={(val) => updateNegociacion('maxDiscountTier', Number(val))}
              >
                <SelectTrigger id="maxDiscountTier" className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((tier) => (
                    <SelectItem key={tier} value={String(tier)}>
                      {DISCOUNT_TIER_LABELS[tier]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* maxPaymentPlanMonths */}
            <div className="space-y-1">
              <Label htmlFor="maxPaymentPlanMonths" className="text-sm">
                {t('inmobiliaria.ai.policies.fields.maxPaymentMonths')}
              </Label>
              <Input
                id="maxPaymentPlanMonths"
                type="number"
                min={1}
                max={48}
                className="min-h-[44px]"
                value={localPolicy.negociacion.maxPaymentPlanMonths}
                onChange={(e) => updateNegociacion('maxPaymentPlanMonths', Number(e.target.value))}
              />
            </div>
            {/* minPromiseAmountCop */}
            <div className="space-y-1">
              <Label htmlFor="minPromiseAmountCop" className="text-sm">
                {t('inmobiliaria.ai.policies.fields.minPromiseAmount')}
              </Label>
              <Input
                id="minPromiseAmountCop"
                type="number"
                className="min-h-[44px]"
                placeholder="ej. 50000"
                value={localPolicy.negociacion.minPromiseAmountCop}
                onChange={(e) => updateNegociacion('minPromiseAmountCop', Number(e.target.value))}
              />
            </div>
          </div>
        </section>

        {/* ─── Section 3: Escalación ───────────────────────────────────────── */}
        <section
          className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6 space-y-4"
          aria-labelledby="section-escalacion"
        >
          <div>
            <h2 id="section-escalacion" className="text-xl font-semibold text-foreground">
              {t('inmobiliaria.ai.policies.escalacion.title')}
            </h2>
            <p className="text-sm text-neutral-500 mt-1">
              {t('inmobiliaria.ai.policies.escalacion.description')}
            </p>
          </div>
          <div className="border-t border-neutral-100 dark:border-neutral-800" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* maxDaysBeforeEscalation */}
            <div className="space-y-1">
              <Label htmlFor="maxDaysBeforeEscalation" className="text-sm">
                {t('inmobiliaria.ai.policies.fields.maxDaysBeforeEscalation')}
              </Label>
              <Input
                id="maxDaysBeforeEscalation"
                type="number"
                min={1}
                max={90}
                className="min-h-[44px]"
                value={localPolicy.escalacion.maxDaysBeforeEscalation}
                onChange={(e) =>
                  updateEscalacion('maxDaysBeforeEscalation', Number(e.target.value))
                }
              />
            </div>
            {/* brokenPromisesThreshold */}
            <div className="space-y-1">
              <Label htmlFor="brokenPromisesThreshold" className="text-sm">
                {t('inmobiliaria.ai.policies.fields.brokenPromiseThreshold')}
              </Label>
              <Input
                id="brokenPromisesThreshold"
                type="number"
                min={1}
                max={10}
                className="min-h-[44px]"
                value={localPolicy.escalacion.brokenPromisesThreshold}
                onChange={(e) =>
                  updateEscalacion('brokenPromisesThreshold', Number(e.target.value))
                }
              />
            </div>
            {/* autoEscalateToLegal */}
            <div className="flex items-center justify-between min-h-[44px] md:col-span-2">
              <Label htmlFor="autoEscalateToLegal" className="text-sm cursor-pointer">
                {t('inmobiliaria.ai.policies.fields.autoEscalateToLegal')}
              </Label>
              <Switch
                id="autoEscalateToLegal"
                checked={localPolicy.escalacion.autoEscalateToLegal}
                onCheckedChange={(checked) => updateEscalacion('autoEscalateToLegal', checked)}
              />
            </div>
          </div>
        </section>

        {/* ─── Section 4: Compliance ───────────────────────────────────────── */}
        <section
          className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6 space-y-4"
          aria-labelledby="section-compliance"
        >
          <div>
            <h2 id="section-compliance" className="text-xl font-semibold text-foreground">
              {t('inmobiliaria.ai.policies.compliance.title')}
            </h2>
            <p className="text-sm text-neutral-500 mt-1">
              {t('inmobiliaria.ai.policies.compliance.description')}
            </p>
          </div>
          <div className="border-t border-neutral-100 dark:border-neutral-800" />
          <div className="space-y-2">
            {/* verifyRneBeforeCall — LOCKED (T-36-11-04) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex items-center justify-between min-h-[44px] opacity-60 cursor-not-allowed"
                  aria-disabled="true"
                  aria-label={t('inmobiliaria.ai.policies.fields.lockedAriaLabel')}
                >
                  <Label className="text-sm text-foreground select-none">
                    {t('inmobiliaria.ai.policies.fields.verifyRne')}
                  </Label>
                  <Switch
                    checked={localPolicy.compliance.verifyRneBeforeCall}
                    disabled={true}
                    aria-disabled="true"
                    role="switch"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{t('inmobiliaria.ai.policies.fields.lockedTooltip')}</p>
              </TooltipContent>
            </Tooltip>

            {/* aiDisclosure — LOCKED (T-36-11-04) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex items-center justify-between min-h-[44px] opacity-60 cursor-not-allowed"
                  aria-disabled="true"
                  aria-label={t('inmobiliaria.ai.policies.fields.lockedAriaLabel')}
                >
                  <Label className="text-sm text-foreground select-none">
                    {t('inmobiliaria.ai.policies.fields.aiDisclosure')}
                  </Label>
                  <Switch
                    checked={localPolicy.compliance.aiDisclosure}
                    disabled={true}
                    aria-disabled="true"
                    role="switch"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{t('inmobiliaria.ai.policies.fields.lockedTooltip')}</p>
              </TooltipContent>
            </Tooltip>

            {/* callRecording — NOT locked, user can toggle */}
            <div className="flex items-center justify-between min-h-[44px]">
              <Label htmlFor="callRecording" className="text-sm cursor-pointer">
                {t('inmobiliaria.ai.policies.fields.recordCalls')}
              </Label>
              <Switch
                id="callRecording"
                checked={localPolicy.compliance.callRecording}
                onCheckedChange={(checked) => updateCompliance('callRecording', checked)}
              />
            </div>
          </div>
        </section>

        {/* ─── Impact simulator trigger ─────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            disabled={!isDirty || isSimulating}
            onClick={() => void runSimulator()}
            className="flex items-center gap-2 min-h-[44px]"
          >
            {isSimulating ? (
              <CircleNotch className="h-4 w-4 animate-spin" />
            ) : (
              <ChartBar className="h-4 w-4" />
            )}
            {isSimulating
              ? t('inmobiliaria.ai.policies.simulator.simulating')
              : t('inmobiliaria.ai.policies.simulator.trigger')}
          </Button>
        </div>

        {/* ─── Simulator result card ────────────────────────────────────────── */}
        {simulatorOpen && (
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/30 p-5 space-y-4">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-xl font-semibold text-foreground">
                  {t('inmobiliaria.ai.policies.simulator.title')}
                </h3>
                {/* MANDATORY disclaimer caption — D-36-08, T-36-11-04 */}
                <p className="text-xs text-neutral-500 mt-1">
                  {t('inmobiliaria.ai.policies.simulator.disclaimer')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSimulatorOpen(false)}
                aria-label={t('inmobiliaria.ai.policies.simulator.dismiss')}
                className="text-neutral-400 hover:text-neutral-600 text-xs p-1 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {simulatorData && simulatorData.results.length === 0 && (
              <NoDataYetBadge
                reason={t('inmobiliaria.ai.policies.simulator.empty.body')}
                phase={36}
              />
            )}

            {simulatorData && simulatorData.results.length > 0 && (
              <>
                {/* Results table */}
                <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700 text-sm">
                    <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          {t('inmobiliaria.ai.policies.simulator.colDecision')}
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          {t('inmobiliaria.ai.policies.simulator.colCurrent')}
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          {t('inmobiliaria.ai.policies.simulator.colProposed')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-[#1a1a1c] divide-y divide-neutral-100 dark:divide-neutral-800">
                      {simulatorData.results.map((row) => {
                        const diff = row.proposedCount - row.currentCount
                        const diffClass =
                          diff > 0
                            ? 'text-rose-600'
                            : diff < 0
                              ? 'text-emerald-600'
                              : 'text-neutral-900 dark:text-neutral-100'
                        return (
                          <tr key={row.outcome}>
                            <td className="px-4 py-2 text-neutral-700 dark:text-neutral-300 capitalize">
                              {row.outcome}
                            </td>
                            <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                              {row.currentCount}
                            </td>
                            <td className={`px-4 py-2 text-right font-mono tabular-nums ${diffClass}`}>
                              {row.proposedCount}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Recharts BarChart (only when >= 2 rows) */}
                {simulatorData.results.length >= 2 && (
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={simulatorData.results}>
                        <XAxis dataKey="outcome" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <RechartsTooltip />
                        <Legend />
                        <Bar
                          dataKey="currentCount"
                          fill="#a3a3a3"
                          name={t('inmobiliaria.ai.policies.simulator.colCurrent')}
                        />
                        <Bar
                          dataKey="proposedCount"
                          fill="#5B5FEF"
                          name={t('inmobiliaria.ai.policies.simulator.colProposed')}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── Policy version history table ─────────────────────────────────── */}
        <section aria-labelledby="section-history">
          <h2 id="section-history" className="text-xl font-semibold text-foreground mb-4">
            {t('inmobiliaria.ai.policies.history.title')}
          </h2>

          {versionsLoading && !versionsData && (
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 animate-pulse">
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-full mb-2" />
              <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-3/4" />
            </div>
          )}

          {!versionsLoading && versions.length === 0 && (
            <NoDataYetBadge
              reason={t('inmobiliaria.ai.policies.history.empty')}
              phase={36}
            />
          )}

          {versions.length > 0 && (
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              {/* Versions sorted DESC by versionNumber — hook guarantees DESC order */}
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      {t('inmobiliaria.ai.policies.history.version')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      {t('inmobiliaria.ai.policies.history.savedBy')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      {t('inmobiliaria.ai.policies.history.date')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      {t('inmobiliaria.ai.policies.history.note')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      {t('inmobiliaria.ai.policies.history.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {versions.map((version, idx) => {
                    const isActive =
                      activeVersionNumber !== null
                        ? version.versionNumber === activeVersionNumber
                        : idx === 0
                    return (
                      <tr
                        key={version.id}
                        className={
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/10'
                            : 'bg-white dark:bg-[#1a1a1c]'
                        }
                      >
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-2">
                            <span
                              className={`font-mono text-xs ${isActive ? 'font-semibold text-foreground' : 'text-neutral-600 dark:text-neutral-400'}`}
                            >
                              v{version.versionNumber}
                            </span>
                            {isActive && (
                              <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                {t('inmobiliaria.ai.policies.history.active')}
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">
                          {version.createdByMemberId}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono tabular-nums text-neutral-500">
                          {new Date(version.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-500 italic">
                          {version.changeDescription ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          {!isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="min-h-[44px]"
                              aria-label={t('inmobiliaria.ai.policies.history.ariaRestore').replace(
                                '{version}',
                                String(version.versionNumber),
                              )}
                              onClick={() => setRollbackTarget(version)}
                            >
                              <ArrowCounterClockwise className="h-4 w-4 mr-1" />
                              {t('inmobiliaria.ai.policies.history.restore')}
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ─── Rollback AlertDialog ─────────────────────────────────────────── */}
        <AlertDialog
          open={rollbackTarget !== null}
          onOpenChange={(open) => {
            if (!open) setRollbackTarget(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('inmobiliaria.ai.policies.dialog.restore.title').replace(
                  '{version}',
                  String(rollbackTarget?.versionNumber ?? ''),
                )}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('inmobiliaria.ai.policies.dialog.restore.body').replace(
                  '{version}',
                  String(rollbackTarget?.versionNumber ?? ''),
                )}
                {rollbackError && (
                  <span className="block mt-2 text-rose-600 text-sm">{rollbackError}</span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRollbackTarget(null)}>
                {t('inmobiliaria.ai.policies.dialog.restore.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => void handleRollback()}
              >
                <ArrowCounterClockwise className="h-4 w-4 mr-1" />
                {t('inmobiliaria.ai.policies.dialog.restore.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ─── Save AlertDialog ─────────────────────────────────────────────── */}
        <AlertDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('inmobiliaria.ai.policies.dialog.save.title')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {simulatorOpen
                  ? t('inmobiliaria.ai.policies.dialog.save.body') +
                    ' ' +
                    t('inmobiliaria.ai.policies.simulator.title') +
                    '.'
                  : t('inmobiliaria.ai.policies.dialog.save.body')}
                {saveError && (
                  <span className="block mt-2 text-rose-600 text-sm">{saveError}</span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('inmobiliaria.ai.policies.dialog.save.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isSaving ? (
                  <CircleNotch className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <FloppyDisk className="h-4 w-4 mr-1" />
                )}
                {t('inmobiliaria.ai.policies.dialog.save.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>

      {/* ─── Sticky save footer ───────────────────────────────────────────── */}
      <div className="sticky bottom-0 z-20 bg-white dark:bg-[#1a1a1c] border-t border-neutral-200 dark:border-neutral-700 py-3 px-6 flex items-center justify-between">
        <div>
          {isDirty && (
            <span className="text-xs text-amber-600">
              {t('inmobiliaria.ai.policies.unsavedChanges')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="min-h-[44px]"
            disabled={!isDirty}
            onClick={handleCancel}
          >
            {t('inmobiliaria.ai.policies.cancel')}
          </Button>
          <Button
            size="sm"
            className="min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={!isDirty || isSaving}
            onClick={() => setSaveDialogOpen(true)}
          >
            <FloppyDisk className="h-4 w-4 mr-1" />
            {t('inmobiliaria.ai.policies.save')}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  )
}
