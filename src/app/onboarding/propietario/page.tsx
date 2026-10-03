'use client'

import { LeasefyLogotype } from '@/components/brand/LeasefySymbol';
import { useState, useEffect, useMemo, Suspense } from 'react'
import { toast } from 'sonner'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/use-auth'
import { BrandHomeLink } from '@/components/brand/BrandHomeLink'
import { motion } from 'framer-motion'
import { Appear, CrossFade, Presence, motionScale, motionSpring } from '@leasefy/cadence'
import { ArrowRight, ArrowLeft, Check, Shield, House, User, Phone, Envelope, ChatCircle, MapPin, CurrencyDollar, Rocket, SealCheck, Money, X } from '@phosphor-icons/react'
import { cn, sanitizeReturnUrl } from '@/lib/utils'
import { apiClient } from '@/lib/api/client'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import {
  celularParaElBack,
  partirElNombre,
  revisarDatosDelPropietario,
  type CampoDelPropietario,
  type ErroresDelPropietario,
} from './datos-del-propietario'

/** La ruta de cada dato en el cuerpo de `POST /users/me/onboarding` → su campo en el paso 1. */
const CAMPO_DEL_SERVIDOR: Record<string, CampoDelPropietario> = {
  firstName: 'displayName',
  lastName: 'displayName',
  phone: 'phone',
}
const CAMPOS_DEL_PASO_1: readonly CampoDelPropietario[] = ['displayName', 'phone']

// ============================================================================
// TextTs & Constants
// ============================================================================

type PreferredContact = 'whatsapp' | 'email' | 'phone'
type PropertyType = 'apartment' | 'house' | 'studio' | 'room'

interface OnboardingData {
  // Step 1: About You
  displayName: string
  phone: string
  preferredContact: PreferredContact
  // Step 2: Your Property
  propertyTextT: PropertyType | null
  propertyCity: string
  expectedRent: string
}

const PROPERTY_TYPES: { value: PropertyType; label: string; emoji: string }[] = [
  { value: 'apartment', label: 'Apartamento', emoji: '🏢' },
  { value: 'house', label: 'Casa', emoji: '🏠' },
  { value: 'studio', label: 'Estudio', emoji: '🛏️' },
  { value: 'room', label: 'Habitación', emoji: '🚪' },
]

const CITIES = [
  'Bogotá',
  'Medellín',
  'Cali',
  'Barranquilla',
  'Cartagena',
  'Bucaramanga',
  'Pereira',
  'Santa Marta',
  'Otra ciudad',
]

// ============================================================================
// Main Component
// ============================================================================

