'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/use-auth'
import { getUserHomeRoute } from '@/lib/auth/role-routes'
import { RUTA_DEL_SELECTOR_DE_PERFIL } from '@/lib/auth/perfil-de-onboarding'
import { sanitizeReturnUrl } from '@/lib/utils'
import { SalirDelRegistro } from '@/components/onboarding/SalirDelRegistro'
import { CrossFade } from '@leasefy/cadence'
import { useDireccionDelPaso } from '@/components/onboarding/wizard/use-direccion-del-paso'
import { ArrowLeft, ArrowRight, Clock, Eye, Lightning, SealCheck, Shield, ShieldCheck } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useTenantOnboarding, TENANT_ONBOARDING_STEPS } from '@/lib/context/TenantOnboardingContext'
import { useI18n } from '@/lib/i18n'
import {
  EnlaceDeVuelta,
  OnboardingInfoPanel,
  OnboardingStepList,
  OnboardingStepTitle,
  OnboardingWizardLayout,
  type PasoDeLaLista,
} from '@/components/onboarding/wizard'
import { IntentoDeAvanzarContext } from './intento-de-avanzar'

interface TenantOnboardingShellProps {
  children: React.ReactNode
}

// Step-specific "why we need this" content
const STEP_WHY_CONTENT = {
  es: [
    {
      eyebrow: 'Tus datos',
      title: '¿Por qué necesitamos esto?',
      points: [
        { icono: SealCheck, texto: 'Verificamos tu identidad para proteger a todos' },
        { icono: Shield, texto: 'Tu información está encriptada y segura' },
        { icono: Lightning, texto: 'Propietarios ven tu perfil verificado' },
      ],
    },
    {
      eyebrow: 'Tu búsqueda',
      title: '¿Por qué preferencias?',
      points: [
        { icono: Eye, texto: 'Te mostramos solo propiedades relevantes' },
        { icono: Clock, texto: 'Ahorra tiempo en tu búsqueda' },
        { icono: Lightning, texto: 'Recibe alertas personalizadas' },
      ],
    },
  ],
  en: [
    {
      eyebrow: 'Your details',
      title: 'Why do we need this?',
      points: [
        { icono: SealCheck, texto: 'We verify your identity to protect everyone' },
        { icono: Shield, texto: 'Your information is encrypted and secure' },
        { icono: Lightning, texto: 'Landlords see your verified profile' },
      ],
    },
    {
      eyebrow: 'Your search',
      title: 'Why preferences?',
      points: [
        { icono: Eye, texto: 'We show you only relevant properties' },
        { icono: Clock, texto: 'Save time in your search' },
        { icono: Lightning, texto: 'Receive personalized alerts' },
      ],
    },
  ],
}

