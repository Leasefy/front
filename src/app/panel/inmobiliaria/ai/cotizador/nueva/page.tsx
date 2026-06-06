'use client'
// Phase 30 plan 30-05 (COTI-UI-02, D-08)
// 3-step new quote wizard. Raw cédula is NEVER sent in the POST body;
// hashCedula() is called at submit time only.

import * as React from 'react'
import { useState, useCallback, useEffect } from 'react'

void React  // ensures React is in scope for classic-JSX transform under vitest
import { useRouter, useSearchParams } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useWizardDraft } from '@/lib/hooks/cotizador/use-wizard-draft'
import { useQuoteMetadata } from '@/lib/hooks/cotizador/use-quote-metadata'
import { hashCedula, CedulaValidationError } from '@/lib/cotizador/hash-cedula'
import { WizardStepIndicator } from '@/components/inmobiliaria/cotizador/WizardStepIndicator'
import { WizardStep1Candidato } from '@/components/inmobiliaria/cotizador/WizardStep1Candidato'
import { WizardStep2Propiedad } from '@/components/inmobiliaria/cotizador/WizardStep2Propiedad'
import { WizardStep3Review } from '@/components/inmobiliaria/cotizador/WizardStep3Review'
import { WizardRestoreBanner } from '@/components/inmobiliaria/cotizador/WizardRestoreBanner'
import { PageGuard } from '@/components/auth/PageGuard'
import { CotizadorWizardSkeleton } from '@/components/skeleton/panel/CotizadorWizardSkeleton'

const EMPTY_CANDIDATO = { cedula: '', nombre: '', ciudad: '' }
const EMPTY_PROPIEDAD = { canonCop: '' as number | '', tipoInmueble: '', codeudoresCount: 0 }

// Phase 33 D-33-10: re-quote mode detection & isolated draft key prefix
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const RE_QUOTE_DRAFT_KEY_PREFIX = 'cotizador.draft.wizard:'

