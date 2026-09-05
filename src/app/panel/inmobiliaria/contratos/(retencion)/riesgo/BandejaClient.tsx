'use client'

import { AvisoDatosDeEjemplo } from '@/components/estado/AvisoDatosDeEjemplo'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MagnifyingGlass, Warning } from '@phosphor-icons/react'
import { TablePagination } from '@/components/ui/pagination'
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination'
import { useRetencionBandeja } from '@/lib/hooks/retencion/use-retencion'
import { formatCop } from '@/lib/data/mock-retencion'
import type { RetentionCase, RetentionState } from '@/lib/types/retencion'

type Tab =
  | 'todos'
  | 'critico'
  | 'alto'
  | 'medio'
  | 'renovaciones'
  | 'vacancia'
  | 'mantenimiento'
  | 'finanzas'
  | 'comunicacion'
  | 'recuperados'
  | 'perdidos'

const TABS: { key: Tab; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'critico', label: 'Crítico' },
  { key: 'alto', label: 'Alto' },
  { key: 'medio', label: 'Medio' },
  { key: 'renovaciones', label: 'Renovaciones' },
  { key: 'vacancia', label: 'Vacancia' },
  { key: 'mantenimiento', label: 'Mantenimiento' },
  { key: 'finanzas', label: 'Finanzas' },
  { key: 'comunicacion', label: 'Comunicación' },
  { key: 'recuperados', label: 'Recuperados' },
  { key: 'perdidos', label: 'Perdidos' },
]

const STATE_LABEL: Record<RetentionState, string> = {
  saludable: 'Saludable',
  observacion: 'Observación',
  riesgo_medio: 'Riesgo medio',
  alto_riesgo: 'Alto riesgo',
  critico: 'Crítico',
  recuperado: 'Recuperado',
  perdido: 'Perdido',
}

function stateBadgeClasses(state: RetentionState): string {
  switch (state) {
    case 'critico':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
    case 'alto_riesgo':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
    case 'riesgo_medio':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300'
    case 'recuperado':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
    case 'perdido':
      return 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
    default:
      return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
  }
}

function matchesTab(c: RetentionCase, tab: Tab): boolean {
  switch (tab) {
    case 'todos':
      return true
    case 'critico':
      return c.state === 'critico'
    case 'alto':
      return c.state === 'alto_riesgo'
    case 'medio':
      return c.state === 'riesgo_medio' || c.state === 'observacion'
    case 'renovaciones':
      return c.rootCause.key === 'contractual' || /renov/i.test(c.rootCause.label) || /renov/i.test(c.nextAction.label)
    case 'vacancia':
      return c.rootCause.key === 'vacancia'
    case 'mantenimiento':
      return c.rootCause.key === 'mantenimiento'
    case 'finanzas':
      return c.rootCause.key === 'financiera'
    case 'comunicacion':
      return c.rootCause.key === 'comunicacion'
    case 'recuperados':
      return c.state === 'recuperado'
    case 'perdidos':
      return c.state === 'perdido'
    default:
      return true
  }
}

export default function BandejaClient() {
  const router = useRouter()
  const { data, isLoading, error, usingMock } = useRetencionBandeja('todos')
  const [tab, setTab] = useState<Tab>('todos')
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    const all = data?.cases ?? []
    const q = search.trim().toLowerCase()
    return all
      .filter((c) => matchesTab(c, tab))
      .filter((c) => (q ? c.ownerName.toLowerCase().includes(q) || (c.city ?? '').toLowerCase().includes(q) : true))
      .sort((a, b) => b.expectedCommissionLoss - a.expectedCommissionLoss)
  }, [data, tab, search])

  // Paginación — la bandeja lista casos de riesgo, uno por propietario, y
  // crece con la cartera. `resetKey` lleva la pestaña y la búsqueda para
  // volver a la primera página al filtrar.
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(rows, { resetKey: `${tab}|${search}` })

  const goToCase = (caseId: string) =>
    router.push(`/panel/inmobiliaria/contratos/riesgo/${encodeURIComponent(caseId)}`)

  return (
    <main className="p-6 lg:p-8 space-y-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Bandeja de riesgos</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Propietarios e inmuebles priorizados por comisión en riesgo.
        </p>
        {usingMock ? (
          <AvisoDatosDeEjemplo
            className="mt-3"
            queEsInventado="Los propietarios, las ciudades, los puntajes de riesgo y los montos en pesos"
            queFalta="El agente de Retención no está desplegado: el microservicio sólo monta el webhook de WhatsApp, no las rutas /api/agency/:id/retencion/*. Sin ellas, el cliente cae al mock de src/lib/data/mock-retencion.ts."
          />
        ) : null}
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtros de bandeja">
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
                'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ' +
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

      {/* Search */}
      <div className="relative max-w-sm">
        <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar propietario o ciudad…"
          className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 pl-9 pr-3 py-2 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
        />
      </div>

      {/* Table */}
      {isLoading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-neutral-100 dark:bg-neutral-800/50 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-center rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700">
          <Warning size={26} weight="duotone" className="text-neutral-400" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No hay casos en este filtro.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900/60 text-left text-xs text-neutral-500 dark:text-neutral-400">
              <tr>
                <th className="px-3 py-2 font-medium">Score</th>
                <th className="px-3 py-2 font-medium">Propietario</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2 font-medium">Causa raíz</th>
                <th className="px-3 py-2 font-medium hidden md:table-cell">Inmuebles</th>
                <th className="px-3 py-2 font-medium hidden lg:table-cell">Responsable</th>
                <th className="px-3 py-2 font-medium text-right">Comisión en riesgo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {pageItems.map((c) => (
                <tr
                  key={c.caseId}
                  role="link"
                  tabIndex={0}
                  onClick={() => goToCase(c.caseId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') goToCase(c.caseId)
                  }}
                  className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <td className="px-3 py-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/30 text-xs font-semibold text-rose-700 dark:text-rose-300">
                      {c.score}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-neutral-900 dark:text-white whitespace-nowrap">{c.ownerName}</p>
                    <p className="text-xs text-neutral-400">{c.city ?? '—'} · {c.ownerType}</p>
                  </td>
                  <td className="px-3 py-2">
                    <span className={'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' + stateBadgeClasses(c.state)}>
                      {STATE_LABEL[c.state]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">
                    {c.rootCause.label} <span className="text-neutral-400">({c.rootCause.pct}%)</span>
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell text-neutral-600 dark:text-neutral-300">{c.propertyCount}</td>
                  <td className="px-3 py-2 hidden lg:table-cell text-neutral-500 dark:text-neutral-400">
                    {c.responsible.name ?? c.responsible.role}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-neutral-900 dark:text-white whitespace-nowrap">
                    {formatCop(c.expectedCommissionLoss)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pie de tabla del design system: cuántos casos hay, cuáles se
              muestran y cuántas filas por página. */}
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
        <div className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm text-rose-600 dark:text-rose-400">
          No pude cargar la bandeja: {error}
        </div>
      ) : null}
    </main>
  )
}
