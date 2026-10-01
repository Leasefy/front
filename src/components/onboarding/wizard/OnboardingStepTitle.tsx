'use client'

/**
 * El encabezado de un paso: «Paso N de M» en versalitas, el título y una línea
 * de qué se pide.
 *
 * 🔴 El título NO va en negrita (Nico, 30-09: «los títulos no los manejamos en
 * bold y ya lo sabes»). Es el patrón de las pantallas nuevas aprobadas —
 * `/auth` (`AuthForm`) y el paso a paso del segundo factor —: `font-heading`,
 * peso medio, interletrado cerrado y tamaño contenido. No `.text-h1`, que es
 * negrita y llega a 48 px.
 *
 * Al cambiar de paso el foco pasa al título (no en la primera pintura: ahí
 * manda el campo que tenga `autoFocus`), para que el lector de pantalla
 * anuncie dónde quedó la persona — igual que en el segundo factor.
 */

import { useEffect, useRef, type ReactNode } from 'react'

export interface OnboardingStepTitleProps {
  /** Cambia cuando cambia el paso; con eso se mueve el foco al título. */
  pasoId: string
  /** «Paso 2 de 4». Se omite si no hay número que dar. */
  rotulo?: string
  titulo: string
  subtitulo?: ReactNode
  /** Algo antes del rótulo, dentro del encabezado («← Cambiar de perfil»). */
  antes?: ReactNode
}

export function OnboardingStepTitle({ pasoId, rotulo, titulo, subtitulo, antes }: OnboardingStepTitleProps) {
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const pasoAnterior = useRef(pasoId)

  useEffect(() => {
    if (pasoAnterior.current === pasoId) return
    pasoAnterior.current = pasoId
    tituloRef.current?.focus({ preventScroll: false })
  }, [pasoId])

  return (
    <div>
      {antes}
      {rotulo ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">{rotulo}</p>
      ) : null}
      <h1
        ref={tituloRef}
        tabIndex={-1}
        className="mt-2 text-balance font-heading text-[26px] font-medium leading-[1.12] tracking-[-0.03em] text-fg outline-none sm:text-[28px]"
      >
        {titulo}
      </h1>
      {subtitulo ? <p className="mt-2 text-pretty text-body-sm text-fg-muted">{subtitulo}</p> : null}
    </div>
  )
}
