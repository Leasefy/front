'use client'

import { AvisoDatosDeEjemplo } from '@/components/estado/AvisoDatosDeEjemplo'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  MagnifyingGlass,
  ClipboardText,
  Scales,
  PauseCircle,
  BellRinging,
  Gavel,
  CheckCircle,
  ArrowUUpLeft,
  ArrowFatLineUp,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { TablePagination } from '@/components/ui/pagination'
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination'
import { useDecisiones, useReviewDecision } from '@/lib/hooks/retencion/use-decisiones'
import type {
  AutonomousDecision,
  DecisionType,
  ReviewOutcome,
} from '@/lib/types/retencion'

// ── Tabs: controlan el filtro de servidor reviewableOnly ──
type Tab = 'pendientes' | 'todas'

const TABS: { key: Tab; label: string }[] = [
  { key: 'pendientes', label: 'Pendientes de revisión' },
  { key: 'todas', label: 'Todas' },
]

// ── Chips por tipo de decisión (filtro de cliente) ──
type Chip = DecisionType | 'todos'

const CHIPS: { key: Chip; label: string }[] = [
  { key: 'todos', label: 'Todas' },
  { key: 'plan_created', label: 'Plan creado' },
  { key: 'escalated_legal', label: 'Escalado a legal' },
  { key: 'parked_review', label: 'Pausado para revisión' },
  { key: 'notified', label: 'Notificación' },
]

// ── Mapas finitos con FALLBACK neutro (un valor fuera del mapa NO crashea) ──

interface DecisionMeta {
  label: string
  icon: PhosphorIcon
  badge: string
}

const DECISION_META: Record<DecisionType, DecisionMeta> = {
  plan_created: {
    label: 'Plan creado',
    icon: ClipboardText,
    // El curso normal de la decisión: el rose original era el acento del
    // módulo de retención, no un estado → tinte de marca.
    badge: 'bg-primary-soft text-primary',
  },
  escalated_legal: {
    label: 'Escalado a legal',
    icon: Scales,
    badge: 'bg-warning-soft text-warning',
  },
  parked_review: {
    // Un escalón por debajo de «Escalado a legal»: mismo ámbar, sobre el
    // tinte neutro en vez del tinte de atención. Cadence no tiene un quinto
    // matiz, y dos píldoras idénticas para dos decisiones distintas se leen
    // como un error (mismo criterio que stateBadgeClasses en BandejaClient).
    label: 'Pausado para revisión',
    icon: PauseCircle,
    badge: 'bg-surface-muted text-warning',
  },
  notified: {
    label: 'Notificación',
    icon: BellRinging,
    badge: 'bg-info-soft text-info',
  },
}

const DECISION_FALLBACK: DecisionMeta = {
  label: 'Decisión',
  icon: ClipboardText,
  badge: 'bg-surface-muted text-fg-muted',
}

function decisionMeta(type: DecisionType): DecisionMeta {
  return DECISION_META[type] ?? DECISION_FALLBACK
}

interface OutcomeMeta {
  label: string
  badge: string
}

const OUTCOME_META: Record<ReviewOutcome, OutcomeMeta> = {
  upheld: {
    label: 'Confirmada',
    badge: 'bg-success-soft text-success',
  },
  overridden: {
    // Acá el rose SÍ era estado: la decisión del agente estuvo mal.
    label: 'Revertida',
    badge: 'bg-danger-soft text-danger',
  },
  escalated: {
    label: 'Escalada',
    badge: 'bg-warning-soft text-warning',
  },
}

const OUTCOME_FALLBACK: OutcomeMeta = {
  label: 'Revisada',
  badge: 'bg-surface-muted text-fg-muted',
}

function outcomeMeta(outcome: ReviewOutcome): OutcomeMeta {
  return OUTCOME_META[outcome] ?? OUTCOME_FALLBACK
}

