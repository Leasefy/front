'use client'

import { PageHeader } from '@/components/admin/screen/PageHeader'
import { Pill } from '@/components/admin/Pill'

// ── Scaffold data (BACK.md §9 · ADMIN-API-CONTRACT.md coverage table) ─────────

/**
 * STATIC SCAFFOLD — no fetch.
 * Neither GET /kill-switch nor POST /kill-switch/:tenantId exist in the admin
 * API (out of scope by design; not present in ADMIN-API-CONTRACT.md). The
 * agency_policies.cobranza_paused_* columns don't exist either. Build the
 * migration + endpoints first, then wire this screen.
 */

const MIGRATION_SQL = `-- agent/prisma/migrations/XXXX_kill_switch/migration.sql
ALTER TABLE agent.agency_policies
  ADD COLUMN cobranza_paused_at     TIMESTAMPTZ,
  ADD COLUMN cobranza_paused_by     TEXT,
  ADD COLUMN cobranza_paused_reason TEXT;`

const TODO_LIST = [
  'Aplicar migration SQL (columnas cobranza_paused_* en agency_policies)',
  'Back: GET /api/v1/admin/kill-switch — agencias + calls 24h/7d + failed states + escalaciones abiertas + paused_at',
  'Back: POST /api/v1/admin/kill-switch/:tenantId — toggle con logAdminAction("kill_switch.toggle")',
  'Agent: chequear cobranza_paused_at antes de iniciar cualquier llamada/outreach',
  'Front: reemplazar este scaffold por la tabla real con botón Pausar/Reanudar',
]

const SAMPLE_ROWS = [
  { agency: 'Inmobiliaria Demo SAS', calls24h: 14, calls7d: 96, failed: 0, esc: 1, paused: false },
  { agency: 'Real Estate Bogotá',    calls24h: 6,  calls7d: 41, failed: 2, esc: 0, paused: false },
  { agency: 'Cartera Andina',        calls24h: 0,  calls7d: 3,  failed: 0, esc: 0, paused: true },
]

// ── Page ──────────────────────────────────────────────────────────────────────

/** /kill-switch — STATIC scaffold: endpoint not built yet (BACK.md §9). */
export default function KillSwitchPage() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <PageHeader
        label="16 · kill-switch"
        title="Pausar agencia"
        description="Freno de emergencia por inmobiliaria: detiene llamadas y outreach del agente."
      />

      {/* Scaffold notice */}
      <div className="card p-5 border-l-4 border-l-warn mb-6">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-warn">
            scaffold · pendiente de build
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
            esfuerzo · ~1h agent + 2h back + 1h admin
          </span>
        </div>
        <p className="text-sm text-fg mt-2">
          El endpoint <code className="font-mono">GET /api/v1/admin/kill-switch</code> no existe
          en la API admin (fuera de alcance por diseño — no figura en{' '}
          <code className="font-mono">ADMIN-API-CONTRACT.md</code>), y las columnas{' '}
          <code className="font-mono">agency_policies.cobranza_paused_*</code> tampoco.
          Cuando ship, esta pantalla lista agencias con actividad reciente y un botón
          Pausar/Reanudar auditado.
        </p>
        <p className="text-xs text-fg-muted mt-2">
          Trackeado en: <code className="font-mono">BACK.md §9 · kill-switch</code>
        </p>
      </div>

      {/* Todo list */}
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
        qué se necesita para shipearla
      </div>
      <div className="card p-5 mb-6">
        <ol className="space-y-2 text-sm text-fg">
          {TODO_LIST.map((t, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-mono text-brand text-xs shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Migration SQL */}
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
        migration SQL · copy-paste a Supabase Studio
      </div>
      <div className="card p-0 mb-6 overflow-hidden">
        <pre className="bg-bg-dim p-4 font-mono text-[11px] leading-relaxed text-fg overflow-x-auto">
          {MIGRATION_SQL}
        </pre>
      </div>

      {/* Preview (greyed out, non-interactive) */}
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
        preview · cómo se va a ver cuando ship
      </div>
      <div className="card p-5 mb-6 opacity-60 pointer-events-none select-none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border font-mono text-[10px] text-fg-subtle uppercase tracking-[0.12em]">
                <th className="text-left py-2 font-medium">Agencia</th>
                <th className="text-right py-2 font-medium">Calls 24h</th>
                <th className="text-right py-2 font-medium">Calls 7d</th>
                <th className="text-right py-2 font-medium">Failed abiertos</th>
                <th className="text-right py-2 font-medium">Escalaciones</th>
                <th className="text-center py-2 font-medium">Estado</th>
                <th className="text-center py-2 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_ROWS.map((r) => (
                <tr key={r.agency} className="border-b border-bg-border">
                  <td className="py-2.5">{r.agency}</td>
                  <td className="py-2.5 text-right tabular-nums font-mono text-xs">{r.calls24h}</td>
                  <td className="py-2.5 text-right tabular-nums font-mono text-xs">{r.calls7d}</td>
                  <td className="py-2.5 text-right tabular-nums font-mono text-xs">{r.failed}</td>
                  <td className="py-2.5 text-right tabular-nums font-mono text-xs">{r.esc}</td>
                  <td className="py-2.5 text-center">
                    <Pill tone={r.paused ? 'bad' : 'ok'}>{r.paused ? 'pausada' : 'activa'}</Pill>
                  </td>
                  <td className="py-2.5 text-center">
                    <button className="btn text-xs" disabled>
                      {r.paused ? 'Reanudar' : 'Pausar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
