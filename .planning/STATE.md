---
gsd_state_version: 1.0
milestone: v6.0
milestone_name: Backoffice Unificado ERP·CRM·Autopilot
status: in_progress
stopped_at: null
last_updated: "2026-05-30"
last_activity: 2026-05-30 — Phase v6-06 (PQRS / Solicitudes + Agenda interna) DONE + verified
progress:
  total_phases: 8
  completed_phases: 6
  total_plans: 0
  completed_plans: 0
  percent: 75
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-29)
See: .planning/ERP-CRM-AUTOPILOT-PROGRAM.md — **program backbone (6 milestones, multi-repo)**
See: .planning/research/ERP-VISION/GAP-ANALYSIS.md — **gap analysis (16 dominios) + maps por repo**
See: .planning/milestones/v6.0-{REQUIREMENTS,ROADMAP}.md — **detalle del milestone activo**

**Core value:** El usuario habla, los agentes ejecutan; el sistema opera la inmobiliaria (no es un Excel con UI).
**Current focus:** 🚧 **v6.0 — Backoffice Unificado ERP·CRM·Autopilot (frontend-first)**. Construir TODAS las secciones del ERP en el panel de forma aditiva (sin romper el CRM existente) + momentos autopilot que no dependen de motor backend.

## ⚠️ Numeración de fases — `v6-NN` (CRÍTICO)

v6.0 usa el namespace **`v6-01` … `v6-08`** (NO enteros sueltos). Razón: el repo **`agent`** corre un milestone **`v2.1-frontend`** cuyas fases (29→37→…) aterrizan commits de FRONTEND en ESTE repo (`ai/cobranza`, `ai/cotizador`). mvp ya tiene commits `32-xx`…`36-xx`, y `agent` Phase 37 (cobranza-aggregate-analytics) es la siguiente — seguirá 38, 39… Si v6.0 usara enteros (37-44) colisionaría con ese stream paralelo en el historial de mvp. Commits de v6.0: **`feat(v6-01): …`**.

## ⛔ Restricción dura del milestone (2026-05-29)

**ADITIVO — no romper el CRM existente.** El usuario fue enfático ("ya hay mucho del CRM"). Todo trabajo entra como rutas/módulos nuevos vía `canAccess(module,'view')`; la "unificación" es una capa de nav/IA encima, no un rewrite. Leer `docs/DESIGN.md` antes de cualquier UI.

## Current Position

Milestone: v6.0 — Backoffice Unificado ERP·CRM·Autopilot (frontend-first)
Phase: **v6-01..v6-06 DONE** ✅ — **v6-07 (Terceros por IA) es la siguiente**
Plan: —
Status: In progress — v6-01..v6-06 implementados + verificados (tsc limpio, rutas 200, review 3/3 PASS)
Last activity: 2026-05-30 — v6-06 PQRS / Solicitudes + Agenda interna (2 secciones + contratos pqrs/agenda.types + i18n es/en) done

Progress: [██████████████████████▓░░░░░░] 75% — 6 de 8 fases (v6-01..v6-06 ✅)

**Phases (v6-NN):**
- [x] **v6-01** IA Unificada & Command Center (UNIF) — ✅ done, branch `feat/v6.0-01-ia-unificada-command-center`
- [x] **v6-02** Facturación ⭐ (FACT) — ✅ done (sección frontend + contrato `facturacion.types.ts`; motor DIAN → M2)
- [x] **v6-03** Conciliación bancaria (CONC) — ✅ done (sección frontend + contrato `conciliacion.types.ts`; motor → M2)
- [x] **v6-04** Egresos / Tesorería (EGR) — ✅ done (vista ERP fórmula neto completa, aditiva sobre `dispersiones`; ledger → M1)
- [x] **v6-05** Informes & Insights (INFO) — ✅ done (motor `lib/insights` + `InsightsPanel` en /hoy; INFO-01/02/03 cubierto por `reportes` existente; data real → hooks/M1-M2)
- [x] **v6-06** PQRS + Agenda (PQRS/AGEN) — ✅ done (secciones `/pqrs` + `/agenda` + contratos `pqrs.types.ts`/`agenda.types.ts` + i18n es/en; PQRS-01..03 y AGEN-01..02 cubiertos; triage IA + agregación → M1. Nav-flip + i18n quedaron bundled en commits `37-07` por sesión paralela en el mismo working tree — contenido correcto, mensaje mislabeled)
- [ ] **v6-07** Terceros por IA (TERC) — agente/tool **Mastra** en `rent/agent` (reusa `extract-document.ts`)
- [ ] **v6-08** Captura propiedad foto+audio — stretch (CAPT)

