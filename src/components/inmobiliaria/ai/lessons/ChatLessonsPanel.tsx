'use client'

/**
 * ChatLessonsPanel — the AI chat "self-learning lessons" certification screen
 * (F3). Lists the lessons the assistant has learned from usage, grouped
 * candidates → certified → rejected, and lets an OPERATOR+ user certify or
 * discard each candidate.
 *
 * The fence is fail-closed: certifying a thinly-evidenced lesson resolves with
 * `applied: false` + a `reason` (NOT an HTTP error). This panel surfaces that
 * reason as a toast so the human understands why the certify did not stick.
 * Rejecting is always applied. VIEWER/CONTADOR can read but get no actions; a
 * stray 403 from certify is also handled with a toast.
 *
 * States mirror the AI hub conventions (use-ai-hub-landing / ai-hub-chat):
 *   - no backend wired      → honest "backend not configured" notice
 *   - loading               → skeletons
 *   - error                 → ErrorState with retry
 *   - empty                 → "el asistente aprende a medida que lo usás"
 *   - enabled === false     → banner: certified lessons exist but aren't applied
 */

import { useMemo, useState } from 'react'
import {
  Brain,
  Lightning,
  Warning,
  Info,
} from '@phosphor-icons/react'

import { useAuth } from '@/lib/auth'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { isAgencyManager } from '@/lib/auth/agency-roles'
import { toast } from '@/components/ui/toast'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { isAgentConfigured, type CertifyDecision } from '@/lib/api/ai-hub-lessons'
import { useChatLessons } from '@/lib/hooks/use-chat-lessons'
import { ChatLessonCard } from './ChatLessonCard'

const STATUS_ORDER = ['candidate', 'certified', 'rejected'] as const

const GROUP_TITLE: Record<(typeof STATUS_ORDER)[number], string> = {
  candidate: 'Por certificar',
  certified: 'Certificadas',
  rejected: 'Descartadas',
}

const GROUP_HINT: Record<(typeof STATUS_ORDER)[number], string> = {
  candidate: 'Lecciones aprendidas esperando tu revisión.',
  certified: 'Aprobadas por tu equipo — influyen en el asistente cuando el aprendizaje está activo.',
  rejected: 'Descartadas: el asistente no las usa.',
}

export function ChatLessonsPanel() {
  const { agency } = useAuth()
  // Roles vienen de PermissionsContext (my-permissions), igual que el sidebar y
  // la pantalla de escalaciones — NO de useAuth (que no expone isAdmin).
  const { isAdmin, agencyRole } = usePermissionsContext()
  // OPERATOR+ (en este codebase: ADMIN / AGENTE). VIEWER y CONTADOR: solo lectura.
  const canCertify = isAgencyManager({ isAdmin, agencyRole })

  const { lessons, enabled, isLoading, error, certify } = useChatLessons()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const grouped = useMemo(() => {
    const byStatus: Record<(typeof STATUS_ORDER)[number], typeof lessons> = {
      candidate: [],
      certified: [],
      rejected: [],
    }
    for (const lesson of lessons) byStatus[lesson.status].push(lesson)
    return byStatus
  }, [lessons])

  const candidateCount = grouped.candidate.length

  async function handleDecide(lessonId: string, decision: CertifyDecision) {
    setPendingId(lessonId)
    try {
      const result = await certify(lessonId, decision)
      if (decision === 'rejected') {
        toast.success('Lección descartada')
        return
      }
      // certified
      if (result.applied) {
        toast.success('Lección certificada')
      } else {
        // Fail-closed fence: surface the backend reason verbatim.
        toast.error(`No se pudo certificar: ${result.reason || 'evidencia insuficiente'}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'error desconocido'
      if (message.includes('403')) {
        toast.error('No tienes permiso para certificar lecciones.')
      } else {
        toast.error(`No se pudo procesar la acción: ${message}`)
      }
    } finally {
      setPendingId(null)
    }
  }

  // ── No backend wired (dev posture / fail-soft) ──────────────────────────────
  if (!isAgentConfigured()) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-white/[0.02] px-5 py-6">
        <div className="flex items-start gap-3">
          <Info weight="duotone" className="h-5 w-5 text-neutral-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
              El servicio del asistente no está conectado en este entorno.
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Las lecciones aparecerán aquí cuando el asistente esté disponible.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading && lessons.length === 0) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error && lessons.length === 0) {
    return (
      <ErrorState
        title="No pudimos cargar las lecciones"
        description="El asistente no respondió. Por favor intenta de nuevo."
        onRetry={() => void window.location.reload()}
      />
    )
  }

  // ── Empty ───────────────────────────────────────────────────────────────────
  if (lessons.length === 0) {
    return (
      <EmptyState
        icon={Brain}
        title="Aún no hay lecciones"
        description="El asistente aprende a medida que lo usás. Cuando detecte un patrón, lo verás aquí para certificarlo."
      />
    )
  }

  // ── List ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Master-switch banner: certified lessons exist but aren't applied yet. */}
      {!enabled && grouped.certified.length > 0 && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-[#B7791F]/30 bg-[#F8F0E0]/60 dark:border-[#B7791F]/40 dark:bg-[#B7791F]/10 px-4 py-3"
        >
          <Warning weight="duotone" className="h-5 w-5 text-[#B7791F] dark:text-[#D2992F] mt-0.5 flex-shrink-0" />
          <p className="text-sm text-[#7A5410] dark:text-[#D2992F]">
            <span className="font-medium">El aprendizaje está desactivado.</span>{' '}
            Tienes lecciones certificadas, pero todavía no influyen en el asistente.
            Se aplicarán cuando se active el aprendizaje para tu inmobiliaria.
          </p>
        </div>
      )}

      {/* Read-only notice for VIEWER / CONTADOR with candidates waiting. */}
      {!canCertify && candidateCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-white/[0.02] px-4 py-3">
          <Lightning weight="duotone" className="h-5 w-5 text-neutral-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Estás viendo las lecciones en modo lectura. Solo administradores y
            agentes pueden certificarlas.
          </p>
        </div>
      )}

      {STATUS_ORDER.map((status) => {
        const items = grouped[status]
        if (items.length === 0) return null
        return (
          <section key={status} aria-labelledby={`lessons-group-${status}`}>
            <div className="mb-3">
              <h2
                id={`lessons-group-${status}`}
                className="font-heading text-sm font-semibold text-neutral-900 dark:text-white"
              >
                {GROUP_TITLE[status]}
                <span className="ml-1.5 text-xs font-normal text-neutral-400 dark:text-neutral-500 tabular-nums">
                  {items.length}
                </span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {GROUP_HINT[status]}
              </p>
            </div>
            <div className="space-y-3">
              {items.map((lesson) => (
                <ChatLessonCard
                  key={lesson.id}
                  lesson={lesson}
                  canCertify={canCertify}
                  pendingId={pendingId}
                  onDecide={handleDecide}
                />
              ))}
            </div>
          </section>
        )
      })}

      {/* agency context guard — keeps the unused warning honest in builds where
          agency may be momentarily null without breaking the panel. */}
      {!agency && (
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          Selecciona una inmobiliaria para ver sus lecciones.
        </p>
      )}
    </div>
  )
}
