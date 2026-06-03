---
gsd_state_version: 1.0
milestone: avaluos-ui
milestone_name: Avalúos UI — Public Valuation Flow
status: in_progress
stopped_at: null
last_updated: "2026-06-03"
last_activity: 2026-06-03 — Phase 34-avaluos-ui plan 04 (Confirmation + status polling page) DONE
progress:
  total_phases: 1
  completed_phases: 0
  total_plans: 5
  completed_plans: 4
  percent: 80
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-29)
See: .planning/ERP-CRM-AUTOPILOT-PROGRAM.md — **program backbone (6 milestones, multi-repo)**
See: .planning/research/ERP-VISION/GAP-ANALYSIS.md — **gap analysis (16 dominios) + maps por repo**
See: .planning/milestones/v6.0-{REQUIREMENTS,ROADMAP}.md — **detalle del milestone activo**

**Core value:** El usuario habla, los agentes ejecutan; el sistema opera la inmobiliaria (no es un Excel con UI).
**Current focus:** ✅ **v6.0 — Backoffice Unificado ERP·CRM·Autopilot (frontend-first) COMPLETO (8/8)**. Todas las secciones del ERP existen en el panel de forma aditiva + los momentos autopilot por IA (terceros, captura de propiedad). El motor backend (M1–M3) y los go-lives externos siguen en el programa. Próximo paso del programa: decidir/arrancar M1 (motor ERP) — ver `ERP-CRM-AUTOPILOT-PROGRAM.md`.

## ⚠️ Numeración de fases — `v6-NN` (CRÍTICO)

v6.0 usa el namespace **`v6-01` … `v6-08`** (NO enteros sueltos). Razón: el repo **`agent`** corre un milestone **`v2.1-frontend`** cuyas fases (29→37→…) aterrizan commits de FRONTEND en ESTE repo (`ai/cobranza`, `ai/cotizador`). mvp ya tiene commits `32-xx`…`36-xx`, y `agent` Phase 37 (cobranza-aggregate-analytics) es la siguiente — seguirá 38, 39… Si v6.0 usara enteros (37-44) colisionaría con ese stream paralelo en el historial de mvp. Commits de v6.0: **`feat(v6-01): …`**.

## ⛔ Restricción dura del milestone (2026-05-29)

**ADITIVO — no romper el CRM existente.** El usuario fue enfático ("ya hay mucho del CRM"). Todo trabajo entra como rutas/módulos nuevos vía `canAccess(module,'view')`; la "unificación" es una capa de nav/IA encima, no un rewrite. Leer `docs/DESIGN.md` antes de cualquier UI.

## Current Position

Milestone: v6.0 — Backoffice Unificado ERP·CRM·Autopilot (frontend-first) — ✅ COMPLETO
Phase: **v6-01..v6-08 DONE** ✅ — milestone v6.0 cerrado (8/8)

---

## Current Position — Phase 34 (Avalúos UI)

Milestone: avaluos-ui — Avalúos UI — Public Valuation Flow
Phase: 34-avaluos-ui — In progress (4/5 plans done)
Plan: 34-04 DONE, 34-05 next
Status: In progress
Last activity: 2026-06-03 — 34-04 Status polling + Wompi checkout + estado/verificar pages DONE

Progress: [████████████████████░░░░░░░░░] 80% — 4 de 5 planes (34-01 ✅, 34-02 ✅, 34-03 ✅, 34-04 ✅)

**Plans (34-NN):**
- [x] **34-01** Foundation — types, service client, /avaluo public landing — ✅ done (2026-06-03)
- [x] **34-02** Wompi session route — server-side SHA-256 integrity hash — ✅ done (2026-06-03)
- [x] **34-03** Wizard UI — AvaluoContext, AvaluoWizardShell, 4 step components, /avaluo/nuevo — ✅ done (2026-06-03)
- [x] **34-04** Confirmation + status polling page — ✅ done (2026-06-03)
- [ ] **34-05** Admin/review panel

