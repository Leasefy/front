'use client'

import { PageHeader } from '@/components/admin/screen/PageHeader'

// ── Scaffold data (BACK.md §9 · FRONT.md §6.32) ───────────────────────────────

/**
 * STATIC SCAFFOLD — no fetch.
 * agent.agency_targets table does not exist yet (GAPS.md #3).
 * The "Meta Activos" bar on the dashboard home is 100% hardcoded/mock today.
 */

const MIGRATION_SQL = `-- agent/prisma/migrations/XXXX_agency_targets/migration.sql
CREATE TABLE agent.agency_targets (
  tenant_id              UUID         NOT NULL REFERENCES agent.agencies(tenant_id) ON DELETE CASCADE,
  period_year            INTEGER      NOT NULL,
  period_month           INTEGER      NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  target_active_debtors  INTEGER      NOT NULL DEFAULT 0,
  target_recovery_cop    BIGINT       NOT NULL DEFAULT 0,
  target_kept_pct        NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (target_kept_pct BETWEEN 0 AND 100),
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, period_year, period_month)
);

CREATE INDEX agency_targets_period_idx ON agent.agency_targets(period_year, period_month);
ALTER TABLE agent.agency_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent.agency_targets FORCE ROW LEVEL SECURITY;

CREATE POLICY agency_targets_tenant_isolation ON agent.agency_targets
  FOR ALL USING (tenant_id = (current_setting('app.tenant_id', TRUE))::uuid);`

const TODO_LIST = [
  'Aplicar migration SQL (ver abajo)',
  'CRUD endpoints GET/PUT /api/agency/:id/targets/:year/:month en agent (rol OWNER/ADMIN)',
  'Extender onboarding flow para que la inmobiliaria setee metas en step de policy',
  'Editor admin con monthly grid · alertas si tracking < target',
  'Wire home: la barra "Meta Activos" del HOY mega-card lee de acá en vez del 100K hardcoded',
  'Notif WhatsApp a OWNER si meta < 50% del mes a día 20',
]

const PREVIEW_ROWS = [
  { name: 'Inmobiliaria Demo SAS', td: 150, tr: '$25.0M', pct: 70, tracking: 92 },
  { name: 'Real Estate Bogotá',    td: 300, tr: '$48.0M', pct: 65, tracking: 58 },
  { name: 'Cartera Andina',        td: 80,  tr: '$12.0M', pct: 75, tracking: 110 },
]

function trackingTone(t: number): string {
  return t >= 100 ? 'pill-ok' : t >= 80 ? 'pill-warn' : 'pill-bad'
}

// ── Page ──────────────────────────────────────────────────────────────────────

/** /agency-targets — STATIC scaffold (BACK.md §9 · FRONT.md §6.32). */
export default function AgencyTargetsPage() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <PageHeader
        label="27 · targets"
        title="Metas mensuales por agencia"
        description="Recovery COP/mes objetivo · % cumplimiento promesas · # deudores activos meta. Alimenta la barra Meta Activos del home."
      />

      {/* Scaffold notice */}
      <div className="card p-5 border-l-4 border-l-warn mb-6">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-warn">
            scaffold · pendiente de build
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
            esfuerzo · ~2h agent + 1h admin
          </span>
        </div>
        <p className="text-sm text-fg mt-2">
          Tabla <code className="font-mono">agent.agency_targets</code> no existe en agent —
          Gap 3 del GAPS.md. Hoy la barra del home muestra <strong>100K hardcoded</strong> como
          placeholder. Los datos de tracking son 100% mock.
        </p>
        <p className="text-xs text-fg-muted mt-2">
          Trackeado en: <code className="font-mono">GAPS.md #3 — Tabla agency_targets</code>
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
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
          grid · agencia × mes 2026
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border font-mono text-[10px] text-fg-subtle uppercase tracking-[0.12em]">
                <th className="text-left  py-2 font-medium">Agencia</th>
                <th className="text-right py-2 font-medium">Target deudores</th>
                <th className="text-right py-2 font-medium">Target recovery</th>
                <th className="text-right py-2 font-medium">% kept target</th>
                <th className="text-right py-2 font-medium">Tracking</th>
              </tr>
            </thead>
            <tbody>
              {PREVIEW_ROWS.map((r) => (
                <tr key={r.name} className="border-b border-bg-border">
                  <td className="py-2.5 text-sm">{r.name}</td>
                  <td className="py-2.5 text-right tabular-nums font-mono text-xs">{r.td}</td>
                  <td className="py-2.5 text-right tabular-nums font-mono text-xs">{r.tr}</td>
                  <td className="py-2.5 text-right tabular-nums font-mono text-xs">{r.pct}%</td>
                  <td className="py-2.5 text-right">
                    <span className={`pill ${trackingTone(r.tracking)}`}>{r.tracking}%</span>
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
