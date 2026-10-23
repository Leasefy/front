'use client'

import { useRouter } from 'next/navigation'
import { Coins } from '@phosphor-icons/react'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtCOP, fmtDiaCorto, USD_TO_COP } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Tarjeta } from '@/components/admin/screen/Tarjeta'
import { nombreDelModelo } from '@/lib/admin/textos-del-admin'


/* ── Types (match ADMIN-API-CONTRACT.md — Costs) ────────────────────────── */

interface Mtd {
  vapi_cost_usd_mtd: string
  claude_cost_usd_mtd: string
  vapi_cost_cop_mtd: string    // pre-converted server-side (COP_PER_USD = 4000)
  claude_cost_cop_mtd: string
  total_cost_cop_mtd: string
}

interface PerTenantRow {
  tenant_id: string
  legal_name: string
  vapi_cost_usd: string
  claude_cost_usd: string
  total_cost_usd: string
  total_cost_cop: string
}

interface DailyRow {
  day: string
  vapi_cost_usd: string
  claude_cost_usd: string
}

interface ModelMixRow {
  model_used: string
  count: string
  cost_usd: string
}

interface CostsResponse {
  mtd: Mtd | null
  perTenant: PerTenantRow[]
  dailySeries: DailyRow[]
  modelMix: ModelMixRow[]
}

