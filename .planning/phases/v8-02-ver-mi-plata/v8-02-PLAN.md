# v8-02 · Ver mi plata (F3) — PLAN

**Goal:** reemplazar el shell de `/panel/portafolio` con la vista real "Mi plata" del propietario,
cableada a los 8 endpoints de finanzas del back — degradando honesto a "Próximamente" mientras el
back esté flag-OFF. Aditivo, sin tocar inmobiliaria ni captación.

## Contrato del back (finanzas, verificado en `portal-propietario-finanzas.ts`)

| Endpoint | Shape (fuente de verdad — se lee verbatim, sin aritmética de cliente) |
|---|---|
| `GET /portafolio` | `{ totalProperties, occupied, vacant, occupancyPct, recaudoMesActual, openRequestsCount, vacantDetail[], contractsExpiring[{propertyRef,propertyLabel,tenantDisplayName,endDate,daysLeft,preaviso}] }` |
| `GET /inmuebles` | `[{ propertyRef, label, occupancyStatus, contract: {canonCop,endDate,daysRemaining,tenantDisplayName}|null }]` |
| `GET /inmuebles/{ref}` | `{ property, contract|null, novedades[], recaudo? }` (payload de novedad restringido a claves no-PII) |
| `GET /inmuebles/{ref}/pagos?limit&offset` | `{ total, items[{paymentRef,contractRef,amountCop,paidAt,concepto,periodo}] }` |
| `GET /recaudo?months` | `{ months[], total[{month,amountCop}], byProperty[] }` |
| `GET /recaudo/anual?year` | `{ year, totals[{concepto,totalCop,paymentsCount}] }` |
| `GET /proyeccion` | `{ months[{month,totalCop,byProperty[]}], assumptions[] }` |
| `GET /informe.pdf` | PDF (blob vía `apiClient.getBlob` / fetch a agent) |

## Sub-plan v8-02-01 — Service + types

- `src/lib/api/owner-finanzas.types.ts` — tipos frontend-first EXACTOS de los 8 shapes (misma
  disciplina que v8-01: se migra a `components['schemas']` cuando el back esté en el schema generado).
- Extender `owner-portal.service.ts` (o `owner-finanzas.service.ts`) con:
  `getPortafolio, getInmuebles, getInmueble(ref), getPagos(ref,{limit,offset}), getRecaudo(months),
  getRecaudoAnual(year), getProyeccion` (todos degrade→null) + `getInformePdf()` (blob, degrade→null).
- Hook `useOwnerFinanzas` en `useOwnerPortal.ts`: carga portafolio+inmuebles+proyeccion,
  expone `{ ...data, isLoading, unavailable }`.

## Sub-plan v8-02-02 — Hub "Mi plata" (`/panel/portafolio/page.tsx`)

Reemplaza el shell. Si `unavailable` → EmptyState "Próximamente" (una sola vez). Si hay data:
- **KPI strip** (Cadence `KpiCard`): inmuebles, ocupación %, recaudo del mes, solicitudes abiertas.
- **Mis inmuebles**: lista/tabla con canon, inquilino, días restantes → link a detalle.
- **Contratos por vencer**: card con `daysLeft` + preaviso (informativo, sin countdown alarmista).
- **Recaudo anual por concepto** + **proyección** (lista de meses; montos verbatim).
- **Descargar informe** (botón → `getInformePdf` → blob download). Deshabilitado si unavailable.

Money SIEMPRE con `formatCurrency` de `useI18n`, leído verbatim (sin recomputar totales).

## Sub-plan v8-02-03 — Detalle de inmueble (`/panel/portafolio/[propertyRef]/page.tsx`)

- Cabecera del inmueble + contrato (canon, vigencia, inquilino, preaviso).
- **Historial de pagos** (`/pagos`, con concepto/monto/fecha/periodo, paginado por limit/offset).
- **Novedades** (payload no-PII, verbatim).
- Degrade honesto si el detalle no está disponible.

## Gates
- tsc limpio + `next build` verde (rutas `/panel/portafolio` y `/panel/portafolio/[propertyRef]`).
- Cero imports de inmobiliaria; `inmobiliaria/*` sin cambios.
- **Cero aritmética de dinero en cliente** — montos leídos verbatim del shape del back.
- Sin data falsa: con back flag-OFF, la página muestra "Próximamente", no números inventados.
- Preaviso/vencimientos informativos (sin `destructive`/countdown alarmista — doctrina de v7).
