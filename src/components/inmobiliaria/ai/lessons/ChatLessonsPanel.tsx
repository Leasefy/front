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
 * 🔴 (02-10-2026) Un fallo de certificar llega ENTERO (`ApiError`, ver
 * `certifyChatLesson`) y el toast lo dice por el traductor: un 403 dice quién
 * puede, un 5xx «de nuestro lado» con la referencia, «la conexión» sólo si no
 * hubo respuesta. Antes: «No se pudo procesar la acción: ai-hub chat lessons
 * certify 403», y el 403 se detectaba buscando «403» en el texto. El motivo
 * de la cerca (`reason`) viene en inglés del micro y tampoco se muestra crudo.
 *
 * States mirror the AI hub conventions (use-ai-hub-landing / ai-hub-chat):
 *   - no backend wired      → honest "backend not configured" notice
 *   - loading               → skeletons
 *   - error                 → <FalloDeCarga> con reintento (`refresh` del hook)
 *   - empty                 → "el asistente aprende a medida que lo usas"
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
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { EmptyState } from '@/components/ui/empty-state'
import { isAgentConfigured, type CertifyDecision } from '@/lib/api/ai-hub-lessons'
import { mensajeDelFalloDeLaAccion } from '@/lib/chat/fallo-de-la-accion'
import { useChatLessons } from '@/lib/hooks/use-chat-lessons'
import { ChatLessonCard } from './ChatLessonCard'
import { TablePagination } from '@/components/ui/pagination'
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination'

