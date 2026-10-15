'use client'

/**
 * PreguntarView.tsx — la conversación abierta con Naira (Fase 13, plan 13-06; UI-SPEC §7.7, §11.1-§11.2, §12; P9-P13).
 *
 * Pinta el título, el vacío con ejemplos de preguntas (sin números), el hilo como `role="log"` y el compositor al final.
 * Cada turno muestra la pregunta tal como se escribió (UserBubble: solo el texto, sin autor ni hora; «quién preguntó» no
 * existe, B-5) y su estado: consultando, la respuesta, «Reintentar pregunta» si no se pudo enviar, o por qué no hay
 * respuesta. El borrador es estado de UI (no dato del agente): se va con la vista. No importa nada de `@/lib/hooks/` (el
 * fallo lo decide VistaDeNaira antes) y no conoce rutas del panel: las recibe.
 */

import type { JSX } from 'react'
import { useRef, useState } from 'react'
import { ChatTeardropText, Power } from '@phosphor-icons/react'

import { UserBubble } from '@/components/beta/UserBubble'
import { CompositorDePregunta } from '@/components/inmobiliaria/naira/CompositorDePregunta'
import { RespuestaDeNaira } from '@/components/inmobiliaria/naira/RespuestaDeNaira'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { useI18n } from '@/lib/i18n'
import type { HiloDeNaira, SugerenciaDePregunta, TurnoDeConversacion } from '@/lib/naira/conversacion'
import type { ChatMessage } from '@/lib/types/beta-chat'

export interface PreguntarViewProps {
  readonly hilo: HiloDeNaira
  readonly enCurso: boolean
  readonly onPreguntar: (pregunta: string) => void
  readonly onReintentarTurno: (turnoId: number) => void
  readonly hrefDeAprobaciones: string | null
  readonly sugerencias: readonly SugerenciaDePregunta[]
}

/** La conversación no está habilitada (Naira o su sub-flag apagados: el 404 no los distingue). Sin CTA. */
export function ConversacionApagada(): JSX.Element {
  const { t } = useI18n()
  return (
    <div data-testid="naira-conversacion-apagada">
      <EmptyState
        icon={Power}
        title={t('inmobiliaria.ai.naira.preguntar.apagadaTitulo')}
        description={t('inmobiliaria.ai.naira.preguntar.apagadaDescripcion')}
      />
    </div>
  )
}

/** La pregunta de un turno como mensaje del usuario (UserBubble no pinta la hora ni el autor). */
function mensajeDe(turno: TurnoDeConversacion): ChatMessage {
  return { id: 'naira-pregunta-' + turno.id, role: 'user', content: turno.pregunta, timestamp: new Date(0), status: 'complete' }
}

export function PreguntarView({
  hilo,
  enCurso,
  onPreguntar,
  onReintentarTurno,
  hrefDeAprobaciones,
  sugerencias,
}: PreguntarViewProps): JSX.Element {
  const { t } = useI18n()
  const [borrador, setBorrador] = useState('')
  const campo = useRef<HTMLTextAreaElement>(null)

  /** Precarga la pregunta y devuelve el foco al campo; NO envía. */
  const sugerir = (pregunta: string) => {
    setBorrador(pregunta)
    campo.current?.focus()
  }
  const enviar = (pregunta: string) => {
    onPreguntar(pregunta)
    setBorrador('')
  }

  /** El estado de un turno (el reintento reenvía la MISMA pregunta en su lugar, P11). */
  function estadoDelTurno(turno: TurnoDeConversacion): JSX.Element {
    const estado = turno.estado
    switch (estado.kind) {
      case 'consultando':
        return (
          <p data-naira-consultando="" className="flex items-center gap-2 text-sm text-fg-muted">
            <Spinner size="sm" label={t('inmobiliaria.ai.naira.preguntar.consultando')} />
            {t('inmobiliaria.ai.naira.preguntar.consultando')}
          </p>
        )
      case 'con_respuesta':
        return (
          <RespuestaDeNaira
            respuesta={estado.respuesta}
            origen={estado.origen}
            hrefDeAprobaciones={hrefDeAprobaciones}
            onSugerir={sugerir}
          />
        )
      case 'no_enviada':
        return (
          <div role="status" className="space-y-2">
            <p className="text-sm text-fg">{t('inmobiliaria.ai.naira.preguntar.noEnviada')}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="naira-reintentar-pregunta"
              disabled={enCurso}
              onClick={() => onReintentarTurno(turno.id)}
            >
              {t('inmobiliaria.ai.naira.preguntar.reintentar')}
            </Button>
          </div>
        )
      case 'ilegible':
        return (
          <p role="status" className="text-sm text-fg">
            {t('inmobiliaria.ai.naira.preguntar.ilegible')}
          </p>
        )
      case 'invalida':
        return (
          <p role="status" className="text-sm text-fg">
            {t('inmobiliaria.ai.naira.preguntar.invalida')}
          </p>
        )
      default: {
        const _exhaustivo: never = estado
        return _exhaustivo
      }
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight leading-tight text-fg">{t('inmobiliaria.ai.naira.preguntar.titulo')}</h1>
        <p className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.preguntar.bajada')}</p>
      </header>
      {hilo.turnos.length === 0 ? (
        <div data-testid="naira-preguntar-vacio" className="space-y-3">
          <EmptyState
            icon={ChatTeardropText}
            title={t('inmobiliaria.ai.naira.preguntar.vacioTitulo')}
            description={t('inmobiliaria.ai.naira.preguntar.vacioDescripcion')}
          />
          {sugerencias.length > 0 ? (
            <ul aria-label={t('inmobiliaria.ai.naira.preguntar.ejemplos')} className="flex flex-wrap justify-center gap-2">
              {sugerencias.map((s, i) =>
                s.kind === 'metrica' ? (
                  <li key={i}>
                    <Button type="button" variant="link" size="sm" onClick={() => sugerir(s.pregunta)}>
                      {s.etiqueta}
                    </Button>
                  </li>
                ) : null,
              )}
            </ul>
          ) : null}
        </div>
      ) : null}
      <section
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={t('inmobiliaria.ai.naira.preguntar.hilo')}
        aria-busy={enCurso}
        data-naira-hilo=""
        className="mx-auto w-full min-w-0 max-w-3xl space-y-4"
      >
        {hilo.turnos.map((turno) => (
          <div key={turno.id} data-naira-turno={turno.estado.kind} className="min-w-0 space-y-2">
            <UserBubble message={mensajeDe(turno)} />
            {estadoDelTurno(turno)}
          </div>
        ))}
      </section>
      <div className="mx-auto w-full min-w-0 max-w-3xl">
        <CompositorDePregunta valor={borrador} onCambiar={setBorrador} onEnviar={enviar} ocupado={enCurso} refDelCampo={campo} />
      </div>
    </div>
  )
}
