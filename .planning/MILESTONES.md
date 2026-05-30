# Milestones

## v1.0 — MVP Frontend (COMPLETE)

**Shipped:** 2026-01-29
**Phases:** 11
**Summary:** Full frontend with mock data — property catalog, application wizard, risk score display, landlord/tenant dashboards, contracts, pricing, maps, auth UI.

## v2.0 — Design System & QA Audit (COMPLETE)

**Shipped:** 2026-02-02
**Phases:** 4
**Summary:** Design tokens, component redesign, 48+ QA findings fixed, dark mode, responsive audit, accessibility, navigation fixes.

## v3.0 — Inmobiliaria Module (COMPLETE)

**Shipped:** 2026-02-08
**Phases:** 10 (33 plans)
**Summary:** Complete agency management dashboard — propietarios, portafolio, pipeline, agentes, cobros, dispersiones, reportes, operaciones, configuracion, analytics.

## v3.1 — Landing & SEO (COMPLETE)

**Shipped:** 2026-02-10
**Summary:** i18n across entire codebase (ES/EN), pricing page redesign with unified card format, SEO optimization (dynamic OG images, metadata, JSON-LD structured data), es_CL → es_CO locale fix.

## v4.0 — AI Agent Platform Beta (COMPLETE)

**Shipped:** 2026-02-10
**Phases:** 9 (21 plans)
**Summary:** Conversational AI interface ("Beta" section) — chat UI with streaming, agent activity display, decision system, briefings, preferences/autonomy settings, API client layer, i18n, mobile support.

## v5.0 — Agency Plan-Gated Features & AI Agent UX (⏸️ PAUSED 2026-05-12)

**Started:** 2026-03-26
**Paused:** 2026-05-12 — Collections Agent (Agente de Cobranza) in `Leasefy/agent` became priority #1 for the company. See `~/rent/agent/.planning/AGENT-COBRANZA-SPEC.md`. v5.0 will resume once the Collections Agent's frontend integration scope is clear.
**Goal:** Make the platform feel agentic from day one for agencies. Build plan-gated features (advanced reports, automatic reminders) that differentiate Flex plans. Ship the pricing model where agencies pay $10 USD per successful lease.
**Key insight:** Flex plans include AI agents as differentiator — agencies should prefer per-lease pricing.
**Status at pause:** Phases 1–33 complete. Deferred items: Automatic Reminders, Contract Expiry Reminders.

## v6.0 — Backoffice Unificado ERP·CRM·Autopilot (🚧 PLANNING 2026-05-29)

**Started:** 2026-05-29
**Phases:** v6-01..v6-08 (frontend-first; namespace `v6-NN` para no colisionar con el stream `agent` v2.1-frontend que commitea frontend en mvp con `3x-xx`). v6-01 ✅ done.
**Goal:** Que TODAS las secciones de un ERP inmobiliario existan en el panel (facturación, conciliación bancaria, egresos/tesorería, informes contables, PQRS, agenda) de forma **aditiva y sin romper el CRM existente**, más los momentos autopilot (insights proactivos, creación de terceros por IA, captura de propiedad por foto+audio). Es el arranque **frontend-first** de un programa multi-repo de 6 milestones (ERP engine en `back-main`, AI en `agent`).
**Backbone:** `.planning/ERP-CRM-AUTOPILOT-PROGRAM.md` · **Gap analysis:** `.planning/research/ERP-VISION/GAP-ANALYSIS.md` · **Detalle:** `milestones/v6.0-{REQUIREMENTS,ROADMAP}.md`
**Key insight:** El diferencial no son más módulos, es que el sistema opere la inmobiliaria. v6.0 deja el FRENTE del ERP+CRM+Autopilot completo; los motores (DIAN, conciliación real, posteo contable) llegan en M2–M3.
