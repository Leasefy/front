# Capability Map — `~/rent/admin` (Leasefy / nest INTERNAL ops backoffice)

> Repo mapped: `/Users/nicolasgarcia/rent/admin`
> Date: 2026-05-29 · Skeptical read of source, not the HANDOFF doc.

## TL;DR — what this app actually is (disambiguation)

This is the **Leasefy-INTERNAL ops / backoffice console**, NOT an agency-facing ERP/CRM.
It is a cross-tenant **observability + control panel over the AI _cobranza_ (collections)
microservice** that lives in `~/rent/agent`. Access is locked to `ADMIN_EMAILS` (Nicolás +
Victor) via Supabase magic-link + email allowlist — enforced in `src/app/(admin)/layout.tsx`
(redirect to `/login` if `!isAdminEmail`) and `src/lib/supabase/middleware.ts`.

- **Stack**: Next.js 14 App Router + TypeScript + Tailwind (port 3100). No state mgmt lib.
- **Data layer**: direct **`node-postgres` (`pg`)** pool against the *same* Supabase Postgres
  the agent service writes, with `search_path=agent,public` (`src/lib/db.ts`). It reads the
  `agent.*` schema **cross-tenant, bypassing RLS by connection string** — this is the whole
  point of the repo (a privileged ops view). Plus the **Vapi REST API** (`src/lib/vapi.ts`)
  for voice-assistant prompts + call history, and `@supabase/supabase-js` admin client for
  the user roster.
- **27 routes** (Nav codes 00–27, `src/components/Nav.tsx`). ~18 are real DB-backed,
  3–4 are scaffolds with copy-paste migration SQL + mock preview, 1 is a functional
  scaffold (UI real, write action disabled pending a migration).
- **Domain scope is almost entirely D3 (cobranza) + compliance/ops + billing.** It touches
  the ERP+CRM+Autopilot vision only through the _collections vertical_ and platform billing.
  **It is NOT the ERP/CRM/Autopilot home** — none of the agency operational modules
  (facturación, contratos, propiedades, propietarios, PQRS, terceros, conciliación, etc.)
  live here. Those belong in the agency-facing frontend (`~/rent/mvp`) and/or the agent svc.

### Overlap / disambiguation flag
This backoffice **shadows several agency-facing concerns** but only as a *cross-tenant
read/control view for Leasefy staff*, never as the tenant's own tool:
- It surfaces **payments / disbursements** (`agent.payments` incl. `disbursement_status`,
  `disbursed_amount`, `fee_amount`, `invoice_cufe`) → overlaps D3/D4 — but it is an internal
  funnel monitor, not an agency egresos workflow.
- It surfaces **MRR/ARR billing per agency** (`agent.billing_events`) → this is **Leasefy
  billing the agencies** (platform revenue), NOT agency-issued facturación to owners/tenants.
  Do not confuse with D2.
- It edits **Vapi voice-agent prompts** and pricing/policy config — Leasefy-operator levers,
  not agency self-service.
So: if the question is "where does the agency-facing ERP+CRM+Autopilot live?", the answer is
**not here**. This repo only proves that a real cobranza/payments/compliance data model
already exists in `agent.*` that the ERP could build on.

---

## Domain-by-domain verdicts

### D1 — Conciliación bancaria
- **Status: MISSING**
- **Evidence**: No bank-file import, no movement-matching, no `concepto/tercero` reconciliation
  anywhere. `agent.payments` is gateway-based (Wompi/Bold) not bank-statement-based. Grep of
  `src/` shows no Bancolombia / extracto / conciliación logic.
- **Note**: Payment *identification* here = Wompi/Bold webhook status, not bank reconciliation.
  Out of scope for this internal tool.

### D2 — Facturación (venta / compra / DIAN / NC-ND)
- **Status: PARTIAL (peripheral, internal billing only)**
- **Evidence**: `/billing` (`src/app/(admin)/billing/page.tsx`) aggregates `agent.billing_events`
  into MRR/ARR — this is **Leasefy charging agencies**, not agency electronic invoicing.
  `agent.payments.invoice_cufe` column is *selected* in `/payments` (a CUFE field exists in the
  data model) but there is no invoice generation, DIAN flow, IVA logic, or notas débito/crédito
  in this repo. `/pricing-config` reads `agent.agency_policies` billing models.
