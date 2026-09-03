---
gsd_state_version: 1.0
milestone: v7.0
milestone_name: — Portal del Inquilino
status: "Roadmap creado (7 fases, 27/27 REQ mapeados) — listo para `/gsd:plan-phase v7-01`"
stopped_at: context exhaustion at 77% (2026-09-03)
last_updated: "2026-09-03T05:10:28.462Z"
last_activity: 2026-07-16 — ROADMAP.md v7.0 creado (7 fases v7-01..v7-07); traceability REQ→fase completa
progress:
  total_phases: 58
  completed_phases: 43
  total_plans: 170
  completed_plans: 158
  percent: 74
---

# Project State

## Project Reference

See: .planning/PROJECT.md
See: .planning/research/portal-inquilino/GAP-ANALYSIS.md — **gap analysis del portal (qué tiene / qué falta) + research (FEATURES/PITFALLS/ARCHITECTURE/STACK)**
See: .planning/REQUIREMENTS.md — **requerimientos v7.0 (por pilar) + traceability REQ→fase**
See: .planning/ROADMAP.md — **fases v7-01..v7-07 (goals, REQ-IDs, success criteria, deps externas)**

**Core value:** El usuario habla, los agentes ejecutan; el sistema opera la relación de arriendo (no es un Excel con UI). Para el inquilino: que pueda **OPERAR** su arriendo (pagar, pedir, ver, seguir, acordar, comunicar), no solo quejarse.

**Current focus:** 🚧 **v7.0 — Portal del Inquilino (frontend-first)**. Cierra P1: el portal `/inquilino` es hoy un **funnel de adquisición** (buscar→aplicar→firmar→pagar) **sin capa de operación post-firma**. v7.0 suma esa capa (Estado de casos, Solicitudes/PQRS, Acuerdos de pago), sube parcial→real 3 pilares (Pagos Wompi real, Documentos del arriendo, Comunicación atada al caso) y limpia superficies fake (dashboard/perfil/config). Aditivo, sin romper el CRM ni el portal existente.

## ⚠️ Numeración de fases — `v7-NN` (CRÍTICO)

v7.0 usa el namespace **`v7-01` … `v7-07`** (NO enteros sueltos), misma razón que `v6-NN`: el repo `agent` aterriza commits de FRONTEND en ESTE repo con numeración `3x-xx`; enteros sueltos colisionarían en el historial de mvp. Commits de v7.0: **`feat(v7-01): …`**. NO crear directorios de fase con enteros sueltos.

## ⛔ Restricción dura del milestone

**ADITIVO — no romper el portal `/inquilino` existente ni el CRM.** Todo entra como rutas/servicios nuevos o extensiones aditivas; **reusar** contratos existentes (`pqrs.types.ts`, `tenant-payment-requests.types.ts`, `SignatureForm`/`SignaturePad`, patrón Wompi de avalúos), NO forkear. Leer `docs/DESIGN.md` antes de cualquier UI.

## ⚖️ Guardrails legales Colombia (NO negociables — de `PITFALLS.md`, codificados como success criteria)

- PQRS reusa `pqrs.types.ts` (no forkear) · **SLA 15 días hábiles** (Ley 1480/2011) computado y visible.
- **Acuerdos NUNCA auto-aprueban** (T-323/2024 + Circular SIC 001/2025) — pasan por el gate del `agent`.
- Mensajes/recordatorios respetan el **gate de contacto** (Ley 2300/2023: máx 1/día); **no preguntar "por qué" la mora** (art. 7); nada de amenazas Datacrédito sin gate de 3 partes.
- Docs con **Habeas Data** (Ley 1581/2012): consentimiento por propósito, ARCO/borrar, sin IDOR.
- "Saldo"/"acuerdo" trazan a **única fuente de verdad** (`tenant-payment-requests.types.ts`), sin dark patterns en mora.

## Current Position

Milestone: v7.0 — Portal del Inquilino
Phase: v7-01 Fundación & Limpieza del Portal (next to plan)
Plan: —
Status: Roadmap creado (7 fases, 27/27 REQ mapeados) — listo para `/gsd:plan-phase v7-01`
Last activity: 2026-07-16 — ROADMAP.md v7.0 creado (7 fases v7-01..v7-07); traceability REQ→fase completa

## Roadmap (v7.0 — 7 fases)

| Fase | Nombre | REQ-IDs | # criterios |
|------|--------|---------|-------------|
| v7-01 | Fundación & Limpieza del Portal | BASE-01..04, PAGO-01 | 5 |
| v7-02 | Documentos del Arriendo | DOCU-01..04 | 4 |
| v7-03 | Estado de Casos (Hub) | CASO-01..03 | 4 |
| v7-04 | Pagos Reales (Wompi) | PAGO-02..05 | 4 |
| v7-05 | Comunicación | COMU-01..03 | 4 |
| v7-06 | Solicitudes / PQRS | SOLI-01..04 | 4 |
| v7-07 | Acuerdos de Pago (LAST) | ACUE-01..04 | 4 |

Orden: v7-01 → v7-02 → v7-03 → v7-04 → v7-05 → v7-06 → v7-07 (Acuerdos al final por dep dura cross-repo en `agent`).

