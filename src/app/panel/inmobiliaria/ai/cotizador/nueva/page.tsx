'use client'
// Phase 30 plan 30-05 (COTI-UI-02, D-08)
// 3-step new quote wizard. Raw cédula is NEVER sent in the POST body;
// hashCedula() is called at submit time only.

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { getAccessToken } from '@/lib/api/client'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useWizardDraft } from '@/lib/hooks/cotizador/use-wizard-draft'
import { hashCedula, CedulaValidationError } from '@/lib/cotizador/hash-cedula'
import { WizardStepIndicator } from '@/components/inmobiliaria/cotizador/WizardStepIndicator'
import { WizardStep1Candidato } from '@/components/inmobiliaria/cotizador/WizardStep1Candidato'
import { WizardStep2Propiedad } from '@/components/inmobiliaria/cotizador/WizardStep2Propiedad'
import { WizardStep3Review } from '@/components/inmobiliaria/cotizador/WizardStep3Review'
import { WizardRestoreBanner } from '@/components/inmobiliaria/cotizador/WizardRestoreBanner'
import { PageGuard } from '@/components/auth/PageGuard'

const EMPTY_CANDIDATO = { cedula: '', nombre: '', ciudad: '' }
const EMPTY_PROPIEDAD = { canonCop: '' as number | '', tipoInmueble: '', codeudoresCount: 0 }

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

  // Optional pre-fill from ?cedula= query param (COTI-UI-02 optional)
  useEffect(() => {
    const prefilledCedula = searchParams?.get('cedula')
    if (prefilledCedula && candidato.cedula === '' && !hasDraft) {
      setCandidato(prev => ({ ...prev, cedula: prefilledCedula }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    clear()
    setShowRestoreBanner(false)
    setCandidato(EMPTY_CANDIDATO)
    setPropiedad(EMPTY_PROPIEDAD)
    setStep(1)
  }, [clear])

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
    const stripped = candidato.cedula.replace(/[\s.\-]/g, '')
    if (!/^\d{7,10}$/.test(stripped)) {
      errors.cedula = t('inmobiliaria.ai.cotizador.nueva.errors.cedulaInvalida')
    }
    if (!candidato.nombre.trim()) {
      errors.nombre = t('inmobiliaria.ai.cotizador.nueva.errors.requerido')
    }
    if (!candidato.ciudad.trim()) {
      errors.ciudad = t('inmobiliaria.ai.cotizador.nueva.errors.requerido')
    }
    setStep1Errors(errors)
    return Object.keys(errors).length === 0
  }, [candidato, t])

  const handleStep1Next = useCallback(() => {
    if (!validateStep1()) return
    save({ step: 2, candidato, propiedad: { ...propiedad, canonCop: Number(propiedad.canonCop) || 0 } })
    setStep(2)
  }, [validateStep1, save, candidato, propiedad])

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
    setStep(3)
  }, [validateStep2, save, candidato, propiedad])

  // ---- Step 3 submit ----

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)
    setArcoError(false)
    setSubmitError(null)
    try {
      const cedulaHash = await hashCedula(candidato.cedula)
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      const agencyId = agency?.id
      if (!agentUrl || !agencyId) throw new Error('Configuration error')
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/cotizador/quote`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getAccessToken()}`,
          },
          body: JSON.stringify({
            cedulaHash,
            nombre: candidato.nombre,
            ciudad: candidato.ciudad,
            canonCop: Number(propiedad.canonCop),
            tipoInmueble: propiedad.tipoInmueble,
            codeudoresCount: propiedad.codeudoresCount,
          }),
        }
      )
      if (res.status === 451) {
        setArcoError(true)
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string })?.error ?? `Error ${res.status}`)
      }
      const { quoteId } = (await res.json()) as { quoteId: string }
      clear()
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
  }, [candidato, propiedad, agency, clear, router, t])

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
          {hasDraft && showRestoreBanner && (
            <WizardRestoreBanner
              onContinue={handleContinue}
              onStartFresh={handleStartFresh}
            />
          )}

          {step === 1 && (
            <WizardStep1Candidato
              value={candidato}
              onChange={handleCandidatoChange}
              onNext={handleStep1Next}
              errors={step1Errors}
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
