'use client'

import Link from 'next/link'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'
import type { PillTone } from '@/lib/admin/types'

// ---------- Stage constants (BACK.md §7.1) ----------

const CARTERA_STAGES = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'SX'] as const
type CarteraStage = (typeof CARTERA_STAGES)[number]
type StageTone = Extract<PillTone, 'ok' | 'neutral' | 'warn' | 'bad' | 'muted'>

const STAGE_LABEL_ES: Record<CarteraStage, string> = {
  S0: 'Pre-vencimiento',
  S1: 'Cartera fresca',
  S2: 'Mora administrativa',
  S3: 'Mora pre-jurídica',
  S4: 'Siniestro inmobiliario',
  S5: 'Restitución / jurídico',
  SX: 'Skip / Abandono',
}

const STAGE_HINT_ES: Record<CarteraStage, string> = {
  S0: 'día < 0',
  S1: 'día 1..15',
  S2: 'día 16..45',
  S3: 'día 46..89',
  S4: 'reclamo seguro',
  S5: '≥ 90d, sin póliza',
  SX: 'cualquier edad',
}

const STAGE_TONE: Record<CarteraStage, StageTone> = {
  S0: 'ok',
  S1: 'neutral',
  S2: 'warn',
  S3: 'warn',
  S4: 'bad',
  S5: 'bad',
  SX: 'muted',
}

// ---------- Color helpers ----------

function toneToBgClass(tone: StageTone): string {
  switch (tone) {
    case 'ok':      return 'bg-ok/15'
    case 'neutral': return 'bg-brand/15'
    case 'warn':    return 'bg-warn/20'
    case 'bad':     return 'bg-bad/20'
    case 'muted':   return 'bg-fg-dim/25'
  }
}

function toneToBorderClass(tone: StageTone): string {
  switch (tone) {
    case 'ok':      return 'border-l-ok'
    case 'neutral': return 'border-l-brand'
    case 'warn':    return 'border-l-warn'
    case 'bad':     return 'border-l-bad'
    case 'muted':   return 'border-l-fg-dim'
  }
}

function toneToInkClass(tone: StageTone): string {
  switch (tone) {
    case 'ok':      return 'text-ok'
    case 'neutral': return 'text-brand'
    case 'warn':    return 'text-warn'
    case 'bad':     return 'text-bad'
    case 'muted':   return 'text-fg-muted'
  }
}

// ---------- Types ----------

/** Raw bucket from the API (SQL casts to ::text). */
interface ApiBucket {
  stage: CarteraStage
  n: string
  avg_days_in_state: string | null
  oldest_entered_at: string | null
}

interface StageBucket {
  stage: CarteraStage
  n: number
  avg_days_in_state: number | null
  oldest_entered_at: string | null
}

interface TransitionRow {
  id: string
  transitioned_at: string
  from_stage: CarteraStage | null
  to_stage: CarteraStage
  reason: string
  debtor_id: string
  debtor_name: string | null
  legal_name: string | null
}

/**
 * Response shape for GET /cartera (BACK.md §8.6 overview).
 * Assumption: backend returns {buckets, transitions, totals} as stated in the spec.
 */
interface CarteraOverview {
  buckets: ApiBucket[]
  transitions: TransitionRow[]
  totals: {
    tracked: string
    total: string
  }
}

// ---------- Sub-components ----------

function StageCard({ bucket, total }: { bucket: StageBucket; total: number }) {
  const tone = STAGE_TONE[bucket.stage]
  const pct = total > 0 ? (bucket.n / total) * 100 : 0
  return (
    <Link
      href={`/admin/cartera/${bucket.stage}`}
      className={`block card p-4 hover:bg-bg-hover transition-colors border-l-2 ${toneToBorderClass(tone)}`}
    >
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-subtle">
          {bucket.stage}
        </span>
        <span className="font-mono text-[10px] tabular-nums text-fg-subtle">
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="font-display text-3xl tabular-nums leading-none mb-1">
        {bucket.n.toLocaleString('es-CO')}
      </div>
      <div className="text-xs text-fg truncate" title={STAGE_LABEL_ES[bucket.stage]}>
        {STAGE_LABEL_ES[bucket.stage]}
      </div>
      <div className="mt-2 pt-2 border-t border-bg-border flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
        <span>{STAGE_HINT_ES[bucket.stage]}</span>
        {bucket.avg_days_in_state !== null && (
          <span className="tabular-nums normal-case text-fg-muted">
            {bucket.avg_days_in_state.toFixed(1)}d prom
          </span>
        )}
      </div>
    </Link>
  )
}

function TransitionArrow({
  from,
  to,
}: {
  from: CarteraStage | null
  to: CarteraStage
}) {
  const toTone = STAGE_TONE[to]
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tabular-nums">
      <span className="text-fg-subtle">{from ?? <span className="italic">inicial</span>}</span>
      <span className="text-fg-dim">→</span>
      <span className={`px-1.5 py-0.5 ${toneToBgClass(toTone)} ${toneToInkClass(toTone)}`}>
        {to}
      </span>
    </span>
  )
}

