'use client'

import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { Pill } from '@/components/admin/Pill'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'
import type { PillTone } from '@/lib/admin/types'

// ─── Types (co-located, per FRONT.md §6.22) ────────────────────────────────

type CronStatus = 'ok' | 'degraded' | 'down' | 'unknown'

/**
 * Per-cron freshness inferred from Postgres side-effects
 * (ADMIN-API-CONTRACT.md — Inngest monitor). `last_run` null = no signal.
 */
interface CronRow {
  cron: string
  last_run: string | null
}

/** Workflow run counts 24h, grouped (ADMIN-API-CONTRACT.md). */
interface WorkflowRow {
  workflow_id: string
  run_count: number | string
}

/** GET /api/v1/admin/inngest-monitor */
interface InngestMonitorResponse {
  crons: CronRow[]
  workflowRuns: WorkflowRow[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Hours since an ISO timestamp; null when there is no signal. */
function hoursAgo(iso: string | null): number | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  return Number.isFinite(ms) ? ms / 3_600_000 : null
}

/**
 * Staleness computed client-side (the back only sends last_run):
 * <26h ok · 26–72h degraded (stale) · >72h down · null unknown.
 */
function cronStatus(lastRun: string | null): CronStatus {
  const h = hoursAgo(lastRun)
  if (h == null) return 'unknown'
  if (h < 26) return 'ok'
  if (h <= 72) return 'degraded'
  return 'down'
}

function cronTone(s: CronStatus): PillTone {
  switch (s) {
    case 'ok':       return 'ok'
    case 'degraded': return 'warn'
    case 'down':     return 'bad'
    case 'unknown':  return 'muted'
  }
}

function cronLabel(s: CronStatus): string {
  return s === 'unknown' ? 'sin signal' : s
}

// ─── Page ──────────────────────────────────────────────────────────────────

/** /inngest-monitor — Crons + workflows (BACK.md §8.19 · FRONT.md §6.22). */
export default function InngestMonitorPage() {
  const { data, isLoading, error } = useApiQuery<InngestMonitorResponse>(
    (signal) => adminApi('/inngest-monitor', { signal }),
    [],
  )

  const crons = (data?.crons ?? []).map((c) => ({
    ...c,
    status: cronStatus(c.last_run),
    hours_ago: hoursAgo(c.last_run),
  }))
  const workflows = data?.workflowRuns ?? []
  const allSilent = crons.length > 0 && crons.every((c) => c.last_run == null)

  const cronCounts = {
    ok:      crons.filter((c) => c.status === 'ok').length,
    degraded: crons.filter((c) => c.status === 'degraded').length,
    down:    crons.filter((c) => c.status === 'down').length,
    unknown: crons.filter((c) => c.status === 'unknown').length,
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <PageHeader
        label="sistema"
        title="Crons + workflows"
        description="Salud inferida vía side-effects en Postgres · volumen workflows desde agent_execution_metrics."
      />

      {isLoading && <LoadingBlock />}
      {!isLoading && error && <ErrorBlock error={error} />}

      {data && (
        <>
          {/* All-silent warning: no cron has any observable side-effect */}
          {allSilent && (
            <div className="card p-4 border-l-4 border-l-warn mb-6 text-xs text-fg-muted">
              Ningún cron tiene side-effect observable en Postgres — verificá que
              Inngest esté corriendo y las keys configuradas en el back.
            </div>
          )}

          {/* Cron summary pills */}
          <div className="flex flex-wrap gap-4 mb-4 text-sm">
            <span><span className="tabular-nums text-ok font-semibold">{cronCounts.ok}</span> <span className="text-fg-muted">ok</span></span>
            <span><span className="tabular-nums text-warn font-semibold">{cronCounts.degraded}</span> <span className="text-fg-muted">stale</span></span>
            <span><span className="tabular-nums text-bad font-semibold">{cronCounts.down}</span> <span className="text-fg-muted">down</span></span>
            <span><span className="tabular-nums text-fg-muted font-semibold">{cronCounts.unknown}</span> <span className="text-fg-muted">sin signal</span></span>
          </div>

          {/* Crons table */}
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
            crons · {crons.length} registrados · TZ=America/Bogota
          </div>
          <div className="card overflow-x-auto mb-6">
            <table className="w-full text-sm table-zebra">
              <thead>
                <tr className="border-b border-bg-border">
                  {['Cron', 'Último side-effect', 'Status'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {crons.map((c) => (
                  <tr key={c.cron} className="border-b border-bg-border last:border-0">
                    <td className="px-3 py-2.5 font-mono text-xs text-fg">{c.cron}</td>
                    <td className="px-3 py-2.5 text-xs text-fg-muted font-mono whitespace-nowrap">
                      {c.last_run ? (
                        <>
                          {fmtDateTime(c.last_run)}
                          {c.hours_ago != null && (
                            <span className="ml-1 text-[10px] text-fg-subtle">
                              (hace {c.hours_ago.toFixed(1)}h)
                            </span>
                          )}
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <Pill tone={cronTone(c.status)}>{cronLabel(c.status)}</Pill>
                    </td>
                  </tr>
                ))}
                {crons.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-fg-muted text-sm">
                      Sin crons registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Workflows table */}
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
            workflows event-driven · volumen 24h
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm table-zebra">
              <thead>
                <tr className="border-b border-bg-border">
                  {['ID', 'Invocaciones 24h'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle whitespace-nowrap ${i >= 1 ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workflows.map((w) => {
                  const runs = Number(w.run_count) || 0
                  return (
                    <tr key={w.workflow_id} className="border-b border-bg-border last:border-0">
                      <td className="px-3 py-2.5 font-mono text-xs text-fg">{w.workflow_id}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-mono text-xs">
                        {runs > 0 ? (
                          <span className="text-ok">{runs}</span>
                        ) : (
                          <span className="text-fg-subtle">0</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {workflows.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-fg-muted text-sm">
                      Sin workflows registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card p-4 mt-6 border-l-4 border-l-fg-subtle text-xs text-fg-muted">
            Para status live (last_error, queue_depth, retry count) integrar Inngest Cloud API
            con <code className="font-mono">INNGEST_SIGNING_KEY</code>.
          </div>
        </>
      )}
    </div>
  )
}
