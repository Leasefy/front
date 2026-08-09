'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardText,
  Hourglass,
  WarningCircle,
  SealCheck,
  CheckCircle,
  XCircle,
  MagnifyingGlass,
  X,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/ui/error-state'
import { Spinner, Input } from '@/components/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { IconButton, SegmentedControl } from '@leasefy/cadence'
import { RecorridoMapa } from '@/components/inmobiliaria/recorrido/RecorridoMapa'
import { landlordApplicationsApi } from '@/lib/api/applications.service'
import type { AllCandidatesItem, LandlordApplicationStatus } from '@/lib/api/applications.types'

// ─── Status display (mirrors propiedades/candidatos pages) ────────────────────

const STATUS_CONFIG: Record<
  LandlordApplicationStatus,
  { label: string; bg: string; text: string }
> = {
  DRAFT:           { label: 'Borrador',          bg: 'bg-surface-muted',  text: 'text-fg-muted' },
  SUBMITTED:       { label: 'Postulado',         bg: 'bg-primary-soft',   text: 'text-primary' },
  UNDER_REVIEW:    { label: 'En revisión',       bg: 'bg-primary-soft',   text: 'text-primary' },
  // "Pre-aprobado" no significa nada para quien lo lee (ver docs/VOCABULARIO.md):
  // mientras el backend siga emitiendo PREAPPROVED, se muestra como "En revisión".
  PREAPPROVED:     { label: 'En revisión',       bg: 'bg-primary-soft',   text: 'text-primary' },
  APPROVED:        { label: 'Aprobado',          bg: 'bg-success-soft',   text: 'text-success' },
  REJECTED:        { label: 'Rechazado',         bg: 'bg-danger-soft',    text: 'text-danger' },
  NEEDS_INFO:      { label: 'Pide info',         bg: 'bg-warning-soft',   text: 'text-warning' },
  WITHDRAWN:       { label: 'Retirado',          bg: 'bg-surface-muted',  text: 'text-fg-muted' },
  CONTRACT_FAILED: { label: 'Contrato fallido',  bg: 'bg-danger-soft',    text: 'text-danger' },
};

const FALLBACK_STATUS = { label: 'Desconocido', bg: 'bg-surface-muted', text: 'text-fg-muted' };

const SCORE_COLORS: Record<string, string> = {
  A: 'text-success bg-success-soft',
  B: 'text-primary bg-primary-soft',
  C: 'text-warning bg-warning-soft',
  D: 'text-danger bg-danger-soft',
};

// ─── Clickable stat tiles (same visual language as propiedades StatTile) ──────

type FilterKey = 'ALL' | 'IN_REVIEW' | 'NEEDS_INFO' | 'PREAPPROVED' | 'APPROVED' | 'REJECTED'

const TILE_TONES = {
  neutral: 'bg-surface-muted text-fg-muted',
  ok: 'bg-success-soft text-success',
  info: 'bg-primary-soft text-primary',
  warn: 'bg-warning-soft text-warning',
  bad: 'bg-danger-soft text-danger',
} as const;

const FILTERS: {
  key: FilterKey;
  label: string;
  tone: keyof typeof TILE_TONES;
  icon: typeof ClipboardText;
  statuses: LandlordApplicationStatus[] | null;
}[] = [
  { key: 'ALL',         label: 'Total',         tone: 'neutral', icon: ClipboardText, statuses: null },
  { key: 'IN_REVIEW',   label: 'En revisión',   tone: 'info',    icon: Hourglass,     statuses: ['SUBMITTED', 'UNDER_REVIEW'] },
  { key: 'NEEDS_INFO',  label: 'Pide info',     tone: 'warn',    icon: WarningCircle, statuses: ['NEEDS_INFO'] },
  { key: 'PREAPPROVED', label: 'Pre-aprobadas', tone: 'neutral', icon: SealCheck,     statuses: ['PREAPPROVED'] },
  { key: 'APPROVED',    label: 'Aprobadas',     tone: 'ok',      icon: CheckCircle,   statuses: ['APPROVED'] },
  { key: 'REJECTED',    label: 'Rechazadas',    tone: 'bad',     icon: XCircle,       statuses: ['REJECTED', 'WITHDRAWN', 'CONTRACT_FAILED'] },
];

function StatTile({
  value,
  label,
  tone,
  icon: Icon,
  active,
  onClick,
}: {
  value: number;
  label: string;
  tone: keyof typeof TILE_TONES;
  icon: typeof ClipboardText;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-3 p-4 rounded-xl border bg-card text-left transition-colors',
        active
          ? 'border-primary ring-1 ring-primary'
          : 'border-border hover:bg-surface-muted',
      )}
    >
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', TILE_TONES[tone])}>
        <Icon className="w-5 h-5" weight="duotone" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold text-fg tabular-nums leading-none">{value}</p>
        <p className="text-xs text-fg-muted mt-1 truncate">{label}</p>
      </div>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

