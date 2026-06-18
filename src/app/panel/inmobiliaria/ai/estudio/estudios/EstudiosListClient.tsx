'use client'

/**
 * EstudiosListClient — Tier-B estudio UX (build-kit §5).
 *
 * The "Estudios" inbox: a filterable two-column list over the unified human
 * queue (useEstudiosList → useAgentWorkItems('estudio')). Mirrors cobranza's
 * DeudoresListClient idioms (filter aside `md:w-64` + section; md+ table with
 * sticky header / sm cards fallback; DS Chip filter chips).
 *
 * Unlike the card-based /ai/estudio/cola (which decides items in place via
 * <ColaHumana>), this is a scannable inbox: filter by severidad / estado /
 * flags + search, click a row to open the case detail at ./[id].
 *
 * Vocabulary (severidad/estado/flag chip labels + tokens + relativeTime) is
 * reused verbatim from ColaHumana so chips render identically everywhere.
 *
 * T-323 guardrail: this list NEVER offers an automatic reject — it only routes
 * the operator to the human decision in the detail page. The `t323` flag is
 * surfaced (filter + chip) but no destructive action lives here.
 */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, ShieldCheck } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Chip } from '@leasefy/ui'
import { useI18n } from '@/lib/i18n'
import { useEstudiosList } from '@/lib/hooks/estudio/use-estudios-list'
import type {
  Severidad,
  WorkItem,
  WorkItemEstado,
  WorkItemFlag,
} from '@/lib/api/work-item'
import {
  severidadLabel,
  estadoLabel,
  flagLabel,
  relativeTime,
  SEVERIDAD_TOKEN,
  FLAG_META,
} from '@/components/inmobiliaria/ai/ColaHumana'
import { EmptyState } from '@/components/data-display/EmptyState'
import { EstudiosListSkeleton } from '@/components/skeleton/panel/EstudiosListSkeleton'

// ── Filter vocab (the closed sets we surface as chips) ───────────────────────
const SEVERIDADES: Severidad[] = ['critica', 'alta', 'media', 'baja']
const ESTADOS: WorkItemEstado[] = [
  'detectado',
  'sugerido',
  'en_revision',
  'aprobado',
  'ejecutando',
  'resuelto',
  'rechazado',
  'fallo',
]
const FLAGS: WorkItemFlag[] = ['necesita_humano', 'en_espera', 't323']

const SEVERIDAD_RANK: Record<Severidad, number> = {
  critica: 3,
  alta: 2,
  media: 1,
  baja: 0,
}

