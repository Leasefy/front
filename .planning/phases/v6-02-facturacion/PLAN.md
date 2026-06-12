# PLAN — Phase v6-02: Facturación

**Milestone:** v6.0 · **Requirements:** FACT-01..06 · **Mode:** mvp (frontend-first, additive)
**Branch:** `feat/v6.0-01-ia-unificada-command-center` (continúa) → idealmente `feat/v6.0-02-facturacion`
**Depends on:** v6-01 (nav + sección registrada como "Pronto" → se activa aquí)
**Status:** ✅ DONE (2026-05-29) — sección frontend (4 tabs + contrato `facturacion.types.ts` + estados + empty states honestos) + nav activada; `tsc` limpio; verificado visual. Motor DIAN/issuance → M2.

> Commits: `feat(v6-02): …`. Numeración `v6-NN` (no colisionar con stream `agent`).

## Goal
Que la sección de **Facturación** de un ERP inmobiliario **exista completa en el frontend**: facturas de venta, de compra, facturación electrónica (estado DIAN/CUFE), notas débito/crédito y facturación recurrente. UI real + **contrato de api-client tipado** con **estado vacío honesto** (el motor real llega en M2; nada de data falsa persistente).

## Approach (additive)
1. **Contrato de tipos** `src/lib/api/facturacion.types.ts` — el shape que M2 (backend DIAN) implementará: `FacturaVenta`, `FacturaCompra`, `NotaCreditoDebito`, `EstadoDIAN`, `EstadoPago`, conceptos, IVA, CUFE, recurrencia.
2. **Ruta** `src/app/panel/inmobiliaria/facturacion/page.tsx` — sección con tabs: **Ventas · Compras · Electrónica (DIAN) · Notas (NC/ND)**. Cada tab: descriptor + leyenda de estados (Badge) + tabla con columnas reales + EmptyState honesto ("se conecta al motor DIAN en M2"). Banner informativo arriba. Botón "Nueva factura" (stub → toast "próximamente").
3. **Activar nav**: en `layout.tsx`, Facturación pasa de `disabled/tag:Pronto` → link real (`module: 'facturacion'` o `null`). Quitar tag.
4. **i18n** `es.json`+`en.json`: `inmobiliaria.facturacion.*` (tabs, columnas, estados, empty states, banner).
5. **Verificar**: `tsc --noEmit` + render.

## Success Criteria (FACT-01..06)
1. Existe `/panel/inmobiliaria/facturacion`, navegable desde la nav (Financiero·ERP).
2. Tab Ventas: tabla con columnas (n°, tercero, concepto, fecha, subtotal, IVA, total, estado pago, estado DIAN) + empty state.
3. Tab Compras: proveedores, estado (vencida/a crédito/pendiente) + empty state.
4. Tab Electrónica: documentos con CUFE + estado DIAN + empty state.
5. Tab Notas: NC/ND asociadas a factura + empty state.
6. Vistas tipadas contra `facturacion.types.ts`; estado vacío honesto (sin data falsa); banner explica que el motor llega en M2.

## Out of scope (M2 backend / later)
Integración real DIAN/CUFE, generación real de facturas, recaudo, persistencia — son M2 (`back-main` + proveedor DIAN). Aquí: UI + contrato + estados.