function OnboardingPropietarioContent() {
  const { locale } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawReturnUrl = searchParams.get('returnUrl')
  const returnUrl = rawReturnUrl ? sanitizeReturnUrl(rawReturnUrl, '/panel') : null
  const { refreshUser, isAuthenticated } = useAuth()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  // Shown when the user taps a disabled CTA: explains the first missing field
  const [disabledHint, setDisabledHint] = useState<string | null>(null)
  // La última pista, para que no se vacíe mientras sale (`Presence`).
  const [pistaVisible, setPistaVisible] = useState<string | null>(null)
  if (disabledHint && disabledHint !== pistaVisible) setPistaVisible(disabledHint)

  // Clear the disabled-CTA hint when changing steps
  useEffect(() => {
    setDisabledHint(null)
  }, [step])

  const [data, setData] = useState<OnboardingData>({
    displayName: '',
    phone: '',
    preferredContact: 'whatsapp',
    propertyTextT: null,
    propertyCity: '',
    expectedRent: '',
  })

  // Load saved progress
  useEffect(() => {
    const saved = localStorage.getItem('plan_onboarding_landlord')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.draft) {
          setData(prev => ({
            ...prev,
            displayName: parsed.draft.displayName || '',
            phone: parsed.draft.phone || '',
            preferredContact: parsed.draft.preferredContact || 'whatsapp',
            propertyTextT: parsed.draft.propertyTextT || null,
            propertyCity: parsed.draft.propertyCity || '',
            expectedRent: parsed.draft.rentPrice?.toString() || '',
          }))
        }
        if (parsed.isComplete) {
          setIsComplete(true)
        }
      } catch (e) {
        console.error('Error loading progress:', e)
      }
    }
  }, [])

  // Lo que el back rechazó por campo (un 400 con `campos`): se va al tocar el campo.
  const [erroresDelServidor, setErroresDelServidor] = useState<ErroresDelPropietario>({})
  // El celular se marca en rojo al salir de él (o al intentar seguir), no mientras se escribe.
  const [celularRevisado, setCelularRevisado] = useState(false)

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }))
    setErroresDelServidor((prev) => {
      const tocados = (Object.keys(updates) as (keyof OnboardingData)[]).filter(
        (k): k is CampoDelPropietario => k === 'displayName' || k === 'phone',
      )
      if (!tocados.some((c) => prev[c] !== undefined)) return prev
      const next = { ...prev }
      for (const c of tocados) delete next[c]
      return next
    })
  }

  // Las mismas reglas que el back (`datos-del-propietario.ts`).
  const erroresDelCliente = useMemo(
    () => revisarDatosDelPropietario({ displayName: data.displayName, phone: data.phone }),
    [data.displayName, data.phone],
  )
  const errorDelNombre =
    (data.displayName.trim() ? erroresDelCliente.displayName : undefined) ?? erroresDelServidor.displayName
  const errorDelCelular = (celularRevisado ? erroresDelCliente.phone : undefined) ?? erroresDelServidor.phone

  // When coming from publish wizard (returnUrl present), skip property step
  const fromPublish = !!returnUrl
  const totalSteps = fromPublish ? 1 : 2

  const isStep1Valid = Object.keys(erroresDelCliente).length === 0
  const isStep2Valid = data.propertyTextT !== null && data.propertyCity.trim().length > 0

  // First missing-field message per step (for the disabled-CTA tap affordance)
  const step1HintMessage =
    erroresDelCliente.displayName ?? erroresDelCliente.phone ?? 'Ingresa tu nombre completo para continuar'
  const step2HintMessage = data.propertyTextT === null
    ? 'Selecciona el tipo de propiedad para continuar'
    : 'Selecciona la ciudad para continuar'

  const handleNext = () => {
    if (step === 1 && isStep1Valid) {
      if (fromPublish) {
        // Skip step 2 — property info already captured in publish wizard
        handleSubmit()
      } else {
        setStep(2)
      }
    }
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
    }
  }

  const handleSubmit = async () => {
    if (!fromPublish && !isStep2Valid) return

    if (Object.keys(erroresDelCliente).length > 0) {
      setCelularRevisado(true)
      setStep(1)
      return
    }

    setIsSubmitting(true)
    setErroresDelServidor({})
    try {
      // Split displayName into first/last for backend
      const { firstName, lastName } = partirElNombre(data.displayName)

      // Call backend onboarding endpoint (el celular en E.164, o nada).
      await apiClient.post('/users/me/onboarding', {
        firstName,
        lastName,
        phone: celularParaElBack(data.phone),
        userType: 'LANDLORD',
      })

      // Refresh user in auth context so role/onboardingCompleted updates
      // Fire-and-forget: don't await because supabase.auth.getSession() can hang
      // when called right after a state change. The critical API call already succeeded.
      refreshUser().catch((err) =>
        console.warn('refreshUser failed after onboarding (non-blocking):', err)
      )

      // Save to localStorage for sidebar progress display
      const completionData = {
        draft: {
          displayName: data.displayName,
          phone: data.phone,
          preferredContact: data.preferredContact,
          ...(fromPublish ? {} : {
            propertyTextT: data.propertyTextT,
            propertyCity: data.propertyCity,
            rentPrice: data.expectedRent ? parseInt(data.expectedRent.replace(/\D/g, '')) : null,
          }),
        },
        completedSteps: fromPublish ? [1] : [1, 2],
        isComplete: true,
        completedAt: new Date().toISOString(),
      }
      localStorage.setItem('plan_onboarding_landlord', JSON.stringify(completionData))
      window.dispatchEvent(new Event('onboarding-updated'))

      setIsComplete(true)
    } catch (error) {
      console.error('Error saving landlord onboarding:', error)
      // 🔴 02-10-2026 · Antes sólo hacía `console.error`: el botón se volvía a
      // prender y nadie decía nada. Ahora, con la regla de oro del traductor:
      //  · lo que el back rechazó por campo va a SU campo (paso 1), con foco;
      //  · lo demás va a un toast: un 5xx dice que fue nuestro, con la
      //    referencia; «conexión» sólo cuando no hubo respuesta.
      const reparto = repartirErroresDelServidor<CampoDelPropietario>(error, {
        mapa: CAMPO_DEL_SERVIDOR,
        campos: CAMPOS_DEL_PASO_1,
        accion: 'guardar tu perfil',
        porDefecto: 'No pudimos guardar tu perfil. Prueba de nuevo en un momento.',
      })
      setErroresDelServidor(reparto.porCampo)
      const primero = reparto.orden[0]
      if (primero) {
        setStep(1)
        setTimeout(() => document.getElementById(primero === 'phone' ? 'ownerPhone' : 'displayName')?.focus(), 0)
      }
      if (reparto.sueltos.length > 0) toast.error(reparto.sueltos.join(' · '))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    router.push(isAuthenticated ? (returnUrl || '/panel') : '/')
  }

  // Auto-redirect after onboarding completes
  useEffect(() => {
    if (isComplete) {
      const destination = returnUrl || '/panel'
      const timer = setTimeout(() => router.push(destination), 2500)
      return () => clearTimeout(timer)
    }
  }, [isComplete, returnUrl, router])

  // Success Screen
  if (isComplete) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        {/* «¡Listo!» llega después de guardar (nunca en el HTML del servidor):
            sube 8 px y el visto entra con el resorte de rebote leve. */}
        <Appear className="max-w-md w-full text-center">
          <motion.div
            initial={{ scale: motionScale.pop, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={motionSpring.bouncy}
            className="w-20 h-20 bg-success-soft rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Check className="w-10 h-10 text-success" weight="bold" />
          </motion.div>
          <h1 className="text-3xl font-bold text-fg mb-3">
            ¡Listo, {data.displayName.split(' ')[0]}!
          </h1>
          <p className="text-fg-muted mb-8">
            Tu perfil está configurado. Ahora puedes publicar tu propiedad y encontrar inquilinos verificados.
          </p>
          <div className="space-y-3">
            {returnUrl ? (
              <Link
                href={returnUrl}
                className="flex items-center justify-center gap-2 w-full py-3.5 px-6 bg-ink text-ink-fg font-semibold rounded-full hover:opacity-90 transition-colors"
              >
                Ir al panel de propiedades
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/publicar"
                  className="flex items-center justify-center gap-2 w-full py-3.5 px-6 bg-ink text-ink-fg font-semibold rounded-full hover:opacity-90 transition-colors"
                >
                  Publicar mi propiedad
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/panel"
                  className="flex items-center justify-center gap-2 w-full py-3.5 px-6 bg-surface text-fg-muted font-medium rounded-full border border-border hover:bg-surface-hover transition-colors"
                >
                  Ir al panel
                </Link>
              </>
            )}
          </div>
        </Appear>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-surface/95 backdrop-blur-sm border-b border-border-faint">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <BrandHomeLink className="flex items-center gap-2">
              <LeasefyLogotype size={24} className="text-fg" title="Leasefy" />
            </BrandHomeLink>

            {/* Progress */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold font-mono tabular-nums transition-colors",
                    step > 1 ? "bg-primary border-2 border-primary text-primary-fg" : "bg-surface border-2 border-primary text-primary"
                  )}
                  style={step === 1 ? { boxShadow: '0 0 0 4px rgba(26,64,255,0.14)' } : undefined}
                >
                  {step > 1 ? <Check className="w-4 h-4" weight="bold" /> : "1"}
                </div>
                {!fromPublish && (
                  <>
                    <div className={cn(
                      "w-12 h-0.5 transition-colors",
                      step > 1 ? "bg-primary" : "bg-border"
                    )} />
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold font-mono tabular-nums transition-colors",
                        step >= 2 ? "bg-surface border-2 border-primary text-primary" : "bg-surface border border-border text-fg-subtle"
                      )}
                      style={step === 2 ? { boxShadow: '0 0 0 4px rgba(26,64,255,0.14)' } : undefined}
                    >
                      2
                    </div>
                  </>
                )}
              </div>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={handleSkip}
                hideArrow
                className="shrink-0 text-fg-subtle hover:text-fg-muted"
              >
                Saltar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-6 py-12">
        {/*
          Paso 1 ↔ paso 2: el nuevo entra por la derecha al avanzar y por la
          izquierda al volver (`CrossFade` de pasos). Su `initial` es `false`:
          el paso 1 llega visible desde el HTML del servidor (antes nacía en
          `opacity: 0` hasta hidratar).
        */}
        <CrossFade swapKey={step} direction={step === 2 ? 'forward' : 'backward'}>
          {step === 1 ? (
            <div>
              {/* Step 1: About You */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-soft text-primary rounded-full text-sm font-medium mb-4">
                  <Shield className="w-4 h-4" />
                  Tu información está protegida
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-fg mb-2">
                  Bienvenido a Leasefy
                </h1>
                <p className="text-fg-muted">
                  Cuéntanos un poco sobre ti para personalizar tu experiencia
                </p>
              </div>

              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault()
                  handleNext()
                }}
              >
              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-fg mb-2">
                    ¿Cómo te llamas? <span className="text-danger">*</span>
                  </label>
                  <Input
                    id="displayName"
                    type="text"
                    autoComplete="name"
                    value={data.displayName}
                    onChange={(e) => updateData({ displayName: e.target.value })}
                    placeholder="Tu nombre completo"
                    invalid={Boolean(errorDelNombre)}
                    aria-invalid={Boolean(errorDelNombre) || undefined}
                    aria-describedby={errorDelNombre ? 'displayName-error' : undefined}
                  />
                  <ErrorDelCampo id="displayName-error" mensaje={errorDelNombre} />
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="ownerPhone" className="block text-sm font-medium text-fg mb-2">
                    Celular <span className="text-fg-subtle font-normal">(opcional)</span>
                  </label>
                  <Input
                    id="ownerPhone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={data.phone}
                    onChange={(e) => {
                      // Only allow numbers
                      const value = e.target.value.replace(/\D/g, '')
                      // Limit to 10 digits
                      if (value.length <= 10) {
                        // Format: 300 123 4567
                        let formatted = value
                        if (value.length > 3) {
                          formatted = value.slice(0, 3) + ' ' + value.slice(3)
                        }
                        if (value.length > 6) {
                          formatted = value.slice(0, 3) + ' ' + value.slice(3, 6) + ' ' + value.slice(6)
                        }
                        updateData({ phone: formatted })
                      }
                    }}
                    placeholder="300 123 4567"
                    maxLength={12}
                    onBlur={() => setCelularRevisado(true)}
                    invalid={Boolean(errorDelCelular)}
                    aria-invalid={Boolean(errorDelCelular) || undefined}
                    aria-describedby={errorDelCelular ? 'ownerPhone-error' : undefined}
                  />
                  {/* La ayuda y el error se cruzan (Cadence `FormError` con `hint`). */}
                  <ErrorDelCampo
                    id="ownerPhone-error"
                    mensaje={errorDelCelular}
                    pista="Solo para notificaciones importantes de tu propiedad"
                  />
                </div>

              </div>

              {/* Continue Button */}
              <span
                className={cn('block', !isStep1Valid && !isSubmitting && 'cursor-not-allowed')}
                onClick={() => {
                  if (!isStep1Valid && !isSubmitting) {
                    setDisabledHint(step1HintMessage)
                    setCelularRevisado(true)
                  }
                }}
              >
              <Button
                type="submit"
                disabled={!isStep1Valid || isSubmitting}
                hideArrow
                size="lg"
                className="w-full mt-10"
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="xs" variant="current" />
                    Guardando...
                  </>
                ) : fromPublish ? (
                  <>
                    Comenzar
                    <Rocket className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
              </span>
              {/* La pista del botón apagado aparece y se va con `Presence`. */}
              <Presence show={Boolean(disabledHint) && !isStep1Valid} distance="xs">
                <p role="status" className="mt-3 text-xs text-warning text-center">
                  {disabledHint || pistaVisible}
                </p>
              </Presence>
              </form>
            </div>
          ) : (
            <div>
              {/* Step 2: Your Property */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-success-soft text-success rounded-full text-sm font-medium mb-4">
                  <House className="w-4 h-4" />
                  Cuéntanos de tu propiedad
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-fg mb-2">
                  Vamos a cuidar tu inversión
                </h1>
                <p className="text-fg-muted">
                  Información básica para encontrarte los mejores inquilinos
                </p>
              </div>

              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSubmit()
                }}
              >
              <div className="space-y-6">
                {/* Property TextT */}
                <div>
                  <label className="block text-sm font-medium text-fg mb-3">
                    Tipo de propiedad <span className="text-danger">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PROPERTY_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => updateData({ propertyTextT: type.value })}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-colors duration-fast ease-standard text-left",
                          data.propertyTextT === type.value
                            ? "border-fg bg-surface-muted"
                            : "border-border bg-surface hover:border-border-strong"
                        )}
                      >
                        <span className="text-xl">{type.emoji}</span>
                        <span className={cn(
                          "font-medium",
                          data.propertyTextT === type.value ? "text-fg" : "text-fg-muted"
                        )}>
                          {type.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* City */}
                <div>
                  <label htmlFor="propertyCity" className="block text-sm font-medium text-fg mb-2">
                    Ciudad <span className="text-danger">*</span>
                  </label>
                  <Select value={data.propertyCity} onValueChange={(value) => updateData({ propertyCity: value })}>
                    <SelectTrigger id="propertyCity">
                      <SelectValue placeholder="Selecciona una ciudad" />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES.map((city) => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Expected Rent */}
                <div>
                  <label htmlFor="expectedRent" className="block text-sm font-medium text-fg mb-2">
                    Arriendo esperado <span className="text-fg-subtle font-normal">(opcional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle font-mono tabular-nums z-10">$</span>
                    <Input
                      id="expectedRent"
                      type="text"
                      inputMode="numeric"
                      value={data.expectedRent}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '')
                        const formatted = value ? parseInt(value).toLocaleString(locale === 'es' ? 'es-CL' : 'en-US') : ''
                        updateData({ expectedRent: formatted })
                      }}
                      placeholder="2.500.000"
                      className="pl-8 pr-20 font-mono tabular-nums"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-fg-subtle text-sm">/mes</span>
                  </div>
                </div>
              </div>

              {/* Trust badges */}
              <div className="mt-8 p-4 bg-surface-muted rounded-[14px]">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-success-soft rounded-[10px] flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-fg">Tu propiedad está protegida</p>
                    <p className="text-xs text-fg-muted mt-0.5">
                      Verificamos todos los inquilinos y ofrecemos seguro contra impagos hasta 24 meses
                    </p>
                  </div>
                </div>
              </div>

              {/* Compass */}
              <div className="flex gap-3 mt-8">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  hideArrow
                  onClick={handleBack}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Atrás
                </Button>
                <span
                  className={cn('flex-1 flex', !isStep2Valid && !isSubmitting && 'cursor-not-allowed')}
                  onClick={() => {
                    if (!isStep2Valid && !isSubmitting) setDisabledHint(step2HintMessage)
                  }}
                >
                  <Button
                    type="submit"
                    disabled={!isStep2Valid || isSubmitting}
                    hideArrow
                    size="lg"
                    className="flex-1"
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner size="xs" variant="current" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        Comenzar
                        <Rocket className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </span>
              </div>
              {/* La pista del botón apagado aparece y se va con `Presence`. */}
              <Presence show={Boolean(disabledHint) && !isStep2Valid} distance="xs">
                <p role="status" className="mt-3 text-xs text-warning text-center">
                  {disabledHint || pistaVisible}
                </p>
              </Presence>
              </form>
            </div>
          )}
        </CrossFade>
      </main>
    </div>
  )
}

export default function OnboardingPropietarioPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <OnboardingPropietarioContent />
    </Suspense>
  )
}