export default function EstudiosListClient() {
  const { t } = useI18n()
  const router = useRouter()

  // ── Filter state (client-side; the queue endpoint returns the full set) ────
  const [severidades, setSeveridades] = useState<Severidad[]>([])
  const [estados, setEstados] = useState<WorkItemEstado[]>([])
  const [flags, setFlags] = useState<WorkItemFlag[]>([])
  const [searchInput, setSearchInput] = useState<string>('')

  const { items, isLoading, error, refetch } = useEstudiosList()

  // ── Apply filters + default sort (severidad desc → newest) ────────────────
  const filtered = useMemo<WorkItem[]>(() => {
    const q = searchInput.trim().toLowerCase()
    return items
      .filter((it) => {
        if (severidades.length > 0 && !severidades.includes(it.severidad)) return false
        if (estados.length > 0 && !estados.includes(it.estado)) return false
        if (flags.length > 0 && !flags.some((f) => it.flags.includes(f))) return false
        if (q) {
          const hay = [
            it.titulo,
            it.accionSugerida?.label ?? '',
            it.subject?.masked ?? '',
            it.subject?.id ?? '',
          ]
            .join(' ')
            .toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        const rank = SEVERIDAD_RANK[b.severidad] - SEVERIDAD_RANK[a.severidad]
        if (rank !== 0) return rank
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
  }, [items, severidades, estados, flags, searchInput])

  const hasActiveFilters =
    severidades.length > 0 ||
    estados.length > 0 ||
    flags.length > 0 ||
    searchInput.trim().length > 0

  // ── First-load skeleton ───────────────────────────────────────────────────
  if (isLoading && items.length === 0) return <EstudiosListSkeleton />

  // ── Zero-data EmptyState (no filters, genuinely empty, no error) ───────────
  if (!isLoading && !hasActiveFilters && items.length === 0 && !error) {
    return (
      <main className="p-6 lg:p-8 space-y-4">
        <EmptyState
          icon={ShieldCheck}
          title={t('inmobiliaria.ai.estudio.list.empty.title')}
          description={t('inmobiliaria.ai.estudio.list.empty.description')}
        />
      </main>
    )
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleSeveridad = (s: Severidad) =>
    setSeveridades((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  const toggleEstado = (e: WorkItemEstado) =>
    setEstados((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]))
  const toggleFlag = (f: WorkItemFlag) =>
    setFlags((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]))
  const clearFilters = () => {
    setSeveridades([])
    setEstados([])
    setFlags([])
    setSearchInput('')
  }
  const navigateToEstudio = (id: string) => {
    router.push(`/panel/inmobiliaria/ai/estudio/${encodeURIComponent(id)}`)
  }

  // ── Filters aside ─────────────────────────────────────────────────────────
  const FiltersPanel = (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-fg">
        {t('inmobiliaria.ai.estudio.list.filters.title')}
      </h2>

      {/* Severidad chips */}
      <fieldset>
        <legend className="text-xs font-medium text-fg-muted mb-2">
          {t('inmobiliaria.ai.estudio.list.filters.severidad')}
        </legend>
        <div className="flex flex-wrap gap-2">
          {SEVERIDADES.map((s) => (
            <Chip
              key={s}
              size="sm"
              selected={severidades.includes(s)}
              onClick={() => toggleSeveridad(s)}
              data-testid={`estudio-severidad-chip-${s}`}
            >
              {severidadLabel(t, s)}
            </Chip>
          ))}
        </div>
      </fieldset>

      {/* Estado chips */}
      <fieldset>
        <legend className="text-xs font-medium text-fg-muted mb-2">
          {t('inmobiliaria.ai.estudio.list.filters.estado')}
        </legend>
        <div className="flex flex-wrap gap-2">
          {ESTADOS.map((e) => (
            <Chip
              key={e}
              size="sm"
              selected={estados.includes(e)}
              onClick={() => toggleEstado(e)}
              data-testid={`estudio-estado-chip-${e}`}
            >
              {estadoLabel(t, e, 'estudio')}
            </Chip>
          ))}
        </div>
      </fieldset>

      {/* Flag chips */}
      <fieldset>
        <legend className="text-xs font-medium text-fg-muted mb-2">
          {t('inmobiliaria.ai.estudio.list.filters.flags')}
        </legend>
        <div className="flex flex-wrap gap-2">
          {FLAGS.map((f) => (
            <Chip
              key={f}
              size="sm"
              selected={flags.includes(f)}
              onClick={() => toggleFlag(f)}
              data-testid={`estudio-flag-chip-${f}`}
            >
              {flagLabel(t, f)}
            </Chip>
          ))}
        </div>
      </fieldset>

      <Button variant="link" size="sm" hideArrow onClick={clearFilters} className="px-0">
        {t('inmobiliaria.ai.estudio.list.filters.clear')}
      </Button>
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="p-4 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          {t('inmobiliaria.ai.estudio.list.title')}
        </h1>
        <p className="text-sm text-fg-muted mt-0.5">
          {t('inmobiliaria.ai.estudio.list.subtitle')}
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Filter aside (md+) */}
        <aside className="md:w-64 md:sticky md:top-4 md:self-start">{FiltersPanel}</aside>

        {/* Main content */}
        <section className="flex-1 min-w-0">
          {/* Search + count */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex-1 max-w-md">
              <label htmlFor="estudio-search" className="sr-only">
                {t('inmobiliaria.ai.estudio.list.filters.search.label')}
              </label>
              <input
                id="estudio-search"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('inmobiliaria.ai.estudio.list.filters.search.placeholder')}
                className="w-full px-3 py-2 text-sm rounded-md border border-border bg-surface text-fg placeholder:text-fg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
              />
            </div>
            <span className="hidden md:inline text-xs font-medium text-fg-muted whitespace-nowrap tabular-nums">
              {t('inmobiliaria.ai.estudio.list.count', { n: filtered.length })}
            </span>
          </div>

          {/* Error banner (inline bottom-style, not a toast) */}
          {error && (
            <div className="rounded-xl border border-danger/30 bg-danger-soft p-4 mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-danger">
                {t('inmobiliaria.ai.estudio.list.error')}: {error}
              </p>
              <Button variant="outline" size="sm" hideArrow onClick={() => void refetch()}>
                {t('inmobiliaria.ai.estudio.list.errorRetry')}
              </Button>
            </div>
          )}

          {/* md+ table */}
          <div className="hidden md:block overflow-x-auto overscroll-contain rounded-xl border border-border bg-card">
            <table className="min-w-full divide-y divide-border text-sm [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-surface-muted">
              <thead className="bg-surface-muted">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-fg-muted uppercase tracking-wide">
                    {t('inmobiliaria.ai.estudio.list.columns.estudio')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-fg-muted uppercase tracking-wide">
                    {t('inmobiliaria.ai.estudio.list.columns.severidad')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-fg-muted uppercase tracking-wide">
                    {t('inmobiliaria.ai.estudio.list.columns.estado')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-fg-muted uppercase tracking-wide">
                    {t('inmobiliaria.ai.estudio.list.columns.accionSugerida')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-fg-muted uppercase tracking-wide">
                    {t('inmobiliaria.ai.estudio.list.columns.tiempo')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-12 text-center">
                      <p className="text-sm text-fg-muted mb-3">
                        {t('inmobiliaria.ai.estudio.list.emptyFiltered')}
                      </p>
                      <Button variant="outline" size="sm" hideArrow onClick={clearFilters}>
                        {t('inmobiliaria.ai.estudio.list.filters.clear')}
                      </Button>
                    </td>
                  </tr>
                )}
                {filtered.map((it) => {
                  const sev = SEVERIDAD_TOKEN[it.severidad] ?? SEVERIDAD_TOKEN.media
                  return (
                    <tr
                      key={it.id}
                      onClick={() => navigateToEstudio(it.id)}
                      role="link"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') navigateToEstudio(it.id)
                      }}
                      data-testid={`estudio-row-${it.id}`}
                      className="hover:bg-surface-hover cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <td className="px-3 py-2.5 align-top">
                        <p className="text-fg font-medium">{it.titulo}</p>
                        {/* Flag chips inline (t323 surfaced — never auto-rejected here) */}
                        {it.flags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {it.flags.map((flag) => {
                              const meta = FLAG_META[flag] ?? null
                              if (!meta) return null
                              const Icon = meta.icon
                              return (
                                <span
                                  key={flag}
                                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ring-1 ${meta.cls}`}
                                >
                                  <Icon className="w-3 h-3" aria-hidden="true" />
                                  {flagLabel(t, flag)}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <span
                          className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ring-1 ${sev.bg} ${sev.text} ${sev.ring}`}
                        >
                          {severidadLabel(t, it.severidad)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <span className="inline-flex items-center text-xs text-fg-muted px-2 py-0.5 rounded-full ring-1 ring-border bg-surface-muted">
                          {estadoLabel(t, it.estado, 'estudio')}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 align-top max-w-xs">
                        <p className="text-xs text-fg-muted truncate">
                          {it.accionSugerida.label}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <span className="inline-flex items-center gap-1 text-xs text-fg-muted tabular-nums whitespace-nowrap">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          {relativeTime(it.createdAt, t)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* sm cards fallback */}
          <div className="md:hidden">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-border bg-card px-3 py-12 text-center">
                <p className="text-sm text-fg-muted mb-3">
                  {t('inmobiliaria.ai.estudio.list.emptyFiltered')}
                </p>
                <Button variant="outline" size="sm" hideArrow onClick={clearFilters}>
                  {t('inmobiliaria.ai.estudio.list.filters.clear')}
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {filtered.map((it) => {
                  const sev = SEVERIDAD_TOKEN[it.severidad] ?? SEVERIDAD_TOKEN.media
                  return (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() => navigateToEstudio(it.id)}
                        data-testid={`estudio-card-${it.id}`}
                        className="w-full min-h-11 text-left rounded-xl border border-border bg-card px-3 py-3 transition-colors hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-fg">
                            {it.titulo}
                          </p>
                          <span
                            className={`shrink-0 inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ring-1 ${sev.bg} ${sev.text} ${sev.ring}`}
                          >
                            {severidadLabel(t, it.severidad)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="inline-flex items-center text-xs text-fg-muted px-2 py-0.5 rounded-full ring-1 ring-border bg-surface-muted">
                            {estadoLabel(t, it.estado, 'estudio')}
                          </span>
                          {it.flags.map((flag) => {
                            const meta = FLAG_META[flag] ?? null
                            if (!meta) return null
                            const Icon = meta.icon
                            return (
                              <span
                                key={flag}
                                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ring-1 ${meta.cls}`}
                              >
                                <Icon className="w-3 h-3" aria-hidden="true" />
                                {flagLabel(t, flag)}
                              </span>
                            )
                          })}
                        </div>
                        <p className="text-xs text-fg-muted mt-1.5 line-clamp-2">
                          {it.accionSugerida.label}
                        </p>
                        <span className="inline-flex items-center gap-1 text-xs text-fg-muted tabular-nums mt-1.5">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          {relativeTime(it.createdAt, t)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
