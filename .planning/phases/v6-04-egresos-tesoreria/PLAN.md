# PLAN — Phase v6-04: Egresos a propietarios / Tesorería

**Milestone:** v6.0 · **Requirements:** EGR-01..04 · **Mode:** mvp (frontend-first, additive)
**Branch:** `feat/v6.0-01-ia-unificada-command-center` · Commits: `feat(v6-04): …`
**Status:** ✅ DONE (2026-05-29) — nueva vista `/tesoreria` (fórmula neto completa: canon − comisión − IVA com. − descuentos = neto; egresos table + empty state) + contrato `tesoreria.types.ts` + nav "Tesorería". **No toca `dispersiones`** (cero regresión); enlaza a él. `tsc` limpio, verificado visual.

## Contexto (importante)
El módulo **`dispersiones` ya existe y es rico**: `DispersionItem` (rentCollected/commissionAmount/netAmount), `Dispersion` (propietarioBankAccount = cuenta destino, comprobante, status), `ComisionDesglose` (tabla de desglose). Es decir, EGR-01/02/03 **ya están en buena parte**. El **gap real** frente a la visión ERP: el neto actual es solo `canon − comisión = neto`; **faltan las líneas de IVA sobre comisión y descuentos**.

## Goal
Vista ERP de **Tesorería / Egresos netos** con la **fórmula completa**: `canon recibido − comisión admin − IVA comisión − descuentos = neto`, comprobante y cuenta destino. **Aditiva — no toca `dispersiones`** (cero regresión); se cruza con él (EGR-04) vía link "procesar en Dispersiones". Cómputo autoritativo (ledger contable) → **M1 backend**.

## Approach (additive)
1. **Contrato** `src/lib/api/tesoreria.types.ts` — `EgresoNeto` (canonRecibido, comisionAdmin, ivaComision, descuentos, neto, cuentaDestino, estado, comprobanteUrl) — el shape que M1 calculará.
2. **Ruta** `src/app/panel/inmobiliaria/tesoreria/page.tsx`:
   - Header + CTA "Procesar en Dispersiones" (link a `/dispersiones` — conecta con el módulo existente).
   - Banner honesto (cómputo autoritativo → M1).
   - **Fórmula del neto** (tarjeta explicativa con ejemplo ilustrativo etiquetado).
   - **Egresos** tabla (propietario, canon, comisión, IVA com., descuentos, neto, cuenta destino, estado, comprobante) + EmptyState honesto.
3. **Nav**: agregar "Tesorería" bajo FINANCIERO·ERP (aditivo, `module: null`). Agregar al mapa de `/hoy`.
4. **i18n** es+en `inmobiliaria.tesoreria.*`.
5. **Verificar**: `tsc` + screenshot.

## Success Criteria (EGR-01..04)
1. Existe `/panel/inmobiliaria/tesoreria`, navegable.
2. Muestra la fórmula completa del neto (con IVA comisión + descuentos, que dispersiones no explicita).
3. Tabla con cuenta destino + comprobante; EmptyState honesto.
4. **NO modifica `dispersiones`** (verificable: su código intacto); se enlaza a él.

## Out of scope (M1)
Cómputo autoritativo del neto, posteo contable, generación real de comprobante, dispersal — `back-main` (M1). `dispersiones` sigue siendo la acción operativa.
