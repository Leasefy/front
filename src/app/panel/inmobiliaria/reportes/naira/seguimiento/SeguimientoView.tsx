'use client'

/**
 * SeguimientoView.tsx — lo que pinta un `ok` de la lista de loops vivos de Naira (Fase 13, plan 13-04; UI-SPEC §7.3.1,
 * §11.1, §12).
 *
 * Un `h1` y la bajada; los loops en el orden del servidor, una fila cada uno; y, si el rol no ve todo, la frase de ocultos
 * sin su número (U5). Una lista vacía con ocultos NO dice que Naira no sigue nada (sería falso): solo dice lo de los
 * ocultos (P6). Los conteos de Naira no se escriben.
 *
 * No importa ningún hook: recibe los datos del ok por props (el fallo y el 403 los decide `VistaDeNaira` antes).
 */

import type { JSX } from 'react'
import { ArrowsCounterClockwise } from '@phosphor-icons/react'

import { FilaDeSeguimiento } from '@/components/inmobiliaria/naira/FilaDeSeguimiento'
import { EmptyState } from '@/components/ui/empty-state'
import type { NairaOpenLoopsList } from '@/lib/api/naira/contrato'
import { useI18n } from '@/lib/i18n'

export interface SeguimientoViewProps {
  readonly lista: NairaOpenLoopsList
  readonly puedeVotar: boolean
  /** El Client devuelve `null` sin signal-view o con id vacío. */
  readonly hrefDeLaSenal: (promocionId: string) => string | null
  /** El Client devuelve `null` con id vacío. */
  readonly hrefDeLaBitacora: (loopId: string) => string | null
}

export function SeguimientoView({ lista, puedeVotar, hrefDeLaSenal, hrefDeLaBitacora }: SeguimientoViewProps): JSX.Element {
  const { t } = useI18n()
  const lineaDeOcultos =
    lista.ocultosPorRol > 0 ? (
      <p role="status" data-naira-ocultos="" className="text-sm text-fg-muted">
        {t('inmobiliaria.ai.naira.seguimiento.ocultosPorRol')}
      </p>
    ) : null

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight leading-tight text-fg">
          {t('inmobiliaria.ai.naira.seguimiento.titulo')}
        </h1>
        <p className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.seguimiento.bajada')}</p>
      </header>
      {lista.loops.length === 0 ? (
        lineaDeOcultos ?? (
          <div data-testid="naira-seguimiento-vacio">
            <EmptyState
              icon={ArrowsCounterClockwise}
              title={t('inmobiliaria.ai.naira.seguimiento.vacioTitulo')}
              description={t('inmobiliaria.ai.naira.seguimiento.vacioDescripcion')}
            />
          </div>
        )
      ) : (
        <>
          <ul className="space-y-4">
            {lista.loops.map((loop, i) => (
              <li key={`${i}-${loop.loopId}`} className="min-w-0">
                <FilaDeSeguimiento
                  loop={loop}
                  puedeVotar={puedeVotar}
                  hrefDeLaSenal={hrefDeLaSenal(loop.promocionId)}
                  hrefDeLaBitacora={hrefDeLaBitacora(loop.loopId)}
                />
              </li>
            ))}
          </ul>
          {lineaDeOcultos}
        </>
      )}
    </div>
  )
}
