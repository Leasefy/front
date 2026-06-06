# Capability Map — `Leasefy/agent` (autopilot microservice)

Repo: `/Users/nicolasgarcia/rent/agent`
Stack: **TypeScript (ESM, Node ≥22) · Mastra 1.x (agent orchestrator on Vercel AI SDK) · Hono HTTP server · Inngest (durable crons/workflows) · Prisma 7 + Postgres (Supabase, multi-tenant RLS) · Anthropic Claude (tool-use + Vision) · 360dialog WhatsApp · Vapi voice · Wompi/Bold payments · Resend email · S3**
Branch: `restructure/per-agent-organization` · Milestone state (`.planning/STATE.md`): v2.0-cobranza + v2.1-frontend; cobranza fully shipped (Phases 8–17.8 + 29–36), cotizador (insurance) shipped through Phase 36, carrier-integration (Phase 27) PAUSED on portal creds. 68 Prisma models.

**Scope note:** This service is the *autopilot engine*. It contains **4 agent families**: `cobranza` (collections — the deep core), `cotizador` (insurance/afianzadora quoting), `validador` (tenant-scoring), `matching` (smart-matching). It is NOT an ERP/CRM — there is no conciliación, facturación, property capture, PQRS, tercero-CRUD, or agenda module here. Those belong to the backend monolith (`Leasefy/back`) / frontend.

Reality check applied: REST integrations (Wompi, Bold, 360dialog, Vapi, DataCrédito/TransUnion) all ship real `fetch`-based adapters **with a deterministic stub fallback** that activates when the corresponding API key/env is absent. Code paths are real; live traffic is gated on credentials. I mark these HAVE-REAL where the logic + DB + workflow are built and exercised by tests, and call out the credential gate in notes.

---

## D1 Conciliación bancaria
**Status: PARTIAL (narrow — payments reconciliation only, not bank-file import)**
Evidence:
- `src/payments/provider.ts` — `getReconciliation()` method on the `PaymentProvider` interface (Wompi/Bold).
- `src/inngest/functions/daily-dispersion.ts` step `reconcile-per-tenant` calls `provider.getReconciliation()`, logs discrepancies, atomically flips `payments.disbursedAt`.
- `src/server/routes/wompi-webhook.ts`, `bold-webhook.ts` — inbound PSP webhooks reconcile a payment to a payment-link reference.
Notes: Reconciliation here = matching PSP settlement to a payment-link `reference`, not importing Bancolombia/multi-bank flat files and matching by tercero/concepto/valor. No bank-statement ingestion, no partial/duplicate/value-diff detection engine, no accounting posting. The broad D1 ERP scope is MISSING; only PSP-side settlement matching exists.

## D2 Facturación
**Status: MISSING**
Evidence: No invoice/factura/DIAN/nota-crédito models in `prisma/schema.prisma` (68 models reviewed — none for invoicing). `BillingEvent` + `monthly-billing-aggregation.ts` exist but meter **Leasefy's own SaaS usage billing** (whatsapp.sent, calls, etc.), not customer-facing facturación de venta/compra or facturación electrónica.

