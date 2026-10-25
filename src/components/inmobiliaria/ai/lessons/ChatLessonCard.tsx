'use client'

/**
 * ChatLessonCard — one self-learning lesson row in the certification fence (F3).
 *
 * Shows the human-readable `recommendation` as the main text, a kind badge
 * (enrutamiento/aprobación), the agent it concerns, and evidence (support,
 * approved/rejected for approval lessons, relative "última vez", sample
 * question). Candidate lessons get Certificar + Descartar actions; certified
 * lessons show a "Certificada" badge + a "Revertir" (→ reject); rejected
 * lessons are dimmed.
 *
 * Pure presentation — all backend calls live in useChatLessons. The actions are
 * disabled while a decision is in flight and hidden entirely for users without
 * certify permission (OPERATOR+).
 *
 * Glow up 22-10-2026 (Cadence 2): tokens de la casa en vez de hex, el estado
 * en una pastilla (`Badge`) y el tipo y el agente en una línea gris (antes
 * tres pastillas de color y una barra de color a la izquierda); letra de 13 px
 * como mínimo (los #temas iban a 10 px); «Certificar» de borde: en la lista hay
 * una por lección y el azul de la pantalla es uno solo.
 */

import { ArrowCounterClockwise, Check, X } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type {
  ChatLesson,
  ChatLessonAgent,
  CertifyDecision,
} from '@/lib/api/ai-hub-lessons'

// ── Display maps (es-CO) ──────────────────────────────────────────────────────

const KIND_LABEL: Record<ChatLesson['kind'], string> = {
  routing: 'Enrutamiento',
  approval: 'Aprobación',
  // No se minó: alguien del equipo la escribió corrigiendo una respuesta con el
  // pulgar abajo, y por eso nace certificada.
  feedback: 'Corrección del equipo',
}

/** Human label for the agent a lesson concerns. */
const AGENT_LABEL: Record<ChatLessonAgent, string> = {
  cobranza: 'Cobranza',
  cotizador: 'Asegurabilidad',
  estudio: 'Estudio',
  matching: 'Afinidad',
  avaluo: 'Avalúos',
  conciliacion: 'Conciliación',
  pagos: 'Pagos',
}

function agentLabel(agent: ChatLesson['pattern']['agent']): string {
  if (!agent) return 'General'
  return AGENT_LABEL[agent as ChatLessonAgent] ?? agent
}

/** Relative "última vez" without a date-fns dependency (Intl semantics). */
function relativeLastSeen(iso: string): string {
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return '—'
  const diffMin = Math.floor((Date.now() - ts) / 60_000)
  if (diffMin < 1) return 'hace un momento'
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `hace ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 30) return `hace ${diffD} d`
  const diffMo = Math.floor(diffD / 30)
  return `hace ${diffMo} mes${diffMo === 1 ? '' : 'es'}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface ChatLessonCardProps {
  lesson: ChatLesson
  /** Whether the current user may certify/reject (OPERATOR+). */
  canCertify: boolean
  /** The lesson id currently being decided (disables that row's actions). */
  pendingId: string | null
  onDecide: (lessonId: string, decision: CertifyDecision) => void
  className?: string
}

export function ChatLessonCard({
  lesson,
  canCertify,
  pendingId,
  onDecide,
  className,
}: ChatLessonCardProps) {
  const isRejected = lesson.status === 'rejected'
  const isCertified = lesson.status === 'certified'
  const isCandidate = lesson.status === 'candidate'
  const isBusy = pendingId === lesson.id

  return (
    <div
      data-testid="chat-lesson-card"
      data-status={lesson.status}
      className={cn(
        'rounded-lg border border-border bg-card',
        'transition-opacity duration-base ease-standard',
        isRejected && 'opacity-60',
        className,
      )}
    >
      <div className="p-4 sm:p-5">
        {/* Tipo y agente en una línea gris; el estado en su pastilla */}
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-caption text-fg-muted">
            {KIND_LABEL[lesson.kind]} · {agentLabel(lesson.pattern.agent)}
          </p>

          <div className="ml-auto">
            {isCertified && <Badge variant="success">Certificada</Badge>}
            {isRejected && <Badge variant="secondary">Descartada</Badge>}
            {isCandidate && <Badge variant="warning">Candidata</Badge>}
          </div>
        </div>

        {/* Recommendation — the primary text (brand heading font) */}
        <p className="mt-2 text-body leading-snug text-fg">
          {lesson.recommendation}
        </p>

        {/* Tags */}
        {lesson.pattern.tags.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-caption text-fg-muted">
            {lesson.pattern.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </p>
        )}

        {/* Evidence */}
        <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-fg-muted">
          <div className="flex items-center gap-1">
            <dt className="sr-only">Observaciones</dt>
            <dd className="tabular-nums">
              <span className="text-fg">{lesson.evidence.support}</span>{' '}
              {lesson.evidence.support === 1 ? 'observación' : 'observaciones'}
            </dd>
          </div>

          {lesson.kind === 'approval' &&
            (lesson.evidence.approved !== undefined ||
              lesson.evidence.rejected !== undefined) && (
              <div className="flex items-center gap-1">
                <dt className="sr-only">Aprobadas / rechazadas</dt>
                <dd className="tabular-nums">
                  <span className="text-success-700 dark:text-success-100">
                    {lesson.evidence.approved ?? 0}{' '}
                    {(lesson.evidence.approved ?? 0) === 1 ? 'aprobada' : 'aprobadas'}
                  </span>
                  {' · '}
                  <span className="text-danger">
                    {lesson.evidence.rejected ?? 0}{' '}
                    {(lesson.evidence.rejected ?? 0) === 1 ? 'rechazada' : 'rechazadas'}
                  </span>
                </dd>
              </div>
            )}

          <div className="flex items-center gap-1">
            <dt className="sr-only">Última vez</dt>
            <dd>última vez {relativeLastSeen(lesson.evidence.lastSeen)}</dd>
          </div>
        </dl>

        {/* Sample question */}
        {lesson.evidence.sampleQuestion && (
          <p className="mt-2 border-l-2 border-border pl-2.5 text-caption italic text-fg-muted">
            “{lesson.evidence.sampleQuestion}”
          </p>
        )}

        {/* Actions */}
        {canCertify && (isCandidate || isCertified) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {isCandidate && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  isLoading={isBusy}
                  disabled={isBusy}
                  hideArrow
                  onClick={() => onDecide(lesson.id, 'certified')}
                >
                  <Check className="h-4 w-4" weight="bold" />
                  Certificar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isBusy}
                  onClick={() => onDecide(lesson.id, 'rejected')}
                >
                  <X className="h-4 w-4" weight="bold" />
                  Descartar
                </Button>
              </>
            )}
            {isCertified && (
              <Button
                size="sm"
                variant="ghost"
                disabled={isBusy}
                isLoading={isBusy}
                onClick={() => onDecide(lesson.id, 'rejected')}
              >
                <ArrowCounterClockwise className="h-4 w-4" />
                Revertir
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
