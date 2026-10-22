'use client'

import Link from 'next/link'
import { ArrowRight, Wallet } from '@phosphor-icons/react'
import { Card, MonoLabel, Progress, Stagger, StaggerItem, StatusBadge } from '@leasefy/cadence'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { ETAPA, ETAPAS_DE_CARTERA, legible, type EtapaDeCartera as CarteraStage } from '@/lib/admin/textos-del-admin'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Tarjeta } from '@/components/admin/screen/Tarjeta'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'


/** El tono de Cadence (`StatusBadge`) de cada etapa. */
const TONO_DEL_SELLO = { ok: 'success', neutral: 'info', warn: 'warning', bad: 'critical', muted: 'neutral' } as const

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
  const etapa = ETAPA[bucket.stage]
  const pct = total > 0 ? (bucket.n / total) * 100 : 0
  return (
    <Link href={`/admin/cartera/${bucket.stage}`} className="group block h-full rounded-[20px] outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card interactive className="flex h-full flex-col gap-2 p-5">
        <div className="flex items-center justify-between gap-2">
          <StatusBadge tone={TONO_DEL_SELLO[etapa.tono]}>{bucket.stage}</StatusBadge>
          <MonoLabel className="tabular-nums">{pct.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %</MonoLabel>
        </div>
        <div className="font-mono text-stat tabular-nums text-fg">{bucket.n.toLocaleString('es-CO')}</div>
        <div className="truncate text-body-sm font-medium text-fg" title={etapa.nombre}>
          {etapa.nombre}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border-faint pt-2 text-caption text-fg-subtle">
          <span>{etapa.pista}</span>
          {bucket.avg_days_in_state !== null && (
            <span className="font-mono tabular-nums text-fg-muted">
              {bucket.avg_days_in_state.toLocaleString('es-CO', { maximumFractionDigits: 1 })} d prom.
            </span>
          )}
        </div>
      </Card>
    </Link>
  )
}

function TransitionArrow({ from, to }: { from: CarteraStage | null; to: CarteraStage }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono text-caption text-fg-subtle">{from ?? 'inicio'}</span>
      <ArrowRight className="h-3.5 w-3.5 text-fg-subtle" aria-hidden="true" />
      <Pill tone={ETAPA[to].tono}>{to}</Pill>
    </span>
  )
}

// ---------- Page ----------

/** /cartera — portfolio overview (BACK.md §8.6 · FRONT.md §6.9). */
export default function CarteraPage() {
  const { data, isLoading, error, refetch } = useApiQuery<CarteraOverview>(
    (signal) => adminApi('/cartera', { signal }),
  )


  if (isLoading) return <div className="space-y-6 p-6 lg:p-8"><LoadingBlock filas={6} /></div>
  if (error) return <div className="space-y-6 p-6 lg:p-8"><ErrorBlock error={error} onReintentar={refetch} /></div>

  // Normalise: fill in stages missing from the API (n=0 if no debtors in stage)
  const byStage = new Map((data?.buckets ?? []).map((b) => [b.stage, b]))
  const buckets: StageBucket[] = ETAPAS_DE_CARTERA.map((stage) => {
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
      orden: (r) => r.transitioned_at,
      ordenPrimero: 'desc',
      texto: (r) => fmtDateTime(r.transitioned_at),
      cell: (r) => (
        <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">{fmtDateTime(r.transitioned_at)}</span>
      ),
    },
    {
      header: 'Deudor',
      orden: (r) => r.debtor_name,
      texto: (r) => r.debtor_name,
      cell: (r) => <span className="block max-w-[200px] truncate font-medium">{r.debtor_name ?? '—'}</span>,
    },
    {
      header: 'Inmobiliaria',
      orden: (r) => r.legal_name,
      texto: (r) => r.legal_name,
      cell: (r) => <span className="block max-w-[180px] truncate text-fg-muted">{r.legal_name ?? '—'}</span>,
    },
    {
      header: 'Cambio de etapa',
      orden: (r) => r.to_stage,
      texto: (r) => `${r.from_stage ?? 'inicio'} → ${r.to_stage}`,
      cell: (r) => <TransitionArrow from={r.from_stage} to={r.to_stage} />,
    },
    {
      header: 'Motivo',
      texto: (r) => legible(r.reason),
      cell: (r) => <span className="block max-w-[260px] truncate text-fg-muted" title={r.reason}>{legible(r.reason)}</span>,
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Cartera"
        description={[
          `${total.toLocaleString('es-CO')} deudores en 7 etapas de cobro (S0 a S5 y SX).`,
          untracked > 0 ? ` ${untracked.toLocaleString('es-CO')} todavía sin etapa.` : '',
        ].join('')}
      />

      <section aria-label="Deudores por etapa">
        <Stagger className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-7">
          {buckets.map((b) => (
            <StaggerItem key={b.stage} className="h-full">
              <StageCard bucket={b} total={total} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <Tarjeta titulo="Cómo se reparte" descripcion="Toca una etapa para ver sus deudores.">
        <div className="space-y-3">
          {buckets.map((b) => {
            const pct = total > 0 ? (b.n / total) * 100 : 0
            const etapa = ETAPA[b.stage]
            return (
              <Link
                key={b.stage}
                href={`/admin/cartera/${b.stage}`}
                className="group -mx-2 grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 rounded-sm px-2 py-1 outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,14rem)_1fr_auto]"
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="font-mono text-caption text-fg-subtle">{b.stage}</span>
                  <span className="truncate text-body-sm text-fg">{etapa.nombre}</span>
                </span>
                <Progress value={(b.n / maxN) * 100} color={etapa.barra} size="sm" label={`${etapa.nombre}: ${b.n}`} />
                <span className="w-24 text-right font-mono text-caption tabular-nums text-fg-muted">
                  {b.n.toLocaleString('es-CO')} · {pct.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %
                </span>
              </Link>
            )
          })}
        </div>
      </Tarjeta>

      <section className="space-y-3" aria-label="Cambios de etapa recientes">
        <MonoLabel className="block">Cambios de etapa recientes</MonoLabel>
        <DataTable
          columns={transitionColumns}
          rows={data?.transitions}
          getKey={(r) => r.id}
          emptyTitle="Todavía no hay cambios de etapa"
          emptyHint="La tarea de cartera corre todos los días a las 6:30 a. m. (hora de Bogotá)."
          emptyIcon={<Wallet weight="bold" />}
          aria-label="Cambios de etapa"
          queSon={['cambio', 'cambios']}
          buscar="Deudor, inmobiliaria o motivo"
          segmentos={[
            { valor: 'todos', nombre: 'Todos', cumple: () => true },
            ...ETAPAS_DE_CARTERA.map((e) => ({ valor: e, nombre: `A ${e}`, cumple: (r: TransitionRow) => r.to_stage === e })),
          ]}
          ordenInicial={{ columna: 0, sentido: 'desc' }}
          exportar="cambios-de-etapa"
        />
      </section>
    </div>
  )
}
