'use client'

/**
 * Cobranza Escalations Kanban — Phase 34 plan 34-06 (D-34-01..D-34-05).
 *
 * 3 columns: Abiertas / Asignadas / Resueltas (últimos 7 días).
 * Cards sorted by URGENCY_RANK DESC then created_at DESC (defensive client-
 * side resort, backend already sorts).
 *
 * Click-button actions only (D-34-01) — no drag-drop. Buttons hidden via
 * RBAC (D-34-02: operator sees Tomar; admin sees Asignar; assignee/admin
 * sees Resolver).
 *
 * Refs mvp:docs/DESIGN.md §1 (sobrio + warm), §4 (cards rounded-lg + shadow),
 * §11 (loading state), §16 (numeric tabular-nums).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from '@phosphor-icons/react'
import { AnimatedNumber, CrossFade, Presence, Stagger, StaggerItem } from '@leasefy/cadence'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh'
import { useAuth } from '@/lib/auth'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import {
  useEscalations,
  type Escalation,
} from '@/lib/hooks/cobranza/use-escalations'
import { EscalationCard } from '@/components/inmobiliaria/cobranza/EscalationCard'
import { EscalationResolveModal } from '@/components/inmobiliaria/cobranza/EscalationResolveModal'
import { EscalationAssignDropdown } from '@/components/inmobiliaria/cobranza/EscalationAssignDropdown'
import { inmobiliariaConfigApi } from '@/lib/api/inmobiliaria.service'
import type { AgencyUser } from '@/lib/types/inmobiliaria'
import { CobranzaEscalacionesSkeleton } from '@/components/skeleton/panel/CobranzaEscalacionesSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Button, Spinner, toast } from '@/components/ui'
import { mensajeDeLaAccion } from '@/lib/hooks/cobranza/mensaje-de-la-accion'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'

function EscalacionesContent() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const { user } = useAuth()
  const { canAccess } = usePermissionsContext()

  const { data, isLoading, error, mutate, claim, assign, resolve } = useEscalations()

  useAutoRefresh(mutate)

  const hasResolvePerm = canAccess('cobranza', 'resolve-escalation')
  const hasAssignPerm = canAccess('cobranza', 'assign-escalation')

  const currentUserEmail = user?.email ?? null

  const [resolveOpen, setResolveOpen] = useState<string | null>(null)
  const [assignOpen, setAssignOpen] = useState<string | null>(null)
  const [members, setMembers] = useState<AgencyUser[]>([])

  // Load agency members once (only if user can assign)
  useEffect(() => {
    if (!hasAssignPerm) return
    let cancelled = false
    inmobiliariaConfigApi
      .getUsers()
      .then((list: AgencyUser[]) => {
        if (!cancelled) setMembers(list)
      })
      .catch(() => {
        /* swallow — assign dropdown will show empty state */
      })
    return () => {
      cancelled = true
    }
  }, [hasAssignPerm])

  const handleOpenDetail = useCallback(
    (id: string) => {
      router.push(`/panel/inmobiliaria/pagos/cobranza/escalaciones/${id}`)
    },
    [router],
  )

  // Tomar y asignar ignoraban el resultado: si fallaban, la tarjeta volvía a
  // su sitio sin decir nada. Ahora avisan con el traductor (un 409 dice su
  // `message`, un 5xx «de nuestro lado», la red la conexión).
  const handleClaim = useCallback(
    async (id: string) => {
      const r = await claim(id)
      if (!r.ok) {
        toast.error(
          r.status === 403
            ? t('inmobiliaria.ai.cobranza.escalaciones.errors.forbidden')
            : mensajeDeLaAccion(r, {
                porDefecto: 'No pudimos tomar la escalación.',
                accion: 'tomar la escalación',
              }),
        )
      }
    },
    [claim, t],
  )

  const handleResolve = useCallback(
    async (
      id: string,
      body: { category: Parameters<typeof resolve>[1]['category']; resolution_text: string },
    ) => resolve(id, body),
    [resolve],
  )

  const handleAssign = useCallback(
    async (id: string, memberUserId: string) => {
      const r = await assign(id, memberUserId)
      if (!r.ok) {
        toast.error(
          r.status === 403
            ? t('inmobiliaria.ai.cobranza.escalaciones.errors.forbidden')
            : mensajeDeLaAccion(r, {
                porDefecto: 'No pudimos asignar la escalación.',
                accion: 'asignar la escalación',
              }),
        )
      }
    },
    [assign, t],
  )

  const lastUpdated = useMemo(() => {
    if (!data?.generatedAt) return null
    const sec = Math.max(
      0,
      Math.round((Date.now() - new Date(data.generatedAt).getTime()) / 1000),
    )
    // «Actualizado hace un momento» (antes «hace 0s», suelto bajo el título).
    if (sec < 60) return locale.startsWith('es') ? 'Actualizado hace un momento' : 'Updated just now'
    const min = Math.round(sec / 60) // redondeo: no es plata
    return locale.startsWith('es')
      ? `Actualizado hace ${min} ${min === 1 ? 'minuto' : 'minutos'}`
      : `Updated ${min}m ago`
  }, [data?.generatedAt, locale])

  // ARIA live region — announces newly-arrived open escalations to screen
  // readers (Phase 38 plan 38-04c / XR-06 / WCAG 4.1.3). We compare the
  // current data.open.length against the previously-seen count; when it
  // grows we set the announcement string. No realtime hook exists in this
  // page yet, but SWR revalidation will trigger this every time data is
  // re-fetched (mutate button, focus revalidation, etc).
  const prevOpenCountRef = useRef(0)
  const [newEscalacionCount, setNewEscalacionCount] = useState(0)

  useEffect(() => {
    const current = data?.open.length ?? 0
    const prev = prevOpenCountRef.current
    if (current > prev && prev > 0) {
      setNewEscalacionCount(current - prev)
    }
    prevOpenCountRef.current = current
  }, [data?.open.length])

  const escalacionAnnouncement =
    newEscalacionCount > 0
      ? t('inmobiliaria.ai.cobranza.escalaciones.liveRegion.newEscalacion', {
          count: newEscalacionCount,
        })
      : ''

  const columns: Array<{
    key: 'open' | 'assigned' | 'resolved'
    label: string
    items: Escalation[]
  }> = useMemo(
    () => [
      {
        key: 'open',
        label: t('inmobiliaria.ai.cobranza.escalaciones.kanbanColumns.open'),
        items: data?.open ?? [],
      },
      {
        key: 'assigned',
        label: t('inmobiliaria.ai.cobranza.escalaciones.kanbanColumns.assigned'),
        items: data?.assigned ?? [],
      },
      {
        key: 'resolved',
        label: t('inmobiliaria.ai.cobranza.escalaciones.kanbanColumns.resolved'),
        items: data?.resolved ?? [],
      },
    ],
    [t, data],
  )

  // ── Skeleton + celebratory EmptyState guards (Phase 38 plan 38-04a / D-38-04) ─
  // Movimiento: cada salida en un `CrossFade` con su clave (esqueleto →
  // tablero, → «todo al día»); lo que ya estaba al montarse no se anima.
  if (isLoading && !data) {
    return (
      <CrossFade swapKey="esqueleto">
        <CobranzaEscalacionesSkeleton />
      </CrossFade>
    )
  }

  const allEmpty =
    data !== null &&
    data.open.length === 0 &&
    data.assigned.length === 0 &&
    data.resolved.length === 0
  if (!isLoading && allEmpty && !error) {
    return (
      <CrossFade swapKey="vacio">
      <div className="p-6 lg:p-8">
        <EmptyState
          icon={CheckCircle}
          title={t('inmobiliaria.ai.cobranza.escalaciones.empty.title')}
          description={t('inmobiliaria.ai.cobranza.escalaciones.empty.description')}
        />
      </div>
      </CrossFade>
    )
  }

  return (
    <CrossFade swapKey="tablero">
    <div className="p-6 lg:p-8 space-y-6">
      {/* ARIA live region — announces new open escalations to screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {escalacionAnnouncement}
      </div>

      {/* La vuelta y el encabezado común (GLOW UP 21-10). */}
      <div className="space-y-3">
        <div>
          {/* Se llega acá desde el caso («Escalaciones →») o desde el tablero
              del Resumen, y no había forma de devolverse. `router.back()`
              regresa a donde estabas; sin historial (pestaña nueva) cae al
              Resumen de Cobranza. */}
          <Button
            variant="link"
            size="sm"
            hideArrow
            onClick={() => {
              if (window.history.length > 1) router.back()
              else router.push('/panel/inmobiliaria/pagos/cobranza')
            }}
            className="gap-1 px-0 h-auto text-sm text-muted-foreground hover:text-foreground"
            data-testid="escalaciones-volver"
          >
            ← Volver
          </Button>
        </div>
      <EncabezadoDePantalla
        seccion="Cobranza"
        titulo={t('inmobiliaria.ai.cobranza.escalaciones.pageTitle')}
        descripcion="Los casos que el agente subió a una persona: tómalos, asígnalos o resuélvelos."
        junto={
          lastUpdated ? (
            <span className="text-caption tabular-nums text-fg-muted">{lastUpdated}</span>
          ) : null
        }
        data-testid="escalaciones-encabezado"
      />
      </div>

      {/* Loading state — DESIGN.md §11 */}
      {isLoading && !data && (
        <div className="flex items-center justify-center py-12">
          <Spinner size="md" />
        </div>
      )}

      {/* Error state — color+icon+text (a11y: not color-only per XR-06) */}
      {/* GLOW UP 21-10: el hook guarda el error como texto crudo («500», el
          nombre de una variable) y aquí salía tal cual, con «Error:» adelante.
          Ahora es el cartel de siempre: qué no cargó y su reintento. */}
      {error && !data ? (
        <FalloDeCarga error={new Error(error)} queEs="las escalaciones" onReintentar={() => mutate()} />
      ) : null}

      {/* Kanban — 3 columns md+, stacked sm. Las columnas ya no animan su
          propia entrada (la página entra con su template): se anima el
          CAMBIO — tomar, asignar o resolver saca la tarjeta de su columna y la
          hace entrar en la otra, y el número de la columna cuenta. */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((col) => (
            <section
              key={col.key}
              className="rounded-lg border border-border bg-card/50 overflow-hidden"
              aria-labelledby={`column-${col.key}-heading`}
            >
              <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
                <h2
                  id={`column-${col.key}-heading`}
                  className="text-caption font-medium uppercase tracking-wide text-muted-foreground"
                >
                  {col.label}
                </h2>
                <span className="text-caption text-muted-foreground tabular-nums">
                  <AnimatedNumber value={col.items.length} format={(n) => String(Math.round(n))} />
                </span>
              </div>
              <div className="p-3 space-y-2 min-h-[200px]">
                <Presence
                  as="p"
                  show={col.items.length === 0}
                  initial={false}
                  direction="none"
                  className="text-caption text-muted-foreground text-center py-6"
                >
                  {locale.startsWith('es') ? 'Sin escalaciones' : 'No escalations'}
                </Presence>
                <Stagger className="space-y-2">
                  {col.items.map((esc) => (
                    <StaggerItem key={esc.id}>
                      <EscalationCard
                        escalation={esc}
                        currentUserEmail={currentUserEmail}
                        hasResolvePerm={hasResolvePerm}
                        hasAssignPerm={hasAssignPerm}
                        onOpen={handleOpenDetail}
                        onClaim={handleClaim}
                        onAssign={setAssignOpen}
                        onResolve={setResolveOpen}
                      />
                    </StaggerItem>
                  ))}
                </Stagger>
              </div>
            </section>
          ))}
        </div>
      )}

      <EscalationResolveModal
        escalationId={resolveOpen}
        isOpen={resolveOpen !== null}
        onClose={() => setResolveOpen(null)}
        onResolve={handleResolve}
      />

      <EscalationAssignDropdown
        escalationId={assignOpen}
        isOpen={assignOpen !== null}
        onClose={() => setAssignOpen(null)}
        agencyMembers={members}
        currentAssigneeUserId={
          assignOpen
            ? (data?.open ?? [])
                .concat(data?.assigned ?? [])
                .find((e) => e.id === assignOpen)?.assignee_user_id ?? null
            : null
        }
        onAssign={handleAssign}
      />
    </div>
    </CrossFade>
  )
}

export default function EscalacionesPage() {
  return (
    <PageGuard module="cobranza">
      <EscalacionesContent />
    </PageGuard>
  )
}
