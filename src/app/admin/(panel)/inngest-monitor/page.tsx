'use client'

import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { Pill } from '@/components/admin/Pill'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'
import type { PillTone } from '@/lib/admin/types'
import { Card, MonoLabel } from '@leasefy/cadence'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

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
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Tareas programadas"
        description="Salud inferida vía side-effects en Postgres · volumen workflows desde agent_execution_metrics."
      />

      {isLoading && <LoadingBlock />}
      {!isLoading && error && <ErrorBlock error={error} />}

      {data && (
        <>
          {/* All-silent warning: no cron has any observable side-effect */}
          {allSilent && (
            <Card className="p-4  mb-6 text-caption text-fg-muted">
              Ningún cron tiene side-effect observable en Postgres — verifica que
              Inngest esté corriendo y las keys configuradas en el back.
            </Card>
          )}

          {/* Cron summary pills */}
          <div className="flex flex-wrap gap-4 mb-4 text-sm">
            <span><span className="tabular-nums text-success font-semibold">{cronCounts.ok}</span> <span className="text-fg-muted">ok</span></span>
            <span><span className="tabular-nums text-warning font-semibold">{cronCounts.degraded}</span> <span className="text-fg-muted">stale</span></span>
            <span><span className="tabular-nums text-danger font-semibold">{cronCounts.down}</span> <span className="text-fg-muted">down</span></span>
            <span><span className="tabular-nums text-fg-muted font-semibold">{cronCounts.unknown}</span> <span className="text-fg-muted">sin signal</span></span>
          </div>

          {/* Crons table */}
          <MonoLabel className="block mb-3">
            crons · {crons.length} registrados · TZ=America/Bogota
          </MonoLabel>
          <Card className="overflow-x-auto mb-6">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border">
                  {['Cron', 'Último side-effect', 'Status'].map((h) => (
                    <TableHead
                      key={h}
                      
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {crons.map((c) => (
                  <TableRow key={c.cron} className="border-b border-border last:border-0">
                    <TableCell className="font-mono text-caption text-fg">{c.cron}</TableCell>
                    <TableCell className="text-caption text-fg-muted font-mono whitespace-nowrap">
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
                    </TableCell>
                    <TableCell >
                      <Pill tone={cronTone(c.status)}>{cronLabel(c.status)}</Pill>
                    </TableCell>
                  </TableRow>
                ))}
                {crons.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="px-4 py-8 text-center text-fg-muted text-sm">
                      Sin crons registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Workflows table */}
          <MonoLabel className="block mb-3">
            workflows event-driven · volumen 24h
          </MonoLabel>
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border">
                  {['ID', 'Invocaciones 24h'].map((h, i) => (
                    <TableHead
                      key={h}
                      className={`px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle whitespace-nowrap ${i >= 1 ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((w) => {
                  const runs = Number(w.run_count) || 0
                  return (
                    <TableRow key={w.workflow_id} className="border-b border-border last:border-0">
                      <TableCell className="font-mono text-caption text-fg">{w.workflow_id}</TableCell>
                      <TableCell className="text-right tabular-nums font-mono text-caption">
                        {runs > 0 ? (
                          <span className="text-success">{runs}</span>
                        ) : (
                          <span className="text-fg-subtle">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {workflows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="px-4 py-8 text-center text-fg-muted text-sm">
                      Sin workflows registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          <Card className="p-4 mt-6 border-l-4 border-l-fg-subtle text-caption text-fg-muted">
            Para status live (last_error, queue_depth, retry count) integrar Inngest Cloud API
            con <code className="font-mono">INNGEST_SIGNING_KEY</code>.
          </Card>
        </>
      )}
    </div>
  )
}