## D3 Recaudo & Cobranza
**Status: HAVE-REAL (this is the repo's core; production-grade, deep)**
Evidence (agents): `src/mastra/agents/cobranza/` — voice-conductor, closer, negotiation-strategist, hardship-counselor, identity-verifier, escalation-router, compliance-guardrail, whatsapp-composer, whatsapp-reply-handler, call-summarizer, qa-scorer, profile-inferer.
Evidence (state machine + cadence): `src/cartera/state-machine.ts`, `stages.ts`, `transition-stage.ts`, `cadence-orchestrator.ts` (`decideTodayContacts`), `prioritizer.ts`. Stages S0→S5 + SX (skip). Cron `src/inngest/functions/cartera-cadence-cron.ts` (`30 6 * * * TZ=America/Bogota`) decides per-debtor channel/time honoring Ley 2300 schedule windows.
Evidence (payment links): `src/mastra/tools/generate-payment-link.ts`, `generate-fresh-payment-link.ts`, `src/payments/wompi.ts` + `bold.ts` — real `POST /online/link/v1` (Bold) / Wompi REST, server-side amount (no LLM inflation), stub fallback to `pay.leasefy.co/stub/...` when no creds.
Evidence (escalation ladder): `src/inngest/functions/legal-escalation-workflow.ts` (S3 pre-jurídico/jurídico), `pre-bureau-notification-cron.ts`, `src/mastra/tools/escalate-to-human.ts`, `trigger-legal-workflow.ts`, `issue-certified-notice.ts`, `report-to-central.ts` (centrales de riesgo).
Evidence (intereses/planes): `src/cartera/payment-plans/engine.ts` (`computeOffer` with 3-layer discount clamp), `default-watcher.ts` (auto-revert on missed installment), `wompi-link.ts`.
Evidence (auto non-payment report): `src/inngest/functions/cartera-daily-report-cron.ts` + `src/server/services/build-daily-report.ts` + `daily-report-thresholds.ts` — daily KPI report w/ alert derivation, emailed + opt-in WhatsApp top-3.
Evidence (operator UI APIs): `src/server/routes/agency-cobranza-*.ts` (~20 routes: debtors, debtor timeline/calls/compromisos/memos/audit, interventions, escalations, compliance, daily-report, call audio/transcript, reveal-pii), `cobranza-payments-funnel.ts`, `cartera-overview.ts`, `cartera-approvals-operator.ts`.
Notes: Real DB-backed (`Debtor`, `DebtorState`, `CarteraStageTransition`, `CadenceContact`, `Call`, `CallTurn`, `PaymentPromise`, `Payment`, `Escalation`, `PaymentPlan`, `CentralReport`, `LegalArtifact`). Compliance baked in (Ley 2300, Habeas Data, RNE, SAGRILAFT actorType). Live phone/WhatsApp/payment traffic gated on Vapi/360dialog/Wompi creds; everything else exercised by an extensive vitest suite (~3200 tests).

## D4 Egresos a propietarios
**Status: PARTIAL (payout dispersion batch exists; no comprobante-de-egreso / neto computation)**
Evidence: `src/inngest/functions/daily-dispersion.ts` — SPT/payout batch (04:00 Bogotá): lists approved-undispersed `payments`, flips `disbursedAt`, INSERTs `Payout` rows per tenant inside `withTenantScope`, audit-logged. `Payout` + `Payment` Prisma models.
Notes: This disperses *collected payments* via the PSP. There is NO canon−comisión−IVA−descuentos neto calculation, no comprobante de egreso document, no owner-statement generation. The owner-payout *accounting* side of D4 is MISSING; only the money-movement batch is present.

## D5 Contratos & Firma
**Status: PARTIAL (legal-doc PDF generation + e-sign webhook plumbing exist; not lease-contract generation)**
Evidence: `src/cartera/legal/artifact-builder.ts`, `pre-judicial-letter.template.ts`, `src/cartera/insurance/packet-builder.ts` — PDF assembly (pdf-lib) for **pre-judicial letters & siniestro packets**, not lease contracts. E-signature provider webhook: `src/server/routes/certicamara-webhook.ts` (Certicámara). Triple-gated human approval for filings (`automated-decisions-review.ts`).
Notes: No lease-contract template engine, no pre-send completeness validation (bank acct/docs/mascotas/escenario tributario/comisión), no signature-pending priority/availability logic, no automatic canon increments/renovaciones. What exists is collections-legal artifact generation + one e-sign vendor webhook. Contract lifecycle (D5 proper) is MISSING.

## D6 Gestión documental
**Status: PARTIAL (Vision-based extraction for tenant-scoring docs; not contract doc-management)**
Evidence: `src/mastra/tools/extract-document.ts` — Claude Vision/Document API OCR with per-field confidence, doc-type prompts for `cedula | extracto_bancario | contrato_laboral | certificado_ingresos | nomina | reporte_credito`; doc-hash dedupe cache (`ProcessedDocument` model); cost metering. `src/mastra/lib/` consistency/freshness checks (income-analysis, document-freshness in the scoring pipeline). Doc freshness/expiry: `fecha_emision` extraction + freshness checks in `tenant-scoring-pipeline.ts`.
Notes: This is real document AI, but scoped to **rental-application underwriting**, not the broad D6 contract-document repository (store-per-contract, auto-classify, associate-to-contract, missing-doc detection, carta-no-renovación validation, clause/risk detection, smart search). Those D6 features are MISSING here.

## D7 CRM / Captación / Propiedades
**Status: N/A (not this service's concern)**
Evidence: No property/listing/lead models in schema; `sync-crm-outcome.ts` only *pushes cobranza outcomes back to the external CRM*. `smart-matching` (D7-adjacent) lives here but operates on candidate↔property compatibility, not capture/inventory.
Notes: Property capture, fichas, portales, leads → backend monolith / frontend, not the agent service.

## D8 Creación de propiedades por app móvil + audio
**Status: MISSING**
Evidence: No audio-file→IA-transcription→ficha pipeline. The only transcription is **Vapi's nova-3 STT inside live cobranza voice calls** (`src/server/routes/vapi-webhook.ts` assistant-request config; `call-summarizer.ts` consumes transcripts) — that is collections voice, not property-creation-by-audio.
Notes: No mobile-capture or audio-to-listing flow anywhere in this repo.

## D9 PQRS / Solicitudes
**Status: MISSING**
Evidence: No PQRS/solicitud/reclamo/ticket model or route. Grep hits for "solicitud"/"reclamo" are incidental template/prompt text in cobranza scripts. The closest analog is the **ARCO data-subject rights flow** (`src/server/routes/cotizador-data-subject.ts`, `agency-arco-requests.ts`, `arco-public.ts`, `cotizador-arco-handler.ts`) — Ley 1581 acceso/rectificación/cancelación/oposición intake + SLA + triage. That is a habeas-data rights inbox, NOT operational PQRS (repairs, complaints, provider quotes).
Notes: ARCO ≠ PQRS. If counted generously, request-intake+triage+SLA *machinery* exists and is reusable, but PQRS as a domain is absent.

## D10 Creación de terceros automatizada
**Status: MISSING (extraction primitive exists; no tercero-create flow)**
Evidence: `extract-document.ts` can OCR a `cedula` (and there's RUT-adjacent fields), which is the *primitive* D10 would need. But there is no foto-cédula/RUT/audio → extract → prefill → review → save tercero pipeline, and no Tercero model in schema.
Notes: Reusable building block present (Claude Vision cédula extraction), full capability MISSING.

## D11 Informes & Insights
**Status: PARTIAL (real cobranza + cotizador reporting/insights; not the ERP report catalog)**
Evidence (cobranza): `src/server/routes/dashboard-{summary,calls,compliance,performance,portfolio}.ts`, `cartera-overview.ts`, `cobranza-payments-funnel.ts`, `cartera-daily-report.ts` + cache table `CarteraDailyReportCache`; threshold-driven alert derivation in `daily-report-thresholds.ts` (proactive-alert seed). `metrics.ts`, `metrics-billing.ts`.
Evidence (cotizador insights): `src/server/routes/agency-cotizador-insights.ts` (approval-rate-monthly, prima-distribution, assumptions, cost-trend), `agency-cotizador-costos.ts`, `cotizador-drift-reporter.ts`, `cotizador-sla-rollup.ts`, `cotizador-cost-aggregator.ts`.
Notes: Real, DB-backed operational analytics for the two agent domains, with the beginnings of proactive alerts (threshold breaches → daily-report alerts). The broad accounting/tax/helisa-export/certificado-tributario report catalog is MISSING (that's backend ERP).

## D12 Agenda interna
**Status: PARTIAL (event-driven follow-up scheduling; no calendar/agenda surface)**
Evidence: `src/followup/planner.ts`, `src/mastra/tools/schedule-follow-up.ts`, `cadence-orchestrator.ts` (`scheduled_at` per debtor honoring Ley 2300), `CadenceContact` model with scheduled contacts; numerous Inngest crons (cadence 06:30, daily-report 06:45, pre-bureau, dispersion, etc.).
Notes: Strong *event→scheduled-action* machinery for cobranza, but no human-facing agenda/calendar tied to visitas/firmas/vencimientos/inspecciones, and no auto-task creation surface. The scheduling primitive exists; the cross-system agenda product is MISSING.

## D13 Notificaciones automáticas
**Status: HAVE-REAL (multi-channel, for cobranza/cotizador events)**
Evidence (WhatsApp): `src/whatsapp/dialog360.ts` (+ `kapso.ts` alt provider, `provider.ts` interface), `src/mastra/tools/send-whatsapp.ts` + `compose-whatsapp.ts` (template select/fill + opt-out/frequency/schedule gates), `src/whatsapp/templates/` (Meta-approved templates), `whatsapp-webhook.ts` inbound.
Evidence (voice): `src/server/routes/vapi-webhook.ts`, `vapi-inbound.ts`; `src/voice/conductor.ts`.
Evidence (email): Resend (`resend` dep) used in `arco-public.ts` verification, daily reports, insurance claim filing (`src/cartera/insurance/file-claim.ts`).
Evidence (gating): `check-opt-out.ts`, `check-frequency.ts`, `check-schedule.ts`, `check-rne.ts`, `record-compliance.ts` — all enforce Ley 2300 / Habeas Data / RNE before any send.
Notes: Real compliant multi-channel dispatch for pago/mora/escalación/firma-legal/daily-report. Live sends gated on 360dialog/Vapi/Resend creds (stub-mode otherwise). Notification *triggers* cover the cobranza event set; broader ERP events (incremento, egreso, no-renovación) not wired because those domains don't exist here.

## D14 Conversación / asesoría automática
**Status: HAVE-REAL for cobranza (voice + WhatsApp); the rest of D14 N/A here**
Evidence (voice): full Vapi assistant config + `/vapi/webhook` end-of-call/assistant-request handlers (`src/server/routes/vapi-webhook.ts`, 81KB; `vapi-inbound.ts`); `src/voice/state-machine.ts` + `conductor.ts` drive multi-turn collections calls with specialist sub-agents (identity-verifier, negotiation-strategist, hardship-counselor, closer) under a compliance guardrail.
Evidence (WhatsApp): `whatsapp-webhook.ts` inbound + `whatsapp-reply-handler.ts` agent (Haiku intent classifier: PAY_NOW/NEED_PLAN/OPT_OUT/free-text→escalate; "if in doubt, escalate"); `parse-reply.ts`, `link-reply-to-call.ts`.
Notes: This is genuine autonomous conversational AI — but purpose-built for **debt negotiation/recaudo**, not for property Q&A, sending fichas, scheduling visitas, or owner/tenant general advisory. Inbound WhatsApp free-text NLU is deliberately conservative (escalates rather than free-converses). General-purpose property/lead conversation (the D14 vision) is MISSING.

## D15 Portal/app propietarios e inquilinos
**Status: N/A (no end-user portal in this service)**
Evidence: Service exposes only agency-JWT-gated operator APIs (`agency-cobranza-*`, `agency-cotizador-*`) + unauthenticated ARCO/webhook intakes. No tenant/owner self-service surface.
Notes: Portal lives in the frontend repo; this service would be a data provider to it.

## D16 Afianzadoras / seguros
**Status: HAVE-REAL (insurance quoting engine `cotizador`) + PARTIAL (live carrier integration paused)**
Evidence: `src/mastra/agents/cotizador/` — quote-orchestrator + `runExtendedQuote` deterministic verdict engine, scoring, screening (PEP/OFAC hook), explainability (reasoning trace + PII redaction), counterfactual ("ask-why"), SLA, recovery. Carrier registry in Postgres (`CotizadorAseguradoraRegistry`, `CotizadorTenantAseguradoraOverride`); per-carrier adapters `src/mastra/agents/cotizador/aseguradoras/{sura,sekure,shared}/`. Routes: `src/server/routes/cotizador*.ts` (quote, streaming, re-quote, guardrails, admin, ask-why, data-subject), `agency-cotizador-*.ts`. Insurance-claim filing (siniestro) for cobranza: `src/cartera/insurance/` (packet-builder, file-claim, aseguradora-recipients for Sura/Mapfre/Solidaria/Acción via Resend).
Notes: The quoting/screening/explainability/compliance machinery is real and tested. **Live carrier APIs (Bolívar Conecta, Sekure APIM) are PAUSED at Phase 27** pending portal credentials — adapters + OAuth2 token cache + route discriminator are scaffolded, real HTTP bodies deferred (`.planning/STATE.md` Phase 27). So: quoting logic HAVE-REAL, real-carrier round-trip PARTIAL/blocked. This is the closest thing to the "Leasefy-as-afianzadora" future, but currently it's a multi-carrier *quote aggregator*, not bonding/garantía issuance.

---

### Summary verdict
- **Built & real here:** D3 Cobranza (full autopilot), D13 Notifications (multi-channel compliant), D14 Conversational (cobranza voice + WhatsApp), D16 Insurance quoting (cotizador).
- **Partial / reusable primitives:** D1 (PSP reconciliation only), D4 (payout batch only), D5 (legal-PDF + 1 e-sign webhook), D6 (Vision OCR for scoring docs), D11 (cobranza/cotizador analytics), D12 (event-driven scheduling).
- **Missing here (belong to backend/frontend):** D2 Facturación, D7 CRM/Propiedades, D8 audio-property-creation, D9 PQRS, D10 tercero-create, D15 end-user portal.
- **Credential gates (logic real, live traffic pending key):** 360dialog WhatsApp, Vapi voice, Wompi/Bold, DataCrédito/TransUnion, Resend, S3, and Phase-27 carrier APIs.
