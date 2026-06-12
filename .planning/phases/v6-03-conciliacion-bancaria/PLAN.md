# PLAN — Phase v6-03: Conciliación bancaria

**Milestone:** v6.0 · **Requirements:** CONC-01..05 · **Mode:** mvp (frontend-first, additive)
**Branch:** `feat/v6.0-01-ia-unificada-command-center` (continúa) · Commits: `feat(v6-03): …`
**Depends on:** v6-01 (nav registrada como "Pronto" → se activa aquí)
**Status:** ✅ DONE (2026-05-29) — sección frontend (cargar fuente, resumen 6-casos, movimientos + empty states) + contrato `conciliacion.types.ts` + nav activada; `tsc` limpio. Parser/matching real → M2.

## Goal
Que la inmobiliaria pueda **cargar una fuente bancaria y conciliar movimientos** contra obligaciones desde el panel, con detección de casos (completo/parcial/duplicado/no-identificado/diferencia/fuera-de-fecha) y cola de revisión. UI real + contrato de tipos + estado vacío honesto; el motor de matching real llega en **M2** (`back-main`).

## Approach (additive)
1. **Contrato** `src/lib/api/conciliacion.types.ts` — `MovimientoBancario`, `CasoConciliacion`, `FuenteConciliacion`, `ResumenConciliacion`, `EstadoMatch`.
2. **Ruta** `src/app/panel/inmobiliaria/conciliacion/page.tsx`:
   - Header + "Nueva conciliación" (stub → toast).
   - Banner M2.
   - **Cargar fuente** (dropzone estilizado, stub → toast "procesamiento en M2").
   - **Resumen** strip: 6 contadores por caso (conciliados/parciales/duplicados/no-identificados/diferencias/fuera-de-fecha), todos en 0.
   - **Movimientos** tabla con columnas reales (fecha, referencia, tercero, contrato, valor banco, valor esperado, caso, acción confirmar/rechazar) + EmptyState honesto.
3. **Activar nav** (`layout.tsx`): Conciliación pasa de Pronto → link real (`module: null`).
4. **Hoy bloque map**: Conciliación deja de ser `soon`.
5. **i18n** es+en `inmobiliaria.conciliacion.*`.
6. **Verificar**: `tsc --noEmit`.

## Success Criteria (CONC-01..05)
1. Existe `/panel/inmobiliaria/conciliacion`, navegable (Financiero·ERP).
2. Zona "Cargar fuente" (Bancolombia/multi-fuente) presente.
3. Resumen distingue los 6 casos; tabla con columna "caso" + acciones confirmar/rechazar (en leyenda).
4. EmptyState honesto; sin data falsa; banner explica motor → M2.
5. Tipado contra `conciliacion.types.ts`.

## Out of scope (M2)
Parser real de archivos Bancolombia, motor de matching difuso, posteo contable — `back-main` (M2).