// ── Acciones disponibles para una decisión sin revisar ──
interface ActionMeta {
  outcome: ReviewOutcome
  label: string
  variant: 'default' | 'outline' | 'destructive'
  icon: PhosphorIcon
  confirmTitle: string
  confirmBody: string
}

const ACTIONS: ActionMeta[] = [
  {
    outcome: 'upheld',
    label: 'Confirmar',
    variant: 'default',
    icon: CheckCircle,
    confirmTitle: '¿Confirmar la decisión de Laura?',
    confirmBody: 'La decisión queda registrada como correcta. Esto la marca como revisada y no se podrá cambiar.',
  },
  {
    outcome: 'overridden',
    label: 'Revertir',
    variant: 'outline',
    icon: ArrowUUpLeft,
    confirmTitle: '¿Revertir la decisión de Laura?',
    confirmBody: 'Marcas la decisión como incorrecta. El equipo deberá retomar el caso manualmente.',
  },
  {
    outcome: 'escalated',
    label: 'Escalar',
    variant: 'destructive',
    icon: ArrowFatLineUp,
    confirmTitle: '¿Escalar esta decisión?',
    confirmBody: 'Elevas el caso para revisión humana de mayor nivel. Quedará registrado como escalado.',
  },
]

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface PendingAction {
  decision: AutonomousDecision
  action: ActionMeta
}

