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

## v6.0 — Backoffice Unificado ERP·CRM·Autopilot (✅ COMPLETE 2026-05-30)

**Started:** 2026-05-29 · **Shipped:** 2026-05-30
**Phases:** v6-01..v6-08 (8/8, frontend-first; namespace `v6-NN` para no colisionar con el stream `agent` v2.1-frontend que commitea frontend en mvp con `3x-xx`).
**Goal:** Que TODAS las secciones de un ERP inmobiliario existan en el panel (facturación, conciliación bancaria, egresos/tesorería, informes contables, PQRS, agenda) de forma **aditiva y sin romper el CRM existente**, más los momentos autopilot (insights proactivos, creación de terceros por IA, captura de propiedad por foto+audio). Es el arranque **frontend-first** de un programa multi-repo de 6 milestones (ERP engine en `back-main`, AI en `agent`).
**Backbone:** `.planning/ERP-CRM-AUTOPILOT-PROGRAM.md` · **Gap analysis:** `.planning/research/ERP-VISION/GAP-ANALYSIS.md` · **Detalle:** `milestones/v6.0-{REQUIREMENTS,ROADMAP}.md`
**Key insight:** El diferencial no son más módulos, es que el sistema opere la inmobiliaria. v6.0 deja el FRENTE del ERP+CRM+Autopilot completo; los motores (DIAN, conciliación real, posteo contable) llegan en M2–M3.

## avaluos-ui — Avalúos UI Public Valuation Flow (✅ COMPLETE 2026-06-03)

**Phase 34 (5 plans):** landing pública `/avaluo`, ruta Wompi session (hash de integridad server-side), wizard 4 pasos, confirmación + polling, páginas de panel agencia (list/nuevo/detail).

## v7.0 — Portal del Inquilino (🚧 IN PROGRESS 2026-07-16)

**Started:** 2026-07-16
**Phases:** v7-01..v7-07 (7, frontend-first; namespace `v7-NN`). Rama de planning: `plan/v7.0-portal-inquilino` (off `feat/leasefy-ds-redesign`, no toca `main`).
**Problema (P1):** después de firmar, el inquilino solo tiene a quién escribir si hay un problema; el producto cierra pero no opera la relación → mora, quejas, menor renovación.
**Goal:** El portal `/inquilino` ya existe (~55-60% real, funnel de adquisición con firma OTP) pero sin capa de operación post-firma. v7.0 **suma** esa capa (Estado de casos, Solicitudes/PQRS, Acuerdos de pago), **sube parcial→real** 3 pilares (Pagos Wompi, Documentos del arriendo, Comunicación) y **limpia** superficies fake (dashboard/perfil/config). Aditivo, frontend-first.
**Backbone:** `.planning/research/portal-inquilino/GAP-ANALYSIS.md` · **Detalle:** `REQUIREMENTS.md` + `ROADMAP.md`
**Guardrails legales:** Ley 2300/2023, T-323/2024 + SIC 001/2025, Habeas Data 1581/2012, SLA PQRS 15 días — codificados como success criteria.
**Key insight:** El portal ya existe; el milestone no es construirlo sino darle al inquilino cómo **operar** la relación (pedir, seguir, acordar, pagar, comunicar) en vez de solo quejarse.
