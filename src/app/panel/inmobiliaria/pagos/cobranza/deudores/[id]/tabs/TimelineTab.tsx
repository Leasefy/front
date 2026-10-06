'use client'

/**
 * TimelineTab — Phase 31 plan 31-09.
 *
 * Chronological event list (stage_transition / call / payment / memo).
 * Click stage_transition expands {from, to, actor, reason}. Click call row
 * navigates to /cobranza/llamadas/[callId].
 *
 * NOTE: long histories (>200 events) — swap react-virtual in a later phase.
 */

import * as React from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { useI18n } from '@/lib/i18n'
import { useDebtorTimeline } from '@/lib/hooks/cobranza/use-debtor-timeline'
import { relativeTime } from '@/lib/cartera'
import {
  ArrowsLeftRight,
  PhoneCall,
  CheckCircle,
  NotePencil,
  Circle,
  type Icon,
} from '@phosphor-icons/react'
import { Collapse, CrossFade, Stagger, StaggerItem } from '@leasefy/cadence'
import { Button } from '@/components/ui'

void React

/**
 * La clave de cada evento: lo que ES (tipo + momento), no su posición. Con el
 * índice, un evento nuevo que llega arriba (tiempo real) le cambiaba la clave
 * a todos y la lista entera volvía a entrar. Dos del mismo tipo en el mismo
 * instante se distinguen por su orden de aparición (`#2`, `#3`).
 */
function clavesDeLosEventos(events: { event_type: string; occurred_at: string }[]): string[] {
  const vistas = new Map<string, number>()
  return events.map((ev) => {
    const base = `${ev.event_type}-${ev.occurred_at}`
    const n = (vistas.get(base) ?? 0) + 1
    vistas.set(base, n)
    return n === 1 ? base : `${base}#${n}`
  })
}

interface TimelineTabProps {
  debtorId: string
  /** Bump from parent (Phase 31 plan 31-11 realtime) to force a refetch. */
  refetchKey?: number
}

/*
 * 🔴 19-09: acá había emojis (⇄ 📞 ✅ 📝). Un emoji se pinta con la fuente del
 * sistema: cambia de forma en cada plataforma, no hereda `currentColor` —así
 * que en tema oscuro queda de otro color que el texto que acompaña— y no
 * escala con el resto de la tipografía. El panel marca todo lo demás con
 * iconos de Phosphor; esta línea de tiempo era la excepción.
 */
const EVENT_ICON: Record<string, Icon> = {
  stage_transition: ArrowsLeftRight,
  call: PhoneCall,
  payment: CheckCircle,
  memo: NotePencil,
}

export function TimelineTab({ debtorId, refetchKey = 0 }: TimelineTabProps) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const { data, isLoading, error, refetch } = useDebtorTimeline({ debtorId })
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  // Realtime-driven refetch (D-31-18 single refetch per event).
  useEffect(() => {
    if (refetchKey > 0) void refetch()
  }, [refetchKey, refetch])

  // Movimiento: cada salida en un `CrossFade` con su clave (cargando →
  // eventos, → fallo, → vacío).
  if (isLoading && !data) {
    return (
      <CrossFade swapKey="cargando">
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="h-14 bg-surface-muted rounded-sm animate-pulse"
          />
        ))}
      </div>
      </CrossFade>
    )
  }

  if (error) {
    return (
      <CrossFade swapKey="fallo">
      <div className="rounded-md border border-danger/30 bg-danger-soft p-4 flex items-center justify-between gap-4">
        <p className="text-sm text-danger">
          {t('inmobiliaria.ai.cobranza.detail.timeline.error')}: {error}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          hideArrow
        >
          {t('inmobiliaria.ai.cobranza.detail.timeline.errorRetry')}
        </Button>
      </div>
      </CrossFade>
    )
  }

  const events = data?.events ?? []
  if (events.length === 0) {
    return (
      <CrossFade swapKey="vacio">
      <div className="rounded-md border border-dashed border-border p-8 text-center">
        <p className="text-sm text-fg-muted">
          {t('inmobiliaria.ai.cobranza.detail.timeline.empty')}
        </p>
      </div>
      </CrossFade>
    )
  }

  const claves = clavesDeLosEventos(events)

  // El evento que llega en vivo entra arriba bajando a su lugar; la primera
  // vez la lista entra escalonada (techo 320 ms). Sin `layout`: una historia
  // larga mediría cada fila en cada cambio.
  return (
    <CrossFade swapKey="eventos">
    <Stagger as="ol" direction="down" layout={false} className="space-y-2">
      {events.map((ev, idx) => {
        const isExpanded = expandedIdx === idx
        const isClickableCall =
          ev.event_type === 'call' &&
          ev.payload &&
          typeof (ev.payload as { call_id?: string }).call_id === 'string'

        const handleClick = () => {
          if (ev.event_type === 'stage_transition') {
            setExpandedIdx(isExpanded ? null : idx)
            return
          }
          if (isClickableCall) {
            const callId = (ev.payload as { call_id?: string }).call_id
            if (callId) {
              router.push(`/panel/inmobiliaria/pagos/cobranza/llamadas/${callId}`)
            }
          }
        }

        return (
          <StaggerItem
            as="li"
            key={claves[idx]}
            className="rounded-sm border border-border bg-surface"
          >
            <button
              type="button"
              onClick={handleClick}
              className="w-full text-left px-3 py-2 flex items-start gap-3 hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
            >
              <span
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-fg-muted"
                title={ev.event_type}
              >
                {(() => {
                  const Icono = EVENT_ICON[ev.event_type] ?? Circle
                  return <Icono className="h-4 w-4" weight="duotone" />
                })()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-fg">
                  {t(
                    `inmobiliaria.ai.cobranza.detail.timeline.event${
                      ev.event_type === 'stage_transition'
                        ? 'StageTransition'
                        : ev.event_type === 'call'
                          ? 'Call'
                          : ev.event_type === 'payment'
                            ? 'Payment'
                            : 'Memo'
                    }`,
                  )}
                </span>
                <span
                  className="block text-xs text-fg-muted mt-0.5"
                  title={new Date(ev.occurred_at).toLocaleString(locale)}
                >
                  {relativeTime(ev.occurred_at, locale)}
                </span>
              </span>
            </button>
            {/* El detalle del cambio de etapa se abre y se cierra con su
                altura (`Collapse`), no de golpe. */}
            <Collapse
              open={isExpanded && ev.event_type === 'stage_transition'}
              className="px-3 pb-3 pt-1 text-xs text-fg-muted border-t border-border font-mono"
            >
                <pre className="whitespace-pre-wrap break-words">
                  {JSON.stringify(ev.payload, null, 2)}
                </pre>
            </Collapse>
          </StaggerItem>
        )
      })}
    </Stagger>
    </CrossFade>
  )
}