/** Ronda 30 (regla de Nico: listas con paginación): cada grupo de lecciones, de a 10. */
function LeccionesPaginadas<T extends { id: string }>({
  items,
  render,
}: {
  items: T[]
  render: (item: T) => React.ReactNode
}) {
  const pag = useTablePagination(items, {})
  return (
    <>
      <Stagger className="space-y-3">
        {pag.pageItems.map((item) => (
          <StaggerItem key={item.id}>{render(item)}</StaggerItem>
        ))}
      </Stagger>
      {items.length > pag.pageSize ? (
        <div className="pt-3">
          <TablePagination
            total={pag.total}
            page={pag.page}
            pageSize={pag.pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={pag.setPage}
            onPageSizeChange={pag.setPageSize}
          />
        </div>
      ) : null}
    </>
  )
}
import { AnimatedNumber, CrossFade, Presence, Stagger, StaggerItem } from '@leasefy/cadence'

const STATUS_ORDER = ['candidate', 'certified', 'rejected'] as const

const GROUP_TITLE: Record<(typeof STATUS_ORDER)[number], string> = {
  candidate: 'Por certificar',
  certified: 'Certificadas',
  rejected: 'Descartadas',
}

/**
 * Por qué la cerca no dejó certificar, en español y en minúscula (va después
 * de «No se pudo certificar: »). El micro lo manda en inglés
 * (`chat-lessons.ts` → `certifyFence`: «insufficient evidence (support 2 <
 * 3)», «empty recommendation», «lesson not found»): se traduce lo que se
 * conoce y lo que no se conoce no se muestra.
 */
export function motivoDeLaCerca(reason: string | null | undefined): string {
  const r = (reason ?? '').trim()
  if (/insufficient evidence/i.test(r)) {
    return 'todavía no hay evidencia suficiente; el asistente necesita verlo más veces.'
  }
  if (/empty recommendation/i.test(r)) return 'la lección no tiene una recomendación escrita.'
  if (/not found/i.test(r)) return 'esa lección ya no existe. Recarga la lista.'
  // La que el micro ya escribe en español («sólo el administrador certifica…»).
  if (/^s[óo]lo el administrador/i.test(r)) return /[.!?]$/.test(r) ? r : `${r}.`
  // Sin motivo: la cerca es la de la evidencia (lo de siempre).
  if (!r) return 'todavía no hay evidencia suficiente.'
  // Otro motivo («store error», «missing id»…): no se inventa uno.
  return 'no se pudo aplicar en este momento. Prueba de nuevo.'
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

  const { lessons, enabled, isLoading, error, certify, refresh } = useChatLessons()
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
        // Fail-closed fence: the backend reason, in Spanish.
        toast.error(`No se pudo certificar: ${motivoDeLaCerca(result.reason)}`)
      }
    } catch (err) {
      toast.error(
        mensajeDelFalloDeLaAccion(err, {
          accion: decision === 'rejected' ? 'descartar la lección' : 'certificar la lección',
          porDefecto:
            decision === 'rejected'
              ? 'No se pudo descartar la lección. Prueba de nuevo en un momento.'
              : 'No se pudo certificar la lección. Prueba de nuevo en un momento.',
          sinPermiso: 'No tienes permiso para certificar lecciones.',
        }),
      )
    } finally {
      setPendingId(null)
    }
  }

  // ── No backend wired (dev posture / fail-soft) ──────────────────────────────
  // Movimiento: cada estado en un `CrossFade` con su clave (cargando →
  // lecciones, → fallo, → vacío); lo que ya estaba al montarse no se anima.
  if (!isAgentConfigured()) {
    return (
      <div className="rounded-lg border border-border bg-surface-muted px-5 py-6">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-fg-muted mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-fg">
              El asistente de Leasefy no está disponible en este momento.
            </p>
            <p className="text-sm text-fg-muted mt-0.5">
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
      <CrossFade swapKey="cargando">
      <div className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
      </CrossFade>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error && lessons.length === 0) {
    return (
      <CrossFade swapKey="fallo">
      {/* Reintentar recargaba la PÁGINA ENTERA (`window.location.reload()`)
          para volver a pedir una lista: se perdía todo lo demás que hubiera en
          pantalla. El hook ya expone `refresh`. */}
      <FalloDeCarga
        error={error}
        queEs="las lecciones del asistente"
        onReintentar={refresh}
      />
      </CrossFade>
    )
  }

  // ── Empty ───────────────────────────────────────────────────────────────────
  if (lessons.length === 0) {
    return (
      <CrossFade swapKey="vacio">
      <EmptyState
        icon={Brain}
        title="Aún no hay lecciones"
        description="El asistente aprende a medida que lo usas. Cuando detecte un patrón, lo verás aquí para certificarlo."
      />
      </CrossFade>
    )
  }

  // ── List ────────────────────────────────────────────────────────────────────
  return (
    <CrossFade swapKey="lecciones">
    <div className="space-y-6">
      {/* Master-switch banner: certified lessons exist but aren't applied yet.
          Entra y sale con `Presence` (certificar la primera lo hace aparecer). */}
      <Presence
          show={!enabled && grouped.certified.length > 0}
          initial={false}
          role="status"
          className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3"
        >
          <Warning className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-warning-700 dark:text-warning-100">
            <span className="font-medium">El aprendizaje está desactivado.</span>{' '}
            Tienes lecciones certificadas, pero todavía no influyen en el asistente.
            Se aplicarán cuando se active el aprendizaje para tu inmobiliaria.
          </p>
      </Presence>

      {/* Read-only notice for VIEWER / CONTADOR with candidates waiting. */}
      {!canCertify && candidateCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3">
          <Lightning className="h-5 w-5 text-fg-muted mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-fg-muted">
            Estás viendo las lecciones en modo lectura. Sólo administradores y
            asesores pueden certificarlas.
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
                className="font-heading text-sm font-medium text-fg"
              >
                {GROUP_TITLE[status]}
                <span className="ml-1.5 font-mono text-caption font-normal text-fg-muted tabular-nums">
                  <AnimatedNumber value={items.length} format={(n) => String(Math.round(n))} />
                </span>
              </h2>
              <p className="text-caption text-fg-muted">
                {GROUP_HINT[status]}
              </p>
            </div>
            {/* Certificar o descartar mueve la lección de grupo: sale de éste
                y entra en el otro. */}
            <LeccionesPaginadas
              items={items}
              render={(lesson) => (
                <ChatLessonCard
                  lesson={lesson}
                  canCertify={canCertify}
                  pendingId={pendingId}
                  onDecide={handleDecide}
                />
              )}
            />
          </section>
        )
      })}

      {/* agency context guard — keeps the unused warning honest in builds where
          agency may be momentarily null without breaking the panel. */}
      {!agency && (
        <p className="text-caption text-fg-muted">
          Selecciona una inmobiliaria para ver sus lecciones.
        </p>
      )}
    </div>
    </CrossFade>
  )
}
