# PLAN — Phase v6-05: Informes & Insights

**Milestone:** v6.0 · **Requirements:** INFO-01..05 · **Mode:** mvp (frontend-first, additive)
**Branch:** `feat/v6.0-01-ia-unificada-command-center` · Commits: `feat(v6-05): …`
**Status:** ✅ DONE (2026-05-29) — motor puro `src/lib/insights/{types,engine}.ts` + `InsightsPanel.tsx` (por severidad, acciones, empty "al día") integrado en `/hoy` (reemplaza el placeholder; preview hasta cablear hooks). `tsc` limpio. INFO-01/02/03 cubierto por `reportes` existente.

## Contexto (honesto)
El módulo **`reportes` ya existe** y cubre buena parte de INFO-01/02/03 (cartera, comisiones, flujo-caja, extracto, export PDF/CSV) + `analytics`. El **delta real** es la capa **"de informes a insights"** (INFO-04/05): convertir la data en alertas accionables. `/hoy` (v6-01) ya dejó reservada esa zona con ejemplos "Pronto" — aquí la hacemos real.

## Goal
Un **motor de insights** (puro, con reglas reales) + un **`<InsightsPanel/>`** reutilizable que renderiza alertas accionables ("18 contratos por vencer · 6 sin gestión" → ir a contratos; "42 en mora · 11 prioritarios" → ir a cobranza; "$84M por dispersar · cubres 62%" → ir a tesorería). Integrado en `/hoy` (reemplaza el placeholder). Cada insight enlaza a su acción (INFO-05).

## Approach (additive)
1. `src/lib/insights/types.ts` — `Insight`, `InsightKind`, `InsightSeverity`, `InsightInputs`.
2. `src/lib/insights/engine.ts` — `deriveInsights(inputs): Insight[]` con reglas por umbral (contratos por vencer, mora prioritaria, por dispersar, propiedad estancada, firma pendiente). Puro/testeable.
3. `src/components/inmobiliaria/InsightsPanel.tsx` — mapa de presentación (kind → icono/color/href/i18n) + render por severidad + empty state "todo al día".
4. **Integrar en `/hoy`** — reemplazar la zona placeholder por `<InsightsPanel/>`. En dev (sin backend) los inputs vienen vacíos → muestra ejemplos "vista previa" vía el mismo componente (honesto, etiquetado); en prod el engine consume data real.
5. **i18n** es+en `inmobiliaria.insights.*`.
6. **Verificar**: test del engine (node) + `tsc` + screenshot.

## Success Criteria (INFO-04/05 — wedge)
1. Existe el engine puro `deriveInsights` con reglas reales (verificado con node).
2. `<InsightsPanel/>` renderiza insights accionables por severidad + empty "al día".
3. `/hoy` usa el panel real (no placeholder estático).
4. Cada insight enlaza a su acción (contratos/cobranza/tesorería/propiedades).
5. INFO-01/02/03: el catálogo de informes está cubierto por el módulo `reportes` existente (cross-link "Ver informes"); las categorías ERP nuevas (FE, compras, Helisa, cert. tributario) se suman cuando exista su data (M1/M2).

## Out of scope
Catálogo de informes nuevo (evitar redundancia con `reportes`); data real de insights (se cablea a hooks cuando el backend responda — en dev no hay backend).
