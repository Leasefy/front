'use client'

import { useEffect } from 'react'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { Pill } from '@/components/admin/Pill'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'
import type { PillTone } from '@/lib/admin/types'

// ─── Types (co-located, per FRONT.md §6.21) ────────────────────────────────

type CheckStatus = 'ok' | 'degraded' | 'down' | 'unconfigured'
type CheckCategory = 'database' | 'external'

/** GET /api/v1/admin/health checks[] item (ADMIN-API-CONTRACT.md — Health). */
interface Check {
  name: string
  category: CheckCategory
  status: CheckStatus
  latency_ms: number | null
  detail?: string | null
  /** Env var required to enable this check (only present when status = unconfigured). */
  required_env?: string
}

/** GET /api/v1/admin/health → { status: worst-of-13, checks }. */
interface HealthResponse {
  status: 'ok' | 'degraded' | 'down'
  checks: Check[]
}

// ─── Constants ─────────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<CheckCategory, string> = {
  database: 'Database / Postgres',
  external: 'External / proveedores',
}

const CATEGORY_ORDER: CheckCategory[] = ['database', 'external']

function statusTone(s: CheckStatus): PillTone {
  switch (s) {
    case 'ok':           return 'ok'
    case 'degraded':     return 'warn'
    case 'down':         return 'bad'
    case 'unconfigured': return 'muted'
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────

/** /health — system status (BACK.md §8.18 · FRONT.md §6.21). */
export default function HealthPage() {
  const { data, isLoading, error, refetch } = useApiQuery<HealthResponse>(
    (signal) => adminApi('/health', { signal }),
    [],
  )

  // Auto-refresh every 30s so the page stays live without a manual reload.
  useEffect(() => {
    const id = setInterval(() => refetch(), 30_000)
    return () => clearInterval(id)
  }, [refetch])

  const all = data?.checks ?? []
  const counts = {
    ok:           all.filter((c) => c.status === 'ok').length,
    degraded:     all.filter((c) => c.status === 'degraded').length,
    down:         all.filter((c) => c.status === 'down').length,
    unconfigured: all.filter((c) => c.status === 'unconfigured').length,
  }

  const byCategory = new Map<CheckCategory, Check[]>()
  for (const c of all) {
    const list = byCategory.get(c.category) ?? []
    list.push(c)
    byCategory.set(c.category, list)
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <PageHeader
        label="sistema"
        title="System status"
        description="13 checks en paralelo · timeout individual 5 s · auto-refresca cada 30 s."
      />

      {isLoading && <LoadingBlock label="ejecutando checks…" />}
      {!isLoading && error && <ErrorBlock error={error} />}

      {data && (
        <>
          {/* Global status (worst-of-13, computed server-side) */}
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
              estado global
            </span>
            <Pill tone={statusTone(data.status)}>{data.status}</Pill>
          </div>

          {/* KPI summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <KpiCard label="OK"              value={counts.ok}           tone="ok" />
            <KpiCard label="Degradados"      value={counts.degraded}     tone="warn" />
            <KpiCard label="Caídos"          value={counts.down}         tone="bad" />
            <KpiCard label="No configurados" value={counts.unconfigured} />
          </div>

          {/* Per-category tables */}
          {CATEGORY_ORDER.map((cat) => {
            const checks = byCategory.get(cat)
            if (!checks?.length) return null
            return (
              <section key={cat} className="mb-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
                  {CATEGORY_LABEL[cat]}
                </div>
                <div className="card overflow-x-auto">
                  <table className="w-full text-sm table-zebra">
                    <thead>
                      <tr className="border-b border-bg-border">
                        <th className="text-left px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle w-28">
                          Status
                        </th>
                        <th className="text-left px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
                          Servicio
                        </th>
                        <th className="text-right px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle w-20">
                          Latencia
                        </th>
                        <th className="text-left px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
                          Detalle
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {checks.map((c) => (
                        <tr key={c.name} className="border-b border-bg-border last:border-0">
                          <td className="px-3 py-2.5">
                            <Pill tone={statusTone(c.status)}>{c.status}</Pill>
                          </td>
                          <td className="px-3 py-2.5 font-medium text-fg">{c.name}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums font-mono text-xs text-fg-muted">
                            {c.latency_ms != null ? `${c.latency_ms}ms` : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-fg-muted font-mono">
                            {c.detail ?? '—'}
                            {c.required_env && (
                              <span className="ml-2 pill pill-warn text-[9px]">{c.required_env}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          })}

          <div className="card p-4 mt-2 border-l-4 border-l-fg-subtle text-xs text-fg-muted">
            Para activar un check <span className="pill">unconfigured</span>, agregá el env var indicado
            a <code className="font-mono">.env.local</code> y recargá la página.
          </div>
        </>
      )}
    </div>
  )
}
