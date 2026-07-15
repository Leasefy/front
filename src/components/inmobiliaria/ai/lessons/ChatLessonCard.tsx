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
 * Styling vocabulary mirrors components/beta/DecisionCard.tsx (left accent bar,
 * neutral hairline, brand success/danger tokens) and the brand heading font
 * (font-heading / Satoshi), never a serif.
 */

import { CheckCircle, ArrowCounterClockwise, Check, X, Robot } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type {
  ChatLesson,
  ChatLessonAgent,
  CertifyDecision,
} from '@/lib/api/ai-hub-lessons'

// ── Display maps (es-CO) ──────────────────────────────────────────────────────

const KIND_LABEL: Record<ChatLesson['kind'], string> = {
  routing: 'Enrutamiento',
  approval: 'Aprobación',
}

/** Human label for the agent a lesson concerns. */
const AGENT_LABEL: Record<ChatLessonAgent, string> = {
  cobranza: 'Cobranza',
  cotizador: 'Asegurabilidad',
  estudio: 'Estudio',
  matching: 'Matching',
  avaluo: 'Avalúos',
  conciliacion: 'Conciliación',
  pagos: 'Pagos',
}

function agentLabel(agent: ChatLesson['pattern']['agent']): string {
  if (!agent) return 'General'
  return AGENT_LABEL[agent as ChatLessonAgent] ?? agent
}

/** Brand accent per status (left bar), mirroring DecisionCard's token set. */
const STATUS_ACCENT: Record<ChatLesson['status'], string> = {
  candidate: 'border-l-[#1A40FF]',
  certified: 'border-l-[#2C7A53]',
  rejected: 'border-l-neutral-300 dark:border-l-neutral-700',
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
        'rounded-lg border border-neutral-200/70 dark:border-border/50',
        'border-l-[3px]',
        STATUS_ACCENT[lesson.status],
        'bg-white dark:bg-card/80',
        'transition-opacity duration-200',
        isRejected && 'opacity-60',
        className,
      )}
    >
      <div className="p-4 sm:p-5">
        {/* Header: kind + agent badges, status chip */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-[#EEF1FF] dark:bg-[#1A40FF]/15 px-2 py-0.5 text-[11px] font-medium text-[#1A40FF] dark:text-[#5570FF]">
            {KIND_LABEL[lesson.kind]}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            <Robot weight="duotone" className="h-3 w-3" />
            {agentLabel(lesson.pattern.agent)}
          </span>

          <div className="ml-auto">
            {isCertified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F3EC] dark:bg-[#2C7A53]/15 px-2 py-0.5 text-[11px] font-medium text-[#2C7A53] dark:text-[#3EAE70]">
                <CheckCircle weight="fill" className="h-3.5 w-3.5" />
                Certificada
              </span>
            )}
            {isRejected && (
              <span className="inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                Descartada
              </span>
            )}
            {isCandidate && (
              <span className="inline-flex items-center rounded-full bg-[#F8F0E0] dark:bg-[#B7791F]/15 px-2 py-0.5 text-[11px] font-medium text-[#B7791F] dark:text-[#D2992F]">
                Candidata
              </span>
            )}
          </div>
        </div>

        {/* Recommendation — the primary text (brand heading font) */}
        <p className="mt-3 font-heading text-[15px] font-medium leading-snug text-neutral-900 dark:text-white">
          {lesson.recommendation}
        </p>

        {/* Tags */}
        {lesson.pattern.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {lesson.pattern.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-500 dark:text-neutral-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Evidence */}
        <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-1">
            <dt className="sr-only">Observaciones</dt>
            <dd className="tabular-nums">
              <span className="font-medium text-neutral-700 dark:text-neutral-200">
                {lesson.evidence.support}
              </span>{' '}
              {lesson.evidence.support === 1 ? 'observación' : 'observaciones'}
            </dd>
          </div>

          {lesson.kind === 'approval' &&
            (lesson.evidence.approved !== undefined ||
              lesson.evidence.rejected !== undefined) && (
              <div className="flex items-center gap-1">
                <dt className="sr-only">Aprobadas / rechazadas</dt>
                <dd className="tabular-nums">
                  <span className="text-[#2C7A53] dark:text-[#3EAE70]">
                    {lesson.evidence.approved ?? 0} aprob.
                  </span>
                  {' · '}
                  <span className="text-[#C4503B] dark:text-[#E0664D]">
                    {lesson.evidence.rejected ?? 0} rech.
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
          <p className="mt-2 border-l-2 border-neutral-200 dark:border-neutral-700 pl-2.5 text-xs italic text-neutral-500 dark:text-neutral-400">
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
                  variant="default"
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
                  variant="outline"
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
