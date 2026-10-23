'use client'

import Link from 'next/link'
import { Wallet } from '@phosphor-icons/react'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime, fmtFecha } from '@/lib/admin/format'
import { ETAPA, ETAPAS_DE_CARTERA, motivoDeEtapa, type EtapaDeCartera as CarteraStage } from '@/lib/admin/textos-del-admin'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'


/** El tono de Cadence (`StatusBadge`) de cada etapa. */
const TONO_DEL_TRAMO = { ok: 'exito', neutral: 'neutro', warn: 'aviso', bad: 'critico', muted: 'neutro' } as const

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

function TransitionArrow({ from, to }: { from: CarteraStage | null; to: CarteraStage }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-caption text-fg-muted">{from ? ETAPA[from].nombre : 'Inicio'}</span>
      <span className="text-caption text-fg-subtle" aria-hidden="true">→</span>
      <Pill tone={ETAPA[to].tono}>{ETAPA[to].nombre}</Pill>
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
  if (error)
    return (
      <div className="space-y-6 p-6 lg:p-8">
        <ErrorBlock error={error} onReintentar={refetch} titulo="No pudimos cargar la cartera" />
      </div>
    )

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
  const conCasos = buckets.filter((b) => b.n > 0)
  const sinCasos = buckets.filter((b) => b.n === 0)

  const tracked = data ? parseInt(data.totals.tracked, 10) : 0
  const allDebtors = data ? parseInt(data.totals.total, 10) : 0
  const untracked = Math.max(0, allDebtors - tracked)

  const transitionColumns: Column<TransitionRow>[] = [
    {
      header: 'Cuándo',
      orden: (r) => r.transitioned_at,
      ordenPrimero: 'desc',
      texto: (r) => fmtDateTime(r.transitioned_at),
      // Ronda 26 (revisora r25): la tabla no cabía a 1440; la hora no decide nada aquí (va al Excel).
      cell: (r) => (
        <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted" title={fmtDateTime(r.transitioned_at)}>
          {fmtFecha(r.transitioned_at)}
        </span>
      ),
    },
    {
      header: 'Deudor',
      orden: (r) => r.debtor_name,
      texto: (r) => r.debtor_name,
      cell: (r) => <span className="block max-w-[180px] truncate text-body-sm font-medium text-fg">{r.debtor_name ?? '—'}</span>,
    },
    {
      header: 'Inmobiliaria',
      orden: (r) => r.legal_name,
      texto: (r) => r.legal_name,
      cell: (r) => <span className="block max-w-[160px] truncate text-body-sm text-fg-muted">{r.legal_name ?? '—'}</span>,
    },
    {
      header: 'Cambio de etapa',
      orden: (r) => r.to_stage,
      texto: (r) => `${r.from_stage ? ETAPA[r.from_stage].nombre : 'Inicio'} → ${ETAPA[r.to_stage].nombre}`,
      cell: (r) => <TransitionArrow from={r.from_stage} to={r.to_stage} />,
    },
    {
      header: 'Motivo',
      texto: (r) => motivoDeEtapa(r.reason),
      cell: (r) => (
        <span className="block max-w-[200px] truncate text-body-sm text-fg-muted" title={motivoDeEtapa(r.reason)}>
          {motivoDeEtapa(r.reason)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader title="Cartera" description="Los deudores de todas las inmobiliarias, por etapa de cobro." />

      {/* Glow up 22-10: LA RESPUESTA (cuántos deudores hay en cobro y en qué etapa) en una cifra con la barra por
          etapa; cada etapa abre su lista. Antes, 7 tarjetas del mismo peso con el código (S0…SX) arriba y la misma
          cuenta repetida en una segunda tarjeta. */}
      <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
        <CifraHeroe
          rotulo="Deudores en cobro"
          cifra={total.toLocaleString('es-CO')}
          contexto={untracked > 0 ? `${untracked.toLocaleString('es-CO')} todavía sin etapa` : undefined}
          // Ronda 26 (revisora r25): sólo las etapas con casos (antes las 7, casi todas en cero, cada una con su
          // pista); las vacías se nombran en una línea al pie.
          tramos={conCasos.map((b) => ({
            clave: b.stage,
            etiqueta: ETAPA[b.stage].nombre,
            monto: b.n,
            tono: TONO_DEL_TRAMO[ETAPA[b.stage].tono],
            cifra: (
              <Link
                href={`/admin/cartera/${b.stage}`}
                className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Ver los deudores en ${ETAPA[b.stage].nombre.toLowerCase()} (${b.n})`}
              >
                {b.n.toLocaleString('es-CO')}
              </Link>
            ),
            extra:
              b.avg_days_in_state !== null ? (
                <p className="text-caption text-fg-muted">
                  <span className="font-mono tabular-nums">{b.avg_days_in_state.toLocaleString('es-CO', { maximumFractionDigits: 1 })}</span> días en promedio
                </p>
              ) : (
                <p className="text-caption text-fg-muted">{ETAPA[b.stage].pista}</p>
              ),
          }))}
          total={total}
          pie={
            sinCasos.length > 0 && conCasos.length > 0
              ? `Sin casos en ${sinCasos.length === 1 ? 'la etapa' : `${sinCasos.length} etapas`}: ${sinCasos
                  .map((b) => ETAPA[b.stage].nombre.toLowerCase())
                  .join(', ')}.`
              : undefined
          }
          data-testid="cartera-por-etapa"
        />
      </div>

      <section className="space-y-3" aria-label="Cambios de etapa recientes">
        <h2 className="text-subtitle font-medium text-fg">Cambios de etapa recientes</h2>
        <DataTable
          columns={transitionColumns}
          rows={data?.transitions}
          getKey={(r) => r.id}
          emptyTitle="Todavía no hay cambios de etapa"
          emptyHint="La tarea de cartera corre todos los días a las 6:30 a. m. (hora de Bogotá)."
          emptyIcon={<Wallet weight="duotone" />}
          aria-label="Cambios de etapa"
          queSon={['cambio', 'cambios']}
          buscar="Deudor, inmobiliaria o motivo"
          segmentos={[
            { valor: 'todos', nombre: 'Todos', cumple: () => true },
            ...ETAPAS_DE_CARTERA.map((e) => ({ valor: e, nombre: `A ${ETAPA[e].nombre.toLowerCase()}`, cumple: (r: TransitionRow) => r.to_stage === e })),
          ]}
          ordenInicial={{ columna: 0, sentido: 'desc' }}
          exportar="cambios-de-etapa"
        />
      </section>
    </div>
  )
}
