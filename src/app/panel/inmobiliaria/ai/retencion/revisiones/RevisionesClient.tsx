'use client'

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
import { toast } from '@/components/ui/toast'
import { useDecisiones, useReviewDecision } from '@/lib/hooks/retencion/use-decisiones'
import type {
  AutonomousDecision,
  DecisionType,
  ReviewOutcome,
} from '@/lib/types/retencion'

// ── Tabs (pill rose): controlan el filtro de servidor reviewableOnly ──
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
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  },
  escalated_legal: {
    label: 'Escalado a legal',
    icon: Scales,
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  },
  parked_review: {
    label: 'Pausado para revisión',
    icon: PauseCircle,
    badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300',
  },
  notified: {
    label: 'Notificación',
    icon: BellRinging,
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  },
}

const DECISION_FALLBACK: DecisionMeta = {
  label: 'Decisión',
  icon: ClipboardText,
  badge: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
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
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  overridden: {
    label: 'Revertida',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  },
  escalated: {
    label: 'Escalada',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  },
}

const OUTCOME_FALLBACK: OutcomeMeta = {
  label: 'Revisada',
  badge: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
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
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">
          Cola de revisión de decisiones
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Decisiones autónomas tomadas por Laura, listas para confirmar, revertir o escalar.
        </p>
        {usingMock ? (
          <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            Datos de demostración
          </span>
        ) : null}
      </header>

      {/* Tabs (pill rose) */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtros de revisión">
        {TABS.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={
                'px-3 py-1 text-xs font-medium rounded-full border transition-colors ' +
                (active
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-rose-400')
              }
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Chips por tipo de decisión (filtro de cliente) */}
      <div className="flex flex-wrap gap-2" aria-label="Filtrar por tipo de decisión">
        {CHIPS.map((c) => {
          const active = chip === c.key
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setChip(c.key)}
              className={
                'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ' +
                (active
                  ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                  : 'bg-white dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:border-rose-300')
              }
            >
              {c.label}
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por propietario o caso…"
          className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 pl-9 pr-3 py-2 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
        />
      </div>

      {/* Table */}
      {isLoading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-neutral-100 dark:bg-neutral-800/50 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700">
          <Gavel size={26} weight="duotone" className="text-neutral-400" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No hay decisiones en este filtro.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900/60 text-left text-xs text-neutral-500 dark:text-neutral-400">
              <tr>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Caso</th>
                <th className="px-3 py-2 font-medium">Tier</th>
                <th className="px-3 py-2 font-medium hidden md:table-cell">Creada</th>
                <th className="px-3 py-2 font-medium">Revisión</th>
                <th className="px-3 py-2 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {rows.map((d) => {
                const meta = decisionMeta(d.decisionType)
                const DecisionIcon = meta.icon
                const reviewed = d.reviewedBy !== null
                const canReview = d.reviewable && !reviewed
                return (
                  <tr key={d.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <td className="px-3 py-3">
                      <span
                        className={
                          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ' +
                          meta.badge
                        }
                      >
                        <DecisionIcon size={14} weight="duotone" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/panel/inmobiliaria/ai/retencion/bandeja/${encodeURIComponent(d.caseId)}`}
                        className="font-medium text-rose-700 dark:text-rose-300 hover:underline whitespace-nowrap"
                      >
                        {d.ownerId}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex h-6 min-w-[2rem] items-center justify-center rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        T{d.tier}
                      </span>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                      {formatDate(d.createdAt)}
                    </td>
                    <td className="px-3 py-3">
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
                          <span className="text-xs text-neutral-400">
                            por {d.reviewedBy}
                            {d.reviewedAt ? ` · ${formatDate(d.reviewedAt)}` : ''}
                          </span>
                        </div>
                      ) : canReview ? (
                        <span className="text-xs text-neutral-400">Pendiente</span>
                      ) : (
                        <span className="text-xs text-neutral-400">No revisable</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
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
                        <span className="flex justify-end text-xs text-neutral-300 dark:text-neutral-600">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {error && !isLoading ? (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm text-rose-600 dark:text-rose-400">
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
