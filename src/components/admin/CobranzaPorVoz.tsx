'use client'

import { useRouter } from 'next/navigation'
import { Cifra, FranjaDeCifras } from '@leasefy/cadence'
import { CheckCircle } from '@phosphor-icons/react'

import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { MasDetalles } from '@/components/pantalla/MasDetalles'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { ErrorBlock, LoadingBlock } from '@/components/admin/screen/states'
import { Tarjeta } from '@/components/admin/screen/Tarjeta'
import { Pill } from '@/components/admin/Pill'
import { fmtCOP, fmtDateTime, fmtDiaCorto, fmtFecha, fmtNumero, fmtPorcentaje, USD_TO_COP } from '@/lib/admin/format'
import { NOMBRE_DEL_MODELO } from '@/lib/admin/modelo-de-cobro'
import {
  canalDeLaLlamada,
  estadoDelExperimento,
  estadoDelPago,
  eventoDeCumplimiento,
  modeloDeCobro,
  resultadoDeLaLlamada,
  tonoDelPago,
  urgencia,
} from '@/lib/admin/textos-del-admin'

/* ── Contract: docs/ADMIN-API-CONTRACT.md (back repo) — GET /dashboard ─────
 * 12 independent blocks via Promise.allSettled; each block may be null
 * (per-block tolerance). Numeric amounts/counts arrive as strings (::text).
 * ───────────────────────────────────────────────────────────────────────── */

interface TopKpis {
  paid_total_mtd: string
  paid_count_mtd: string
  vapi_cost_mtd: string // USD
  claude_cost_mtd: string // USD
  debtors_active: string
  debtors_closed: string
  cartera_atrasada_count: string
  cartera_atrasada_amount: string
}

interface TodayRow {
  payments_today_count: string
  payments_today_total: string
  payments_yesterday_count: string
  payments_yesterday_total: string
  calls_today_count: string
  calls_yesterday_count: string
  promises_today_count: string
  promises_yesterday_count: string
  escalations_today_count: string
  escalations_yesterday_count: string
  new_agencies_today: string
  new_agencies_yesterday: string
  compliance_events_today: string
  compliance_events_yesterday: string
  vapi_cost_today: string
  vapi_cost_yesterday: string
}

interface PlanRow {
  billing_model: string
  agency_count: string
  active_count: string
  paid_mtd: string | null
  debtors_count: string
  open_promises_count: string
}

interface KeyMetrics {
  avg_ticket_30d: string
  avg_promise_amount_30d: string
  promise_kept_pct_30d: string
  call_completion_pct_30d: string
}

interface DayBucket {
  day: string
  paid_total: string
  calls_count: string
  vapi_cost: string
}

interface ExperimentVariant {
  variant_id: string
  label: string
  assignment_count: string
}

interface ActiveExperiment {
  id: string
  name: string
  status: string
  created_at: string
  variants: ExperimentVariant[]
}

interface TxRow {
  id: string
  amount: string
  status: string
  provider: string | null
  paid_at: string | null
  created_at: string
  debtor_name: string
  legal_name: string | null
}

interface AgencyRow {
  tenant_id: string
  legal_name: string
  debtors_count: string
  calls_30d: string
  open_promises: string
  open_escalations: string
  paid_30d: string | null
}

interface OutcomeRow {
  outcome: string | null
  count: string
}

export interface OpenEscalation {
  id: string
  tenant_id: string
  status: string
  urgency: string
  created_at: string
  debtor_name: string
  legal_name: string | null
}

interface ComplianceCount {
  event_type: string
  count: string
}

interface FooterMetrics {
  mrr: string
  arr: string
  channel_mix: { call_type: string; count: string }[]
  calls_this_month: string
}

export interface DashboardResponse {
  topKpis: TopKpis | null
  today: TodayRow | null
  planBreakdown: PlanRow[] | null
  keyMetrics: KeyMetrics | null
  dailyTrend: DayBucket[] | null
  activeExperiment: ActiveExperiment | null
  recentTransactions: TxRow[] | null
  agencies: AgencyRow[] | null
  outcomes: OutcomeRow[] | null
  openEscalations: OpenEscalation[] | null
  complianceCounts: ComplianceCount[] | null
  footer: FooterMetrics | null
}

