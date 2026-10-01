'use client'

/**
 * El marco de los asistentes de registro: el del inquilino y el de la
 * inmobiliaria (Nico, 30-09: «utiliza la forma en cómo tiene los steps
 * inquilino que son verticales a la izquierda y el contenido centrado en el
 * medio y lo otro es informativo pero lo quiero hermoso»).
 *
 * Tres columnas en escritorio, con un orden de importancia claro:
 *   - izquierda: los pasos, que se leen como progreso (`OnboardingStepList`);
 *   - centro: el contenido del paso, el protagonista, en una tarjeta;
 *   - derecha: lo informativo (`OnboardingInfoPanel`), que acompaña sin pesar.
 *
 * En teléfono es una sola columna con el MISMO DOM, en ese orden: los pasos
 * como una fila compacta arriba, el contenido y lo informativo al final. Un
 * solo árbol y no dos copias escondidas con CSS: los `data-testid` y los
 * `aria-current` existen una vez.
 *
 * La cabecera es la del selector de perfil y la de «Antes de comenzar»: el
 * logotipo a la izquierda y la salida a la derecha, sin barra ni vidrio, para
 * que el registro se sienta una sola pieza.
 *
 * El movimiento respeta `prefers-reduced-motion` para todo lo que vive
 * adentro (`MotionConfig reducedMotion="user"`): con la preferencia puesta,
 * framer-motion apaga los desplazamientos y deja sólo los fundidos.
 */

import type { ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'
import { LeasefyLogotype } from '@/components/brand'
import { cn } from '@/lib/utils'

export interface OnboardingWizardLayoutProps {
  /**
   * La marca de la cabecera. Por defecto el logotipo SIN enlace: dentro del
   * asistente de la inmobiliaria el logo es marca, no salida (ver el comentario
   * en `OnboardingInmobiliariaClient`). El inquilino pasa el suyo con enlace.
   */
  marca?: ReactNode
  /** Lo de la derecha de la cabecera: «Salir», «Saltar por ahora»… */
  accionesDeCabecera?: ReactNode
  /** Los pasos (`OnboardingStepList`). */
  pasos: ReactNode
  /** La columna informativa (`OnboardingInfoPanel`). */
  informacion?: ReactNode
  /**
   * Lo que va arriba de la tarjeta, fuera de ella: el enlace para volver a
   * elegir perfil, un aviso de error de la sesión…
   */
  antesDelContenido?: ReactNode
  /** El contenido del paso. Va dentro de la tarjeta protagonista. */
  children: ReactNode
  /**
   * Sin tarjeta: para estados que ya traen su propio marco (un error de
   * sesión, la carga del asistente). Por defecto, con tarjeta.
   */
  sinTarjeta?: boolean
  className?: string
}

export function OnboardingWizardLayout({
  marca,
  accionesDeCabecera,
  pasos,
  informacion,
  antesDelContenido,
  children,
  sinTarjeta = false,
  className,
}: OnboardingWizardLayoutProps) {
  return (
    <MotionConfig reducedMotion="user">
      <div className={cn('min-h-screen w-full bg-bg', className)}>
        <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8 sm:py-5">
          {marca ?? (
            <span className="flex items-center" aria-label="Leasefy">
              <LeasefyLogotype className="h-6 w-auto" title="Leasefy" />
            </span>
          )}
          {accionesDeCabecera ? <div className="flex items-center gap-2">{accionesDeCabecera}</div> : null}
        </header>

        <main className="mx-auto w-full max-w-[1180px] px-4 pb-16 pt-2 sm:px-8 lg:pt-6">
          <div
            data-testid="asistente-de-registro"
            className="grid grid-cols-1 gap-6 lg:grid-cols-[208px_minmax(0,1fr)_272px] lg:gap-10 xl:grid-cols-[224px_minmax(0,1fr)_296px] xl:gap-14"
          >
            {/* Pasos: fila compacta en teléfono, columna en escritorio. */}
            <div className="lg:sticky lg:top-8 lg:self-start lg:pt-2">{pasos}</div>

            <div className="mx-auto w-full min-w-0 max-w-[580px]">
              {antesDelContenido ? <div className="mb-4">{antesDelContenido}</div> : null}
              {sinTarjeta ? (
                children
              ) : (
                <div className="rounded-lg border border-border bg-surface shadow-xs">{children}</div>
              )}
            </div>

            {informacion ? (
              <aside aria-label="Información del paso" className="lg:sticky lg:top-8 lg:self-start lg:pt-2">
                {informacion}
              </aside>
            ) : null}
          </div>
        </main>
      </div>
    </MotionConfig>
  )
}
