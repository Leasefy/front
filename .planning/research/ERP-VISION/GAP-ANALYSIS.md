# GAP ANALYSIS — Leasefy Agency ERP + CRM + Autopilot

**Date:** 2026-05-29
**Scope:** Evolving Leasefy's agency backoffice into a unified ERP + CRM + Autopilot for Colombian inmobiliarias.
**Inputs synthesized:** `map-mvp-frontend.md` (agency frontend `rent/mvp`), `map-back-main.md` (`rent/back-main` NestJS monolith), `map-agent.md` (`rent/agent` autopilot microservice), `map-admin.md` (`rent/admin` internal ops console). Vision domains D1–D16.

---

## 1. Executive Summary

Leasefy already has two production-grade autopilot verticals — **collections (D3)** and **insurance quoting (D16)** — built deep in the `agent` microservice and surfaced richly in the `mvp` frontend (`ai/cobranza/**`, `ai/cotizador/**`). Around those, the agency frontend has **real, backend-wired CRM and operations** (properties, pipeline, owners, contracts+e-sign, dispersiones, maintenance, in-app messaging, reports). That is a strong CRM + partial Autopilot foundation.

The **ERP financial core is the big hole.** The four most valuable accounting/financial domains for an inmobiliaria — **D1 conciliación bancaria, D2 facturación (especially DIAN electronic invoicing), D4 owner-payout neto/comprobante computation,** and the **tax/accounting report catalog (Helisa export, certificado tributario) in D11** — are essentially NET-NEW. The intended monolith backend (`back-main`) is a bare NestJS+Prisma scaffold at Phase 2/10 with a single `User` model and zero ERP code, so "the ERP engine" must be built from zero (in `back-main` or wherever the team consolidates).

