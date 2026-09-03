'use client'

/**
 * LlamadaDetalleSheet — el detalle de UNA llamada, en un cajón.
 *
 * Pedido de Nico (2026-08-25): desde la pestaña «Llamadas» del deudor, el clic
 * navegaba a la página completa del detalle — y en dev el primer clic moría
 * compilando la ruta (8.7s + reinicio por memoria: «da un error y no pasa
 * nada»). Para mirar UNA llamada sin perder el contexto del caso, un cajón:
 * mismo patrón que `AcuerdoDetalleSheet`, mismas piezas que la página.
 *
 * No reinventa nada: `useCallDetail` + los paneles reales del detalle
 * (audio, resumen, QA, transcripción, traza). La página completa sigue
 * existiendo —el PDF de transcripción vive allá— y el pie del cajón la
 * enlaza.
 *
 * PII: acá solo viajan los campos ya enmascarados del endpoint
 * (`debtorNameMasked`, `debtorCedulaMasked`) — igual que la página.
 */

import { useRef } from 'react'
import Link from 'next/link'

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui'
// El Badge de cadence — el del barrel local no tiene el variant `neutral`,
// y la página del detalle usa este mismo.
import { Badge } from '@leasefy/cadence'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { useCallDetail } from '@/lib/hooks/cobranza/use-call-detail'
import CallAudioPlayer from '@/components/inmobiliaria/cobranza/call/CallAudioPlayer'
import CallTranscript from '@/components/inmobiliaria/cobranza/call/CallTranscript'
import CallQAPanel from '@/components/inmobiliaria/cobranza/call/CallQAPanel'
import CallSummaryPanel from '@/components/inmobiliaria/cobranza/call/CallSummaryPanel'
import CallStateTracePanel from '@/components/inmobiliaria/cobranza/call/CallStateTracePanel'
import {
  callOutcomeLabel,
  channelLabel,
  directionLabel,
} from '@/lib/cobranza/call-vocab'

export interface LlamadaDetalleSheetProps {
  /** null = cerrado. El cajón se monta solo con una llamada elegida. */
  callId: string | null
  onClose: () => void
}

function formatSec(total: number): string {
  if (!Number.isFinite(total) || total < 0) return '00:00'
  const m = Math.floor(total / 60)
  const s = Math.floor(total % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Mismos cortes que la página del detalle (80/60). */
function qaVariant(score: number | null): 'success' | 'warning' | 'danger' | 'neutral' {
  if (score == null) return 'neutral'
  if (score >= 80) return 'success'
  if (score >= 60) return 'warning'
  return 'danger'
}

export function LlamadaDetalleSheet({ callId, onClose }: LlamadaDetalleSheetProps) {
  if (!callId) return null
  return <CajonAbierto callId={callId} onClose={onClose} />
}

/**
 * Separado para que `useCallDetail` corra siempre con un callId real: montar
 * el hook con null y esconder el resultado rompería el orden de hooks al
 * abrir y cerrar.
 */
function CajonAbierto({ callId, onClose }: { callId: string; onClose: () => void }) {
  const { t, locale } = useI18n()
  const { agency } = useAuth()
  const agencyId = agency?.id ?? ''
  const { data, isLoading, error, refetch } = useCallDetail({ callId })

  // El transcript busca (click-to-seek) sobre el MISMO <audio> del reproductor.
  const audioRef = useRef<HTMLAudioElement>(null)

  const iso = data?.startedAt ?? data?.initiatedAt ?? null
  let fechaLabel = ''
  if (iso) {
    try {
      fechaLabel = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso))
    } catch {
      fechaLabel = iso
    }
  }

  const overallPct = data?.qa.overall == null ? null : Math.round(data.qa.overall)

  return (
    <Sheet
      open
      onOpenChange={(abierto) => {
        if (!abierto) onClose()
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl !p-0 flex flex-col gap-0"
      >
        <SheetTitle className="sr-only">
          Llamada de cobranza{data ? ` a ${data.debtorNameMasked}` : ''}
        </SheetTitle>

        {/* Cabecera fija. `pr-12`: el botón de cerrar del Sheet va absoluto
            arriba a la derecha. */}
        <div className="flex-none border-b border-border p-5 pr-12 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-fg">
              {data?.debtorNameMasked ?? 'Llamada'}
            </h2>
            {data && (
              <Badge variant={qaVariant(data.qa.overall)} className="shrink-0 mt-0.5 tabular-nums">
                QA {overallPct == null ? '—' : `${overallPct}/100`}
              </Badge>
            )}
          </div>
          {data && (
            <p className="text-xs text-fg-muted">
              {[
                fechaLabel,
                data.durationSeconds != null ? formatSec(data.durationSeconds) : null,
                callOutcomeLabel(data.outcome) ?? null,
                `${channelLabel(data.channel)}${data.direction === 'inbound' ? ` · ${directionLabel(data.direction)}` : ''}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>

        {/* Cuerpo — `data-lenis-prevent` o el scroll queda muerto */}
        <div
          className="flex-1 overflow-y-auto p-5 space-y-4"
          data-lenis-prevent
          style={{ overscrollBehavior: 'contain' }}
        >
          {isLoading && !data && (
            <div className="space-y-3" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 rounded-lg bg-surface-muted animate-pulse" />
              ))}
            </div>
          )}

          {error && !data && !isLoading && (
            <div
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger-soft p-4 space-y-2"
            >
              <p className="text-sm text-danger font-medium">
                {t('inmobiliaria.ai.cobranza.call.error')}
              </p>
              <p className="text-xs text-danger/80">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
                hideArrow
              >
                {t('inmobiliaria.ai.cobranza.call.errorRetry')}
              </Button>
            </div>
          )}

          {data && (
            <>
              {/* El reproductor decide solo si hay audio: le pregunta al
                  proxy. NO se usa `data.hasRecording` — esa bandera se
                  desincroniza (ver use-call-recording.ts). */}
              <CallAudioPlayer callId={callId} agencyId={agencyId} audioRef={audioRef} />
              <CallSummaryPanel summary={data.summary} />
              <CallQAPanel qa={data.qa} />
              <CallTranscript
                callId={callId}
                onSeek={(sec) => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = sec
                    void audioRef.current.play().catch(() => {
                      /* política de autoplay — silencio */
                    })
                  }
                }}
                complianceEvents={data.complianceEvents}
                callStartedAt={data.startedAt ?? data.initiatedAt}
              />
              <CallStateTracePanel stateTrace={data.stateTrace} />
            </>
          )}
        </div>

        {/* Pie: la página completa sigue siendo la casa del PDF de
            transcripción y del replay a pantalla llena. */}
        <div className="flex-none border-t border-border p-4">
          <Button asChild variant="outline" size="sm" hideArrow>
            <Link href={`/panel/inmobiliaria/ai/cobranza/llamadas/${callId}`}>
              Abrir la página completa
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
