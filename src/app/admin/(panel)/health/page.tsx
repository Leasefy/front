'use client'

import { useEffect } from 'react'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { Pill } from '@/components/admin/Pill'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'
import type { PillTone } from '@/lib/admin/types'
import { Card, MonoLabel } from '@leasefy/cadence'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

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
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Salud del sistema"
        description="13 checks en paralelo · timeout individual 5 s · auto-refresca cada 30 s."
      />

      {isLoading && <LoadingBlock label="ejecutando checks…" />}
      {!isLoading && error && <ErrorBlock error={error} />}

      {data && (
        <>
          {/* Global status (worst-of-13, computed server-side) */}
          <div className="flex items-center gap-3 mb-4">
            <MonoLabel>
              estado global
            </MonoLabel>
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
                <MonoLabel className="block mb-3">
                  {CATEGORY_LABEL[cat]}
                </MonoLabel>
                <Card className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border">
                        <TableHead >
                          Status
                        </TableHead>
                        <TableHead >
                          Servicio
                        </TableHead>
                        <TableHead className="text-right">
                          Latencia
                        </TableHead>
                        <TableHead >
                          Detalle
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {checks.map((c) => (
                        <TableRow key={c.name} className="border-b border-border last:border-0">
                          <TableCell >
                            <Pill tone={statusTone(c.status)}>{c.status}</Pill>
                          </TableCell>
                          <TableCell className="font-medium text-fg">{c.name}</TableCell>
                          <TableCell className="text-right tabular-nums font-mono text-caption text-fg-muted">
                            {c.latency_ms != null ? `${c.latency_ms}ms` : '—'}
                          </TableCell>
                          <TableCell className="text-caption text-fg-muted font-mono">
                            {c.detail ?? '—'}
                            {c.required_env && (
                              <Pill tone="warn" className="ml-2 text-[9px]">{c.required_env}</Pill>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </section>
            )
          })}

          <Card className="p-4 mt-2 border-l-4 border-l-fg-subtle text-caption text-fg-muted">
            Para activar un check <Pill tone="neutral">unconfigured</Pill>, agrega el env var indicado
            a <code className="font-mono">.env.local</code> y recarga la página.
          </Card>
        </>
      )}
    </div>
  )
}