export default function NuevaCotizacionPage() {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { agency } = useAuth()
  const { canAccess } = usePermissionsContext()
  const { draft, hasDraft, save, clear } = useWizardDraft()

  const canCreate = canAccess('cotizador', 'create-quote')

  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [showRestoreBanner, setShowRestoreBanner] = useState(true)
  const [candidato, setCandidato] = useState(EMPTY_CANDIDATO)
  const [propiedad, setPropiedad] = useState<{
    canonCop: number | ''
    tipoInmueble: string
    codeudoresCount: number
  }>(EMPTY_PROPIEDAD)
  const [step1Errors, setStep1Errors] = useState<{ cedula?: string; nombre?: string; ciudad?: string }>({})
  const [step2Errors, setStep2Errors] = useState<{ canonCop?: string; tipoInmueble?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [arcoError, setArcoError] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Phase 33 D-33-10 re-quote state
  const [prefillCedulaHash, setPrefillCedulaHash] = useState<string | null>(null)
  const [prefillFailed, setPrefillFailed] = useState(false)
  const [prefillDismissed, setPrefillDismissed] = useState(false)
  const [sessionCapError, setSessionCapError] = useState(false)

  // Phase 33 D-33-10: detect re-quote mode from ?from= query param
  const fromParam = searchParams?.get('from') ?? null
  const isValidUUID = fromParam !== null && UUID_REGEX.test(fromParam)
  const isReQuoteMode = isValidUUID
  const parentQuoteId = isValidUUID ? fromParam : null
  if (fromParam !== null && !isValidUUID && typeof window !== 'undefined') {
    console.warn('[cotizador/nueva] Invalid re-quote param value:', fromParam)
  }

  // Phase 33 D-33-10: fire metadata fetch unconditionally; hook short-circuits on empty quoteId
  const parentMetadata = useQuoteMetadata(parentQuoteId ?? '')

  // NOTE: a ?cedula= query-param pre-fill was intentionally removed (Ley 1581 / D-08).
  // Accepting a raw cédula from the URL leaks PII to browser history, the Referer header,
  // and server logs. The operator enters the cédula via the step-1 input instead, and it is
  // hashed at submit time. Do not reintroduce a raw-PII prefill here.

  // Phase 33 D-33-10: hydrate wizard state from parent quote metadata in re-quote mode
  useEffect(() => {
    if (!isReQuoteMode) return
    if (parentMetadata.isLoading) return
    if (parentMetadata.error !== null) {
      // Pre-fill fetch failed (parent 404 or network) — D-33-14 error path 1
      setPrefillFailed(true)
      return
    }
    if (!parentMetadata.data) return

    const data = parentMetadata.data

    // D-08 INVARIANT: only cedulaHash (opaque hex) enters wizard state.
    // Raw cédula digits are never fetched or stored in re-quote mode.
    if (data.cedulaHash) {
      setPrefillCedulaHash(data.cedulaHash)
    }
    // else: backend didn't return cedulaHash (pre-33-03 response) — operator must
    // manually enter a new cédula via normal step 1 input.

    setPropiedad({
      canonCop: data.canonCop,
      // codeudoresCount not in GET response — defaults to 0 per Phase 33 D-33-10
      codeudoresCount: 0,
      tipoInmueble: data.tipoInmueble,
    })
    // ciudad lives in candidato for the wizard's step-1 ciudad field
    setCandidato(prev => ({ ...prev, ciudad: data.ciudad }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentMetadata.isLoading, parentMetadata.error, parentMetadata.data, isReQuoteMode])

  // ---- Restore handlers ----

  const handleContinue = useCallback(() => {
    if (draft) {
      setCandidato(draft.candidato)
      setPropiedad(draft.propiedad)
      setStep(draft.step)
    }
    setShowRestoreBanner(false)
  }, [draft])

  const handleStartFresh = useCallback(() => {
    // Phase 33 D-33-10: in re-quote mode, discard re-quote draft and navigate away from ?from=
    if (isReQuoteMode && parentQuoteId && typeof window !== 'undefined') {
      localStorage.removeItem(`${RE_QUOTE_DRAFT_KEY_PREFIX}${parentQuoteId}`)
      router.replace('/panel/inmobiliaria/ai/cotizador/nueva')
      return
    }
    clear()
    setShowRestoreBanner(false)
    setCandidato(EMPTY_CANDIDATO)
    setPropiedad(EMPTY_PROPIEDAD)
    setStep(1)
  }, [clear, isReQuoteMode, parentQuoteId, router])

  // Phase 33 D-33-10: operator clicks "Cambiar candidato" — clears pre-filled hash,
  // re-opens normal cédula input. Nombre and ciudad pre-fill remain.
  const handleClearPrefill = useCallback(() => {
    setPrefillCedulaHash(null)
    setCandidato(prev => ({ ...prev, cedula: '' }))
  }, [])

  // ---- Step 1 handlers ----

  const handleCandidatoChange = useCallback(
    (field: 'cedula' | 'nombre' | 'ciudad', value: string) => {
      setCandidato(prev => ({ ...prev, [field]: value }))
      setStep1Errors(prev => ({ ...prev, [field]: undefined }))
    },
    []
  )

  const handleCedulaBlur = useCallback(() => {
    const stripped = candidato.cedula.replace(/[\s.\-]/g, '')
    if (candidato.cedula !== '' && !/^\d{7,10}$/.test(stripped)) {
      setStep1Errors(prev => ({
        ...prev,
        cedula: t('inmobiliaria.ai.cotizador.nueva.errors.cedulaInvalida'),
      }))
    }
  }, [candidato.cedula, t])

  const validateStep1 = useCallback((): boolean => {
    const errors: { cedula?: string; nombre?: string; ciudad?: string } = {}
    // Phase 33 D-33-10: in re-quote mode with pre-fill active, cédula is pre-filled
    // via hash — there is no raw input to validate. Skip the cédula regex check.
    if (!prefillCedulaHash) {
      const stripped = candidato.cedula.replace(/[\s.\-]/g, '')
      if (!/^\d{7,10}$/.test(stripped)) {
        errors.cedula = t('inmobiliaria.ai.cotizador.nueva.errors.cedulaInvalida')
      }
    }
    if (!candidato.nombre.trim()) {
      errors.nombre = t('inmobiliaria.ai.cotizador.nueva.errors.requerido')
    }
    if (!candidato.ciudad.trim()) {
      errors.ciudad = t('inmobiliaria.ai.cotizador.nueva.errors.requerido')
    }
    setStep1Errors(errors)
    return Object.keys(errors).length === 0
  }, [candidato, t, prefillCedulaHash])

  const handleStep1Next = useCallback(() => {
    if (!validateStep1()) return
    save({ step: 2, candidato, propiedad: { ...propiedad, canonCop: Number(propiedad.canonCop) || 0 } })
    // Phase 33 D-33-10: also persist re-quote draft with isolated key
    if (isReQuoteMode && parentQuoteId && typeof window !== 'undefined') {
      const rqDraft = {
        step: 2,
        candidato,
        propiedad: { ...propiedad, canonCop: Number(propiedad.canonCop) || 0 },
        prefillCedulaHash,
        updatedAt: Date.now(),
      }
      localStorage.setItem(`${RE_QUOTE_DRAFT_KEY_PREFIX}${parentQuoteId}`, JSON.stringify(rqDraft))
    }
    setStep(2)
  }, [validateStep1, save, candidato, propiedad, isReQuoteMode, parentQuoteId, prefillCedulaHash])

  // ---- Step 2 handlers ----

  const handlePropiedadChange = useCallback(
    (field: 'canonCop' | 'tipoInmueble' | 'codeudoresCount', value: number | string) => {
      setPropiedad(prev => ({ ...prev, [field]: value }))
      setStep2Errors(prev => ({ ...prev, [field]: undefined }))
    },
    []
  )

  const validateStep2 = useCallback((): boolean => {
    const errors: { canonCop?: string; tipoInmueble?: string } = {}
    if (propiedad.canonCop === '' || Number(propiedad.canonCop) <= 0) {
      errors.canonCop = t('inmobiliaria.ai.cotizador.nueva.errors.canonPositivo')
    }
    if (!propiedad.tipoInmueble) {
      errors.tipoInmueble = t('inmobiliaria.ai.cotizador.nueva.errors.tipoRequerido')
    }
    setStep2Errors(errors)
    return Object.keys(errors).length === 0
  }, [propiedad, t])

  const handleStep2Next = useCallback(() => {
    if (!validateStep2()) return
    save({ step: 3, candidato, propiedad: { ...propiedad, canonCop: Number(propiedad.canonCop) } })
    // Phase 33 D-33-10: also persist re-quote draft with isolated key
    if (isReQuoteMode && parentQuoteId && typeof window !== 'undefined') {
      const rqDraft = {
        step: 3,
        candidato,
        propiedad: { ...propiedad, canonCop: Number(propiedad.canonCop) || 0 },
        prefillCedulaHash,
        updatedAt: Date.now(),
      }
      localStorage.setItem(`${RE_QUOTE_DRAFT_KEY_PREFIX}${parentQuoteId}`, JSON.stringify(rqDraft))
    }
    setStep(3)
  }, [validateStep2, save, candidato, propiedad, isReQuoteMode, parentQuoteId, prefillCedulaHash])

  // ---- Step 3 submit ----

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)
    setArcoError(false)
    setSubmitError(null)
    setSessionCapError(false)
    try {
      // Phase 33 D-33-10 / D-08: build submit body. Re-quote mode with active pre-fill
      // uses the backend-provided cedulaHash directly (never call hashCedula()).
      const submitBody: Record<string, unknown> = {
        nombre: candidato.nombre,
        ciudad: candidato.ciudad,
        canonCop: Number(propiedad.canonCop),
        tipoInmueble: propiedad.tipoInmueble,
        codeudoresCount: propiedad.codeudoresCount,
      }
      // D-08 INVARIANT: POST body NEVER contains a 'cedula' field — only 'cedulaHash'.
      if (prefillCedulaHash) {
        // Pre-fill active: hash already a 64-char SHA-256 hex from backend.
        submitBody.cedulaHash = prefillCedulaHash
      } else {
        // Normal path (new cédula entered by operator): hash the raw input.
        submitBody.cedulaHash = await hashCedula(candidato.cedula)
      }
      // Phase 33 D-33-10: link counterfactual to its parent when in re-quote mode
      // (unless operator dismissed the pre-fill failure banner — fresh quote then).
      if (isReQuoteMode && parentQuoteId && !prefillDismissed) {
        submitBody.re_quote_of = parentQuoteId
      }

      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      const agencyId = agency?.id
      if (!agentUrl || !agencyId) throw new Error('Configuration error')
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/cotizador/quote`,
        {
          method: 'POST',
          headers: agentAuthHeaders({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(submitBody),
        }
      )
      if (res.status === 451) {
        setArcoError(true)
        return
      }
      // Phase 33 D-33-14 error path 2: per-session re-quote cap (G9)
      if (res.status === 429) {
        setSessionCapError(true)
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string })?.error ?? `Error ${res.status}`)
      }
      const { quoteId } = (await res.json()) as { quoteId: string }
      clear()
      // Phase 33 D-33-10: also clear the per-parent re-quote draft on success
      if (isReQuoteMode && parentQuoteId && typeof window !== 'undefined') {
        localStorage.removeItem(`${RE_QUOTE_DRAFT_KEY_PREFIX}${parentQuoteId}`)
      }
      router.push(`/panel/inmobiliaria/ai/cotizador/${quoteId}`)
    } catch (err) {
      if (err instanceof CedulaValidationError) {
        setStep1Errors({ cedula: t('inmobiliaria.ai.cotizador.nueva.errors.cedulaInvalida') })
        setStep(1)
      } else {
        setSubmitError(err instanceof Error ? err.message : 'Error desconocido')
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [candidato, propiedad, agency, clear, router, t, prefillCedulaHash, isReQuoteMode, parentQuoteId, prefillDismissed])

  // ── Skeleton guard (Phase 38 plan 38-04b / D-38-04 wizard rule) ───────────
  // Re-quote hydration only — normal new-quote path always has immediate form
  // state, so no skeleton there. No EmptyState (wizard always has form state).
  if (isReQuoteMode && parentMetadata.isLoading) {
    return (
      <PageGuard module="cotizador" action="view">
        <CotizadorWizardSkeleton />
      </PageGuard>
    )
  }

  return (
    <PageGuard module="cotizador" action="view">
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card px-4 py-4 sm:px-6">
          <h1 className="text-h4 text-foreground">
            {t('inmobiliaria.ai.cotizador.nueva.title')}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t('inmobiliaria.ai.cotizador.nueva.subtitle')}
          </p>
        </div>

        {/* Step indicator */}
        <WizardStepIndicator totalSteps={3} currentStep={step} />

        {/* Main content */}
        <div className="mx-auto max-w-lg px-4 pb-8 sm:px-6">
          {/* Phase 33 D-33-14: pre-fill GET failure banner — 404/network on parent quote */}
          {isReQuoteMode && prefillFailed && !prefillDismissed && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4"
            >
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {t('inmobiliaria.ai.cotizador.reQuote.prefillFailed.banner')}
              </p>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const hist = typeof window !== 'undefined' ? window.history.length : 0
                    if (hist > 1) router.back()
                    else router.push('/panel/inmobiliaria/ai/cotizador')
                  }}
                  className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  {t('inmobiliaria.ai.cotizador.reQuote.prefillFailed.volver')}
                </button>
                <button
                  type="button"
                  onClick={() => setPrefillDismissed(true)}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {t('inmobiliaria.ai.cotizador.reQuote.prefillFailed.continuar')}
                </button>
              </div>
            </div>
          )}

          {hasDraft && showRestoreBanner && (
            <WizardRestoreBanner
              onContinue={handleContinue}
              onStartFresh={handleStartFresh}
            />
          )}

          {/* Phase 33 D-33-10: re-using cédula notice (replaces cédula input semantically) */}
          {step === 1 && prefillCedulaHash && (
            <div
              role="region"
              aria-label={t('inmobiliaria.ai.cotizador.reQuote.cedulaNotice.ariaLabel')}
              className="mb-4 flex items-center justify-between rounded-xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 px-4 py-3"
            >
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {t('inmobiliaria.ai.cotizador.reQuote.cedulaNotice.message')}
              </p>
              <button
                type="button"
                onClick={handleClearPrefill}
                className="ml-3 shrink-0 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                {t('inmobiliaria.ai.cotizador.reQuote.cedulaNotice.changeButton')}
              </button>
            </div>
          )}

          {step === 1 && (
            <WizardStep1Candidato
              value={candidato}
              onChange={handleCandidatoChange}
              onNext={handleStep1Next}
              errors={prefillCedulaHash ? { ...step1Errors, cedula: undefined } : step1Errors}
              onCedulaBlur={handleCedulaBlur}
            />
          )}

          {step === 2 && (
            <WizardStep2Propiedad
              value={propiedad}
              onChange={handlePropiedadChange}
              onNext={handleStep2Next}
              onBack={() => setStep(1)}
              errors={step2Errors}
            />
          )}

          {step === 3 && (
            <WizardStep3Review
              candidato={candidato}
              propiedad={{ ...propiedad, canonCop: Number(propiedad.canonCop) }}
              onSubmit={handleSubmit}
              onBack={() => setStep(2)}
              isLoading={isSubmitting}
              arcoError={arcoError}
              canCreate={canCreate}
            />
          )}

          {/* Phase 33 D-33-14 error path 2: per-session re-quote cap (HTTP 429) */}
          {sessionCapError && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-4 text-sm text-rose-700 dark:text-rose-300"
            >
              {t('inmobiliaria.ai.cotizador.reQuote.sessionCapHit')}
            </div>
          )}

          {submitError && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-4 text-sm text-rose-700 dark:text-rose-300"
            >
              {submitError}
            </div>
          )}
        </div>
      </div>
    </PageGuard>
  )
}
