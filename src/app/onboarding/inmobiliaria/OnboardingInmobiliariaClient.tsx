'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Info } from '@phosphor-icons/react'
import { LeasefyLogotype } from '@/components/brand/LeasefySymbol'
import { CargaDeMarca } from '@/components/ui/carga-de-marca'
import { useOnboardingSession } from '@/lib/hooks/use-onboarding-session'
import { useOnboardingProvisioning } from '@/lib/hooks/use-onboarding-provisioning'
import { MarcoDelAsistente } from '@/components/onboarding/inmobiliaria/MarcoDelAsistente'
import { OnboardingSessionErrorBanner } from '@/components/onboarding/inmobiliaria/OnboardingSessionErrorBanner'
import { OnboardingProvisioningErrorBanner } from '@/components/onboarding/inmobiliaria/OnboardingProvisioningErrorBanner'
import { EleccionDePerfil } from '@/components/onboarding/perfil/EleccionDePerfil'
import { PanelAntesDeComenzar } from '@/components/onboarding/perfil/PanelAntesDeComenzar'
import { SalirDelRegistro } from '@/components/onboarding/SalirDelRegistro'
import { AgencyStepForm } from '@/components/onboarding/inmobiliaria/AgencyStepForm'
import {
  agenciaDelBorrador,
  computeAgencyStepPrefill,
  type AgencyStepPreStepValues,
} from '@/components/onboarding/inmobiliaria/agency-step-prefill'
import { MembersStepForm, type PendingMembersInvites } from '@/components/onboarding/inmobiliaria/MembersStepForm'
import {
  correosConInvitacion,
  crearInvitacionesDelEquipo,
} from '@/components/onboarding/inmobiliaria/crear-invitaciones'
import {
  toMembersRequest,
  type MembersStepFormValues,
} from '@/components/onboarding/inmobiliaria/members-step-schema'
import { PaymentProviderAutoSkipStep } from '@/components/onboarding/inmobiliaria/PaymentProviderAutoSkipStep'
import { PolicyAutoSkipStep } from '@/components/onboarding/inmobiliaria/PolicyAutoSkipStep'
import {
  POLICY_STEP_DEFAULT_VALUES,
  toPolicyRequest,
} from '@/components/onboarding/inmobiliaria/policy-step-schema'
import { TermsStepForm } from '@/components/onboarding/inmobiliaria/TermsStepForm'
import { CompleteStepForm } from '@/components/onboarding/inmobiliaria/CompleteStepForm'
import { PasoYaGuardado } from '@/components/onboarding/inmobiliaria/PasoYaGuardado'
import {
  borrarBorradorLocal,
  guardarBorradorLocal,
  leerBorradorLocal,
} from '@/components/onboarding/inmobiliaria/borrador-local'
import { miembrosDelBorrador } from '@/components/onboarding/inmobiliaria/members-step-schema'
import type { OnboardingWizardStep } from '@/lib/hooks/use-onboarding-session'

/** El orden de `STEP_ORDER` del micro (`onboarding/state-machine.ts`): el cursor sólo avanza. */
const ORDEN_DEL_MICRO: OnboardingWizardStep[] = [
  'start',
  'agency',
  'members',
  'payment_provider',
  'policy',
  'habeas_data',
  'complete',
]

/**
 * Reads the wizard's sessionId. Two sources:
 *  - `?session=<uuid>` — DEV/TESTING OVERRIDE ONLY. Lets an engineer resume
 *    an existing agent session directly without re-provisioning. Real users
 *    never carry this param.
 *  - Otherwise, the authenticated agency owner's session is provisioned via
 *    `useOnboardingProvisioning` (`POST /users/me/onboarding`), which is
 *    what the back actually returns the `agentSessionId` from (work-unit #4).
 */
export default function OnboardingInmobiliariaClient() {
  const searchParams = useSearchParams()
  const overrideSessionId = searchParams.get('session')

  if (overrideSessionId) {
    return <OnboardingWizard sessionId={overrideSessionId} />
  }

  return <ProvisionedOnboardingWizard />
}

