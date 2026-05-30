# PLAN — Phase v6-01: IA Unificada & Command Center

**Milestone:** v6.0 · **Requirements:** UNIF-01..04 · **Mode:** mvp (frontend-first, additive)
**Branch:** `feat/v6.0-01-ia-unificada-command-center`
**Status:** ✅ DONE (2026-05-29) — implemented, typecheck/lint/compile clean, verified visually (sidebar groups + `/hoy` render; dashboard no regression).

> Numeración `v6-NN` (no entero) para no colisionar con el stream `agent` v2.1-frontend (Phases 29→37+) que también commitea en `mvp`. Commits: `feat(v6-01): …`.

## Goal
Que el panel se lea/sienta como un solo ERP·CRM·Autopilot: nav agrupada en bloques + landing "Hoy" + secciones ERP nuevas registradas como "Pronto". **Sin romper ningún módulo/ruta existente.**

## What shipped (additive, backward-compatible)
- `PlanSidebar.tsx` (shared, 4 layouts): optional `kind:'section'` group label + `tag` pill ("Pronto"). Flat navs unaffected.
- `MobileNavBar.tsx` / `MobileNavSheet.tsx`: filter `kind:'section'` (+ disabled) so the bottom bar/sheet only show reachable leaves.
- `inmobiliaria/layout.tsx`: regrouped nav into 5 bloques (INICIO · AUTOPILOT · CRM·Comercial · FINANCIERO·ERP · OPERACIÓN·DOCS), all 14 prior items + 8 AI sub-routes preserved; added `Hoy` (active) + Facturación/Conciliación/PQRS/Agenda ("Pronto", disabled); orphan-section pruning after permission filter.
- `app/panel/inmobiliaria/hoy/page.tsx` (NEW): command center — framing header, reserved Insights & Alertas zone (engine → v6-05), Autopilot-activo strip, "Tu sistema" bloque map.
- i18n `es.json` + `en.json`: `inmobiliaria.nav.*` (hoy, facturacion, conciliacion, pqrs, agenda, pronto, sec*) + `inmobiliaria.hoy.*`.

## Verification (done)
`tsc --noEmit` ✅ · `next build` → "Compiled successfully" ✅ · `next lint` ✅ (also fixed a **pre-existing** build break: 4 orphan `eslint-disable @typescript-eslint/no-explicit-any` directives in 3 cotizador files) · all 14 original routes + 8 AI sub-routes intact ✅ · Hoy + grouped sidebar render, dashboard no regression ✅.

## Out of scope (later v6 phases)
Real insights engine (v6-05), facturación UI (v6-02), conciliación UI (v6-03), tercero-IA (v6-07).
