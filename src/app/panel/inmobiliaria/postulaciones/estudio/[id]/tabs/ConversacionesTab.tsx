'use client'

/**
 * ConversacionesTab — estudio de inquilino, vista de caso (zona CENTRO).
 *
 * Visión §12: los mensajes intercambiados con el candidato durante el estudio
 * (solicitud de documentos, aclaraciones, recordatorios …) en un hilo de chat.
 * UX-only: el hilo real necesita un endpoint de mensajería que todavía no
 * existe → mostramos un EMPTY-STATE con la estructura de ejemplo de cómo se
 * verán las burbujas (sin inventar datos ni endpoints).
 */

import { ChatsCircle } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/data-display/EmptyState'
import type { EstudioDecision, TenantScoringResult } from '@/lib/estudio/decision'

interface ConversacionesTabProps {
  /** disponibles para enriquecer el hilo cuando exista backend. */
  decision?: EstudioDecision
  result?: TenantScoringResult
}

const NS = 'inmobiliaria.ai.estudio'

/** Burbujas de ejemplo (estructura visual del futuro hilo). */
const EJEMPLO_MENSAJES: {
  side: 'agencia' | 'candidato'
  bodyKey: string
  bodyFb: string
}[] = [
  {
    side: 'agencia',
    bodyKey: `${NS}.detalle.conversaciones.ejemplo.msg1`,
    bodyFb: 'Hola, para avanzar con tu estudio necesitamos tu certificado laboral.',
  },
  {
    side: 'candidato',
    bodyKey: `${NS}.detalle.conversaciones.ejemplo.msg2`,
    bodyFb: 'Claro, lo subo hoy mismo.',
  },
  {
    side: 'agencia',
    bodyKey: `${NS}.detalle.conversaciones.ejemplo.msg3`,
    bodyFb: 'Perfecto, gracias. Te avisamos cuando tengamos el resultado.',
  },
]

export function ConversacionesTab(_props: ConversacionesTabProps) {
  const { t } = useI18n()

  /** i18n con fallback — nunca muestra la clave cruda. */
  const tf = (key: string, fallback: string): string => {
    const r = t(key)
    return r === key ? fallback : r
  }

  return (
    <div className="space-y-5">
      <EmptyState
        icon={ChatsCircle}
        title={tf(`${NS}.detalle.conversaciones.empty.title`, 'Aún no hay conversaciones')}
        description={tf(
          `${NS}.detalle.conversaciones.empty.description`,
          'Cuando intercambies mensajes con el candidato durante el estudio, el hilo de la conversación aparecerá aquí.',
        )}
      />

      {/* Estructura de ejemplo — cómo se verá el hilo (sin datos reales) */}
      <section
        aria-label={tf(`${NS}.detalle.conversaciones.ejemplo.title`, 'Ejemplo de la conversación')}
        className="rounded-lg border border-border bg-card p-5"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
          {tf(`${NS}.detalle.conversaciones.ejemplo.title`, 'Ejemplo de la conversación')}
        </p>
        <ul role="list" className="mt-4 space-y-3">
          {EJEMPLO_MENSAJES.map((m, i) => {
            const esAgencia = m.side === 'agencia'
            return (
              <li
                key={i}
                className={cn('flex', esAgencia ? 'justify-end' : 'justify-start')}
                data-side={m.side}
              >
                <div className="max-w-[80%] min-w-0">
                  <span className="block text-xs font-medium uppercase tracking-wide text-fg-subtle mb-1 px-1">
                    {esAgencia
                      ? tf(`${NS}.detalle.conversaciones.ejemplo.autorAgencia`, 'Inmobiliaria')
                      : tf(`${NS}.detalle.conversaciones.ejemplo.autorCandidato`, 'Candidato')}
                  </span>
                  <div
                    className={cn(
                      'rounded-lg px-3.5 py-2 text-sm leading-snug',
                      esAgencia
                        ? 'rounded-br-sm bg-primary-soft text-primary'
                        : 'rounded-bl-sm bg-surface-muted text-fg border border-border',
                    )}
                  >
                    {tf(m.bodyKey, m.bodyFb)}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        <p className="mt-4 text-xs text-fg-subtle leading-snug">
          {tf(
            `${NS}.detalle.conversaciones.ejemplo.nota`,
            'Estructura ilustrativa. Los mensajes reales aparecerán con su fecha y canal cuando estén disponibles.',
          )}
        </p>
      </section>
    </div>
  )
}
