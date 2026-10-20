'use client'

import { PageHeader } from '@/components/admin/screen/PageHeader'
import { Card, CodeBlock, MonoLabel, StatusBadge } from '@leasefy/cadence'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pill } from '@/components/admin/Pill'

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
  return t >= 100 ? 'ok' : t >= 80 ? 'warn' : 'bad'
}

// ── Page ──────────────────────────────────────────────────────────────────────

/** /agency-targets — STATIC scaffold (BACK.md §9 · FRONT.md §6.32). */
export default function AgencyTargetsPage() {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Metas"
        description="Las metas de cada inmobiliaria: recaudo del mes, promesas cumplidas y deudores activos. Alimentan la barra de metas del Resumen."
      />

      {/* Scaffold notice */}
      <Card className="space-y-3 p-6">
        <div className="flex items-baseline justify-between gap-4">
          <StatusBadge tone="warning">Sin construir todavía</StatusBadge>
          <MonoLabel>Esfuerzo · ~2 h en el micro + 1 h en el admin</MonoLabel>
        </div>
        <p className="text-sm text-fg mt-2">
          Tabla <code className="font-mono">agent.agency_targets</code> no existe en agent —
          Gap 3 del GAPS.md. Hoy la barra del home muestra <strong>100K hardcoded</strong> como
          placeholder. Los datos de tracking son 100% mock.
        </p>
        <p className="text-caption text-fg-muted mt-2">
          Trackeado en: <code className="font-mono">GAPS.md #3 — Tabla agency_targets</code>
        </p>
      </Card>

      {/* Todo list */}
      <MonoLabel className="block mb-3">
        qué se necesita para shipearla
      </MonoLabel>
      <Card className="p-5">
        <ol className="space-y-2 text-sm text-fg">
          {TODO_LIST.map((t, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-mono text-primary text-caption shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </Card>

      {/* Migration SQL */}
      <CodeBlock language="sql" filename="Migración (la aplica Víctor)" code={MIGRATION_SQL} />

      {/* Preview (greyed out, non-interactive) */}
      <MonoLabel className="block mb-3">
        preview · cómo se va a ver cuando ship
      </MonoLabel>
      <Card className="p-5 opacity-60 pointer-events-none select-none">
        <MonoLabel className="block mb-3">
          grid · agencia × mes 2026
        </MonoLabel>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead >Agencia</TableHead>
                <TableHead className="text-right">Target deudores</TableHead>
                <TableHead className="text-right">Target recovery</TableHead>
                <TableHead className="text-right">% kept target</TableHead>
                <TableHead className="text-right">Tracking</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PREVIEW_ROWS.map((r) => (
                <TableRow key={r.name} className="border-b border-border">
                  <TableCell className="text-sm">{r.name}</TableCell>
                  <TableCell className="text-right tabular-nums font-mono text-caption">{r.td}</TableCell>
                  <TableCell className="text-right tabular-nums font-mono text-caption">{r.tr}</TableCell>
                  <TableCell className="text-right tabular-nums font-mono text-caption">{r.pct}%</TableCell>
                  <TableCell className="text-right">
                    <Pill tone={trackingTone(r.tracking)}>{r.tracking} %</Pill>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