function num(s: string | null | undefined): number {
  if (s == null) return 0
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

// ── Stacked daily bar chart (plain divs, no chart lib) ─────────────────────

/**
 * Vapi y Claude cobran en dólares; acá todo va en pesos (Nico: «ninguna
 * pantalla con dólares»), a la tasa fija del admin (`USD_TO_COP`, la misma del
 * back y del Resumen).
 */
const alPeso = (dolares: number) => Math.round(dolares * USD_TO_COP)
/** Ronda 28 (revisora r27): en Costos, un uso sin modelo es uno al que no se le anotó cuál fue. */
const modeloDelUso = (codigo: string | null | undefined) => {
  const nombre = nombreDelModelo(codigo)
  return nombre === 'Sin modelo' ? 'Sin modelo anotado' : nombre
}
const pesos = (dolares: number) => fmtCOP(alPeso(dolares))

function DailyStackedBars({ daily }: { daily: DailyRow[] }) {
  if (daily.length === 0) return <p className="text-body-sm text-fg-muted">Todavía no hay datos.</p>

  const vapiVals = daily.map((d) => num(d.vapi_cost_usd))
  const claudeVals = daily.map((d) => num(d.claude_cost_usd))
  const totals = vapiVals.map((v, i) => v + (claudeVals[i] ?? 0))
  const max = Math.max(...totals, 0.001)

  const vapiTotal = vapiVals.reduce((a, b) => a + b, 0)
  const claudeTotal = claudeVals.reduce((a, b) => a + b, 0)
  // Ronda 26: catorce barras planas no dicen nada; en cero, una línea.
  if (vapiTotal + claudeTotal === 0) {
    return <p className="text-body-sm text-fg-muted">Sin costo de voz ni de modelo en estos {daily.length} días.</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-caption text-fg-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-primary" /> Vapi · <span className="font-mono tabular-nums">{pesos(vapiTotal)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-fg-subtle/45" /> Claude · <span className="font-mono tabular-nums">{pesos(claudeTotal)}</span>
        </span>
      </div>
      <div className="flex h-36 items-end gap-1.5" role="img" aria-label={`Costo diario de los últimos ${daily.length} días`}>
        {totals.map((t, i) => {
          const v = vapiVals[i] ?? 0
          const c = claudeVals[i] ?? 0
          return (
            <div
              key={i}
              className="flex flex-1 flex-col justify-end gap-px overflow-hidden rounded-t-[6px]"
              title={`${fmtDiaCorto(daily[i]?.day)}: Vapi ${pesos(v)} · Claude ${pesos(c)}`}
            >
              {c > 0 && <div className="bg-fg-subtle/45" style={{ height: `${Math.max(1, (c / max) * 100)}%` }} />}
              {v > 0 && <div className="bg-primary" style={{ height: `${Math.max(1, (v / max) * 100)}%` }} />}
              {t === 0 && <div className="h-0.5 bg-border" />}
            </div>
          )
        })}
      </div>
      <div className="flex justify-between font-mono text-caption text-fg-subtle">
        <span>{fmtDiaCorto(daily[0]?.day)}</span>
        <span>{fmtDiaCorto(daily[daily.length - 1]?.day)}</span>
      </div>
    </div>
  )
}

/** /costs — Platform burn (BACK.md §8.9 · FRONT.md §6.17). */
export default function CostsPage() {
  const router = useRouter()

  const costs = useApiQuery<CostsResponse>(
    (signal) => adminApi('/costs', { signal }),
    [],
  )

  const mtd = costs.data?.mtd
  const perTenant = costs.data?.perTenant ?? []
  const daily = costs.data?.dailySeries ?? []
  const modelMix = costs.data?.modelMix ?? []

  const vapiMtdUsd = num(mtd?.vapi_cost_usd_mtd)
  const claudeMtdUsd = num(mtd?.claude_cost_usd_mtd)
  const vapiMtdCop = num(mtd?.vapi_cost_cop_mtd)
  const claudeMtdCop = num(mtd?.claude_cost_cop_mtd)
  const totalCostCop = num(mtd?.total_cost_cop_mtd)
  // Ronda 28 (revisora r27, bloqueante): «no hubo costo» con 80 usos en «Por modelo» era inventarlo: los
  // usos están, su costo no se anotó. Sin costo, la línea dice cuántos usos quedaron sin costo anotado.
  const usosDelMes = modelMix.reduce((a, r) => a + num(r.count), 0)
  const sinCostoEnNinguna = perTenant.every((r) => num(r.total_cost_usd) === 0)
  const todoEnCero = Boolean(costs.data) && totalCostCop === 0 && sinCostoEnNinguna

  // Per-tenant columns

  // Ronda 26 (revisora r25): un $ 0 en cada celda no informa; el cero va como «—» atenuado.
  const plata = (dolares: number, fuerte = false) =>
    dolares > 0 ? (
      <span className={fuerte ? 'font-mono tabular-nums text-fg' : 'font-mono tabular-nums'}>{pesos(dolares)}</span>
    ) : (
      <span className="text-fg-subtle">—</span>
    )
  const tenantColumns: Column<PerTenantRow>[] = [
    { header: 'Inmobiliaria', orden: (r) => r.legal_name, texto: (r) => r.legal_name, cell: (r) => <span className="text-body-sm text-fg">{r.legal_name}</span> },
    { header: 'Vapi', align: 'right', orden: (r) => num(r.vapi_cost_usd), ordenPrimero: 'desc', texto: (r) => alPeso(num(r.vapi_cost_usd)), cell: (r) => plata(num(r.vapi_cost_usd)) },
    { header: 'Claude', align: 'right', orden: (r) => num(r.claude_cost_usd), ordenPrimero: 'desc', texto: (r) => alPeso(num(r.claude_cost_usd)), cell: (r) => plata(num(r.claude_cost_usd)) },
    { header: 'Total', align: 'right', orden: (r) => num(r.total_cost_usd), ordenPrimero: 'desc', texto: (r) => alPeso(num(r.total_cost_usd)), cell: (r) => plata(num(r.total_cost_usd), true) },
  ]

  const modelColumns: Column<ModelMixRow>[] = [
    { header: 'Modelo', orden: (r) => r.model_used, texto: (r) => modeloDelUso(r.model_used), cell: (r) => <span className="text-body-sm text-fg">{modeloDelUso(r.model_used)}</span> },
    { header: 'Usos', align: 'right', orden: (r) => num(r.count), ordenPrimero: 'desc', texto: (r) => num(r.count), cell: (r) => <span className="font-mono tabular-nums">{num(r.count).toLocaleString('es-CO')}</span> },
    { header: 'Costo', align: 'right', orden: (r) => num(r.cost_usd), ordenPrimero: 'desc', texto: (r) => alPeso(num(r.cost_usd)), cell: (r) => plata(num(r.cost_usd)) },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Costos"
        description="Lo que cuesta operar la plataforma este mes: la voz y el modelo de los agentes."
        ayuda={
          <ParaEntenderMas etiqueta="Cómo se calcula" titulo="Los costos de la plataforma" variante="secundario">
            <p className="text-body-sm text-fg-muted">
              Vapi (la voz) y Claude (el modelo) cobran en dólares; aquí van en pesos a{' '}
              <span className="font-mono tabular-nums">{fmtCOP(USD_TO_COP)}</span> por dólar. Los mensajes de WhatsApp
              (360dialog) todavía no se miden: cuando se registren, aparecen aquí.
            </p>
          </ParaEntenderMas>
        }
      />

      {/* Glow up 22-10: LA RESPUESTA (el costo total del mes) partida en voz · modelo. Ronda 26 (revisora r25):
          en cero, UNA línea (antes «—» con su leyenda en «$ 0» y «$ 0», que se contradecían); WhatsApp se dice
          una vez, en «Cómo se calcula». */}
      {costs.data ? (
        totalCostCop > 0 ? (
          <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
            <CifraHeroe
              rotulo="Costo de este mes"
              cifra={fmtCOP(totalCostCop)}
              contexto="voz de las llamadas y modelo de los agentes"
              tramos={[
                { clave: 'vapi', etiqueta: 'Voz de las llamadas (Vapi)', monto: vapiMtdCop || vapiMtdUsd * USD_TO_COP, tono: 'neutro', cifra: fmtCOP(vapiMtdCop || vapiMtdUsd * USD_TO_COP) },
                { clave: 'claude', etiqueta: 'Modelo de los agentes (Claude)', monto: claudeMtdCop || claudeMtdUsd * USD_TO_COP, tono: 'aviso', cifra: fmtCOP(claudeMtdCop || claudeMtdUsd * USD_TO_COP) },
              ]}
              data-testid="costos-del-mes"
            />
          </div>
        ) : (
          <p className="rounded-lg border border-border bg-surface px-5 py-4 text-body-sm text-fg-muted" data-testid="costos-del-mes">
            {usosDelMes > 0
              ? `Este mes van ${usosDelMes.toLocaleString('es-CO')} ${usosDelMes === 1 ? 'uso' : 'usos'} de los agentes sin costo anotado: la voz y el modelo no registraron lo que cobraron.`
              : 'Este mes no hubo costo de voz ni de modelo: los agentes no se han usado.'}
          </p>
        )
      ) : null}

      {/* Ronda 28 (revisora r27, T15): sin costo en ninguna, la tabla de inmobiliarias era tres columnas de
          «—» en todas las filas y los 14 días repetían la línea de arriba: con todo en cero, la línea y los
          usos por modelo. */}
      {todoEnCero ? null : (
      <section className="space-y-3" aria-label="Por inmobiliaria">
        <h2 className="text-subtitle font-medium text-fg">Por inmobiliaria</h2>
        <DataTable
          columns={tenantColumns}
          rows={costs.data ? perTenant : undefined}
          getKey={(r) => r.tenant_id}
          isLoading={costs.isLoading}
          error={costs.error}
          onReintentar={costs.refetch}
          emptyTitle="Todavía no hay costos este mes"
          emptyIcon={<Coins weight="duotone" />}
          aria-label="Costos por inmobiliaria"
          onRowClick={(r) => router.push(`/admin/tenants/${r.tenant_id}`)}
          id="inmobiliarias"
          queSon={['inmobiliaria', 'inmobiliarias']}
          buscar="Buscar inmobiliaria"
          ordenInicial={{ columna: 3, sentido: 'desc' }}
          cifraDelCelular="Total"
          exportar="costos-por-inmobiliaria"
        />
      </section>
      )}

      <div className={todoEnCero ? 'grid grid-cols-1 gap-6' : 'grid grid-cols-1 gap-6 xl:grid-cols-2'}>
        <section className="space-y-3" aria-label="Por modelo">
          <h2 className="text-subtitle font-medium text-fg">Por modelo, este mes</h2>
          <DataTable
            columns={modelColumns}
            rows={modelMix}
            getKey={(r, i) => r.model_used ?? String(i)}
            isLoading={costs.isLoading}
            error={costs.error}
            emptyTitle="No se usó ningún modelo este mes"
            aria-label="Costos por modelo"
            id="modelos"
            queSon={['modelo', 'modelos']}
            // Ronda 30 (mandato: toda tabla con buscador): se busca por el nombre del modelo.
            buscar="Buscar un modelo"
            filasPorPagina={10}
            ordenInicial={{ columna: 2, sentido: 'desc' }}
            cifraDelCelular="Costo"
            exportar="costos-por-modelo"
            masEnElExcel={[{ header: 'Código del modelo', texto: (r) => r.model_used ?? '' }]}
          />
        </section>

        {todoEnCero ? null : (
          <Tarjeta titulo="Últimos 14 días" descripcion="Vapi y Claude, en pesos.">
            <DailyStackedBars daily={daily} />
          </Tarjeta>
        )}
      </div>

    </div>
  )
}