export default function RevisionesClient() {
  const [tab, setTab] = useState<Tab>('pendientes')
  const [chip, setChip] = useState<Chip>('todos')
  const [search, setSearch] = useState('')
  const [pending, setPending] = useState<PendingAction | null>(null)

  const { data, isLoading, error, usingMock, refetch } = useDecisiones({
    reviewableOnly: tab === 'pendientes',
  })
  const { review, isReviewing } = useReviewDecision()

  const rows = useMemo(() => {
    const all = data?.decisions ?? []
    const q = search.trim().toLowerCase()
    return all
      .filter((d) => (chip === 'todos' ? true : d.decisionType === chip))
      .filter((d) =>
        q
          ? d.ownerId.toLowerCase().includes(q) || d.caseId.toLowerCase().includes(q)
          : true,
      )
  }, [data, chip, search])

  // Paginación — la cola de revisión es una lista de registros que crece con
  // cada decisión autónoma de Laura, no un detalle fijo. `resetKey` lleva los
  // tres filtros (pestaña, chip de tipo y búsqueda) para no dejar al usuario
  // mirando una página vacía después de filtrar.
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(rows, { resetKey: `${tab}|${chip}|${search}` })

  const onConfirm = async () => {
    if (!pending) return
    const { decision, action } = pending
    setPending(null)
    try {
      const result = await review(decision.id, action.outcome)
      if (result.alreadyReviewed) {
        toast.warning('Otra persona ya revisó esta decisión')
      } else {
        toast.success('Revisión registrada')
      }
      await refetch()
    } catch {
      toast.error('No pude registrar la revisión. Intenta de nuevo.')
    }
  }

  return (
    <main className="p-6 lg:p-8 space-y-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-fg">
          Cola de revisión de decisiones
        </h1>
        <p className="text-sm text-fg-muted">
          Decisiones autónomas tomadas por Laura, listas para confirmar, revertir o escalar.
        </p>
        {usingMock ? (
          <AvisoDatosDeEjemplo
            className="mt-3"
            queEsInventado="Las decisiones del agente, los propietarios a los que dice haber escrito y sus montos"
            queFalta="El agente de Retención no está desplegado: el microservicio sólo monta el webhook de WhatsApp, no las rutas /api/agency/:id/retencion/*. Sin ellas, el cliente cae al mock de src/lib/data/mock-retencion.ts."
          />
        ) : null}
      </header>

      {/* Tabs — mismo patrón que la bandeja de riesgos: pill sólida cuando
          está activa, pill blanca con hairline cuando no. */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtros de revisión">
        {TABS.map((t) => {
          const active = tab === t.key
          return (
            <Button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              size="sm"
              hideArrow
              variant={active ? 'default' : 'secondary'}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </Button>
          )
        })}
      </div>

      {/* Chips por tipo de decisión (filtro de cliente) — un peso menos que
          las pestañas de arriba: la activa se levanta (pill con borde) y la
          inactiva queda plana, para que las dos filas no se confundan. */}
      <div className="flex flex-wrap gap-2" aria-label="Filtrar por tipo de decisión">
        {CHIPS.map((c) => {
          const active = chip === c.key
          return (
            <Button
              key={c.key}
              type="button"
              size="sm"
              hideArrow
              variant={active ? 'secondary' : 'ghost'}
              onClick={() => setChip(c.key)}
            >
              {c.label}
            </Button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-fg-subtle" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por propietario o caso…"
          className="pl-9"
        />
      </div>

      {/* Table */}
      {isLoading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-surface-muted animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title="No hay decisiones en este filtro."
          description="Probá con otra pestaña, con otro tipo de decisión o cambiá lo que escribiste en la búsqueda."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Caso</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="hidden md:table-cell">Creada</TableHead>
                <TableHead>Revisión</TableHead>
                <TableHead numeric>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((d) => {
                const meta = decisionMeta(d.decisionType)
                const DecisionIcon = meta.icon
                const reviewed = d.reviewedBy !== null
                const canReview = d.reviewable && !reviewed
                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <span
                        className={
                          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ' +
                          meta.badge
                        }
                      >
                        <DecisionIcon size={14} weight="duotone" />
                        {meta.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/panel/inmobiliaria/contratos/riesgo/${encodeURIComponent(d.caseId)}`}
                        className="font-medium text-primary hover:underline whitespace-nowrap"
                      >
                        {d.ownerId}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex h-6 min-w-[2rem] items-center justify-center rounded-md bg-surface-muted px-2 text-xs font-semibold text-fg-muted">
                        T{d.tier}
                      </span>
                    </TableCell>
                    <TableCell muted className="hidden md:table-cell whitespace-nowrap">
                      {formatDate(d.createdAt)}
                    </TableCell>
                    <TableCell>
                      {reviewed ? (
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={
                              'inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-medium ' +
                              outcomeMeta(d.reviewOutcome ?? 'upheld').badge
                            }
                          >
                            {outcomeMeta(d.reviewOutcome ?? 'upheld').label}
                          </span>
                          <span className="text-xs text-fg-subtle">
                            por {d.reviewedBy}
                            {d.reviewedAt ? ` · ${formatDate(d.reviewedAt)}` : ''}
                          </span>
                        </div>
                      ) : canReview ? (
                        <span className="text-xs text-fg-subtle">Pendiente</span>
                      ) : (
                        <span className="text-xs text-fg-subtle">No revisable</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {canReview ? (
                        <div className="flex flex-wrap justify-end gap-2">
                          {ACTIONS.map((a) => {
                            const ActionIcon = a.icon
                            return (
                              <Button
                                key={a.outcome}
                                type="button"
                                size="sm"
                                variant={a.variant}
                                hideArrow
                                disabled={isReviewing}
                                onClick={() => setPending({ decision: d, action: a })}
                              >
                                <ActionIcon size={14} weight="duotone" />
                                {a.label}
                              </Button>
                            )
                          })}
                        </div>
                      ) : (
                        <span className="flex justify-end text-xs text-fg-subtle">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {/* Pie de tabla del design system: cuántas decisiones hay, cuántas
              se muestran y cuántas filas por página. */}
          {shouldPaginate && (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={total}
                page={page}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </div>
      )}

      {error && !isLoading ? (
        <div className="rounded-lg border border-danger bg-danger-soft p-4 text-sm text-danger">
          No pude cargar la cola de revisión: {error}
        </div>
      ) : null}

      {/* Confirmación de revisión */}
      <AlertDialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.action.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{pending?.action.confirmBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReviewing}>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              variant={pending?.action.variant ?? 'default'}
              hideArrow
              isLoading={isReviewing}
              onClick={onConfirm}
            >
              {pending?.action.label}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
