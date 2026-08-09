'use client'

import { PageHeader } from '@/components/admin/screen/PageHeader'

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
    body:    'Te ofrecemos un plan: {{months}} cuotas de {{installment_cop}}. ¿Aceptás?',
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
    <div className="p-6 lg:p-8 max-w-5xl">
      <PageHeader
        label="22 · templates"
        title="Editor multi-idioma"
        description="WhatsApp / Email / SMS templates con version history. Aprobación Meta Cloud API integrada."
      />

      {/* Scaffold notice */}
      <div className="card p-5 border-l-4 border-l-warn mb-6">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-warn">
            scaffold · pendiente de build
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
            esfuerzo · ~4h agent + 2h admin
          </span>
        </div>
        <p className="text-sm text-fg mt-2">
          Hoy los templates viven en{' '}
          <code className="font-mono">src/whatsapp/templates/&#123;es,en&#125;/*.ts</code> del
          agent service. Editarlos requiere PR + redeploy. La tabla{' '}
          <code className="font-mono">agent.message_templates</code> y el enum{' '}
          <code className="font-mono">agent.template_channel</code> no existen todavía.
        </p>
        <p className="text-xs text-fg-muted mt-2">
          Trackeado en:{' '}
          <code className="font-mono">Phase 17.6 templates en filesystem · pendiente migrar a DB</code>
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
        <pre className="bg-surface-muted p-4 font-mono text-[11px] leading-relaxed text-fg overflow-x-auto">
          {MIGRATION_SQL}
        </pre>
      </div>

      {/* Preview (greyed out, non-interactive) */}
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
        preview · cómo se va a ver cuando ship
      </div>
      <div className="card p-5 mb-6 opacity-60 pointer-events-none select-none">
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
          grid · key × lang
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border font-mono text-[10px] text-fg-subtle uppercase tracking-[0.12em]">
                <th className="text-left py-2 font-medium">Key</th>
                <th className="text-left py-2 font-medium">Lang</th>
                <th className="text-left py-2 font-medium">Channel</th>
                <th className="text-left py-2 font-medium">Body (preview)</th>
                <th className="text-left py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {PREVIEW_TEMPLATES.map((t, i) => (
                <tr key={i} className="border-b border-bg-border">
                  <td className="py-2.5 font-mono text-[11px]">{t.key}</td>
                  <td className="py-2.5">
                    <span className="pill text-[10px]">{t.lang}</span>
                  </td>
                  <td className="py-2.5 font-mono text-[11px] text-fg-muted">{t.channel}</td>
                  <td
                    className="py-2.5 text-xs text-fg-muted truncate"
                    style={{ maxWidth: '320px' }}
                  >
                    {t.body}
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`pill text-[10px] ${
                        t.status === 'approved' ? 'pill-ok' : 'pill-warn'
                      }`}
                    >
                      {t.status}
                    </span>
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