The other big theme is the **AI-automation layer on top of existing CRUD.** Many domains have real plumbing but lack the autonomy the vision describes: document intelligence (D6), PQRS auto-triage (D9), automated tercero creation from cédula/RUT/audio (D10), the internal agenda tied to system events (D12), and a general-purpose conversational advisor (D14, vs. today's collections-only voice/WhatsApp). Two domains are flatly NET-NEW everywhere: **D8 mobile/audio property capture** and **D12 internal agenda**.

**Bottom line:** This is a multi-year, multi-repo program, not a milestone. The CRM + collections + insurance "Autopilot" story is largely done; the **ERP accounting spine** and the **AI-automation upgrades** are where the work lives. Recommend `mvp` as the unified agency UI home, `back-main` (or its successor) as the new ERP engine, and `agent` as the autopilot/AI execution service.

---

## 2. Verdict Table (D1–D16)

Status legend: **MOSTLY-DONE** (core built, polish/gaps remain) · **PARTIAL** (real plumbing, missing the automation/financial layer the vision describes) · **MOSTLY-MISSING** (only primitives/adjacent artifacts) · **NET-NEW** (build from zero).

| # | Domain | Overall | Owner repo (build target) | Concrete gap — what to build / improve |
|---|--------|---------|---------------------------|-----------------------------------------|
| **D1** | Conciliación bancaria | **MOSTLY-MISSING** | `back-main` (engine) + `mvp` (UI) | Only PSP-settlement matching exists (`agent` `getReconciliation()` matches Wompi/Bold to payment-link `reference`). NET-NEW: Bancolombia + multi-bank flat-file import, match movement→contract/tercero/concepto by reference+value, auto-conciliate, detect partial/duplicate/unidentified/out-of-date/value-diff, post to accounting. No reconciliation UI in `mvp`. |
| **D2** | Facturación (venta/compra, DIAN, NC/ND) | **NET-NEW** | `back-main` (engine) + `mvp` (UI) | All four repos only have *SaaS self-billing* (Leasefy charging agencies via `agent.billing_events`, surfaced in `mvp` config tab + `admin /billing`). NET-NEW: facturas de venta (non-canon concepts) + compra (proveedores/gastos), **DIAN facturación electrónica + CUFE**, notas débito/crédito, recurring per-period auto-invoice, owner-admin invoice, IVA scenarios, payment links on invoice. `agent.payments.invoice_cufe` column hints at a CUFE persistence seam to investigate, but no invoice generation exists. |
| **D3** | Recaudo & Cobranza | **MOSTLY-DONE** | `agent` (engine) + `mvp` (UI) + `admin` (ops) | Deepest vertical in the company. `agent` has full collections autopilot (state machine S0→S5/SX, cadence cron, payment links, escalation ladder pre-jurídico/jurídico, payment plans, daily non-payment report, Ley 2300/Habeas Data). `mvp` `ai/cobranza/**` (~25 pages) and `admin` (monitoring) consume it. Gap: live phone/WhatsApp/payment traffic is **credential-gated** (Vapi/360dialog/Wompi). Intereses de mora exist in plan engine but not surfaced as discrete UI. Recaudo payment-link generation real. |
| **D4** | Egresos a propietarios | **PARTIAL** | `back-main` (neto/comprobante) + `mvp` (UI exists) + `agent` (dispersal batch) | `mvp` has real owner extracto/comprobante PDF + dispersiones preview/process UI (monolith-backed); `agent` has a payout *money-movement* batch (`daily-dispersion.ts`, flips `disbursedAt`, inserts `Payout`). **Missing the accounting truth:** canon − comisión admin − IVA comisión − descuentos neto computation as authoritative ledger, and comprobante de egreso tied to that. Today the `mvp` PDF computes client-side. Owner bank-account management partial. Consolidate neto computation in the ERP engine. |
| **D5** | Contratos & Firma | **MOSTLY-DONE** | `mvp` (UI+lifecycle) + `back-main` (persistence) | `mvp` has full contract lifecycle: create (upload/template/generate modes), send, sign landlord/tenant, OTP send/verify, remind, activate, reject, cancel, signed-PDF. Real e-sign + reminders, candidate→contract handoff, legal templates. Gaps to close: full pre-send completeness gate (bank acct + docs + mascotas + escenario tributario + comisión), signature-pending priority/availability logic (inmueble disponible-hasta-firma, expira/desiste), and automatic canon increments (IPC/índice/periodicidad) + renovaciones as scheduled automation. (`agent` only has collections-legal PDF + 1 Certicámara webhook — not lease contracts.) |
| **D6** | Gestión documental | **PARTIAL** | `mvp` (UI) + `back-main` (store) + `agent` (AI extract) | Real upload/store/associate per contract/property/application + acta de entrega (`mvp`). `agent` has Claude Vision OCR (`extract-document.ts`) but scoped to applicant-scoring docs, not the contract document repository. Missing: auto-classify, key-date extraction, missing-doc detection, carta-no-renovación validation, expiry alerts, clause/risk detection, summarization, smart search. Reuse `agent` Vision primitives, point them at the portfolio doc corpus. |
| **D7** | CRM / Captación / Propiedades | **MOSTLY-DONE** | `mvp` (UI) + `back-main` (persistence) | `mvp` has real property CRUD+filters+naturalQuery, photos, inventory ficha, lead/candidate mgmt, agent assignment, visits (incl. public slot endpoint), pipeline Kanban (move-stage/convert-to-lease), postulación approve/reject. Gaps: explicit "ficha compartible por WhatsApp" share action not found; **portal publication (fincaraiz/metrocuadrado) is a disabled "Próximamente" shell**; arriendo flow strong but venta flow thin. (`back-main` has zero property models — persistence currently lives behind the `NEXT_PUBLIC_BACKEND_URL` monolith that is not `back-main`.) |
| **D8** | Property creation por app móvil + audio | **NET-NEW** | `mvp` (mobile UI) + `agent` (audio→IA) | Nothing anywhere. `mvp` create form is plain text; portal-import "AI review" is a heuristic `gapFiller.ts` (not LLM); CSV import is the only real path. `agent` audio transcription exists only inside live Vapi collections calls. NET-NEW: mobile capture (fotos+audio) → IA transcribe → structured ficha + descripción comercial. |
| **D9** | PQRS / Solicitudes | **PARTIAL** | `mvp` (UI) + `agent` (AI triage) + `back-main` (persistence) | `mvp` has real "mantenimiento" register with status workflow + quote-approval (repair→proveedor cotización flow). Missing: full PQRS taxonomy (quién/tipo/inmueble/asignado/estado/respuesta) and AI classify/route/assign/follow-up/close. `agent` has reusable request-intake+triage+SLA machinery (ARCO inbox) but ARCO ≠ PQRS. Generalize the ARCO triage pattern into a PQRS agent. |
| **D10** | Creación de terceros automatizada | **MOSTLY-MISSING** | `agent` (extract) + `mvp` (review/save UI) + `back-main` (Tercero model) | Today fully manual (~15 min) in `mvp` (`propietariosApi.create` plain form). Primitive exists: `agent` `extract-document.ts` can OCR cédula/RUT-adjacent fields. NET-NEW glue: foto-cédula/RUT/audio → IA extract → prefill → review → save tercero. No `Tercero` model in `back-main` (only auth `User`). |
| **D11** | Informes & Insights | **PARTIAL** | `mvp` (UI) + `back-main` (accounting reports) + `agent` (op analytics) | `mvp` has real reporting (cartera, comisiones, flujo-caja, extracto, PDF/CSV export) + analytics charts/forecast. `agent` has cobranza/cotizador operational analytics + threshold alerts (proactive-alert seed). **Missing:** Helisa export, certificado tributario, facturas-de-compra/FE report categories, and the broad proactive-insight engine ("tienes 18 contratos por vencer, 6 sin gestión"). Accounting reports depend on D1/D2/D4 existing first. |
| **D12** | Agenda interna | **NET-NEW** | `mvp` (UI) + `agent` (auto-task) | No `/agenda` or `/calendario` route anywhere. `agent` has strong event→scheduled-action machinery (followup planner, cadence `scheduled_at`, crons) but no human-facing calendar. NET-NEW: unified internal calendar tied to visitas/firmas-pendientes/vencimientos/seguimientos/inspecciones, auto-create tasks from system events. |
| **D13** | Notificaciones automáticas | **PARTIAL** | `agent` (send engine) + `mvp` (config+inbox) | `agent` has real compliant multi-channel dispatch (WhatsApp 360dialog/Kapso, Vapi voice, Resend email) with opt-out/frequency/schedule/RNE gates — but triggers cover only the cobranza/cotizador event set. `mvp` surfaces in-app notifications + push + config toggles/thresholds + reminder config. Missing: triggers for the ERP events that don't exist yet (incremento, egreso, no-renovación, firma-pendiente, vencimiento) — they get wired as D2/D4/D5 land. |
| **D14** | Conversación / asesoría automática | **PARTIAL** | `agent` (AI engine) + `mvp` (UI) | Real autonomous conversational AI exists but is **collections-only** (Vapi voice multi-turn + conservative WhatsApp NLU in `agent`). `mvp` `mensajes` is human↔candidate app chat (not autonomous); general advisor is the **hidden mock beta** (`src/components/beta/`). Missing: general-purpose advisor (answer property questions, send fichas, confirm availability, schedule visits, request docs, follow up leads, attend owners/tenants) connected to the live CRM/ERP. |
| **D15** | Portal/app propietarios e inquilinos | **MOSTLY-MISSING** | `mvp`/new portal app (UI) + `agent`/`back-main` (data) | Out of `panel/inmobiliaria` scope, but a partial product seam exists: tenant-facing services in `mvp` (`landlord.service.ts`, `tenant-payment-requests`, `pse-payments`, wishlists, visits) and non-agency `panel/` roles. `agent` exposes only agency-JWT operator APIs (would be the data provider). NET-NEW: owner/tenant self-service portal (contratos, pagos, egresos, comprobantes, solicitudes, documentos, estado mora, reportes mensuales). Largely gated on D1/D2/D4 data existing. |
| **D16** | Afianzadoras / seguros | **MOSTLY-DONE** | `agent` (engine) + `mvp` (UI) | `agent` `cotizador` is real: carrier-agnostic quote engine, multi-carrier verdicts, screening/PEP-OFAC hook, explainability/ask-why, SLA, registry in Postgres, per-carrier adapters; siniestro packet-builder + file-claim. `mvp` `ai/cotizador/**` (~10 pages, streaming) consumes it. Gap: **live carrier integration (Bolívar Conecta, Sekure APIM) PAUSED at Phase 27** pending portal credentials (adapters/OAuth scaffolded, real HTTP bodies deferred). Today it is a quote *aggregator*, not bonding/garantía issuance ("Leasefy-as-afianzadora" is future). |

### Domain status tally
- **MOSTLY-DONE (4):** D3 Cobranza, D5 Contratos, D7 CRM, D16 Seguros.
- **PARTIAL (6):** D4 Egresos, D6 Documental, D9 PQRS, D11 Informes, D13 Notificaciones, D14 Conversación.
- **MOSTLY-MISSING (3):** D1 Conciliación, D10 Terceros, D15 Portal.
- **NET-NEW (3):** D2 Facturación, D8 Mobile+audio, D12 Agenda.

---

## 3. Home Repo Recommendation

**The agency ERP + CRM + Autopilot UI should live in `mvp` (the agency frontend), NOT `admin`.**

Rationale:
- **`mvp` already IS the agency-facing app.** It hosts the entire `panel/inmobiliaria` surface — CRM, contracts, dispersiones, reports, plus the deepest agent UIs (cobranza ~25 pages, cotizador ~10 pages). The ERP modules are net-new tabs/sections inside an existing, role-gated (`allowedRoles={['agency']}`), design-system-consistent app. Adding D1/D2/D4 UI here is additive, not a new app.
- **`admin` is explicitly the wrong tool.** It is the Leasefy-INTERNAL ops/compliance/SRE console (`ADMIN_EMAILS` allowlist, cross-tenant RLS-bypass `pg` pool over `agent.*`). Its own map states "the ERP/CRM/Autopilot home is NOT in this repo." It is a privileged observability layer, never a tenant self-service tool. Keep it as the internal supervision console; do not build agency ERP there.
- **`back-main` is the ERP *engine*, not the UI.** It (or its successor monolith) should own the new ERP data model and accounting logic (terceros, facturación, conciliación, egresos neto, accounting posting/exports). `mvp` consumes it via the existing `apiClient` (`NEXT_PUBLIC_BACKEND_URL`) pattern.
- **`agent` stays the Autopilot/AI execution service.** New AI-automation (doc intelligence, PQRS triage, tercero extraction, general advisor) extends `agent`; `mvp` surfaces it via the established `NEXT_PUBLIC_AGENT_URL` + OpenAPI-generated-types + Supabase Realtime pattern already proven by cobranza/cotizador.

So: **UI home = `mvp`; ERP engine = `back-main`; AI execution = `agent`; internal supervision = `admin`.**

---

## 4. Proposed Multi-Milestone Program

This is too large for one milestone. Six sequenced milestones, ordered by dependency. Each notes frontend (mvp) / backend (back-main) / agent split.

### M1 — ERP Financial Spine: Terceros + Conciliación + Egresos neto
**Domains:** D10 (terceros model), D1 (conciliación), D4 (neto/comprobante).
**Rationale:** The accounting truth everything else hangs on. You cannot do facturación, owner statements, tax reports, or a portal "estado de cuenta" without a real `Tercero` model, reconciled bank movements, and authoritative neto computation. D10's auto-extraction can ship in a later wave; the *model* must come first.
**Split:** **back-main** (NET-NEW: Tercero/Counterparty model, bank-statement import + matching engine, neto ledger + comprobante de egreso, accounting posting) · **mvp** (conciliación UI, terceros CRUD, upgrade existing dispersiones to consume server-side neto) · **agent** (none yet).
**Depends on:** Deciding/standing up the real ERP monolith (back-main is a scaffold today).

### M2 — Facturación + DIAN Electronic Invoicing
**Domains:** D2.
**Rationale:** Highest-risk regulated piece (DIAN FE + CUFE + IVA + NC/ND). Depends on M1 (terceros + reconciled amounts + neto). Recurring per-period auto-invoice and payment-links-on-invoice plug into the existing payment-link infra in `agent`.
**Split:** **back-main** (invoice models, DIAN FE provider integration + CUFE, IVA scenarios, NC/ND, recurring engine) · **mvp** (facturación venta/compra UI, invoice viewer, payment-link surfacing) · **agent** (optional: recurring-invoice cron + invoice notifications via D13).
**Depends on:** M1.

### M3 — Contract Automation + Document Intelligence + Tax/Accounting Reports
**Domains:** D5 (close gaps: pre-send gate, signature-priority, IPC increments, renovaciones), D6 (doc intelligence), D11 (Helisa export, certificado tributario, proactive insights).
**Rationale:** Builds on the now-complete financial spine. Contracts get full automation; documents get AI intelligence (reuse agent Vision); reports finally have real accounting data (M1/M2) to export to Helisa and tax certificates.
**Split:** **back-main** (increment/renewal scheduling, accounting report generators, Helisa export, certificado tributario) · **mvp** (pre-send completeness gate, signature-pending priority UI, renovaciones, doc-intelligence surfaces, report catalog UI) · **agent** (doc auto-classify/key-date/expiry/clause-risk on portfolio corpus, proactive-insight engine seeded from threshold alerts).
**Depends on:** M1, M2.

### M4 — Automation Layer: Tercero Auto-Create + PQRS + Mobile/Audio Property Capture
**Domains:** D10 (auto-extraction glue), D9 (PQRS auto-triage), D8 (mobile+audio).
**Rationale:** The "AI does the data entry" milestone — pure productivity wins on top of existing models. D10 extraction reuses agent Vision; PQRS generalizes the ARCO triage pattern; D8 adds audio→ficha. None block the financial spine, so they sequence after the regulated work.
**Split:** **agent** (cédula/RUT/audio extraction pipeline, PQRS classify/route/assign agent, audio→ficha transcription) · **mvp** (tercero review/save UI, PQRS register + taxonomy UI, mobile capture flow) · **back-main** (PQRS/solicitud persistence model, Tercero prefill endpoints).
**Depends on:** M1 (Tercero model), M3 (doc-intelligence patterns help but not required).

### M5 — Conversational Advisor + Agenda + Notification Expansion
**Domains:** D14 (general advisor), D12 (internal agenda), D13 (ERP-event triggers).
**Rationale:** With CRM+ERP data real and rich, a general-purpose advisor and a unified agenda become valuable and feasible. D13 expands the existing `agent` send engine to fire on the new ERP events (incremento, egreso, no-renovación, firma-pendiente, vencimiento). The agenda auto-creates tasks from those same system events.
**Split:** **agent** (general advisor agent connected to live CRM/ERP — property Q&A, send fichas, schedule visits, request docs, follow leads; new D13 triggers + templates) · **mvp** (productionize the hidden beta chat as the advisor surface, internal agenda/calendar UI) · **back-main** (agenda/task model + event hooks).
**Depends on:** M1–M3 (advisor needs real data; agenda needs real events).

### M6 — Owner/Tenant Portal + Afianzadora Go-Live + Portal Publication
**Domains:** D15 (self-service portal), D16 (live carrier integration), D7 (portal publication + WhatsApp ficha share).
**Rationale:** Customer-facing self-service is the capstone — it surfaces M1–M5 data (contratos, pagos, egresos, comprobantes, solicitudes, documentos, mora, reportes) to owners/tenants. D16 live-carrier go-live unblocks once portal credentials land (Phase 27). D7's portal-publication shell and WhatsApp ficha-share get finished here.
**Split:** **mvp** (owner/tenant portal app or `panel/` roles, finish portal-import + ficha share) · **agent** (resume Phase 27 carrier APIs once creds; portal data APIs) · **back-main** (portal data aggregation endpoints, monthly owner reports).
**Depends on:** M1–M5 (portal has nothing to show without them); M6/D16 also gated on external carrier credentials.

**Dependency chain:** M1 → M2 → M3 → (M4, M5 parallelizable after M3) → M6 (capstone).

---

## 5. Biggest Risks / Hardest Pieces

1. **DIAN facturación electrónica (D2) — highest regulatory risk.** CUFE generation, real-time DIAN validation, IVA scenarios, NC/ND, and audit-grade persistence. A bug here is a tax-compliance liability, not a UX nuisance. Likely needs a certified FE provider (proveedor tecnológico autorizado), not in-house DIAN integration. Allocate the most validation budget here. The `invoice_cufe` column in `agent.payments` is a seam to investigate, not a solution.

2. **Banking integration / conciliación bancaria (D1) — no standard API.** Colombian banks (Bancolombia + multi-source) mostly mean flat-file/extracto ingestion with inconsistent formats, plus a fuzzy matching engine (reference+value→contract/tercero/concepto) that must correctly detect partial/duplicate/unidentified/value-diff/out-of-date payments. High false-positive/negative cost (mis-posted money). Build a strong human-review queue; do not fully auto-post without confidence gates.

3. **Accounting posting + Helisa export + certificado tributario (D1/D4/D11).** Getting the double-entry/accounting model right (and exporting to Helisa cleanly) is finicky domain work that compounds the D1/D2/D4 risk. Requires real accounting expertise, not just engineering.

4. **E-signature legal validity + the `back-main` engine being a scaffold (D5 + foundation).** `mvp` contract e-sign is real, but the authoritative ERP monolith does not exist yet (`back-main` = single User model, Phase 2/10). The biggest *structural* risk is that "the backend" the `mvp` services point to today (`NEXT_PUBLIC_BACKEND_URL`) is not `back-main` — the team must decide which monolith becomes the ERP engine before M1, or M1's foundation work balloons.

5. **Credential gates across live integrations.** Multiple "real logic, no live traffic" gates: Vapi voice, 360dialog WhatsApp, Wompi/Bold payments, DataCrédito/TransUnion, and the **paused Phase-27 carrier APIs (Bolívar/Sekure)** for D16. Several milestones can be *built* but not *go-live* until credentials/contracts land — track these as external blockers, not engineering tasks.

6. **Multi-tenant data correctness across three repos.** `agent` (RLS, `withTenantScope`), `back-main` (RLS + guards), and `mvp` (JWT) must agree on tenant boundaries as ERP financial data spreads. A tenant-isolation bug in financial/accounting data is severe. The `admin` repo's RLS-bypass `pg` pool is a reminder that the privileged path already exists and must stay internal-only.

7. **Cross-repo schema ownership (`agent.*` vs ERP schema).** Cobranza/payments/disbursement data already lives in `agent.*` (proven by `admin`). The ERP engine will need to consume/extend that schema without creating two sources of truth for payments/payouts (D3/D4 overlap). Decide schema ownership early to avoid drift between the autopilot's `Payment`/`Payout` and the ERP's ledger.
