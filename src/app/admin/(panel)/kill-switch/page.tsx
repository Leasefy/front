'use client'

import { PageHeader } from '@/components/admin/screen/PageHeader'
import { Pill } from '@/components/admin/Pill'
import { Card, MonoLabel } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

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
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Pausa de emergencia"
        description="Freno de emergencia por inmobiliaria: detiene llamadas y outreach del agente."
      />

      {/* Scaffold notice */}
      <Card className="p-5 ">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-warning">
            scaffold · pendiente de build
          </span>
          <MonoLabel>
            esfuerzo · ~1h agent + 2h back + 1h admin
          </MonoLabel>
        </div>
        <p className="text-sm text-fg mt-2">
          El endpoint <code className="font-mono">GET /api/v1/admin/kill-switch</code> no existe
          en la API admin (fuera de alcance por diseño — no figura en{' '}
          <code className="font-mono">ADMIN-API-CONTRACT.md</code>), y las columnas{' '}
          <code className="font-mono">agency_policies.cobranza_paused_*</code> tampoco.
          Cuando ship, esta pantalla lista agencias con actividad reciente y un botón
          Pausar/Reanudar auditado.
        </p>
        <p className="text-caption text-fg-muted mt-2">
          Trackeado en: <code className="font-mono">BACK.md §9 · kill-switch</code>
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
      <MonoLabel className="block mb-3">
        migration SQL · copy-paste a Supabase Studio
      </MonoLabel>
      <Card className="p-0 overflow-hidden">
        <pre className="bg-surface-muted p-4 font-mono text-[11px] leading-relaxed text-fg overflow-x-auto">
          {MIGRATION_SQL}
        </pre>
      </Card>

      {/* Preview (greyed out, non-interactive) */}
      <MonoLabel className="block mb-3">
        preview · cómo se va a ver cuando ship
      </MonoLabel>
      <Card className="p-5 opacity-60 pointer-events-none select-none">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead >Agencia</TableHead>
                <TableHead className="text-right">Calls 24h</TableHead>
                <TableHead className="text-right">Calls 7d</TableHead>
                <TableHead className="text-right">Failed abiertos</TableHead>
                <TableHead className="text-right">Escalaciones</TableHead>
                <TableHead >Estado</TableHead>
                <TableHead >Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SAMPLE_ROWS.map((r) => (
                <TableRow key={r.agency} className="border-b border-border">
                  <TableCell >{r.agency}</TableCell>
                  <TableCell className="text-right tabular-nums font-mono text-caption">{r.calls24h}</TableCell>
                  <TableCell className="text-right tabular-nums font-mono text-caption">{r.calls7d}</TableCell>
                  <TableCell className="text-right tabular-nums font-mono text-caption">{r.failed}</TableCell>
                  <TableCell className="text-right tabular-nums font-mono text-caption">{r.esc}</TableCell>
                  <TableCell className="text-center">
                    <Pill tone={r.paused ? 'bad' : 'ok'}>{r.paused ? 'pausada' : 'activa'}</Pill>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="outline" hideArrow className="text-caption" disabled>
                      {r.paused ? 'Reanudar' : 'Pausar'}
                    </Button>
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
