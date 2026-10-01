'use client'

/**
 * El marco del alta de la inmobiliaria: el mismo del inquilino
 * (`OnboardingWizardLayout`) con lo propio de este asistente — sus cuatro
 * pasos verticales a la izquierda, el paso al centro con su título y, a la
 * derecha, para qué sirve lo que se pide en ESE paso (Nico, 30-09).
 *
 * Sólo presentación: qué paso se muestra, a cuál se puede volver y qué se
 * guarda lo sigue decidiendo `OnboardingInmobiliariaClient` con el hook de la
 * sesión.
 */

import type { ReactNode } from 'react'
import type { OnboardingWizardStep } from '@/lib/hooks/use-onboarding-session'
import { SalirDelRegistro } from '@/components/onboarding/SalirDelRegistro'
import { OnboardingInfoPanel, OnboardingStepTitle, OnboardingWizardLayout } from '@/components/onboarding/wizard'
import { OnboardingWizardStepper } from './OnboardingWizardStepper'
import { WIZARD_STEPS, wizardStepIndex } from './wizard-steps'
import { contenidoDelPaso } from './contenido-de-los-pasos'

export interface MarcoDelAsistenteProps {
  /** El paso que se ve (con la vuelta atrás o la pantalla de invitaciones ya resueltas). */
  paso: OnboardingWizardStep | null
  /** Hasta dónde llegó de verdad el asistente (el `currentStep` del hook). */
  pasoAlcanzado: OnboardingWizardStep | null
  /** Volver a un paso hecho desde la lista. */
  onNavigateToStep?: (step: OnboardingWizardStep) => void
  /**
   * Sin el título del paso: mientras carga la sesión o cuando lo que hay que
   * mostrar es un error de la sesión, no un paso.
   */
  sinEncabezado?: boolean
  children: ReactNode
}

export function MarcoDelAsistente({
  paso,
  pasoAlcanzado,
  onNavigateToStep,
  sinEncabezado = false,
  children,
}: MarcoDelAsistenteProps) {
  const contenido = contenidoDelPaso(paso)
  const indice = wizardStepIndex(paso)
  const pasoVisible = WIZARD_STEPS[indice].key

  return (
    <OnboardingWizardLayout
      /*
       * 🔴 La marca va SIN enlace (es la de por defecto del marco). No es
       * `BrandHomeLink`: ese resuelve `getUserHomeRoute`, y mientras la agencia
       * no termina de crearse la persona sigue con rol `tenant`: el logo la
       * mandaba a `/inquilino`, el panel del INQUILINO, a mitad del alta de
       * una inmobiliaria (auditoría 2026-09-05). Dentro del asistente el logo
       * es marca, no salida — para salir está `SalirDelRegistro`.
       *
       * El asistente tampoco tenía salida: la única era cerrar la pestaña.
       * Ahora sí, y la promesa de volver donde quedaste la cumple el punto de
       * retorno del back.
       */
      accionesDeCabecera={<SalirDelRegistro />}
      pasos={
        // Un paso hecho devuelve a ese paso (Nico, 2026-09-07). Es el mismo
        // override que usa el CTA de «faltan pasos» de Confirmar: se limpia
        // solo cuando el paso se vuelve a enviar bien.
        <OnboardingWizardStepper
          currentStep={paso}
          reachedStep={pasoAlcanzado}
          onNavigateToStep={onNavigateToStep}
        />
      }
      informacion={
        <OnboardingInfoPanel
          pasoId={`inmobiliaria-${pasoVisible}`}
          rotulo={contenido.informacion.rotulo}
          titulo={contenido.informacion.titulo}
          razones={contenido.informacion.razones}
          pie={contenido.informacion.pie}
          foto={contenido.informacion.foto}
        />
      }
    >
      <div className="px-5 py-6 sm:px-8 sm:py-8">
        {sinEncabezado ? null : (
          <div className="mb-6">
            <OnboardingStepTitle
              pasoId={paso ?? 'agency'}
              rotulo={`Paso ${indice + 1} de ${WIZARD_STEPS.length}`}
              titulo={contenido.titulo}
              subtitulo={contenido.subtitulo}
            />
          </div>
        )}
        {children}
      </div>
    </OnboardingWizardLayout>
  )
}
