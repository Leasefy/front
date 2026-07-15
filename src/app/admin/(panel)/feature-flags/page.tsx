'use client'

import { PageHeader } from '@/components/admin/screen/PageHeader'

// ── Scaffold data (BACK.md §9 · FRONT.md §6.32) ───────────────────────────────

/**
 * STATIC SCAFFOLD — no fetch.
 * agent.feature_flags table and agent.is_feature_enabled() function do not
 * exist yet. No endpoint is wired; hitting /keys would 404.
 * Build the migration below first, then wire the screen.
 */

const MIGRATION_SQL = `-- agent/prisma/migrations/XXXX_feature_flags/migration.sql
CREATE TABLE agent.feature_flags (
  key          TEXT          NOT NULL,
  tenant_id    UUID          NOT NULL REFERENCES agent.agencies(tenant_id) ON DELETE CASCADE,
  enabled      BOOLEAN       NOT NULL DEFAULT FALSE,
  payload      JSONB         NOT NULL DEFAULT '{}'::jsonb,
  rollout_pct  INTEGER       NOT NULL DEFAULT 0 CHECK (rollout_pct BETWEEN 0 AND 100),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_by   TEXT,
  PRIMARY KEY (key, tenant_id)
);

CREATE INDEX feature_flags_tenant_idx ON agent.feature_flags(tenant_id);
ALTER TABLE agent.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent.feature_flags FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION agent.is_feature_enabled(p_key TEXT, p_tenant UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT enabled FROM agent.feature_flags
      WHERE key = p_key AND tenant_id = p_tenant),
    FALSE
  );
$$ LANGUAGE SQL STABLE;`

const TODO_LIST = [
  'Aplicar migration SQL (ver abajo) + ALTER en .planning del agent',
  'Helper agent.is_feature_enabled(key, tenant) ya incluido en la migration',
  'Server action setFlag(key, tenant_id, enabled, payload) con admin re-check + logAdminAction',
  'UI grid agencias × flags con toggle visual + filtro por estado',
  'Audit trail en agent.audit_log con action="feature_flag.toggle"',
]

const PREVIEW_KEYS = [
  { key: 'inferred_profile_v2',  desc: 'Usa profile inference Phase 17.2 en agent calls' },
  { key: 'whatsapp_top3_alert',  desc: 'Daily report top-3 deudores por WhatsApp (D-13)' },
  { key: 'cartera_payment_plan', desc: 'Permite ofrecer planes de pago en S2/S3' },
  { key: 'english_calls',        desc: 'Habilita prompts EN para deudores anglo' },
]

const SAMPLE_AGENCIES = ['Inmobiliaria Demo SAS', 'Real Estate Bogotá', 'Cartera Andina']

// ── Page ──────────────────────────────────────────────────────────────────────

/** /feature-flags — STATIC scaffold (BACK.md §9 · FRONT.md §6.32). */
export default function FeatureFlagsPage() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <PageHeader
        label="25 · feature-flags"
        title="Toggles per-tenant"
        description="Flags por inmobiliaria: experimentos, features beta, kill-switches granulares."
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
          No existe tabla <code className="font-mono">agent.feature_flags</code> todavía ni la
          función <code className="font-mono">agent.is_feature_enabled()</code>. Cuando ship,
          esta pantalla muestra un grid agencias × flags con toggle visual.
        </p>
        <p className="text-xs text-fg-muted mt-2">
          Trackeado en: <code className="font-mono">HANDOFF.md deuda · feature-flags scaffold</code>
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
          grid agencias × flags
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border font-mono text-[10px] text-fg-subtle uppercase tracking-[0.12em]">
                <th className="text-left py-2 font-medium">Agencia</th>
                {PREVIEW_KEYS.map((f) => (
                  <th key={f.key} className="text-center py-2 font-medium" title={f.desc}>
                    {f.key.split('_').slice(0, 2).join(' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SAMPLE_AGENCIES.map((a) => (
                <tr key={a} className="border-b border-bg-border">
                  <td className="py-2.5 text-sm">{a}</td>
                  {PREVIEW_KEYS.map((f, i) => (
                    <td key={f.key} className="text-center py-2.5">
                      <div
                        className={`inline-block w-8 h-4 rounded-none ${
                          i % 2 === 0 ? 'bg-ok' : 'bg-fg-dim'
                        }`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
