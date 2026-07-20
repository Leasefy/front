# ROADMAP — v8.0 Portal del Propietario (front)

**Milestone:** capa de operación **post-firma** para el panel del propietario/arrendador
(`src/app/panel/(landlord)/`). Frontend-first + **aditivo** (no rompe captación ni inmobiliaria).

**Rama:** `plan/v8.0-portal-propietario` (worktree `~/rent/mvp-portal-propietario`, off
`feat/leasefy-ds-redesign` — **NO main**). Commits locales, **nada pusheado** (corte/tag = Victor,
tren de versiones).

**Started:** 2026-07-20

---

## El problema

El panel del propietario (`(landlord)`) es hoy un **embudo de captación + gestión básica**:
publica propiedad, revisa candidatos uno por uno, firma contrato, ve una suma plana de canon. Igual
que le pasaba a `/inquilino` antes del v7.0, **no tiene capa de operación post-firma**. El back del
Portal del Propietario (repo `Leasefy/agent`, rama `project/portal-propietario`, **v1 completo,
flag-OFF, cero-LLM determinístico**) ya expone 18 endpoints owner-facing bajo
`/api/portal/{agencyId}/propietario/*` — pero **no tienen front**. Este milestone construye ese front,
**sumándolo** al panel que ya existe.

## La solución — 4 pilares (del back v1)

1. **Ver mi plata** sin preguntar: pagos con concepto + histórico + **proyección** (canon × meses
   restantes) + **portafolio multi-inmueble** consolidado + **informe PDF**.
2. **Elegir inquilino**: comparar postulados **asegurables** en simultáneo y elegir **one-click**
   (WYSIWYS — el back valida el set mostrado por hash; CAS single-winner).
3. **Solicitudes con debido proceso**: solicitud operativa → la inmobiliaria intermedia; **timeline**
   + contador de **llamados de atención** (3 misma situación → terminación elegible; nunca auto-cancela).
4. **Enterarse sin ser molestado**: **digest mensual**, vista de **daños** (fail-soft, expone Martín),
   preferencias de **consentimiento** (Habeas Data).

## Reglas de aislamiento (verificadas 2026-07-20)

`(landlord)` e `inmobiliaria` están **limpiamente aislados**: route-groups hermanos sin layout padre
compartido; auth distinta (`ProtectedRoute allowedRoles={['landlord']}` vs `usePermissionsContext`
+ AGENCY_ROLES); **cero imports cruzados** en ambas direcciones. Por lo tanto:

- ✅ Rutas nuevas **solo** bajo `src/app/panel/(landlord)/`.
- ✅ Componentes nuevos en `src/components/landlord/portal/…` (dir landlord-scoped ya existe).
- ✅ `@/components/ui` + `@/lib/*` = **aditivo-only** (agregar; nunca cambiar firmas existentes).
- ✅ El módulo `inmobiliaria/ai/asegurabilidad/*` es **blueprint visual** para F2 — referencia, **NO** import.

## Idiom "back flag-OFF → Próximamente honesto"

Como el back está flag-OFF, todos los endpoints devuelven 404/403. El front usa el idiom ya presente
en el repo (`*.service.ts` traga `ApiError.status ∈ {403,404}` → devuelve vacío) para mostrar
**empty-state honesto "Próximamente"** vía `@/components/ui/empty-state`. **Nunca data falsa** en ruta
de propietario real. Cuando Victor prenda el flag, la misma UI se llena con data real.

## Infra reutilizable (del recon)

- `apiClient.{get,post,getBlob}` (`@/lib/api/client.ts`) — `getBlob` ya listo para PDFs.
- `useI18n` (`@/lib/i18n`) — claves bajo `landlord.*`; `formatCurrency/formatDate`.
- Design systems: **Cadence** (`PageHeader, KpiCard, SegmentedControl…`) + **PLan**
  (`PlanSidebar, PlanHeader, PlanTable, PlanDetailSheet, PlanStatsCard, PlanRiskBadge…`).
- `pqrs.types.ts` ya incluye `solicitante: 'propietario'` → base de F4.
- Hooks de dominio existentes: `useLeases/useLeasePayments`, `useCandidates`, `useContracts`.

---

## Fases

| Fase | Entrega | Endpoints back | Estado |
|------|---------|----------------|--------|
| **v8-01 · Fundación** | owner-service + tipos (re-export del schema del back), cableado a `/api/portal/…propietario/*`, nav "Portal" en `(landlord)`, idiom empty-state, F1 perfil | `GET /perfil` | ✅ Completo |
| **v8-02 · Ver mi plata (F3)** | portafolio consolidado, detalle inmueble, pagos, recaudo anual, proyección, descargar informe PDF | `portafolio · inmuebles · inmuebles/{ref} · inmuebles/{ref}/pagos · recaudo · recaudo/anual · proyeccion · informe.pdf` | ✅ Completo |
| **v8-03 · Elegir inquilino (F2)** | comparación simultánea de postulados asegurables + elección one-click WYSIWYS | `procesos · procesos/{id}/comparacion · POST procesos/{id}/eleccion` | ✅ Completo |
| **v8-04 · Solicitudes (F4)** | crear/listar solicitud + detalle con timeline de debido proceso | `GET/POST solicitudes · GET solicitudes/{id}` | ✅ Completo |
| **v8-05 · Daños + digest (F5)** | vista de daños fail-soft + digest mensual + preferencias de consentimiento | `danos · digest/{periodo} · digests` | ⏳ Pendiente |

## Progreso

| Fase | Plan | Ejecución | Verificación |
|------|------|-----------|--------------|
| v8-01 | ✅ | ✅ | ✅ GOAL ACHIEVED |
| v8-02 | ✅ | ✅ | ✅ GOAL ACHIEVED |
| v8-03 | ✅ | ✅ | ✅ GOAL ACHIEVED |
| v8-04 | ✅ | ✅ | ✅ GOAL ACHIEVED |
| v8-05 | ⏳ | — | — |