// ---------- Page ----------

/** /cartera — portfolio overview (BACK.md §8.6 · FRONT.md §6.9). */
export default function CarteraPage() {
  const { data, isLoading, error } = useApiQuery<CarteraOverview>(
    (signal) => adminApi('/cartera', { signal }),
  )

  if (isLoading) return <div className="p-6 lg:p-8"><LoadingBlock /></div>
  if (error) return <div className="p-6 lg:p-8"><ErrorBlock error={error} /></div>

  // Normalise: fill in stages missing from the API (n=0 if no debtors in stage)
  const byStage = new Map((data?.buckets ?? []).map((b) => [b.stage, b]))
  const buckets: StageBucket[] = CARTERA_STAGES.map((stage) => {
    const b = byStage.get(stage)
    return {
      stage,
      n: b ? parseInt(b.n, 10) : 0,
      avg_days_in_state: b?.avg_days_in_state ? parseFloat(b.avg_days_in_state) : null,
      oldest_entered_at: b?.oldest_entered_at ?? null,
    }
  })

  const total = buckets.reduce((sum, b) => sum + b.n, 0)
  const maxN = Math.max(1, ...buckets.map((b) => b.n))

  const tracked = data ? parseInt(data.totals.tracked, 10) : 0
  const allDebtors = data ? parseInt(data.totals.total, 10) : 0
  const untracked = Math.max(0, allDebtors - tracked)

  const transitionColumns: Column<TransitionRow>[] = [
    {
      header: 'Cuándo',
      cell: (r) => (
        <span className="whitespace-nowrap text-xs text-fg-muted tabular-nums">
          {fmtDateTime(r.transitioned_at)}
        </span>
      ),
    },
    {
      header: 'Deudor',
      cell: (r) => (
        <span className="truncate max-w-[200px]">{r.debtor_name ?? '—'}</span>
      ),
    },
    {
      header: 'Inmobiliaria',
      cell: (r) => (
        <span className="text-xs text-fg-muted truncate max-w-[180px]">
          {r.legal_name ?? '—'}
        </span>
      ),
    },
    {
      header: 'Transición',
      cell: (r) => <TransitionArrow from={r.from_stage} to={r.to_stage} />,
    },
    {
      header: 'Motivo',
      cell: (r) => (
        <span className="font-mono text-[11px] text-fg-muted truncate max-w-[260px]">
          {r.reason}
        </span>
      ),
    },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-7xl space-y-8">
      <PageHeader
        label="05 · cartera"
        title="Estado de cartera"
        description={[
          `${total.toLocaleString('es-CO')} deudores clasificados en 7 stages (S0..S5, SX).`,
          untracked > 0
            ? ` ${untracked.toLocaleString('es-CO')} sin estado asignado.`
            : '',
        ].join('')}
      />

      {/* Stage bucket grid */}
      <section>
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
          buckets por stage
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {buckets.map((b) => (
            <StageCard key={b.stage} bucket={b} total={total} />
          ))}
        </div>
      </section>

      {/* Funnel bars */}
      <section>
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
          distribución
        </div>
        <div className="card p-5">
          <div className="space-y-2.5">
            {buckets.map((b) => {
              const pct = total > 0 ? (b.n / total) * 100 : 0
              const widthPct = (b.n / maxN) * 100
              const tone = STAGE_TONE[b.stage]
              return (
                <Link key={b.stage} href={`/admin/cartera/${b.stage}`} className="block group">
                  <div className="flex items-center gap-3">
                    <div className="w-28 shrink-0 flex items-baseline gap-2">
                      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-subtle">
                        {b.stage}
                      </span>
                      <span className="text-xs text-fg-muted truncate">
                        {STAGE_LABEL_ES[b.stage]}
                      </span>
                    </div>
                    <div className="flex-1 h-6 bg-bg-hover relative overflow-hidden">
                      <div
                        className={`h-full transition-all group-hover:opacity-80 ${toneToBgClass(tone)}`}
                        style={{ width: `${widthPct}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-end pr-2.5 font-mono text-[11px] tabular-nums text-fg">
                        {b.n.toLocaleString('es-CO')}
                      </div>
                    </div>
                    <div className="w-14 shrink-0 text-right font-mono text-[11px] tabular-nums text-fg-subtle">
                      {pct.toFixed(1)}%
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Recent transitions */}
      <section>
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
          transiciones recientes
        </div>
        <DataTable
          columns={transitionColumns}
          rows={data?.transitions}
          getKey={(r) => r.id}
          emptyTitle="Sin transiciones"
          emptyHint="El cron cartera-cadence-cron corre a las 06:30 Bogotá."
        />
      </section>
    </div>
  )
}