**Next:** v6-07 (Creación de terceros por IA): UI de captura foto cédula/RUT / audio → revisar → guardar; el lado IA = agente/tool **Mastra** en `rent/agent`. Nota: `gsd-sdk` NO está instalado — los comandos GSD que dependan de él se corren a mano.

## ⏸️ v5.0 — Pausado (histórico)

v5.0 (Agency Plan-Gated Features & AI Agent UX) quedó **pausado 2026-05-12**. Phases 1–33 completas. Items diferidos: Automatic Reminders, Contract Expiry Reminders (overlap con INFO/notificaciones de v6.0 — reconsiderar al planear v6-05). Después, la UI de cobranza/cotizador (carpetas `ai/cobranza`, `ai/cotizador`) entró bajo el milestone `v2.1-frontend` del repo `agent` (numeración `29`→`37+`, commits `3x-xx` en mvp) — por eso el roadmap formal de mvp llegó a 33 pero hay commits `34-xx`/`35-xx`/`36-xx`.

## Previous Milestones

- v1.0 MVP Frontend (2026-01-29): 11 phases, 35 plans
- v2.0 Design System & QA (2026-02-02): 4 phases
- v3.0 Inmobiliaria Module (2026-02-08): 10 phases, 33 plans
- v3.1 Landing & SEO (2026-02-10): i18n, pricing, SEO
- v4.0 AI Agent Platform Beta (2026-02-10): 9 phases, 21 plans
- v5.0 Agency Plan-Gated Features (2026-03-26 → paused 2026-05-12): Phases 26–33
- (paralelo, repo `agent`) v2.1-frontend: Phases 29–36 done en mvp; Phase 37 next

## Decisions

| ID | Decision | Rationale | Phase |
|----|----------|-----------|-------|
| v6-numbering | v6.0 usa namespace `v6-NN`, no enteros | Evitar colisión con el stream `agent` v2.1-frontend (29→37+) que commitea frontend en mvp | v6.0 |
| v6-frontend-first | v6.0 arranca frontend-first (secciones ERP completas en UI) antes del motor backend | El motor ERP (M1) está bloqueado en decisión de arquitectura de equipo; el frontend entrega valor sin ese bloqueo | v6.0 |
| v6-additive-only | Todo el trabajo v6.0 es aditivo; no se reescribe el CRM existente | Usuario enfático: "no romper lo que ya hay" | v6.0 |
| v6-home-mvp | UI del ERP+CRM+Autopilot vive en `rent/mvp`; motor en `back-main`; IA (Mastra) en `agent`; `admin` interno | Ver GAP-ANALYSIS §3 | v6.0 |
| v6-erp-sections-now | Las secciones ERP existen en el frontend ya, con contrato api-client + estado vacío honesto | Visión "todo en uno"; backend rellena por detrás | v6.0 |
| v6-agents-mastra | Toda capacidad de IA nueva (terceros, audio→ficha, PQRS triage) = agente/tool de **Mastra** en `agent` | Framework decidido del proyecto | v6.0 |

## Session Continuity

Last session: 2026-05-29 — v6-01 done + verified; renumbered v6.0 to `v6-NN` after user flagged collision with agent v2.1-frontend.
Resume file: None

## Accumulated Context

### Roadmap Evolution
- 2026-05-29: Gap analysis de la visión ERP+CRM+Autopilot (workflow, 4 repos) → programa de 6 milestones en `ERP-CRM-AUTOPILOT-PROGRAM.md`.
- 2026-05-29: v6.0 definido (frontend-first, v6-01..v6-08) tras feedback: incluir TODAS las secciones ERP, especialmente facturación, aditivo.
- 2026-05-29: v6-01 implementado + verificado (sidebar agrupado, landing `/hoy`, secciones "Pronto"); fix de build pre-existente (4 directivas eslint huérfanas en cotizador).
- 2026-05-29: renumbered 37-44 → v6-01..v6-08 para no colisionar con el stream `agent`.

### External blockers (programa)
- Decisión de equipo: ¿qué monolito es el motor ERP? (`back-main` es scaffold; mvp consume otro backend vía `NEXT_PUBLIC_BACKEND_URL`). Bloquea M1.
- DIAN: requiere proveedor tecnológico autorizado (D2/M2).
- Credenciales: Vapi, 360dialog/Kapso, Wompi/Bold, DataCrédito, carriers Bolívar/Sekure (Phase 27 cotizador pausada).
- Dev local: `.env`/`.env.local` apunta `NEXT_PUBLIC_BACKEND_URL` a producción (api.leasefy.co) → CORS bloquea localhost; las páginas permission-gated no cargan data en dev sin backend local.
