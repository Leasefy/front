'use client'

import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { Pagination } from '@/components/admin/screen/Pagination'
import { useClientPagination } from '@/lib/admin/use-client-pagination'
import { Pill } from '@/components/admin/Pill'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'

const PAGE_SIZE = 50

// ─── Types (co-located, per FRONT.md §6.19) ────────────────────────────────

/** Heatmap cell: call volume per (dow × hour) in the last 30d. */
interface HeatmapCellRow {
  /** 0=Sun, 1=Mon, …, 6=Sat (EXTRACT(dow) in America/Bogota). */
  dow: number | string
  /** 0–23 (EXTRACT(hour) in America/Bogota). */
  hour: number | string
  /** Call count for this bucket. */
  count: number | string
}

interface ViolationRow {
  id: string
  timestamp: string
  event_type: string
  tenant_id: string | null
  legal_name: string | null
  debtor_id: string | null
  debtor_name: string | null
  channel: string | null
  details: Record<string, unknown> | null
}

/**
 * GET /api/v1/admin/ley-2300 (ADMIN-API-CONTRACT.md — Ley 2300).
 * 30d window, America/Bogota. Counts arrive as numeric strings.
 */
interface Ley2300Response {
  stats: {
    total_calls: string
    total_violations: string
    debtors_affected: string
    tenants_affected: string
  }
  heatmap: HeatmapCellRow[]
  violations: ViolationRow[]
}

// ─── Ley 2300/2023 Art. 7 window logic (BACK.md §7.2) ────────────────────
// Kept client-side per BACK.md note ("can stay client-side OR move here").

/**
 * Returns true when the given dow/hour slot is inside the legal contact window.
 * @param dow  0=Sun, 1=Mon…5=Fri, 6=Sat
 * @param hour 0–23
 */
function isAllowed(dow: number, hour: number): boolean {
  // Mon–Fri: 07:00–19:00
  if (dow >= 1 && dow <= 5) return hour >= 7 && hour < 19
  // Sat: 08:00–15:00
  if (dow === 6) return hour >= 8 && hour < 15
  // Sun: prohibited
  return false
}

// ─── Constants ─────────────────────────────────────────────────────────────

const DAYS = [
  { dow: 1, name: 'Lun' },
  { dow: 2, name: 'Mar' },
  { dow: 3, name: 'Mié' },
  { dow: 4, name: 'Jue' },
  { dow: 5, name: 'Vie' },
  { dow: 6, name: 'Sáb' },
  { dow: 0, name: 'Dom' },
]

const HOURS = Array.from({ length: 24 }, (_, h) => h)

