'use client'

import { AvisoDatosDeEjemplo } from '@/components/estado/AvisoDatosDeEjemplo'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MagnifyingGlass, Warning } from '@phosphor-icons/react'
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
      return 'bg-danger-soft text-danger'
    case 'alto_riesgo':
      return 'bg-warning-soft text-warning'
    // Un escalón por debajo de «Alto riesgo»: mismo ámbar, sobre el tinte
    // neutro en vez del tinte de atención. Cadence no tiene un quinto matiz
    // (RiskBadge del DS resuelve su propia escala igual: gris → warning →
    // danger), y dos píldoras idénticas para dos estados distintos se leen
    // como un error.
    case 'riesgo_medio':
      return 'bg-surface-muted text-warning'
    case 'recuperado':
      return 'bg-success-soft text-success'
    case 'perdido':
      return 'bg-neutral-200 text-fg-subtle'
    default:
      return 'bg-surface-muted text-fg-muted'
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
        <h1 className="text-xl font-semibold text-fg">Bandeja de riesgos</h1>
        <p className="text-sm text-fg-muted">
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

      {/* Search */}
      <div className="relative max-w-sm">
        <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-fg-subtle" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar propietario o ciudad…"
          className="pl-9"
        />
      </div>

      {/* Table */}
      {isLoading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-surface-muted animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Warning}
          title="No hay casos en este filtro."
          description="Probá con otra pestaña o cambiá lo que escribiste en la búsqueda."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Score</TableHead>
                <TableHead>Propietario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Causa raíz</TableHead>
                <TableHead className="hidden md:table-cell">Inmuebles</TableHead>
                <TableHead className="hidden lg:table-cell">Responsable</TableHead>
                <TableHead numeric>Comisión en riesgo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((c) => (
                <TableRow
                  key={c.caseId}
                  role="link"
                  tabIndex={0}
                  onClick={() => goToCase(c.caseId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') goToCase(c.caseId)
                  }}
                  className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <TableCell>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-danger-soft text-xs font-semibold text-danger">
                      {c.score}
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-fg whitespace-nowrap">{c.ownerName}</p>
                    <p className="text-xs text-fg-subtle">{c.city ?? '—'} · {c.ownerType}</p>
                  </TableCell>
                  <TableCell>
                    <span className={'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' + stateBadgeClasses(c.state)}>
                      {STATE_LABEL[c.state]}
                    </span>
                  </TableCell>
                  <TableCell className="text-fg-muted">
                    {c.rootCause.label} <span className="text-fg-subtle">({c.rootCause.pct}%)</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-fg-muted">{c.propertyCount}</TableCell>
                  <TableCell muted className="hidden lg:table-cell">
                    {c.responsible.name ?? c.responsible.role}
                  </TableCell>
                  <TableCell numeric className="font-semibold text-fg whitespace-nowrap">
                    {formatCop(c.expectedCommissionLoss)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

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
        <div className="rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
          No pude cargar la bandeja: {error}
        </div>
      ) : null}
    </main>
  )
}