**Phases (v6-NN):**
- [x] **v6-01** IA Unificada & Command Center (UNIF) — ✅ done, branch `feat/v6.0-01-ia-unificada-command-center`
- [x] **v6-02** Facturación ⭐ (FACT) — ✅ done (sección frontend + contrato `facturacion.types.ts`; motor DIAN → M2)
- [x] **v6-03** Conciliación bancaria (CONC) — ✅ done (sección frontend + contrato `conciliacion.types.ts`; motor → M2)
- [x] **v6-04** Egresos / Tesorería (EGR) — ✅ done (vista ERP fórmula neto completa, aditiva sobre `dispersiones`; ledger → M1)
- [x] **v6-05** Informes & Insights (INFO) — ✅ done (motor `lib/insights` + `InsightsPanel` en /hoy; INFO-01/02/03 cubierto por `reportes` existente; data real → hooks/M1-M2)
- [x] **v6-06** PQRS + Agenda (PQRS/AGEN) — ✅ done (secciones `/pqrs` + `/agenda` + contratos `pqrs.types.ts`/`agenda.types.ts` + i18n es/en; PQRS-01..03 y AGEN-01..02 cubiertos; triage IA + agregación → M1. Nav-flip + i18n quedaron bundled en commits `37-07` por sesión paralela en el mismo working tree — contenido correcto, mensaje mislabeled)
- [x] **v6-07** Terceros por IA (TERC) — ✅ done CROSS-REPO. **agent** (`0cd2dff` + `0d53f61`): `POST /terceros/extract` (tool `extract-tercero.ts` Claude Vision base64/URL + ruta Hono JWT+role + 5 tests; `0d53f61` = hardening del review: bodyLimit 12MB + rate-limit 20/min por usuario). Review v6-07 adversarial: wiring/contract PASS, design PASS, security 2 MEDIUM (fixed). **mvp** (`ddcc218`): botón aditivo "Crear con IA" en propietarios → captura foto cédula/RUT → fetch al agente con JWT → prellena `PropietarioForm` → guarda con el handler manual existente (flujo manual intacto). Contratos `terceros-extract.{types,service}.ts` + i18n. TERC-01..04 cubiertos. E2E real requiere agente corriendo + JWT válido.
- [x] **v6-08** Captura propiedad foto+audio — stretch (CAPT) — ✅ done CROSS-REPO. **agent** (`e5f01f1`): `POST /property-capture/extract` (tool `extract-property.ts` = OpenAI Whisper transcribe + Claude ficha + descripción comercial, fotos opcionales vía Vision; ruta Hono JWT+role+bodyLimit 24MB+rate-limit 10/min; 6 tests). **mvp** (`ee30376`): botón aditivo "Capturar con IA" en propiedades → ruta `/propiedades/captura` con `PropertyIACapture` (grabar audio MediaRecorder + fotos → extrae → form de revisión editable → `propertiesApi.create`). Manual `/nueva` intacto. CAPT-01..04 cubiertos. E2E real requiere agente corriendo + OPENAI/ANTHROPIC keys + JWT.

**Next (programa, no v6.0):** v6.0 frontend-first está COMPLETO. Lo que sigue es el motor backend y go-lives externos (otra milestone del programa): **M1** decidir/arrancar el motor ERP (conciliación, ledger/tesorería autoritativo, posteo contable); **M2** facturación electrónica DIAN (proveedor autorizado); luego cablear data real en las secciones v6 (reemplazar empty-states/contratos por hooks). Push + PR de ambas ramas (mvp + agent) cuando el usuario lo confirme. Nota: `gsd-sdk` NO está instalado.

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

Last session: 2026-06-03 — 34-04 done (useAvaluoStatus hook, WompiPayButton, AvaluoEstadoCard, estado/[submissionId], verificar/[slug]).
Stopped at: Completed 34-04-PLAN.md
Resume file: .planning/phases/34-avaluos-ui/34-05-PLAN.md

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
