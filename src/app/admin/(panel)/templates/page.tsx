'use client'

import { PageHeader } from '@/components/admin/screen/PageHeader'
import { Card, CodeBlock, MonoLabel, StatusBadge } from '@leasefy/cadence'
import { Pill } from '@/components/admin/Pill'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { legible } from '@/lib/admin/textos-del-admin'

// ── Scaffold data (BACK.md §9 · FRONT.md §6.32) ───────────────────────────────

/**
 * STATIC SCAFFOLD — no fetch.
 * agent.message_templates table and agent.template_channel enum do not exist yet.
 * Templates today live in the agent-service filesystem under
 * src/whatsapp/templates/{es,en}/*.ts — editing requires a PR + redeploy.
 */

const MIGRATION_SQL = `-- agent/prisma/migrations/XXXX_message_templates/migration.sql
CREATE TYPE agent.template_channel AS ENUM ('whatsapp', 'email', 'sms');

CREATE TABLE agent.message_templates (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  key             TEXT         NOT NULL,           -- e.g. 'cartera.s2.reminder'
  lang            TEXT         NOT NULL,           -- 'es' | 'en' | 'wayuunaiki' | ...
  channel         agent.template_channel NOT NULL DEFAULT 'whatsapp',
  body            TEXT         NOT NULL,
  variables       TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[], -- '{{full_name}}', '{{amount_cop}}'
  version         INTEGER      NOT NULL DEFAULT 1,
  meta_template_id TEXT,                            -- Meta Cloud API ID when approved
  approved_at     TIMESTAMPTZ,                      -- NULL = draft
  approved_by     TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (key, lang, channel, version)
);

CREATE INDEX message_templates_key_lang_idx ON agent.message_templates(key, lang);

-- seed via scripts/import-fs-templates-to-db.mjs`

const TODO_LIST = [
  'Aplicar migration SQL (ver abajo) en agent',
  'Script scripts/import-fs-templates-to-db.mjs para seed desde src/whatsapp/templates/',
  'Editor en admin: mono textarea + var-injection helper + diff vs versión aprobada',
  'Server action submitForApproval que llama Meta Cloud API (/messages templates POST)',
  'Server action approveTemplate (Meta webhook → approved_at) con logAdminAction',
  'Hot-reload en agent: cache TTL 5min para reflejar cambios sin redeploy',
]

const PREVIEW_TEMPLATES = [
  {
    key:     'cartera.s1.reminder',
    lang:    'es',
    channel: 'whatsapp',
    body:    'Hola {{full_name}}, recordatorio: tu canon de {{amount_cop}} venció hace {{days_late}} días.',
    status:  'approved',
  },
  {
    key:     'cartera.s1.reminder',
    lang:    'en',
    channel: 'whatsapp',
    body:    'Hi {{full_name}}, friendly reminder: your rent of {{amount_cop}} is {{days_late}} days late.',
    status:  'approved',
  },
  {
    key:     'cartera.s2.payment_plan',
    lang:    'es',
    channel: 'whatsapp',
    body:    'Te ofrecemos un plan: {{months}} cuotas de {{installment_cop}}. ¿Aceptas?',
    status:  'approved',
  },
  {
    key:     'cartera.s3.prejudicial',
    lang:    'es',
    channel: 'whatsapp',
    body:    'Última oportunidad antes de iniciar gestión jurídica. {{balance_cop}} adeudado.',
    status:  'draft',
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

/** /templates — STATIC scaffold (BACK.md §9 · FRONT.md §6.32). */
export default function TemplatesPage() {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Plantillas"
        description="Las plantillas de WhatsApp, correo y SMS con su historial de versiones y la aprobación de Meta."
      />

      {/* Scaffold notice */}
      <Card className="space-y-3 p-6">
        <div className="flex items-baseline justify-between gap-4">
          <StatusBadge tone="warning">Sin construir todavía</StatusBadge>
          <MonoLabel>Esfuerzo · ~4 h en el micro + 2 h en el admin</MonoLabel>
        </div>
        <p className="text-sm text-fg mt-2">
          Hoy los templates viven en{' '}
          <code className="font-mono">src/whatsapp/templates/&#123;es,en&#125;/*.ts</code> del
          agent service. Editarlos requiere PR + redeploy. La tabla{' '}
          <code className="font-mono">agent.message_templates</code> y el enum{' '}
          <code className="font-mono">agent.template_channel</code> no existen todavía.
        </p>
        <p className="text-caption text-fg-muted mt-2">
          Trackeado en:{' '}
          <code className="font-mono">Phase 17.6 templates en filesystem · pendiente migrar a DB</code>
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
          grid · key × lang
        </MonoLabel>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead >Key</TableHead>
                <TableHead >Lang</TableHead>
                <TableHead >Channel</TableHead>
                <TableHead >Body (preview)</TableHead>
                <TableHead >Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PREVIEW_TEMPLATES.map((t, i) => (
                <TableRow key={i} className="border-b border-border">
                  <TableCell className="font-mono text-caption">{t.key}</TableCell>
                  <TableCell>
                    <Pill tone="neutral">{t.lang}</Pill>
                  </TableCell>
                  <TableCell className="font-mono text-caption text-fg-muted">{t.channel}</TableCell>
                  <TableCell
                    className="py-2.5 text-caption text-fg-muted truncate"
                    style={{ maxWidth: '320px' }}
                  >
                    {t.body}
                  </TableCell>
                  <TableCell>
                    <Pill tone={t.status === 'approved' ? 'ok' : 'warn'}>{t.status === 'approved' ? 'Aprobada' : legible(t.status)}</Pill>
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