function ProvisionedOnboardingWizard() {
  const {
    status,
    sessionId,
    agencyPrefill,
    valoresGuardados,
    fallo,
    retry,
    provision,
    corrigiendo,
    corregirDatos,
    volverAlAsistente,
  } = useOnboardingProvisioning()

  // Mientras se pregunta dónde quedó esta persona no se le muestra el paso
  // previo: pedirle la razón social para tapársela medio segundo después con
  // el asistente ya empezado sería peor que esperar.
  if (status === 'resuming') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <CargaDeMarca
          tamano="lg"
          disposicion="apilada"
          texto="Buscando dónde quedaste..."
          data-testid="onboarding-resuming"
        />
      </div>
    )
  }

  // Provisioning always needs the owner's name plus the agency's razón
  // social and NIT — collect them here and provision explicitly (see
  // useOnboardingProvisioning). The form stays mounted while the request is
  // in flight so the submit button can disable itself (double-submit guard).
  //
  // «Antes de comenzar» vive en el selector de perfil (Nico, 2026-09-30): las
  // tarjetas a la izquierda, con «Inmobiliaria» elegida, y el formulario a la
  // derecha. Quien llega acá directo (enlace, atrás, la próxima entrada) ve lo
  // mismo que quien lo abrió desde «Selecciona tu perfil».
  if (status === 'needs-info' || status === 'provisioning') {
    return (
      <EleccionDePerfil
        abiertaAlInicio
        volverAlAsistente={corrigiendo && sessionId ? volverAlAsistente : undefined}
        panelDeInmobiliaria={(cerrar, _alAbrirRegistro, alSaberSiPuedeCambiar, alSaberDelRegistroAMedias) => (
          <PanelAntesDeComenzar
            aprovisionamiento={{ status, valoresGuardados, fallo, retry, provision, corrigiendo }}
            onCerrar={cerrar}
            onPuedeCambiarDePerfil={alSaberSiPuedeCambiar}
            onRegistroAMedias={alSaberDelRegistroAMedias}
          />
        )}
      />
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-bg">
        <header className="flex items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
          <LeasefyLogotype className="h-6 w-auto" title="Leasefy" />
          <SalirDelRegistro />
        </header>
        <main className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-6 pb-16">
          <div className="w-full max-w-md">
            <OnboardingProvisioningErrorBanner onRetry={retry} fallo={fallo} />
          </div>
        </main>
      </div>
    )
  }

  if (status !== 'ready' || !sessionId) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <CargaDeMarca
          tamano="lg"
          disposicion="apilada"
          texto="Preparando tu sesión de onboarding..."
          data-testid="provisioning-loading"
        />
      </div>
    )
  }

  return (
    <OnboardingWizard
      sessionId={sessionId}
      preStepAgency={agencyPrefill}
      onCorregirInmobiliaria={corregirDatos}
    />
  )
}

