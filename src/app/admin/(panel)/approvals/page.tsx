'use client'

import { useRouter } from 'next/navigation'
import { SealCheck } from '@phosphor-icons/react'

import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtDateTime } from '@/lib/admin/format'
import { tipoDeDecision } from '@/lib/admin/textos-del-admin'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { BarraDeFiltros, Desplegable, Filtro } from '@/components/admin/screen/Filtros'
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
      // Nunca el JSON crudo en pantalla: el detalle completo está en la decisión.
      return 'Ábrela para ver lo que propone.'
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

/** /admin/approvals — la cola de la ley T-323/2024 (FRONT.md §6.11 · BACK.md §8.10). */
export default function ApprovalsPage() {
  const router = useRouter()
  const { get, setFilters } = useUrlFilters()
  const type = get('type')

  const { data, isLoading, error, refetch } = useApiQuery<ApprovalsResponse>(
    (signal) => adminApi('/approvals', { query: { type: type || undefined }, signal }),
    [type],
  )

  const facets = data?.facets ?? []
  const totalPending = facets.reduce((a, f) => a + parseInt(f.n, 10), 0)
  const ahora = Date.now()
  const diasDe = (r: PendingRow) => (ahora - new Date(r.created_at).getTime()) / 86_400_000
  const filas = data?.data ?? []
  const vencidas = filas.filter((r) => diasDe(r) > 3).length
  const paraMirar = filas.filter((r) => diasDe(r) > 1 && diasDe(r) <= 3).length
  const recientes = filas.length - vencidas - paraMirar

  const columnas: Column<PendingRow>[] = [
    {
      header: 'Decisión',
      className: 'min-w-[260px]',
      orden: (r) => tipoDeDecision(r.decision_type),
      texto: (r) => `${tipoDeDecision(r.decision_type)} · ${summarizePayload(r.decision_type, r.decision_payload)}`,
      cell: (r) => (
        <div className="min-w-0 max-w-md space-y-1">
          <span className="text-body-sm font-medium text-fg">{tipoDeDecision(r.decision_type)}</span>
          <p className="line-clamp-2 text-caption text-fg-muted">{summarizePayload(r.decision_type, r.decision_payload)}</p>
        </div>
      ),
    },
    {
      header: 'Deudor',
      orden: (r) => r.debtor_name,
      texto: (r) => r.debtor_name ?? 'Deudor sin nombre',
      cell: (r) => (
        <div className="min-w-0">
          <div className="font-medium text-fg">{r.debtor_name ?? 'Deudor sin nombre'}</div>
          <div className="text-caption text-fg-muted">{r.legal_name ?? 'Sin inmobiliaria'}</div>
        </div>
      ),
    },
    {
      header: 'Esperando',
      orden: (r) => r.created_at,
      texto: (r) => esperaEnPalabras(diasDe(r)),
      cell: (r) => (
        <Pill tone={tonoDeLaEspera(diasDe(r))} dot>
          {esperaEnPalabras(diasDe(r))}
        </Pill>
      ),
    },
    {
      header: 'Confianza',
      align: 'right',
      orden: (r) => (r.confidence_score != null ? Number(r.confidence_score) : null),
      texto: (r) => (r.confidence_score != null ? Math.round(Number(r.confidence_score) * 100) : null),
      cell: (r) => (
        <span className="font-mono tabular-nums text-fg">
          {r.confidence_score != null ? `${Math.round(Number(r.confidence_score) * 100)} %` : '—'}
        </span>
      ),
    },
    {
      header: 'Propuesta',
      align: 'right',
      orden: (r) => r.created_at,
      ordenPrimero: 'desc',
      texto: (r) => fmtDateTime(r.created_at),
      cell: (r) => (
        <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">{fmtDateTime(r.created_at)}</span>
      ),
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Aprobaciones"
        description="Toda decisión de un agente con efecto legal pasa por aquí antes de ejecutarse (sentencia T-323 de 2024). Toca una para revisarla y decidir."
      />

      {/* Glow up 22-10: LA RESPUESTA (cuántas esperan y cuántas ya pasaron de 3 días) con la barra por espera. */}
      {data && totalPending > 0 ? (
        <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
          <CifraHeroe
            rotulo="Esperan un visto bueno"
            cifra={totalPending.toLocaleString('es-CO')}
            contexto={
              vencidas > 0
                ? `${vencidas.toLocaleString('es-CO')} ${vencidas === 1 ? 'lleva' : 'llevan'} más de 3 días`
                : 'ninguna lleva más de 3 días'
            }
            tramos={[
              { clave: 'vencidas', etiqueta: 'Más de 3 días', monto: vencidas, tono: 'critico', cifra: vencidas.toLocaleString('es-CO') },
              { clave: 'mirar', etiqueta: 'De 1 a 3 días', monto: paraMirar, tono: 'aviso', cifra: paraMirar.toLocaleString('es-CO') },
              { clave: 'recientes', etiqueta: 'Menos de 1 día', monto: recientes, tono: 'neutro', cifra: recientes.toLocaleString('es-CO') },
            ]}
            total={filas.length}
            data-testid="aprobaciones-esperando"
          />
        </div>
      ) : null}

      <DataTable
        columns={columnas}
        rows={data?.data}
        getKey={(r) => r.id}
        isLoading={isLoading}
        error={error}
        onReintentar={refetch}
        emptyTitle="No hay decisiones esperando"
        emptyHint="Cuando un agente proponga algo con efecto legal, aparece aquí para que alguien lo apruebe."
        emptyIcon={<SealCheck weight="duotone" />}
        aria-label="Cola de aprobaciones"
        onRowClick={(r) => router.push(`/admin/approvals/${r.id}`)}
        queSon={['decisión', 'decisiones']}
        buscar="Deudor, inmobiliaria o detalle"
        textoExtra={(r) => `${r.legal_name ?? ''} ${r.model_used}`}
        filtrosEnLaUrl={['type']}
        ordenInicial={{ columna: 2, sentido: 'asc' }}
        exportar="aprobaciones-pendientes"
        masEnElExcel={[
          { header: 'Inmobiliaria', texto: (r) => r.legal_name },
          { header: 'Modelo', texto: (r) => r.model_used },
        ]}
        barra={
          <BarraDeFiltros>
            <Filtro etiqueta="Tipo de decisión">
              <Desplegable
                value={type}
                onChange={(v) => setFilters({ type: v, page: undefined })}
                todas={`Todas (${totalPending})`}
                aria-label="Tipo de decisión"
                opciones={facets.map((f) => ({ valor: f.decision_type, nombre: `${tipoDeDecision(f.decision_type)} (${f.n})` }))}
              />
            </Filtro>
          </BarraDeFiltros>
        }
      />
      {data && data.data.length >= 100 ? (
        <p className="text-caption text-fg-subtle">Se muestran las 100 más viejas; el resto aparece a medida que se decidan.</p>
      ) : null}
    </div>
  )
}