## Previous Milestones

- v1.0 MVP Frontend (2026-01-29): 11 phases, 35 plans
- v2.0 Design System & QA (2026-02-02): 4 phases
- v3.0 Inmobiliaria Module (2026-02-08): 10 phases, 33 plans
- v3.1 Landing & SEO (2026-02-10)
- v4.0 AI Agent Platform Beta (2026-02-10): 9 phases, 21 plans
- v5.0 Agency Plan-Gated Features (2026-03-26 → paused 2026-05-12): Phases 26–33
- v6.0 Backoffice Unificado ERP·CRM·Autopilot (2026-05-29 → COMPLETO 8/8): v6-01..v6-08 frontend-first; motores DIAN/conciliación/ledger → programa M1–M3. Detalle: `milestones/v6.0-*`.
- avaluos-ui — Avalúos UI Public Valuation Flow (2026-06-03): phase 34, 5 plans.
- (paralelo, repo `agent`) v2.1-frontend: commits `3x-xx` en mvp (`ai/cobranza`, `ai/cotizador`).

## Decisions

| ID | Decision | Rationale | Phase |
|----|----------|-----------|-------|
| v7-scope-full | v7.0 = los 6 pilares del portal + limpieza (frontend-first) | Nico: es su propuesta original; el fix completo de P1 | v7.0 |
| v7-numbering | v7.0 usa namespace `v7-NN` | Evitar colisión con el stream `agent` (`3x-xx`) en mvp | v7.0 |
| v7-frontend-first | UI + contrato api-client + empty-state honesto ahora; data real detrás | Deps externas (Wompi productivo, RLS tenant en `agent`) bloquean data, no UI; mismo playbook que v6.0 | v7.0 |
| v7-additive | Aditivo — no romper el portal `/inquilino` ni el CRM; reusar contratos, no forkear | El portal ya existe (~55-60% real); es sumar capa de operación, no reescribir | v7.0 |
| v7-reuse-agency-models | Superficie tenant sobre modelos agency existentes (`SolicitudPqrs`, `SolicitudMantenimiento`, motor de acuerdos `computeOffer`/T-323) | Evita divergencia de estado con `panel/inmobiliaria` | v7.0 |
| v7-phase-order | 7 fases: Fundación → Docs → Casos → Pagos → Comunicación → PQRS → Acuerdos (LAST) | Orden dependency-aware de ARCHITECTURE.md; Acuerdos al final por dep dura cross-repo (RLS tenant en `agent`) | v7.0 |
| v7-pago01-in-base | PAGO-01 (estado de cuenta real) va en v7-01, no en v7-04 | El "próximo pago" del dashboard (BASE-01) ES el estado de cuenta real; misma data del lease-context que la fundación establece | v7.0 |
| v6-additive-only | (histórico) Todo el trabajo es aditivo; no reescribir lo que existe | Usuario enfático | v6.0 |
| v6-agents-mastra | (histórico) Toda IA nueva = agente/tool de Mastra en `agent` | Framework decidido | v6.0 |

## Session Continuity

Last session: 2026-09-03T05:10:28.449Z
Stopped at: context exhaustion at 77% (2026-09-03)
Resume file: None

## Accumulated Context

### Roadmap Evolution

- 2026-07-16: v7.0 Portal del Inquilino definido. Portal existente auditado: funnel de adquisición completo (backend real, firma OTP) **sin capa post-firma**. Gap: pilares 2/4/5 (casos, PQRS, acuerdos) FALTAN; 1/3/6 (pagos, docs, comunicación) PARCIALES; perfil/dashboard/config fake.
- 2026-07-16: ROADMAP creado — **7 fases v7-01..v7-07** derivadas de las 7 categorías (BASE+PAGO-01 fusionados en la fundación; PAGO-02..05 en Pagos). Orden dependency-aware (ARCHITECTURE.md). Acuerdos (v7-07) AL FINAL por dep dura cross-repo. Todos los pilares son UI (UI hint: yes en cada fase).

### External blockers (v7.0 — bloquean *data real*, no la UI frontend-first)

- **Pasarela real (v7-04):** Wompi/Bold productivo para arriendo (hoy PSE-mock `/pse-mock/*`). Patrón ya existe (avalúos: `WompiPayButton` + ruta server-side hash de integridad). Webhook rent-specific en NestJS.
- **`agent` tenant-scoped (v7-07, v7-03, v7-05):** rutas + RLS tenant para Acuerdos de pago (pilar 5), push de estado de casos, y gate de contacto/`requiresHumanReview` vía HTTP. Hoy agency-only; `agent` ya expone `cartera/payment-plans` con `paymentUrl`.
- **Backend NestJS (v7-01, v7-02, v7-05, v7-06):** endpoints lease-scoped (documentos/mensajes), `slaVenceAt` PQRS, perfil get/update, config actions.
- **Dev local:** `NEXT_PUBLIC_BACKEND_URL` apunta a prod (api.leasefy.co) → CORS bloquea localhost.

### v6.0 (histórico) — External blockers del programa

- Motor ERP (M1) bloqueado en decisión de equipo (¿qué monolito?); DIAN requiere proveedor autorizado (M2).