function OnboardingWizard({
  sessionId,
  preStepAgency,
  onCorregirInmobiliaria,
}: {
  sessionId: string
  /**
   * «Salir» → «Volver a los datos de la inmobiliaria» (Nico, 01-10-2026):
   * ahí se corrige la razón social, que en el paso Agencia es de solo
   * lectura. `undefined` con el `?session=` de desarrollo, que no tiene ese
   * formulario detrás.
   */
  onCorregirInmobiliaria?: () => void
  /**
   * Razón social + NIT captured in-session by `OwnerNameStepForm` (via
   * `useOnboardingProvisioning`). `undefined` for the `?session=` dev
   * override (no pre-step ran) — `computeAgencyStepPrefill` tolerates that
   * and falls back entirely to the resume draft.
   */
  preStepAgency?: AgencyStepPreStepValues | null
}) {
  const router = useRouter()
  const {
    status,
    currentStep,
    draft,
    error,
    refresh,
    submitAgency,
    submitMembers,
    submitPaymentProvider,
    submitPolicy,
    acceptTerms,
    completeOnboarding,
  } = useOnboardingSession(sessionId)

  const isSubmitting = status === 'submitting'

  // 401 mid-wizard is treated as an expired session — bounce to login.
  useEffect(() => {
    if (error?.kind === 'unauthorized') {
      router.replace(`/auth?returnUrl=${encodeURIComponent(`/onboarding/inmobiliaria?session=${sessionId}`)}`)
    }
  }, [error, router, sessionId])

  // Owned here, NOT inside `MembersStepForm` — `submitMembers` (the hook)
  // advances `currentStep` to the next step as soon as it resolves. If the
  // "invitations generated" screen lived in local state inside
  // `MembersStepForm`, this component's `currentStep === 'members'` branch
  // below would swap it out for the next step's form before the user ever
  // saw the `rawToken` links (returned by the agent exactly once). Keeping
  // this state here lets us keep rendering `MembersStepForm` regardless of
  // `currentStep` until the user explicitly clicks "Continuar".
  const [pendingMembersInvites, setPendingMembersInvites] = useState<PendingMembersInvites | null>(null)

  /**
   * 🔴 Dos llamadas, en este orden, y por qué.
   *
   * 1. El MICRO (`submitMembers`) es quien mueve el asistente al paso
   *    siguiente. Va primero: si falla, no se creó ninguna invitación y la
   *    persona puede reintentar el paso entero sin chocar contra un «ya existe
   *    una invitación pendiente».
   * 2. El BACK crea las invitaciones DE VERDAD y manda los correos. Los
   *    `rawToken` del micro no los acepta ninguna pantalla (ver
   *    `invite-link.ts`): son los tokens del back los que abren
   *    `/invitacion/<token>`.
   *
   * Un fallo del paso 2 NO frena el alta: la pantalla de resultados dice qué
   * pasó con cada persona y el equipo se puede invitar desde el panel.
   */
  const handleSubmitMembers = async (values: MembersStepFormValues) => {
    const result = await submitMembers(toMembersRequest(values))
    if (!result) return result
    // Al volver a editar Miembros sólo se invita a quien el BACK todavía no
    // tiene invitado (01-10-2026, Alexis: una invitación que el back rechazó
    // seguía en el borrador, se daba por hecha y el correo nunca salió).
    //
    // 🔴 Si no se le puede preguntar al back, se le pide la invitación de
    // TODOS y el back decide (02-10-2026, Alexis: «siempre falla la primera
    // vez»). El respaldo era el borrador del micro, y el borrador NO dice quién
    // quedó invitado: con el fundador sin segundo factor el back rechaza las
    // dos llamadas (GET y POST /inmobiliaria/agency/members, 403
    // `SEGUNDO_FACTOR_REQUERIDO`), el segundo intento tomaba a la persona del
    // borrador por invitada y el paso «funcionaba» sin invitar a nadie. A lo
    // sumo, una invitación vigente vuelve con el 409 del back que lo dice.
    const yaInvitados = (await correosConInvitacion()) ?? new Set<string>()
    const nuevos = values.members.filter((m) => !yaInvitados.has(m.email.trim().toLowerCase()))
    if (nuevos.length === 0) return result

    const invitaciones = await crearInvitacionesDelEquipo(nuevos)
    if (invitaciones.length > 0) setPendingMembersInvites({ invitaciones })
    return result
  }

  // «Reintentar» en la pantalla de resultados: vuelve a pedirle al back SÓLO
  // las invitaciones que fallaron —y que reintentar puede arreglar— y deja
  // las demás como estaban.
  const reintentarInvitaciones = async () => {
    const fallidas =
      pendingMembersInvites?.invitaciones.filter((i) => i.error !== null && i.reintentable !== false) ?? []
    if (fallidas.length === 0) return
    const otraVez = await crearInvitacionesDelEquipo(
      fallidas.map((i) => ({ email: i.email, role: i.role, nombre: i.nombre })),
    )
    const porCorreo = new Map(otraVez.map((i) => [i.email, i]))
    setPendingMembersInvites((actual) =>
      actual
        ? { invitaciones: actual.invitaciones.map((i) => porCorreo.get(i.email) ?? i) }
        : actual,
    )
  }

  // `complete`'s defensive missing-steps CTA sends the user back to an earlier
  // step client-side (the hook has no "go to step" API and isn't touched here).
  // `withOverrideClear` releases control back to the hook's own `currentStep`
  // the moment the overridden step is actually resubmitted successfully.
  const [completeStepOverride, setCompleteStepOverride] = useState<OnboardingWizardStep | null>(null)
  // Para qué se volvió a un paso: desde la barra es para REVISAR (un paso ya
  // guardado se ve en solo lectura); desde el «completa lo que falta» de
  // Confirmar es para COMPLETAR (el micro dijo que ese paso falta: editable).
  const [motivoDelOverride, setMotivoDelOverride] = useState<'revisar' | 'completar'>('revisar')
  const revisarPaso = (paso: OnboardingWizardStep) => {
    setMotivoDelOverride('revisar')
    setCompleteStepOverride(paso)
  }
  const completarPaso = (paso: OnboardingWizardStep) => {
    setMotivoDelOverride('completar')
    setCompleteStepOverride(paso)
  }

  function withOverrideClear<TArgs extends unknown[], TResult>(
    action: (...args: TArgs) => Promise<TResult | null>,
  ): (...args: TArgs) => Promise<TResult | null> {
    return async (...args: TArgs) => {
      const result = await action(...args)
      if (result) setCompleteStepOverride(null)
      return result
    }
  }

  // Habeas Data ya no crea la inmobiliaria al continuar (Nico, 30-09: «debería
  // poder editar la información de los pasos»): aceptar se recuerda acá y la
  // inmobiliaria nace en «Crear mi inmobiliaria», que llama acceptTerms (el
  // compromiso del tenant) y luego /complete. Hasta ese clic la sesión sigue
  // abierta y Agencia y Miembros se pueden reescribir.
  const [terminosAceptados, setTerminosAceptados] = useState(
    () => leerBorradorLocal<{ aceptados: boolean }>(sessionId, 'habeas_data')?.aceptados === true,
  )
  const aceptarTerminos = async () => {
    guardarBorradorLocal(sessionId, 'habeas_data', { aceptados: true })
    setTerminosAceptados(true)
    setCompleteStepOverride(null)
    return true
  }
  const crearInmobiliaria = async () => {
    if (currentStep !== 'complete') {
      const aceptado = await acceptTerms()
      if (!aceptado) return null
      borrarBorradorLocal(sessionId, 'habeas_data')
    }
    return completeOnboarding()
  }

  // El paso donde va la persona: con los términos aceptados en este
  // navegador, Habeas Data ya está hecho y toca Confirmar.
  const pasoDelMicro: OnboardingWizardStep | null =
    currentStep === 'habeas_data' && terminosAceptados ? 'complete' : currentStep

  const effectiveStep = completeStepOverride ?? pasoDelMicro

  // 🔴 Un paso ANTERIOR al cursor del micro ya quedó guardado y no se puede
  // reescribir: el micro sólo acepta el paso actual o el siguiente, y aceptar
  // Habeas Data cierra la sesión. Volver a él lo muestra en solo lectura
  // (Nico, 30-09: el formulario vacío que al enviar decía «No puedes
  // continuar esta sesión»).
  const pasoYaGuardado =
    motivoDelOverride === 'revisar' &&
    completeStepOverride != null &&
    currentStep === 'complete' &&
    !pendingMembersInvites &&
    ORDEN_DEL_MICRO.indexOf(completeStepOverride) < ORDEN_DEL_MICRO.indexOf(currentStep)

  /*
   * 🔴 Volvió de corregir la razón social (01-10-2026). El back ya tiene el
   * nombre nuevo, pero el asistente guardó el viejo en su paso Agencia, y es
   * ESE el que el micro escribe al crear la inmobiliaria: sin volver a
   * guardarlo, Laura le diría a los inquilinos el nombre viejo. Se abre el
   * paso Agencia (la razón social ya sale con la nueva, de solo lectura) para
   * confirmarlo; al guardar, sigue donde iba.
   */
  const razonSocialNueva = preStepAgency?.legalName?.trim() || null
  const razonSocialDelAsistente = (() => {
    const guardada = agenciaDelBorrador(draft)?.legalName
    return typeof guardada === 'string' && guardada.trim() ? guardada.trim() : null
  })()
  const razonSocialPorConfirmar =
    razonSocialNueva !== null &&
    razonSocialDelAsistente !== null &&
    razonSocialNueva !== razonSocialDelAsistente &&
    currentStep !== null &&
    currentStep !== 'complete' &&
    ORDEN_DEL_MICRO.indexOf(currentStep) > ORDEN_DEL_MICRO.indexOf('agency')

  useEffect(() => {
    if (razonSocialPorConfirmar && completeStepOverride === null && !pendingMembersInvites) {
      completarPaso('agency')
    }
    // `completarPaso` sólo pone estado: no hace falta como dependencia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [razonSocialPorConfirmar, completeStepOverride, pendingMembersInvites])

  // While the invite-links screen is pending, keep the stepper/header pinned
  // to "Miembros" instead of following the hook's already-advanced `currentStep`.
  const displayStep = pendingMembersInvites ? 'members' : effectiveStep

  // «Salir» → volver a los datos de la inmobiliaria, mientras el asistente
  // acepte reescribir la Agencia (hasta que se acepten los términos: después
  // el micro ya no la reescribe y corregir el nombre lo dejaría distinto).
  const volver =
    onCorregirInmobiliaria && currentStep !== null && currentStep !== 'complete'
      ? {
          etiqueta: 'Volver a los datos de la inmobiliaria',
          descripcion: 'Ahí corriges la razón social o tu nombre, y sigues aquí donde ibas.',
          onVolver: onCorregirInmobiliaria,
        }
      : undefined

  const cargando = status === 'loading' && error === null
  const conErrorDeSesion = error !== null && error.kind !== 'validation' && error.kind !== 'conflict'

  // El marco (pasos a la izquierda, el paso al centro, lo informativo a la
  // derecha) es el mismo del inquilino: `MarcoDelAsistente`. Acá sólo se
  // decide qué va adentro.
  return (
    <MarcoDelAsistente
      paso={displayStep}
      pasoAlcanzado={pasoDelMicro}
      onNavigateToStep={revisarPaso}
      sinEncabezado={cargando || conErrorDeSesion}
      volver={volver}
    >
      <div className="space-y-6">
        {cargando && (
          <CargaDeMarca
            tamano="lg"
            disposicion="apilada"
            texto="Cargando tu sesión de onboarding..."
            className="flex py-16"
            data-testid="wizard-loading"
          />
        )}

        {conErrorDeSesion && (
          <OnboardingSessionErrorBanner error={error} onRetry={refresh} isRetrying={status === 'loading'} />
        )}

        {status !== 'loading' && (error === null || error.kind === 'validation' || error.kind === 'conflict') && (
          <>
            {pasoYaGuardado ? (
              <PasoYaGuardado
                paso={completeStepOverride}
                draft={draft}
                pasoActual={currentStep}
                onVolver={() => setCompleteStepOverride(null)}
              />
            ) : effectiveStep === 'agency' || effectiveStep === null || effectiveStep === 'start' ? (
              <>
              {razonSocialPorConfirmar && (
                <div
                  role="status"
                  className="mb-5 flex items-start gap-2.5 rounded-md bg-info-soft p-3"
                  data-testid="razon-social-por-confirmar"
                >
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" weight="fill" aria-hidden />
                  <p className="text-body-sm text-fg">
                    Cambiaste la razón social. Confirma los datos de la agencia y sigues donde ibas.
                  </p>
                </div>
              )}
              <AgencyStepForm
                isSubmitting={isSubmitting}
                onSubmit={withOverrideClear(submitAgency)}
                submitError={error !== null && error.kind === 'validation' ? error.message : null}
                prefill={computeAgencyStepPrefill(preStepAgency, draft)}
                sessionId={sessionId}
              />
              </>
            ) : effectiveStep === 'members' || pendingMembersInvites ? (
              <MembersStepForm
                isSubmitting={isSubmitting}
                onSubmit={withOverrideClear(handleSubmitMembers)}
                submitError={error !== null && error.kind === 'validation' ? error.message : null}
                pendingInvites={pendingMembersInvites}
                onContinueAfterInvites={() => setPendingMembersInvites(null)}
                onReintentarInvitaciones={reintentarInvitaciones}
                sessionId={sessionId}
                guardados={miembrosDelBorrador(draft)}
              />
            ) : effectiveStep === 'payment_provider' ? (
              // Invisible step (fix/onboarding-skip-payment) — an inmobiliaria
              // can finish onboarding without a payment gateway and configure
              // one later from the dashboard. Auto-submits `{ skip: true }`
              // instead of showing PaymentProviderStepForm (kept in the
              // codebase, unreachable from the wizard, for future panel reuse).
              <PaymentProviderAutoSkipStep
                isSubmitting={isSubmitting}
                onSkip={() => withOverrideClear(submitPaymentProvider)({ skip: true })}
              />
            ) : effectiveStep === 'policy' ? (
              // Invisible step — the collection policy is an optional adjustment
              // configured later in the agency panel. Auto-submits the agent's
              // default policy instead of showing PolicyStepForm (kept in the
              // codebase, unreachable from the wizard, for future panel reuse).
              <PolicyAutoSkipStep
                isSubmitting={isSubmitting}
                onSkip={() =>
                  withOverrideClear(submitPolicy)(toPolicyRequest(POLICY_STEP_DEFAULT_VALUES))
                }
              />
            ) : effectiveStep === 'habeas_data' ? (
              // The signed-habeas-data upload was replaced by a terms
              // acceptance. The agent step is still `habeas_data`; it's
              // completed via acceptTerms (backend handoff — see
              // onboarding-session.service.ts). El formulario de subida
              // (HabeasDataStepForm) se borró: sus dos rutas —presign-url y
              // confirm— ya no existen en el agente, así que «guardarlo para
              // después» era guardar llamadas a un 404.
              <TermsStepForm
                isSubmitting={isSubmitting}
                onSubmit={aceptarTerminos}
                submitError={error !== null && error.kind === 'validation' ? error.message : null}
              />
            ) : (
              <CompleteStepForm
                isSubmitting={isSubmitting}
                onSubmit={crearInmobiliaria}
                error={error !== null && error.kind === 'conflict' ? error : null}
                onNavigateToStep={completarPaso}
                draft={draft}
              />
            )}
          </>
        )}
      </div>
    </MarcoDelAsistente>
  )
}
