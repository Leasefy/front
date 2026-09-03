'use client'

// Phase 31 plan 31-10 (COBR-UI-04) — call detail client orchestrator.
// Renders header + responsive grid: sticky-top audio on sm, side-by-side on md+.
// Audio player, transcript, and side panels wired in Tasks 2-4.

import * as React from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { useCallDetail } from '@/lib/hooks/cobranza/use-call-detail'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { Button } from '@/components/ui'
import { Badge } from '@leasefy/cadence'
import CallAudioPlayer from '@/components/inmobiliaria/cobranza/call/CallAudioPlayer'
import CallTranscript from '@/components/inmobiliaria/cobranza/call/CallTranscript'
import CallQAPanel from '@/components/inmobiliaria/cobranza/call/CallQAPanel'
import CallStateTracePanel from '@/components/inmobiliaria/cobranza/call/CallStateTracePanel'
import CallSummaryPanel from '@/components/inmobiliaria/cobranza/call/CallSummaryPanel'
import {
  callOutcomeLabel,
  channelLabel,
  directionLabel,
} from '@/lib/cobranza/call-vocab'

interface CallDetailClientProps {
  callId: string
}

function formatSec(total: number): string {
  if (!Number.isFinite(total) || total < 0) return '00:00'
  const m = Math.floor(total / 60)
  const s = Math.floor(total % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

type BadgeVariant = NonNullable<React.ComponentProps<typeof Badge>['variant']>

/**
 * Los dos pills de la cabecera se armaban a mano (`rounded-full px-2.5 …
 * ring-1` + bg/text/ring), en paralelo al Badge del DS. Ahora el puntaje se
 * expresa como `variant` de Cadence — mismos cortes de siempre.
 */
function qaVariant(score: number | null | undefined): BadgeVariant {
  if (score == null) return 'neutral'
  if (score >= 80) return 'success'
  if (score >= 60) return 'warning'
  return 'danger'
}

export default function CallDetailClient({ callId }: CallDetailClientProps) {
  const { t, locale } = useI18n()
  const { agency } = useAuth()
  const agencyId = agency?.id ?? ''
  const { data, isLoading, error, refetch } = useCallDetail({ callId })

  // Audio element ref lives at the orchestrator level so transcript click-to-seek
  // can drive the same <audio> that CallAudioPlayer renders.
  const audioRef = useRef<HTMLAudioElement>(null)

  // Phase 38-07 (D-38-11): export transcript PDF state + callback.
  // Hybrid: backend (38-03) returns PII-redacted JSON; client renders the
  // PDF document via @react-pdf/renderer and triggers browser download.
  const [isExportingTranscript, setIsExportingTranscript] = useState(false)

  const seekTo = useCallback((sec: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = sec
      void audioRef.current.play().catch(() => {
        /* autoplay policy — swallow silently */
      })
    }
  }, [])

  // `startedAt` (connected_at) es null cuando nadie contestó; `initiatedAt`
  // siempre existe. Mostrar vacío en una llamada no contestada es peor que
  // mostrar cuándo se intentó.
  const startedAtLabel = useMemo(() => {
    const iso = data?.startedAt ?? data?.initiatedAt
    if (!iso) return ''
    try {
      return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso))
    } catch {
      return iso
    }
  }, [data?.startedAt, data?.initiatedAt, locale])

  const exportTranscript = useCallback(async () => {
    if (isExportingTranscript || !data) return
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl || !agencyId) return
    setIsExportingTranscript(true)
    try {
      const resp = await agentFetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/calls/${callId}/transcript?redacted=true`)
      if (!resp.ok) throw new Error(`transcript fetch failed: ${resp.status}`)
      // Forma REAL del endpoint. Antes se esperaba `debtorNameRedacted` y
      // `timestamp`, que no existen: el PDF salía con «undefined» donde va el
      // nombre del deudor y sin hora en cada turno. En un documento que sirve
      // de evidencia ante una queja, eso lo invalida.
      const json = (await resp.json()) as {
        turns: Array<{ index: number; speaker: string; text: string; startedAt: string }>
        totalTurns: number
        generatedAt: string
      }
      const [{ pdf }, { TranscriptPdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/lib/cobranza/transcript-pdf-document'),
      ])
      // El endpoint manda `startedAt` absoluto por turno; el PDF quiere el
      // minuto relativo al inicio de la llamada, igual que el panel.
      const base =
        json.turns.length > 0 ? new Date(json.turns[0].startedAt).getTime() : 0
      const turns = json.turns.map((t) => {
        const seg = Math.max(0, Math.round((new Date(t.startedAt).getTime() - base) / 1000))
        const mm = String(Math.floor(seg / 60)).padStart(2, '0')
        const ss = String(seg % 60).padStart(2, '0')
        return {
          speaker: (t.speaker === 'customer' ? 'debtor' : 'agent') as 'agent' | 'debtor',
          text: t.text,
          timestamp: `${mm}:${ss}`,
        }
      })

      const element = (
        <TranscriptPdf
          callId={callId}
          // El nombre enmascarado ya lo trae el detalle de la llamada; el
          // endpoint de transcript no devuelve ninguno.
          debtorNameRedacted={data.debtorNameMasked}
          generatedAt={json.generatedAt}
          turns={turns}
        />
      )
      const blob = await pdf(element).toBlob()
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      const dateStr = data.startedAt
        ? new Date(data.startedAt).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)
      anchor.href = objectUrl
      anchor.download = `transcript-${callId.slice(0, 8)}-${dateStr}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      console.error('[exportTranscript] failed:', err)
    } finally {
      setIsExportingTranscript(false)
    }
  }, [isExportingTranscript, data, agencyId, callId])

  // -------- Loading skeleton (Phase 38-05a: PageSkeleton primitive, detail variant) --------
  if (isLoading && !data) return <PageSkeleton variant="detail" />


  // -------- Error --------
  if (error && !data) {
    return (
      <main className="p-6 lg:p-8">
        <div className="rounded-lg border border-danger/30 bg-danger-soft p-6 max-w-xl">
          <p className="text-sm text-danger font-medium">
            {t('inmobiliaria.ai.cobranza.call.error')}
          </p>
          <p className="text-xs text-danger/80 mt-1">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void refetch()
            }}
            hideArrow
            className="mt-3"
          >
            {t('inmobiliaria.ai.cobranza.call.errorRetry')}
          </Button>
        </div>
      </main>
    )
  }

  // -------- Empty (no data) --------
  if (!data) {
    return (
      <main className="p-6 lg:p-8">
        <p className="text-sm text-fg-muted">
          {t('inmobiliaria.ai.cobranza.call.empty')}
        </p>
      </main>
    )
  }

  // Escala 0-100 (la garantiza `calls_qa_score_decimal_range`). El código
  // viejo comparaba contra 0,8 / 0,6 y multiplicaba por 100, así que toda
  // llamada salía roja con un número de cuatro cifras.
  const qa = qaVariant(data.qa.overall)
  const overallPct = data.qa.overall == null ? null : Math.round(data.qa.overall)

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="space-y-3">
        <Link
          href={`/panel/inmobiliaria/cobros/cobranza/deudores/${data.debtorId}`}
          className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg hover:underline min-h-11"
        >
          ← {t('inmobiliaria.ai.cobranza.call.back')}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-fg tracking-tight">
              {data.debtorNameMasked}
            </h1>
            <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-fg-muted">
              <div className="flex gap-1">
                <dt className="font-medium">
                  {t('inmobiliaria.ai.cobranza.call.header.startedAt')}:
                </dt>
                <dd>{startedAtLabel}</dd>
              </div>
              {data.durationSeconds != null && (
                <div className="flex gap-1">
                  <dt className="font-medium">
                    {t('inmobiliaria.ai.cobranza.call.header.duration')}:
                  </dt>
                  <dd className="font-mono tabular-nums">{formatSec(data.durationSeconds)}</dd>
                </div>
              )}
              <div className="flex gap-1">
                <dt className="font-medium">
                  {t('inmobiliaria.ai.cobranza.call.header.outcome')}:
                </dt>
                {/* Nunca el slug crudo — ver call-vocab.ts */}
                <dd>{callOutcomeLabel(data.outcome) ?? '—'}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="font-medium">Canal:</dt>
                <dd>
                  {channelLabel(data.channel)}
                  {data.direction === 'inbound' && ` · ${directionLabel(data.direction)}`}
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={qa}
              className="tabular-nums"
              aria-label={t('inmobiliaria.ai.cobranza.call.header.qaOverall')}
            >
              QA {overallPct == null ? '—' : `${overallPct}/100`}
            </Badge>
            <Badge
              variant="neutral"
              className="tabular-nums"
              aria-label={t('inmobiliaria.ai.cobranza.call.header.complianceCount')}
            >
              {data.complianceEvents.length}{' '}
              {t('inmobiliaria.ai.cobranza.call.header.complianceCount')}
            </Badge>
            {/* Phase 38-07 (D-38-11): export transcript PDF button. Backend
                returns PII-redacted JSON; @react-pdf/renderer builds the PDF
                client-side and triggers browser download. */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { void exportTranscript() }}
              disabled={isExportingTranscript}
              isLoading={isExportingTranscript}
              hideArrow
              aria-label={t('inmobiliaria.ai.cobranza.call.exportTranscriptPdf')}
            >
              {isExportingTranscript
                ? (locale.startsWith('es') ? 'Generando...' : 'Generating...')
                : t('inmobiliaria.ai.cobranza.call.exportTranscriptPdf')}
            </Button>
          </div>
        </div>
      </header>

      {/* Responsive grid: single column on sm; two columns on md+. */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_22rem] gap-6">
        {/* LEFT COLUMN: audio (sticky) + transcript */}
        <div className="space-y-4">
          {/*
            Reproductor sticky. El envoltorio NO lleva fondo ni padding propio:
            el reproductor ya es una tarjeta con `bg-surface` y esquinas
            redondeadas, así que un `bg-surface` acá dibujaba un rectángulo
            recto por detrás — se veía como un marco cuadrado alrededor de la
            tarjeta redondeada.
          */}
          {/*
            El reproductor decide solo si hay audio: le pregunta al proxy, que
            a su vez le pregunta a Vapi. NO se usa `data.hasRecording` acá — esa
            bandera sale de una columna que sólo se llena si llegó el
            `end-of-call-report`, y se desincroniza (ver `use-call-recording.ts`).
          */}
          {/*
            Se pega DEBAJO de las pestañas del workspace, no encima.

            El `md:top-20` anterior (80px) caía dentro de la franja de las
            pestañas —que arrancan a los 64px— así que el reproductor se montaba
            sobre ellas. La altura de la barra no era un número disponible en
            ningún lado; ahora `WorkspaceNav` la publica en `--workspace-nav-h`
            y las secciones de Cobros (que van encima) en `--secciones-h`; acá
            se suman las dos a los 64px del header.

            `z-10` y no `z-20`: empatado con las pestañas ganaba el reproductor
            por orden en el DOM, que es justo lo que se veía mal.
          */}
          <div className="sticky top-[calc(4rem+var(--secciones-h,0px)+var(--workspace-nav-h,3rem))] z-10">
            <CallAudioPlayer
              callId={callId}
              agencyId={agencyId}
              audioRef={audioRef}
            />
          </div>

          {/* Transcript */}
          <CallTranscript
            callId={callId}
            onSeek={seekTo}
            complianceEvents={data.complianceEvents}
            callStartedAt={data.startedAt ?? data.initiatedAt}
          />
        </div>

        {/* RIGHT COLUMN: QA / state / cost */}
        <aside className="space-y-4">
          {/* Primero lo que pasó; los indicadores de proceso van después. */}
          <CallSummaryPanel summary={data.summary} />
          <CallQAPanel qa={data.qa} />
          <CallStateTracePanel stateTrace={data.stateTrace} />
          {/*
            Costos: FUERA del panel por decisión de producto (Nico, 2026-08-24
            — «no debemos mostrar los costos a los usuarios»). Lo que cuesta la
            llamada es dato interno de Leasefy, no de la inmobiliaria. El API
            sigue exponiendo `cost` para uso interno; solo se quita la tarjeta.
          */}
        </aside>
      </div>
    </main>
  )
}