const DAY_NAMES: Record<number, string> = {
  0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb',
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function HeatmapCell({
  n,
  max,
  allowed,
  dow,
  hour,
}: {
  n: number
  max: number
  allowed: boolean
  dow: number
  hour: number
}) {
  const intensity = max > 0 ? Math.min(1, n / max) : 0
  let bg = '#EFEFEC' // empty / bg-hover equivalent

  if (n > 0) {
    bg = allowed
      ? `rgba(0, 168, 120, ${0.15 + intensity * 0.6})`    // ok-ish green
      : `rgba(211, 53, 71, ${0.25 + intensity * 0.65})`   // bad red (violation)
  } else if (!allowed) {
    bg = '#F7DCE0' // very light red — visually marks prohibited slot
  }

  const tooltip = `${DAY_NAMES[dow]} ${String(hour).padStart(2, '0')}:00 · ${n} intento${n === 1 ? '' : 's'} · ${
    allowed ? 'permitido' : 'fuera de horario'
  }`

  return (
    <div
      title={tooltip}
      className="w-7 h-7 border border-bg-border flex items-center justify-center text-[9px] font-mono tabular-nums text-fg"
      style={{ background: bg }}
    >
      {n > 0 ? n : ''}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

/** /ley-2300 — Compliance window monitoring (BACK.md §8.15 + §7.2 · FRONT.md §6.19). */
export default function Ley2300Page() {
  const { data, isLoading, error } = useApiQuery<Ley2300Response>(
    (signal) => adminApi('/ley-2300', { signal }),
    [],
  )

  const heatmapMap = new Map<string, number>()
  for (const cell of data?.heatmap ?? []) {
    heatmapMap.set(`${Number(cell.dow)}-${Number(cell.hour)}`, Number(cell.count) || 0)
  }
  const maxN = Math.max(1, ...Array.from(heatmapMap.values()))

  const violations = data?.violations ?? []
  /* Violaciones de los últimos 30 días: sin tope. El contador del encabezado
     sigue mostrando el total, no el de la página. */
  const violationsPaging = useClientPagination(violations, PAGE_SIZE)

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <PageHeader
        label="compliance"
        title="Ventanas de contacto"
        description="Ley 2300/2023 Art. 7 · Lun-Vie 07:00–19:00 · Sáb 08:00–15:00 · Dom/festivos prohibido · 30 días."
      />

      {isLoading && <LoadingBlock />}
      {!isLoading && error && <ErrorBlock error={error} />}

      {data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <KpiCard
              label="Llamadas · 30d"
              value={Number(data.stats.total_calls) || 0}
              hint="volumen total"
            />
            <KpiCard
              label="Violaciones · 30d"
              value={Number(data.stats.total_violations) || 0}
              hint="schedule / frequency"
              tone={Number(data.stats.total_violations) > 0 ? 'bad' : 'ok'}
            />
            <KpiCard
              label="Deudores afectados"
              value={Number(data.stats.debtors_affected) || 0}
              hint="con ≥1 violación"
            />
            <KpiCard
              label="Agencias afectadas"
              value={Number(data.stats.tenants_affected) || 0}
              hint="con ≥1 violación"
              tone={Number(data.stats.tenants_affected) > 0 ? 'warn' : 'ok'}
            />
          </div>

          {/* Heatmap */}
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
            heatmap · intentos × hora local Bogotá · 30d
          </div>
          <div className="card p-5 overflow-x-auto mb-6">
            <table className="text-xs border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="text-left pr-3 pb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle whitespace-nowrap">
                    día / hora
                  </th>
                  {HOURS.map((h) => (
                    <th
                      key={h}
                      className="pb-2 font-mono text-[9px] text-fg-subtle tabular-nums text-center w-7"
                    >
                      {String(h).padStart(2, '0')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((d) => (
                  <tr key={d.dow}>
                    <td className="pr-3 py-0.5 font-mono text-[11px] text-fg-muted whitespace-nowrap">
                      {d.name}
                    </td>
                    {HOURS.map((h) => {
                      const n = heatmapMap.get(`${d.dow}-${h}`) ?? 0
                      const allowed = isAllowed(d.dow, h)
                      return (
                        <td key={h} className="p-0">
                          <HeatmapCell n={n} max={maxN} allowed={allowed} dow={d.dow} hour={h} />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-6 text-xs font-mono text-fg-muted">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border border-bg-border" style={{ background: 'rgba(0,168,120,0.5)' }} />
                permitido
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border border-bg-border" style={{ background: 'rgba(211,53,71,0.5)' }} />
                fuera de horario (violación si N &gt; 0)
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-bg-border border border-bg-border" />
                0 intentos / permitido
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border border-bg-border" style={{ background: '#F7DCE0' }} />
                0 intentos / prohibido
              </div>
            </div>
          </div>

          {/* Violations table */}
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
            violaciones recientes · 30d ({violations.length})
          </div>
          {violations.length === 0 ? (
            <div className="card p-6 text-center text-fg-muted text-sm">
              Sin violaciones registradas. Todo dentro del horario.
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm table-zebra">
                <thead>
                  <tr className="border-b border-bg-border">
                    {['Cuándo', 'Tipo', 'Canal', 'Deudor', 'Agencia', 'Detalles'].map((h) => (
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
                  {(violationsPaging.pageRows ?? []).map((v) => (
                    <tr key={v.id} className="border-b border-bg-border last:border-0">
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-xs text-fg-muted tabular-nums">
                        {fmtDateTime(v.timestamp)}
                      </td>
                      <td className="px-3 py-2.5">
                        <Pill tone={v.event_type.includes('inbound') ? 'muted' : 'bad'}>
                          {v.event_type}
                        </Pill>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-fg-muted uppercase tracking-[0.12em]">
                        {v.channel ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 truncate max-w-[180px]">{v.debtor_name ?? '—'}</td>
                      <td className="px-3 py-2.5 text-fg-muted text-xs truncate max-w-[160px]">
                        {v.legal_name ?? '—'}
                      </td>
                      <td
                        className="px-3 py-2.5 text-xs text-fg-muted font-mono max-w-[260px] truncate"
                        title={v.details ? JSON.stringify(v.details) : undefined}
                      >
                        {v.details ? JSON.stringify(v.details).slice(0, 100) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            page={violationsPaging.page}
            total={violationsPaging.total}
            pageSize={PAGE_SIZE}
            onPage={violationsPaging.setPage}
          />
        </>
      )}
    </div>
  )
}