export function TenantOnboardingShell({ children }: TenantOnboardingShellProps) {
  const router = useRouter()
  const returnUrl = useSearchParams().get('returnUrl')
  const { user } = useAuth()
  const { locale } = useI18n()
  const {
    currentStep,
    totalSteps,
    completedSteps,
    goToStep,
    prevStep,
    nextStep,
    submitOnboarding,
    isSubmitting,
    canProceed,
    isComplete,
  } = useTenantOnboarding()

  const isFirstStep = currentStep === 1
  // «Continuar» trae el paso nuevo por la derecha; «Atrás», por la izquierda.
  const direccion = useDireccionDelPaso(String(currentStep), currentStep)
  const isLastStep = currentStep === totalSteps
  // Cap step index to valid range (in case localStorage has old step 4)
  const safeStepIndex = Math.min(currentStep - 1, STEP_WHY_CONTENT.es.length - 1)
  const whyContent = STEP_WHY_CONTENT[locale as 'es' | 'en']?.[safeStepIndex] || STEP_WHY_CONTENT.es[safeStepIndex]

  /*
   * Intentos de «Continuar» con el paso incompleto (ver `intento-de-avanzar`).
   * Se reinicia al cambiar de paso: el paso nuevo arranca sin errores.
   */
  const [intento, setIntento] = useState({ paso: currentStep, veces: 0 })
  const intentos = intento.paso === currentStep ? intento.veces : 0

  /*
   * «Cambiar de perfil» (Nico, 30-09: «esa de inquilino no tiene para
   * devolverse para poder elegir inmobiliaria si se quiere»).
   *
   * Volver es seguro mientras el onboarding no termina: elegir «Inquilino» en
   * el selector sólo guarda `user_metadata.intended_role` en Supabase
   * (`elegirPerfil`); el rol de verdad lo pone el back recién en
   * `POST /users/me/onboarding`, al final de este asistente. Si en el selector
   * elige «Inmobiliaria», la elección se sobrescribe y su alta pone el rol.
   *
   * Con el onboarding ya terminado no se ofrece: el rol ya quedó puesto y el
   * selector mismo manda a esa persona a su panel.
   */
  const puedeCambiarDePerfil = !isComplete && user?.onboardingCompleted !== true

  // Localized content
  const content = {
    es: {
      steps: [
        { label: 'Información básica', description: 'Nombre y contacto' },
        { label: 'Preferencias', description: 'Tu hogar ideal' },
      ],
      stepTitle: ['Cuéntanos sobre ti', 'Tu hogar ideal'],
      stepSubtitle: [
        'Esta información nos ayuda a personalizar tu experiencia',
        'Dinos qué estás buscando',
      ],
      stepOf: 'Paso',
      of: 'de',
      stepsLabel: 'Pasos de tu registro',
      goTo: 'Ir a',
      back: 'Atrás',
      continue: 'Continuar',
      submit: 'Completar perfil',
      saving: 'Guardando...',
      autoFloppyDisk: 'Tu progreso se guarda automáticamente',
      changeProfile: 'Cambiar de perfil',
      secure: 'Datos protegidos con encriptación de nivel bancario',
    },
    en: {
      steps: [
        { label: 'Basic Information', description: 'Name and contact' },
        { label: 'Preferences', description: 'Your ideal home' },
      ],
      stepTitle: ['Tell us about you', 'Your ideal home'],
      stepSubtitle: [
        'This information helps us personalize your experience',
        'Tell us what you\'re looking for',
      ],
      stepOf: 'Step',
      of: 'of',
      stepsLabel: 'Your sign-up steps',
      goTo: 'Go to',
      back: 'Back',
      continue: 'Continue',
      submit: 'Complete profile',
      saving: 'Saving...',
      autoFloppyDisk: 'Your progress is saved automatically',
      changeProfile: 'Change profile',
      secure: 'Data protected with bank-level encryption',
    },
  }

  const t = content[locale as 'es' | 'en'] || content.es

  const handleNext = () => {
    // El botón ya no se apaga con el paso incompleto: si falta algo, no se
    // avanza (la misma regla de siempre, `canProceed`) y el paso muestra en
    // el campo qué falta. Nunca se manda un perfil incompleto.
    if (!canProceed) {
      setIntento({ paso: currentStep, veces: intentos + 1 })
      return
    }
    if (isLastStep) {
      submitOnboarding()
        .then(() => {
          // Owner rule: after completing the wizard, land DIRECTLY on the
          // dashboard — no intermediate stop. submitOnboarding resolves AFTER
          // refreshUser(), so /inquilino renders with the fresh backend flag
          // (no empty-state flash). The wizard just provisioned a TENANT: if
          // this closure's `user` is still the pre-submit null, route as a
          // tenant rather than to the public landing.
          // `returnUrl` honrado: quien llega desde el recorrido de aprobación
          // venía a ver SU catálogo, no la home. Sin esto el onboarding lo
          // descartaba y el recorrido terminaba en otro lado del prometido.
          // `sanitizeReturnUrl` evita que un link externo lo mande a cualquier
          // parte; sin parámetro, el destino de siempre.
          const destino = getUserHomeRoute(user ?? { role: 'tenant' })
          router.push(sanitizeReturnUrl(returnUrl, destino))
        })
        .catch((err) => {
          // Stay in the wizard — the context already surfaced the error toast.
          console.error('[Onboarding] submitOnboarding failed:', err)
        })
    } else {
      nextStep()
    }
  }

  const pasos: PasoDeLaLista[] = TENANT_ONBOARDING_STEPS.map(({ id: step }) => {
    const isCompleted = completedSteps.includes(step)
    const isCurrent = step === currentStep
    // La misma regla de antes para poder volver a un paso.
    const isClickable = isCompleted || isCurrent || step === 1
    const label = t.steps[step - 1].label
    return {
      key: String(step),
      label,
      descripcion: t.steps[step - 1].description,
      estado: isCurrent ? 'actual' : isCompleted ? 'hecho' : 'pendiente',
      onSelect: isClickable && !isCurrent ? () => goToStep(step) : undefined,
      etiquetaDelBoton: `${t.goTo} ${label}`,
      testId: `paso-inquilino-${step}`,
    }
  })

  return (
    <OnboardingWizardLayout
      /*
       * Igual que el asistente de la inmobiliaria (Nico, 01-10-2026):
       *  - El logo es marca, no un enlace: sin `marca`, el marco pone el
       *    logotipo sin enlace. Antes era `BrandHomeLink` y llevaba al panel
       *    del inquilino a mitad del registro, que lo devolvía acá.
       *  - Sin «Saltar por ahora»: estos datos se llenan, no se saltan. Saltar
       *    mandaba a `/inquilino` sin perfil y el guard lo regresaba al
       *    asistente. La salida es `SalirDelRegistro`, que confirma y cierra
       *    sesión; el borrador queda guardado para cuando vuelva.
       */
      accionesDeCabecera={<SalirDelRegistro />}
      pasos={<OnboardingStepList pasos={pasos} etiqueta={t.stepsLabel} nota={t.autoFloppyDisk} />}
      antesDelContenido={
        puedeCambiarDePerfil ? (
          <EnlaceDeVuelta href={RUTA_DEL_SELECTOR_DE_PERFIL} testId="cambiar-de-perfil">
            {t.changeProfile}
          </EnlaceDeVuelta>
        ) : null
      }
      informacion={
        <OnboardingInfoPanel
          pasoId={`inquilino-${currentStep}`}
          rotulo={whyContent.eyebrow}
          titulo={whyContent.title}
          razones={whyContent.points}
          // Sin foto, como en el asistente de la inmobiliaria (Nico, 01-10-2026).
          pie={{ icono: ShieldCheck, texto: t.secure }}
        />
      }
    >
      {/* Step Header */}
      <div className="px-5 pb-6 pt-6 sm:px-8 sm:pt-8">
        <OnboardingStepTitle
          pasoId={String(currentStep)}
          rotulo={`${t.stepOf} ${currentStep} ${t.of} ${totalSteps}`}
          titulo={t.stepTitle[currentStep - 1]}
          subtitulo={t.stepSubtitle[currentStep - 1]}
        />
      </div>

      {/* Form Content */}
      <div className="px-5 pb-7 sm:px-8 sm:pb-8">
        <IntentoDeAvanzarContext.Provider value={intentos}>
          {/*
            El paso nuevo entra por la derecha al avanzar y por la izquierda al
            volver (`CrossFade` de pasos). `popLayout`: monta YA, junto con el
            título (que recibe el foco); el viejo se va por encima, acelerando.
            Antes era `mode="wait"`: el título cambiaba y el cuerpo esperaba.
          */}
          <div className="relative">
            <CrossFade swapKey={currentStep} direction={direccion} mode="popLayout">
              {children}
            </CrossFade>
          </div>
        </IntentoDeAvanzarContext.Provider>
      </div>

      {/* Footer. `px-4` en teléfono: a 390px, con `px-5`, «Atrás» + «Completar
          perfil» sumaban 1px más que la tarjeta y la página desbordaba (medido
          con getBoundingClientRect). */}
      <div className="flex items-center justify-between gap-3 border-t border-border-faint px-4 py-4 sm:px-8 sm:py-5">
        {/* Back button */}
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={isFirstStep || isSubmitting}
          hideArrow
          className={isFirstStep ? 'invisible' : undefined}
        >
          <ArrowLeft className="h-4 w-4" weight="bold" aria-hidden />
          {t.back}
        </Button>

        {/* Next/Submit button */}
        {isSubmitting ? (
          <Button isLoading disabled hideArrow>
            {t.saving}
          </Button>
        ) : (
          <Button onClick={handleNext} hideArrow data-testid="continuar-onboarding-inquilino">
            {isLastStep ? t.submit : t.continue}
            <ArrowRight className="h-4 w-4" weight="bold" aria-hidden />
          </Button>
        )}
      </div>
    </OnboardingWizardLayout>
  )
}