export function num(s: string | null | undefined): number {
  if (s == null) return 0
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

/** «3 promesas», «1 escalación». */
const contar = (n: number, uno: string, varios: string) => `${fmtNumero(n)} ${n === 1 ? uno : varios}`

function frenteAAyer(hoy: number, ayer: number): string | null {
  if (ayer === 0) return null
  const v = ((hoy - ayer) / ayer) * 100
  if (v === 0) return 'igual que ayer'
  return `${v > 0 ? '+' : '−'}${Math.abs(v).toLocaleString('es-CO', { maximumFractionDigits: 1 })} % frente a ayer`
}

// ── lo cobrado frente al costo, 14 días ──────────────────────────────────────

function BarrasDeCatorceDias({ trend }: { trend: DayBucket[] }) {
  if (trend.length === 0) return <p className="text-body-sm text-fg-muted">Todavía no hay días con llamadas.</p>
  const cobrado = trend.map((d) => num(d.paid_total))
  const costo = trend.map((d) => num(d.vapi_cost) * USD_TO_COP)
  const tope = Math.max(...cobrado, ...costo, 1)
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-caption text-fg-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success-500" aria-hidden="true" /> Cobrado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-sand-300 dark:bg-neutral-600" aria-hidden="true" /> Costo de las llamadas
        </span>
      </div>
      <div className="flex h-24 items-end gap-1" role="img" aria-label="Lo cobrado y el costo de cada día">
        {trend.map((d, i) => (
          <div
            key={d.day}
            className="flex h-full flex-1 items-end gap-px"
            title={`${fmtDiaCorto(d.day)}: cobrado ${fmtCOP(cobrado[i]!)} · costo ${fmtCOP(costo[i]!)}`}
          >
            <div className="flex-1 rounded-t-sm bg-success-500" style={{ height: `${Math.max(1, (cobrado[i]! / tope) * 100)}%` }} />
            <div className="flex-1 rounded-t-sm bg-sand-300 dark:bg-neutral-600" style={{ height: `${Math.max(1, (costo[i]! / tope) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between font-mono text-caption tabular-nums text-fg-subtle">
        <span>{fmtDiaCorto(trend[0]?.day)}</span>
        <span>{fmtDiaCorto(trend[trend.length - 1]?.day)}</span>
      </div>
      <p className="text-caption text-fg-muted">
        En los 14 días: cobrado <span className="font-mono tabular-nums text-fg">{fmtCOP(cobrado.reduce((a, b) => a + b, 0))}</span>{' '}
        · costo <span className="font-mono tabular-nums text-fg">{fmtCOP(costo.reduce((a, b) => a + b, 0))}</span>
      </p>
    </div>
  )
}

/** Una lista de «rótulo · cifra» para lo que se consulta. */
function Renglones({ filas, vacio }: { filas: Array<{ clave: string; nombre: React.ReactNode; valor: React.ReactNode }>; vacio: string }) {
  if (filas.length === 0) return <p className="text-body-sm text-fg-muted">{vacio}</p>
  return (
    <dl className="divide-y divide-border-faint">
      {filas.map((f) => (
        <div key={f.clave} className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
          <dt className="min-w-0 text-body-sm text-fg">{f.nombre}</dt>
          <dd className="shrink-0 font-mono text-body-sm tabular-nums text-fg">{f.valor}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * La pestaña «Cobranza por voz» del Resumen (glow up, 22-10-2026). LA RESPUESTA
 * es cuánto cobró Mori este mes (y su retorno sobre lo que costó); debajo, cuatro
 * cifras —hoy, el costo, los deudores y la cartera atrasada— y «hoy» en una
 * frase. El trabajo: las escalaciones abiertas (cada una abre su caso) y las
 * inmobiliarias de los últimos 30 días. El resto de cifras, plegado.
 */
export function CobranzaPorVoz({
  estado,
}: {
  estado: { data?: DashboardResponse; isLoading: boolean; error: Error | null; refetch: () => void }
}) {
  const router = useRouter()

  if (estado.isLoading && !estado.data) return <LoadingBlock label="Cargando la cobranza por voz" filas={6} />
  if (estado.error && !estado.data)
    return <ErrorBlock error={estado.error} onReintentar={estado.refetch} titulo="No pudimos cargar la cobranza por voz" />

  const d = estado.data
  const kpis = d?.topKpis
  const hoy = d?.today
  const planes = d?.planBreakdown ?? []
  const metricas = d?.keyMetrics
  const experimento = d?.activeExperiment ?? null
  const pagos = d?.recentTransactions ?? []
  const inmobiliarias = d?.agencies ?? []
  const resultados = d?.outcomes ?? []
  const escalaciones = d?.openEscalations ?? []
  const cumplimiento = d?.complianceCounts ?? []
  const pie = d?.footer

  const costoVapi = num(kpis?.vapi_cost_mtd) * USD_TO_COP
  const costoClaude = num(kpis?.claude_cost_mtd) * USD_TO_COP
  const costo = costoVapi + costoClaude
  const cobrado = num(kpis?.paid_total_mtd)
  const retorno = costo > 0 ? cobrado / costo : null
  const totalDeResultados = resultados.reduce((a, o) => a + num(o.count), 0)

  const columnasDeEscalaciones: Column<OpenEscalation>[] = [
    {
      header: 'Deudor',
      cell: (e) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-fg">{e.debtor_name}</div>
          <div className="truncate text-caption text-fg-muted">{e.legal_name ?? 'Sin inmobiliaria'}</div>
        </div>
      ),
      texto: (e) => `${e.debtor_name} ${e.legal_name ?? ''}`,
    },
    {
      header: 'Urgencia',
      cell: (e) => <Pill tone={urgencia(e.urgency).tono}>{urgencia(e.urgency).nombre}</Pill>,
      texto: (e) => urgencia(e.urgency).nombre,
    },
    {
      header: 'Desde',
      align: 'right',
      cell: (e) => <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">{fmtDateTime(e.created_at)}</span>,
      orden: (e) => e.created_at,
    },
  ]

  const columnasDeInmobiliarias: Column<AgencyRow>[] = [
    { header: 'Inmobiliaria', cell: (a) => <span className="font-medium text-fg">{a.legal_name}</span>, orden: (a) => a.legal_name, texto: (a) => a.legal_name },
    { header: 'Deudores', align: 'right', cell: (a) => <span className="font-mono tabular-nums">{fmtNumero(num(a.debtors_count))}</span>, orden: (a) => num(a.debtors_count), ordenPrimero: 'desc' },
    { header: 'Llamadas', align: 'right', cell: (a) => <span className="font-mono tabular-nums">{fmtNumero(num(a.calls_30d))}</span>, orden: (a) => num(a.calls_30d), ordenPrimero: 'desc' },
    { header: 'Promesas', align: 'right', cell: (a) => <span className="font-mono tabular-nums">{fmtNumero(num(a.open_promises))}</span>, orden: (a) => num(a.open_promises), ordenPrimero: 'desc' },
    {
      header: 'Escalaciones',
      align: 'right',
      cell: (a) => (
        <span className={num(a.open_escalations) > 0 ? 'font-mono tabular-nums text-warning' : 'font-mono tabular-nums'}>
          {fmtNumero(num(a.open_escalations))}
        </span>
      ),
      orden: (a) => num(a.open_escalations),
      ordenPrimero: 'desc',
    },
    {
      header: 'Cobrado',
      align: 'right',
      cell: (a) => <span className="font-mono tabular-nums">{a.paid_30d ? fmtCOP(num(a.paid_30d)) : '—'}</span>,
      orden: (a) => num(a.paid_30d),
      ordenPrimero: 'desc',
    },
  ]

  const fraseDeHoy = hoy
    ? [
        `${contar(num(hoy.calls_today_count), 'llamada', 'llamadas')} (ayer ${fmtNumero(num(hoy.calls_yesterday_count))})`,
        contar(num(hoy.promises_today_count), 'promesa', 'promesas'),
        contar(num(hoy.escalations_today_count), 'escalación', 'escalaciones'),
        contar(num(hoy.new_agencies_today), 'inmobiliaria nueva', 'inmobiliarias nuevas'),
        contar(num(hoy.compliance_events_today), 'evento de cumplimiento', 'eventos de cumplimiento'),
      ].join(' · ')
    : null

  return (
    <section aria-label="La cobranza por voz" className="space-y-6" data-testid="resumen-cobranza">
      <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
        {kpis ? (
          <CifraHeroe
            rotulo="Cobrado por Mori este mes"
            cifra={fmtCOP(cobrado)}
            contexto={
              <>
                en {contar(num(kpis.paid_count_mtd), 'pago aprobado', 'pagos aprobados')}
                {retorno != null
                  ? ` · ${retorno.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} veces lo que costó`
                  : ''}
              </>
            }
            pie={fraseDeHoy ? <>Hoy: {fraseDeHoy}.</> : 'Las cifras de hoy no llegaron.'}
            data-testid="resumen-cobrado"
          />
        ) : (
          <p className="text-body-sm text-fg-muted">Las cifras del mes no llegaron. Vuelve a intentarlo con «Actualizar».</p>
        )}
      </div>

      {kpis || hoy ? (
        <FranjaDeCifras fila="lg" aria-label="La cobranza en cifras">
          <Cifra
            etiqueta="Cobrado hoy"
            valor={hoy ? fmtCOP(num(hoy.payments_today_total)) : '—'}
            detalle={
              hoy
                ? [`ayer ${fmtCOP(num(hoy.payments_yesterday_total))}`, frenteAAyer(num(hoy.payments_today_total), num(hoy.payments_yesterday_total))]
                    .filter(Boolean)
                    .join(' · ')
                : undefined
            }
          />
          <Cifra
            etiqueta="Costo este mes"
            valor={kpis ? fmtCOP(costo) : '—'}
            detalle={kpis ? `llamadas ${fmtCOP(costoVapi)} · IA ${fmtCOP(costoClaude)}` : undefined}
          />
          <Cifra
            etiqueta="Deudores activos"
            valor={kpis ? num(kpis.debtors_active) : '—'}
            detalle={kpis ? contar(num(kpis.debtors_closed), 'cerrado', 'cerrados') : undefined}
          />
          <Cifra
            etiqueta="Cartera atrasada"
            valor={kpis ? num(kpis.cartera_atrasada_count) : '—'}
            detalle={kpis ? fmtCOP(num(kpis.cartera_atrasada_amount)) : undefined}
            tono={kpis && num(kpis.cartera_atrasada_count) > 0 ? 'aviso' : undefined}
          />
        </FranjaDeCifras>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-subtitle font-medium text-fg">Escalaciones abiertas</h2>
        <DataTable
          id="esc"
          aria-label="Escalaciones abiertas"
          columns={columnasDeEscalaciones}
          rows={escalaciones}
          getKey={(e) => e.id}
          onRowClick={(e) => router.push(`/admin/escalations/${e.id}`)}
          queSon={['escalación', 'escalaciones']}
          paginar={false}
          emptyTitle="Nada escalado"
          emptyHint="Ningún caso espera a una persona."
          emptyIcon={<CheckCircle weight="duotone" />}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-subtitle font-medium text-fg">Inmobiliarias en los últimos 30 días</h2>
        <DataTable
          id="inm"
          aria-label="Inmobiliarias en los últimos 30 días"
          columns={columnasDeInmobiliarias}
          rows={inmobiliarias}
          getKey={(a) => a.tenant_id}
          onRowClick={(a) => router.push(`/admin/tenants/${a.tenant_id}`)}
          queSon={['inmobiliaria', 'inmobiliarias']}
          buscar="Buscar una inmobiliaria"
          ordenInicial={{ columna: 5, sentido: 'desc' }}
          emptyTitle="Ninguna inmobiliaria usa la cobranza por voz"
          emptyHint="Cuando una la prenda, aquí sale lo que Mori hizo por ella."
        />
      </div>

      <MasDetalles etiqueta="Ver más cifras de la cobranza" etiquetaAbierto="Ocultar las cifras de la cobranza" data-testid="resumen-mas-cifras">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Tarjeta titulo="Lo cobrado frente al costo" descripcion="Los últimos 14 días.">
            <BarrasDeCatorceDias trend={d?.dailyTrend ?? []} />
          </Tarjeta>

          <Tarjeta titulo="Cómo terminan las llamadas" descripcion="Los últimos 30 días.">
            {resultados.length === 0 ? (
              <p className="text-body-sm text-fg-muted">Todavía no hay llamadas terminadas.</p>
            ) : (
              <ul className="space-y-3">
                {resultados.map((o) => {
                  const pct = totalDeResultados > 0 ? (num(o.count) / totalDeResultados) * 100 : 0
                  return (
                    <li key={o.outcome ?? 'sin-resultado'} className="space-y-1">
                      <div className="flex items-baseline justify-between gap-3 text-body-sm">
                        <span className="text-fg">{o.outcome ? resultadoDeLaLlamada(o.outcome) : 'Sin resultado'}</span>
                        <span className="font-mono text-caption tabular-nums text-fg-muted">
                          {fmtNumero(num(o.count))} · {fmtPorcentaje(pct)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                        <div className="h-full rounded-full bg-sand-300 dark:bg-neutral-600" style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Tarjeta>

          <Tarjeta titulo="Por modelo de cobro" descripcion="Cuántas inmobiliarias hay en cada uno y lo cobrado este mes.">
            <Renglones
              vacio="Todavía no hay inmobiliarias en la cobranza por voz."
              filas={planes.map((p) => ({
                clave: p.billing_model ?? 'sin-modelo',
                nombre: (
                  <>
                    {(NOMBRE_DEL_MODELO as Record<string, string>)[p.billing_model ?? ''] ?? (p.billing_model ? modeloDeCobro(p.billing_model) : 'Sin modelo')}
                    <span className="block text-caption text-fg-muted">
                      {contar(num(p.agency_count), 'inmobiliaria', 'inmobiliarias')} ({fmtNumero(num(p.active_count))} activas) ·{' '}
                      {contar(num(p.debtors_count), 'deudor', 'deudores')}
                    </span>
                  </>
                ),
                valor: p.paid_mtd ? fmtCOP(num(p.paid_mtd)) : '—',
              }))}
            />
          </Tarjeta>

          <Tarjeta titulo="Métricas clave" descripcion="Los últimos 30 días.">
            <Renglones
              vacio="Las métricas no llegaron."
              filas={
                metricas
                  ? [
                      { clave: 'pago', nombre: 'Pago promedio', valor: fmtCOP(num(metricas.avg_ticket_30d)) },
                      { clave: 'promesa', nombre: 'Promesa promedio', valor: fmtCOP(num(metricas.avg_promise_amount_30d)) },
                      { clave: 'cumplidas', nombre: 'Promesas cumplidas', valor: fmtPorcentaje(num(metricas.promise_kept_pct_30d)) },
                      { clave: 'completas', nombre: 'Llamadas completas', valor: fmtPorcentaje(num(metricas.call_completion_pct_30d)) },
                    ]
                  : []
              }
            />
          </Tarjeta>

          <Tarjeta
            titulo="Experimento en curso"
            descripcion={experimento ? `Desde el ${fmtFecha(experimento.created_at)}.` : undefined}
            acciones={experimento ? <Pill tone={experimento.status === 'running' ? 'ok' : 'neutral'}>{estadoDelExperimento(experimento.status)}</Pill> : null}
          >
            {experimento ? (
              <div className="space-y-3">
                <p className="break-words text-body-sm font-medium text-fg">{experimento.name}</p>
                <Renglones
                  vacio="Todavía no tiene variantes."
                  filas={experimento.variants.map((v) => ({ clave: v.variant_id, nombre: v.label, valor: fmtNumero(num(v.assignment_count)) }))}
                />
              </div>
            ) : (
              <p className="text-body-sm text-fg-muted">No hay experimentos en curso.</p>
            )}
          </Tarjeta>

          <Tarjeta titulo="Pagos de las últimas 24 horas" descripcion={pagos.length > 0 ? contar(pagos.length, 'pago', 'pagos') : undefined}>
            {pagos.length === 0 ? (
              <p className="text-body-sm text-fg-muted">Todavía no hay pagos hoy.</p>
            ) : (
              <ul className="divide-y divide-border-faint">
                {pagos.map((t) => (
                  <li key={t.id} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-medium text-fg">{t.debtor_name}</p>
                      <p className="truncate text-caption text-fg-muted">{t.legal_name ?? 'Sin inmobiliaria'}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-mono text-body-sm tabular-nums text-fg">{fmtCOP(num(t.amount))}</span>
                      <Pill tone={tonoDelPago(t.status)}>{estadoDelPago(t.status)}</Pill>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>

          <Tarjeta titulo="Cumplimiento" descripcion="Eventos de los últimos 30 días.">
            <Renglones
              vacio="Sin eventos en 30 días."
              filas={cumplimiento.map((c) => ({ clave: c.event_type, nombre: eventoDeCumplimiento(c.event_type), valor: fmtNumero(num(c.count)) }))}
            />
          </Tarjeta>

          <Tarjeta titulo="Lo que la cobranza le deja a Leasefy">
            <Renglones
              vacio="Las cifras no llegaron."
              filas={
                pie
                  ? [
                      { clave: 'mrr', nombre: 'Ingreso mensual', valor: fmtCOP(num(pie.mrr)) },
                      { clave: 'arr', nombre: 'Al año', valor: fmtCOP(num(pie.arr)) },
                      { clave: 'llamadas', nombre: 'Llamadas este mes', valor: fmtNumero(num(pie.calls_this_month)) },
                      ...pie.channel_mix.map((c) => ({
                        clave: `canal-${c.call_type}`,
                        nombre: `Llamadas ${canalDeLaLlamada(c.call_type).toLowerCase()}`,
                        valor: fmtNumero(num(c.count)),
                      })),
                    ]
                  : []
              }
            />
          </Tarjeta>
        </div>
      </MasDetalles>
    </section>
  )
}