export default function PostulacionesPage() {
  const router = useRouter()
  const [items, setItems] = useState<AllCandidatesItem[]>([])
  const [filter, setFilter] = useState<FilterKey>('ALL')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await landlordApplicationsApi.getAllCandidates()
      setItems(res.candidates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las postulaciones.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useAutoRefresh(load)

  const countFor = useCallback(
    (statuses: LandlordApplicationStatus[] | null) =>
      statuses === null ? items.length : items.filter((c) => statuses.includes(c.status)).length,
    [items],
  )

  const visibleItems = useMemo(() => {
    const activeFilter = FILTERS.find((f) => f.key === filter)
    let result = activeFilter?.statuses
      ? items.filter((c) => activeFilter.statuses!.includes(c.status))
      : items
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (c) =>
          c.tenantName.toLowerCase().includes(q) ||
          c.tenantEmail.toLowerCase().includes(q) ||
          c.propertyTitle.toLowerCase().includes(q),
      )
    }
    return result
  }, [items, filter, search])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-fg">Postulaciones</h1>
        <p className="text-sm text-fg-muted mt-0.5">
          Postulaciones de inquilinos a tus propiedades. Haz clic en una para revisarla y decidir.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="md" variant="muted" label="Cargando postulaciones" />
        </div>
      ) : error ? (
        <ErrorState
          title="No se pudieron cargar las postulaciones"
          description={error}
          onRetry={() => void load()}
        />
      ) : items.length === 0 ? (
        /* Sin nada que atender, lo útil no son seis tiles en cero ni una tabla
           vacía con filtros: es explicar qué va a llegar acá y de dónde viene.
           El mapa vivía en una pantalla aparte llamada «Recorrido» y ese era el
           error — el recorrido no es un destino, es el contexto de ESTA lista.

           Va DENTRO de la misma tarjeta que hospeda la tabla: el contenedor de
           la lista es el que dice que la lista está vacía. Suelto sobre la
           página el mensaje flota y el mapa parece otra sección. */
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Sin envoltorio con padding: `EmptyState` ya trae el suyo (py-16) y
              sumarle otro abría un hueco de media pantalla antes del mapa. */}
          <EmptyState
            icon={ClipboardText}
            title="Todavía no te ha llegado ninguna postulación"
            description="Cuando alguien con asegurabilidad vigente se postule a una de tus propiedades, aparece acá con su nivel y su estado. Así es el recorrido completo:"
          />
          <div className="border-t border-border px-6 py-8">
            <RecorridoMapa />
          </div>
        </div>
      ) : (
        <>
          {/* Stats — clickable, they filter the table */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {FILTERS.map((f) => (
              <StatTile
                key={f.key}
                value={countFor(f.statuses)}
                label={f.label}
                tone={f.tone}
                icon={f.icon}
                active={filter === f.key}
                onClick={() => setFilter(filter === f.key ? 'ALL' : f.key)}
              />
            ))}
          </div>

          {/* Search + table (same container language as Propiedades) */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted z-10 pointer-events-none" />
                <Input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por candidato, email o propiedad..."
                  className="pl-9 pr-9"
                />
                {search && (
                  <IconButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearch('')}
                    aria-label="Limpiar búsqueda"
                    icon={<X className="w-3.5 h-3.5" />}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10"
                  />
                )}
              </div>

              {/* Status filter (selector excluyente, sincronizado con las tarjetas) */}
              <SegmentedControl<FilterKey>
                aria-label="Filtrar por estado"
                value={filter}
                onChange={setFilter}
                options={FILTERS.map((f) => ({
                  value: f.key,
                  label: f.key === 'ALL' ? 'Todas' : f.label,
                }))}
              />
            </div>

            {visibleItems.length === 0 ? (
              <EmptyState
                icon={ClipboardText}
                title="Sin postulaciones"
                description={
                  search || filter !== 'ALL'
                    ? 'Ninguna postulación coincide con los filtros'
                    : 'Cuando un inquilino se postule a una de tus propiedades, aparecerá aquí.'
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidato</TableHead>
                    <TableHead>Propiedad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleItems.map((c) => {
                    const statusCfg = STATUS_CONFIG[c.status] ?? FALLBACK_STATUS
                    return (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/panel/inmobiliaria/propiedades/${c.propertyId}/candidatos`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-surface-brand flex items-center justify-center shrink-0">
                              <span className="text-xs font-medium text-primary">{initials(c.tenantName)}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-fg truncate">{c.tenantName}</p>
                              <p className="text-xs text-fg-muted truncate">{c.tenantEmail}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-fg">{c.propertyTitle}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                              statusCfg.bg,
                              statusCfg.text,
                            )}
                          >
                            {statusCfg.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          {c.riskScore ? (
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                                SCORE_COLORS[c.riskScore.level] ?? 'text-fg-muted bg-surface-muted',
                              )}
                            >
                              {c.riskScore.totalScore} · {c.riskScore.level}
                            </span>
                          ) : (
                            <span className="text-fg-muted">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-fg-muted">{formatDate(c.submittedAt)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Con trabajo encima, el recorrido se pliega: sigue disponible para
              quien no sepa de dónde salió esta lista, sin robarle espacio a
              quien vino a atenderla. */}
          <details className="group border-t border-border pt-6">
            <summary className="cursor-pointer list-none text-sm font-medium text-primary hover:underline">
              Cómo funciona el recorrido
            </summary>
            <div className="pt-6">
              <RecorridoMapa />
            </div>
          </details>
        </>
      )}
    </div>
  )
}
