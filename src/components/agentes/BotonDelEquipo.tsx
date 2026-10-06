'use client'

import { CaretRight } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { IdDeAgente } from '@/lib/agentes/equipo'

import { OrbeDeAgente } from './OrbeDeAgente'
import { useEquipoDeAgentes } from './equipo-de-agentes-context'

/** Los orbes que asoman en el botón: el orquestador adelante y tres del equipo. */
const ASOMAN: IdDeAgente[] = ['orquestador', 'cobranza', 'pagos', 'retencion']

/**
 * El botón que abre «El equipo»: una pila de orbes + «Conoce al equipo».
 * Pensado para la fila «Según lo que pidas, el chat llama a su especialista…»
 * de la llegada y para la cabecera de la conversación. Sin el provider montado
 * no se pinta (un botón que no abre nada sería una promesa falsa).
 */
export function BotonDelEquipo({
  agente,
  conTexto = true,
  className,
}: {
  /** Abre directo en este agente. */
  agente?: IdDeAgente
  conTexto?: boolean
  className?: string
}) {
  const { t } = useI18n()
  const { abrir, disponible } = useEquipoDeAgentes()
  if (!disponible) return null
  return (
    <button
      type="button"
      onClick={() => abrir(agente)}
      aria-label={conTexto ? undefined : t('agentes.equipo.abrirAria')}
      className={cn(
        'group inline-flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1.5 pr-3 text-caption font-medium text-fg',
        'transition-colors hover:border-border-strong hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      data-testid="boton-del-equipo"
    >
      <span className="flex items-center -space-x-1.5" aria-hidden="true">
        {ASOMAN.map((id, i) => (
          <span key={id} className="relative rounded-full" style={{ zIndex: ASOMAN.length - i }}>
            <OrbeDeAgente agente={id} tamano={i === 0 ? 22 : 18} quieto={i !== 0} decorativo />
          </span>
        ))}
      </span>
      {conTexto && <span>{t('agentes.equipo.abrir')}</span>}
      {conTexto && (
        <CaretRight size={12} aria-hidden="true" className="text-fg-subtle transition-transform group-hover:translate-x-0.5" />
      )}
    </button>
  )
}
