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
import { AnimatedNumber, Card, CrossFade, Presence, Stagger, StaggerItem } from '@leasefy/cadence'
import { BackButton } from '@/components/ui/back-button'
import { confirmar } from '@/components/ui/confirmar'
import { MasDetalles } from '@/components/pantalla/MasDetalles'

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
import { toast } from '@/components/ui'
import { mensajeDeLaAccion } from '@/lib/hooks/cobranza/mensaje-de-la-accion'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado'
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
  // En el celular las tres columnas no caben juntas: se ve UNA, elegida con
  // sus pestañas (la de «sin tomar» primero, que es la que pide a alguien).
  const [columnaMovil, setColumnaMovil] = useState<'open' | 'assigned'>('open')
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
      // Revisora r25 (Escalaciones #4, 1c): tomarla se confirma antes; el caso
      // pasa a tu nombre y deja de estar libre para el resto del equipo.
      const es = locale.startsWith('es')
      const ok = await confirmar({
        titulo: es ? '¿Tomas este caso?' : 'Take this case?',
        descripcion: es
          ? 'Queda a tu nombre: el resto del equipo deja de verlo como libre.'
          : 'It will be assigned to you: the rest of the team stops seeing it as free.',
        accion: es ? 'Tomarlo' : 'Take it',
      })
      if (!ok) return
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
    [claim, t, locale],
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
  // La vuelta y el encabezado común, los mismos en el vacío y en el tablero
  // (revisora r25, Escalaciones #1 y UI: la pieza `BackButton`, no un enlace
  // armado a mano con `router.back`).
  const encabezado = (
    <div className="space-y-3">
      <BackButton href="/panel/inmobiliaria/pagos/cobranza" label={locale.startsWith('es') ? 'Volver' : 'Back'} />
      <EncabezadoDePantalla
        seccion="Cobranza"
        titulo={t('inmobiliaria.ai.cobranza.escalaciones.pageTitle')}
        descripcion="Los casos que el agente le pasó a una persona: tómalos, asígnalos o resuélvelos."
        junto={
          lastUpdated ? (
            <span className="text-caption tabular-nums text-fg-muted">{lastUpdated}</span>
          ) : null
        }
        data-testid="escalaciones-encabezado"
      />
    </div>
  )

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
      <div className="p-6 lg:p-8 space-y-6">
        {encabezado}
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

      {encabezado}

      {/* Error state — color+icon+text (a11y: not color-only per XR-06) */}
      {/* GLOW UP 21-10: el cartel de siempre: qué no cargó y su reintento. */}
      {error && !data ? (
        <FalloDeCarga error={new Error(error)} queEs="las escalaciones" onReintentar={() => mutate()} />
      ) : null}

      {/* C3 (r25): LA RESPUESTA y el tablero en UNA tarjeta. La cifra y lo que
          la acompaña miden lo mismo —lo que sigue sin resolver—: sin la barra
          que sumaba las resueltas. Lo resuelto va plegado debajo (crecía sin
          tope en su columna abierta). */}
      {data ? (
        <Card className="overflow-hidden">
          <CifraHeroe
            className="border-b border-border px-5 pb-5 pt-5 sm:px-6"
            data-testid="escalaciones-sin-tomar"
            tamano="mediana"
            rotulo={locale.startsWith('es') ? 'Sin tomar' : 'Unclaimed'}
            cifra={data.open.length.toLocaleString(locale)}
            contexto={
              locale.startsWith('es')
                ? `de ${(data.open.length + data.assigned.length).toLocaleString(locale)} sin resolver`
                : `of ${(data.open.length + data.assigned.length).toLocaleString(locale)} unresolved`
            }
            esCero={data.open.length === 0}
            cuandoEsCero={
              locale.startsWith('es')
                ? data.assigned.length === 1
                  ? 'Nada sin tomar: 1 caso está en manos de una persona.'
                  : data.assigned.length > 1
                    ? `Nada sin tomar: ${data.assigned.length.toLocaleString(locale)} casos están en manos de una persona.`
                    : 'Nada sin tomar ni por resolver.'
                : 'Nothing unclaimed.'
            }
          />

          <div className="border-b border-border px-4 py-3 md:hidden">
            <PestanasDeEstado<'open' | 'assigned'>
              pestanas={columns
                .filter((col): col is typeof col & { key: 'open' | 'assigned' } => col.key !== 'resolved')
                .map((col) => ({
                  valor: col.key,
                  etiqueta: col.label,
                  cuantos: col.items.length,
                  fija: true,
                  tono: col.key === 'open' && col.items.length > 0 ? ('aviso' as const) : undefined,
                  testid: `escalaciones-pestana-${col.key}`,
                }))}
              valor={columnaMovil}
              onCambio={setColumnaMovil}
              etiqueta={locale.startsWith('es') ? 'Ver una columna' : 'Show one column'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-border">
            {columns
              .filter((col) => col.key !== 'resolved')
              .map((col) => (
                <section
                  key={col.key}
                  className={col.key === columnaMovil ? '' : 'max-md:hidden'}
                  aria-labelledby={`column-${col.key}-heading`}
                >
                  <div className="hidden items-center justify-between border-b border-border px-4 py-2.5 md:flex">
                    <h2 id={`column-${col.key}-heading`} className="text-body-sm font-medium text-fg">
                      {col.label}
                    </h2>
                    <span className="font-mono text-caption tabular-nums text-fg-muted">
                      <AnimatedNumber value={col.items.length} format={(n) => String(Math.round(n))} />
                    </span>
                  </div>
                  <div className="min-h-[160px] space-y-2 p-3">
                    <Presence
                      as="p"
                      show={col.items.length === 0}
                      initial={false}
                      direction="none"
                      className="py-6 text-center text-caption text-fg-muted"
                    >
                      {locale.startsWith('es') ? 'Ninguno por ahora' : 'None for now'}
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
        </Card>
      ) : null}

      {data && data.resolved.length > 0 ? (
        <MasDetalles
          etiqueta={
            locale.startsWith('es')
              ? `${t('inmobiliaria.ai.cobranza.escalaciones.kanbanColumns.resolved')} · ${data.resolved.length.toLocaleString(locale)}`
              : `${t('inmobiliaria.ai.cobranza.escalaciones.kanbanColumns.resolved')} · ${data.resolved.length}`
          }
          etiquetaAbierto={locale.startsWith('es') ? 'Ocultar las resueltas' : 'Hide resolved'}
          data-testid="escalaciones-resueltas"
        >
          <Stagger className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {data.resolved.map((esc) => (
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
        </MasDetalles>
      ) : null}

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