- **Note**: The only "facturación" here is platform self-billing telemetry. Real DIAN/FE
  facturación for agencies does NOT exist in this repo. The `invoice_cufe` column hints the
  agent service may persist a CUFE elsewhere — investigate `~/rent/agent`, not here.

### D3 — Recaudo & Cobranza
- **Status: HAVE-REAL (this is the repo's core)**
- **Evidence**:
  - `/cartera` + `/cartera/[stage]` — real Phase-17.8 collections **state machine**: queries
    `agent.debtor_states` (current_stage S0..S5/SX), `agent.cartera_stage_transitions`
    (append-only), `agent.debtors`. Buckets, funnel, recent transitions, next cadence action.
  - `/payments` — real Wompi/Bold funnel from `agent.payments` (approved/pending/declined/
    refunded, fees, disbursement, 30d KPIs, "approved >3d not disbursed" alert).
  - `/approvals` (+`[id]`) — real T-323/2024 reviewable-decision queue from
    `agent.automated_decisions WHERE reviewable=true`, with server-action `decideApproval`
    (admin re-check + atomic UPDATE gated on `reviewed_at IS NULL`).
  - `/escalations` (+`[id]`) — real human-handoff kanban with `assignEscalation` /
    `resolveEscalation` server actions.
  - `/calls` (+`[id]`) — cross-tenant Vapi call history w/ transcript, recording, QA, compliance
    flags (`src/lib/vapi.ts` `listCalls`/`getCall`).
  - `/debtors` — audited cross-tenant PII search over `agent.debtors` (`debtors/actions.ts`
    `searchDebtors()` writes `audit_log.action='debtor.search'` BEFORE returning data).
  - `/cartera` cadence cron references (`cartera-cadence-cron`), pre-jurídico/jurídico stages.
- **Note**: This is a *monitoring + supervision* layer over an already-built autonomous voice
  collections engine (the agent svc owns the actual calling/escalation). Real data, real
  state machine, real write actions. Mora-window enforcement also present (see D-Compliance).

### D4 — Egresos a propietarios (dispersión)
- **Status: PARTIAL (internal monitor of dispersal, no egreso workflow)**
- **Evidence**: `/payments` reads `agent.payments.disbursement_status`, `disbursed_amount`,
  `disbursed_at`, `fee_amount`, and alerts on "approved >3d sin desembolsar — revisar el cron
  daily-dispersion". `agent.agency_policies` has `success_fee_pct`, `base_fee_cop` etc.
- **Note**: There IS a disbursement data model + a daily-dispersion cron (owned by the agent
  svc). But there is **no comprobante de egreso generation, no neto computation per propietario
  (canon − comisión − IVA), no owner bank-account management** in this repo. It only *watches*
  the dispersal funnel. D4 as the agency vision describes it = MISSING here.

### D5 — Contratos & Firma
- **Status: MISSING**
- **Evidence**: No contract templates, e-signature (Abaco), renewal, or canon-increment logic.
  No grep hits for contrato/firma/Abaco/renovación in `src/`.
- **Note**: Entirely out of scope for the cobranza backoffice.

### D6 — Gestión documental
- **Status: MISSING**
- **Evidence**: No document upload/classify/expiry/clause-detection. The only "documents" are
  `legal_packages` (collections legal dossiers) surfaced indirectly in `/failed-states`
  (`legal_packages PENDING_RECEIPT > 72h`) — that's a collections legal artifact, not agency
  document management.
- **Note**: N/A-adjacent; the legal_packages signal is a cobranza ops inbox item, not D6.

### D7 — CRM / Captación / Propiedades
- **Status: MISSING**
- **Evidence**: No property capture, ficha, leads, asesor assignment, portales. `agent.agencies`
  (tenants) and `agent.debtors` exist, but there is no property/listing entity anywhere here.
- **Note**: CRM/property is the agency frontend's job, not this internal tool.

### D8 — Creación de propiedades por app móvil + audio
- **Status: N/A**
- **Evidence**: Web-only desktop ops console (port 3100, 256px sidebar Nav). No mobile capture,
  no audio→IA ficha pipeline.
- **Note**: Not this repo's concern.

### D9 — PQRS / Solicitudes
- **Status: MISSING**
- **Evidence**: No PQRS/solicitudes registry. `/failed-states` is an *ops* inbox (failed
  central_reports, failed crm_sync_events, stale legal_packages) — internal system failures,
  not tenant/owner PQRS.
- **Note**: Distinct concept; do not count `/failed-states` as PQRS.

### D10 — Creación de terceros automatizada
- **Status: MISSING**
- **Evidence**: `agent.debtors` rows exist and are searched, but there is no tercero-creation
  flow (foto cédula/RUT/audio → IA extract → prefill). Debtors are ingested by the agent svc.
- **Note**: Read-only consumer of the terceros (debtors) the agent svc creates.

### D11 — Informes & Insights
- **Status: PARTIAL (internal ops reporting + CSV exports; cobranza-scoped, not agency reports)**
- **Evidence**:
  - `/audits` + `/audits/export.csv` (`route.ts`) — compliance_events filterable + CSV export.
  - `/audit-explorer` — `audit_log` search for SIC/SAGRILAFT (action LIKE + cédula + dates).
  - `/qa` — call QA score distribution + flag rate + review queue (calls <70 score).
  - `/costs` — Vapi + Claude burn per tenant from `agent.agent_execution_metrics.estimated_cost_usd`
    + `calls.agent_summary->>'vapi_cost'`, ROI per agency.
  - `/billing`, `/onboarding` (funnel), `/ab-tests` (`experiments`), home `/` KPI dashboard.
  - Proactive-insight flavor exists (alerts: "approved >3d sin desembolsar", "violaciones Ley
    2300", failed-states inbox).
- **Note**: These are **Leasefy-operator** reports about the cobranza platform, not the
  agency-facing report suite (cartera/helisa/certificado tributario/facturas de compra). No
  Helisa export, no certificado tributario here. Partial only as "internal analytics exist."

### D12 — Agenda interna
- **Status: MISSING**
- **Evidence**: No calendar/agenda. `/inngest-monitor` lists 9 crons with freshness inferred
  from Postgres side-effects — that's a *cron monitor*, not a user-facing agenda.
- **Note**: Cron observability ≠ agenda tied to system events.

### D13 — Notificaciones automáticas
- **Status: PARTIAL (visibility/registry of notifications, no agency notification engine)**
- **Evidence**: `/templates` (SCAFFOLD) previews WhatsApp/Email/SMS multi-lang templates but
  **the table doesn't exist yet** — migration SQL provided (`agent.message_templates`), preview
  data is hardcoded mock (`PREVIEW_TEMPLATES`). `/opt-outs` reads real
  `agent.compliance_events` opt-out events + `agent.debtors.opt_out_channels`. The actual
  multi-channel sending (Vapi voice, WhatsApp via 360dialog) lives in the agent svc.
- **Note**: This repo *observes* notification compliance (opt-outs) and *will* edit templates,
  but the sending engine is elsewhere. Templates editor = scaffold, not built.

### D14 — Conversación / asesoría automática
- **Status: PARTIAL (cobranza voice agent only — observed/controlled, not built here)**
- **Evidence**: `/agents` + `/agents/[id]` — real Vapi assistant list + **system-prompt editor**
  (`PromptEditor.tsx`, `actions.ts` `patchSystemPrompt`, idempotency markers SILENCE_V1 /
  IDENTITY_NAME_V2). `/calls` shows real conversational transcripts. `/kill-switch` (functional
  scaffold) to pause an agency's cobranza — UI complete, write action disabled until
  `agency_policies.cobranza_paused_at` migration lands.
- **Note**: The conversational AI is **cobranza voice collections only** (Vapi), and this repo
  is the operator console to tune/inspect/kill it — not a general property-Q&A/visit-scheduling
  assistant (that's the D14 agency vision, MISSING here). Real prompt editing against live Vapi.

### D15 — Portal/app propietarios e inquilinos
- **Status: N/A**
- **Evidence**: Internal staff-only tool, `ADMIN_EMAILS` gated. No owner/tenant self-service.
- **Note**: Explicitly the opposite of customer-facing.

### D16 — Afianzadoras / seguros
- **Status: PARTIAL (siniestro signal in cobranza state machine only)**
- **Evidence**: HANDOFF + cartera state machine reference a "siniestro" path (insurance-claim
  branch in Phase 17.8). `/cartera` STAGE machine includes claim-related transitions; no
  dedicated afianzadora module or bonding integration UI in `src/`.
- **Note**: Only as a collections outcome state (claim filed), not a bonding/garantías product.
  Closest real artifact is the cobranza state machine's siniestro transition; no carrier integ.

---

## Additional internal-ops capabilities (not in D1–D16, but notable)

These exist and are real, and define what this repo IS (an ops/compliance/SRE console):
- **Compliance enforcement**: `/ley-2300` (day×hour Bogotá-local contact-window heatmap +
  violations), `/opt-outs` (Habeas Data Ley 1581 registry), `/audit-explorer` (SIC/SAGRILAFT),
  `/audits` (+CSV), `/keys` (Ley 2157 90-day key-rotation ledger, `src/config/key-rotation-log.ts`).
- **System ops / SRE**: `/health` (13 modular checks pinging Vapi/Anthropic/Wompi/Inngest/
  360dialog/Resend/Upstash/R2 — `src/lib/health-checks/`), `/inngest-monitor` (9 crons),
  `/failed-states` (unified failure inbox), `/kill-switch` (functional scaffold).
- **Admin governance**: `/users` (admin roster via `supabaseAdmin.listUsers` × `audit_log`),
  every write server-action does an admin re-check + `logAdminAction` (`src/lib/admin-audit.ts`).
- **Config (mostly scaffolds)**: `/templates`, `/feature-flags`, `/agency-targets` are
  scaffolds++ (migration SQL + mock preview, tables not yet created); `/pricing-config` is
  real read-only of `agent.agency_policies` (edit pending).

## Real-vs-mock ledger (skeptical)
- **REAL (DB or live API)**: `/` `/agents` `/tenants` `/calls` `/audits` `/cartera` `/approvals`
  `/escalations` `/payments` `/qa` `/costs` `/opt-outs` `/ley-2300` `/failed-states` `/health`
  `/inngest-monitor` `/audit-explorer` `/billing` `/ab-tests` `/onboarding` `/debtors` `/users`
  `/keys` `/pricing-config` — all query `agent.*` via `q()` or hit Vapi REST. Verified by reading
  the SQL/fetch in each `page.tsx`/`actions.ts`.
- **FUNCTIONAL SCAFFOLD (UI real, write disabled)**: `/kill-switch` — reads real call counts;
  Pausar buttons `disabled` until `agency_policies.cobranza_paused_at` migration.
- **SCAFFOLD (mock preview + migration SQL, no table yet)**: `/templates`, `/feature-flags`,
  `/agency-targets` — use `src/lib/scaffold-page.tsx`, hardcoded `PREVIEW_*` arrays.

## Bottom line for the ERP+CRM+Autopilot vision
The ERP/CRM/Autopilot home is **NOT in this repo**. `~/rent/admin` is a Leasefy-internal
cross-tenant cobranza ops/compliance console. Its value to the vision: it proves a **real,
queryable cobranza + payments + disbursement + compliance + billing data model already exists
in `agent.*`** (state machine, payments funnel w/ disbursement+fee+CUFE columns, billing_events,
agency_policies pricing, automated_decisions, compliance_events). The agency-facing ERP would
need to consume/extend that schema — but none of D1, D2(agency), D5, D6, D7, D8, D9, D10, D12,
D15, D16 are built here.
