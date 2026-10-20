'use client'

import Link from 'next/link'
import { ArrowRight, SealCheck } from '@phosphor-icons/react'
import { Card, Chip, MonoLabel, Stagger, StaggerItem } from '@leasefy/cadence'

import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtDateTime } from '@/lib/admin/format'
import { tipoDeDecision } from '@/lib/admin/textos-del-admin'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { LoadingBlock, ErrorBlock, EmptyBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'

interface PendingRow {
  id: string
  tenant_id: string
  debtor_id: string
  decision_type: string
  // pg NUMERIC arrives as string (::text cast) — convert before math
  confidence_score: string | null
  model_used: string
  created_at: string
  debtor_name: string | null
  legal_name: string | null
  decision_payload: Record<string, unknown>
}

interface ApprovalsResponse {
  data: PendingRow[]
  facets: Array<{ decision_type: string; n: string }>
}

const pesos = (n: unknown) => (typeof n === 'number' ? `$ ${n.toLocaleString('es-CO')}` : '—')

function summarizePayload(type: string, payload: Record<string, unknown>): string {
  switch (type) {
    case 'pre_judicial_letter':
      return `Carta prejurídica lista · deuda de ${pesos(payload.debt_amount_cop)}`
    case 'siniestro_filing':
      return `Reclamo a la aseguradora ${(payload.insurer as string | undefined) ?? '(sin nombre)'} · ${pesos(payload.debt_amount_cop)}`
    case 'legal_escalation':
      return `Escalación legal a ${(payload.target as string | undefined) ?? '(sin destino)'} · ${
        (payload.reason as string | undefined) ?? 'sin motivo'
      }`
    default:
      return JSON.stringify(payload).slice(0, 200)
  }
}

/** Cuánto lleva esperando: más de 3 días es urgente, más de 1 hay que mirarla. */
function tonoDeLaEspera(dias: number) {
  if (dias > 3) return 'bad' as const
  if (dias > 1) return 'warn' as const
  return 'neutral' as const
}

/** «5 h», «1 día», «3,2 días». */
function esperaEnPalabras(dias: number): string {
  if (dias < 1) return `${Math.max(1, Math.round(dias * 24))} h`
  const redondo = Math.round(dias * 10) / 10
  return `${redondo.toLocaleString('es-CO')} ${redondo === 1 ? 'día' : 'días'}`
}

function ApprovalCard({ row }: { row: PendingRow }) {
  const dias = (Date.now() - new Date(row.created_at).getTime()) / 86_400_000
  const summary = summarizePayload(row.decision_type, row.decision_payload)

  return (
    <Link href={`/admin/approvals/${row.id}`} className="group block rounded-[20px] outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card interactive className="flex items-start gap-4 p-5">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="info">{tipoDeDecision(row.decision_type)}</Pill>
            <span className="font-medium text-fg">{row.debtor_name ?? 'Deudor sin nombre'}</span>
            <span className="text-body-sm text-fg-muted">{row.legal_name ?? 'Sin inmobiliaria'}</span>
          </div>
          <p className="text-body-sm text-fg-muted">{summary}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Pill tone={tonoDeLaEspera(dias)} dot>
              Esperando {esperaEnPalabras(dias)}
            </Pill>
            <MonoLabel>
              Confianza {row.confidence_score != null ? `${Math.round(Number(row.confidence_score) * 100)} %` : '—'}
            </MonoLabel>
            <MonoLabel>{row.model_used}</MonoLabel>
            <MonoLabel className="tabular-nums">{fmtDateTime(row.created_at)}</MonoLabel>
          </div>
        </div>
        <ArrowRight
          className="mt-1 h-5 w-5 shrink-0 text-fg-subtle transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-fg"
          aria-hidden="true"
        />
      </Card>
    </Link>
  )
}

/** /admin/approvals — la cola de la ley T-323/2024 (FRONT.md §6.11 · BACK.md §8.10). */
export default function ApprovalsPage() {
  const { get, setFilters } = useUrlFilters()
  const type = get('type')

  const { data, isLoading, error, refetch } = useApiQuery<ApprovalsResponse>(
    (signal) => adminApi('/approvals', { query: { type: type || undefined }, signal }),
    [type],
  )

  const rows = data?.data ?? []
  const facets = data?.facets ?? []
  const totalPending = facets.reduce((a, f) => a + parseInt(f.n, 10), 0)

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Aprobaciones"
        description="Toda decisión de un agente con efecto legal pasa por acá antes de ejecutarse (sentencia T-323 de 2024)."
      />

      {/* Filtro por tipo: las píldoras de filtro de Cadence. */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo de decisión">
        <Chip selected={!type} onClick={() => setFilters({ type: undefined })}>
          Todas · <span className="font-mono tabular-nums">{totalPending}</span>
        </Chip>
        {facets.map((f) => (
          <Chip
            key={f.decision_type}
            selected={type === f.decision_type}
            onClick={() => setFilters({ type: f.decision_type })}
          >
            {tipoDeDecision(f.decision_type)} · <span className="font-mono tabular-nums">{f.n}</span>
          </Chip>
        ))}
      </div>

      <section className="space-y-3" aria-label="Cola de aprobaciones">
        <MonoLabel className="block">Cola · las más viejas primero</MonoLabel>
        {isLoading ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorBlock error={error} onReintentar={refetch} />
        ) : rows.length === 0 ? (
          <EmptyBlock
            icono={<SealCheck weight="bold" />}
            title="No hay decisiones esperando"
            hint="Cuando un agente proponga algo con efecto legal, aparece acá para que alguien lo apruebe."
          />
        ) : (
          <Stagger className="space-y-2">
            {rows.map((r) => (
              <StaggerItem key={r.id}>
                <ApprovalCard row={r} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>
    </div>
  )
}
