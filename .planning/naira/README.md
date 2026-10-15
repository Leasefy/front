# Naira — planificación cross-repo en `Leasefy/front`

**Qué es Naira:** el Account Manager AI de Leasefy (determinístico por defecto, el LLM solo explica; procedencia, `asOf` y
aislamiento por inmobiliaria como piso). Su backend vive en el microservicio del agente, no acá.

**Dónde vive su roadmap:** en el repo `agent-account-manager` (worktree `/Users/nicolasgarcia/rent/agent-account-manager`,
rama `project/account-manager`), carpeta `.planning/agents/account-manager/` — `ROADMAP.md` (15 fases), `REQUIREMENTS.md`
(UI-01..03, API-01), `STATE.md` y `HANDOFF-*.md`. Esa es la fuente de verdad; esta carpeta solo guarda lo que se ejecuta en el
front.

**Qué hay acá:** la **Fase 13 (cross-repo): Superficie de Naira en `Leasefy/front`** —`phases/13-superficie-naira/`— y el
brief de sus planners (`briefs/brief-planner-13.md`). La numeración 13 es la del roadmap de Naira (orden lógico), no la del
front.

**Qué NO es esta carpeta:** no forma parte del GSD raíz del front (`.planning/ROADMAP.md`, `STATE.md`, `phases/`,
`releases/` son otro proyecto y otro tren de versiones). Nada de acá agrega filas al manifiesto de versiones del front ni
se lee con `gsd-tools phase-plan-index` / `init phase-op` (esos ven el proyecto raíz). Estado 2026-09-27: **solo
planificado** (decisión de Nico, 2026-09-26: "planificar lo que falta", sin ejecutar); ejecutar exige una autorización
nueva y que las Fases 9.5, 10, 11 y 12 del agente estén ejecutadas.
