# v8-05 · Daños + digest (F5) — PLAN

**Goal:** reemplazar el shell de `/panel/novedades` con: (1) resumen mensual (digest) listable +
detalle, y (2) vista de daños **fail-soft** — degrade honesto (flag-OFF / `available:false`).
Aditivo, sin tocar inmobiliaria. **DS-correct desde el arranque** (tokens Cadence, numerales mono,
primitives Badge/Card).

## Contrato del back (verificado en `portal-propietario-danos-digest.ts` + `build-digest.ts`)

| Endpoint | Shape |
|---|---|
| `GET /danos?propertyRef` | `{ available: boolean, tickets: [{ id, propertyRef, category: string|null, severity: string|null, estadoDisplay: 'en_proceso'|'resuelto'|'cerrado', createdAt, resolvedAt: string|null, costoFinalCop: number|null }] }` |
| `GET /digests` | `[{ periodo, generatedAt, deliveredAt: string|null, deliveryChannel: string|null }]` |
| `GET /digest/{periodo}` | `{ periodo, payload: DigestPayload, generatedAt, deliveredAt, deliveryChannel }` |

`DigestPayload` = `{ periodo, generadoEn, recaudo{totalCop,porInmueble[]}, ocupacion{...},
solicitudes{creadas,resueltas,abiertas,nota}, danos{available,resueltosCount,resueltos[]},
contratosPorVencer[], actionItems{decisionesPendientes[],preavisos[]} }`.

**Invariantes:**
- **Daños fail-soft:** `available:false` (tabla de Martín ausente) → sección "Próximamente" SOLO para
  daños, no rompe la página. El resto del hub sigue.
- **PII-minimización:** el payload ya viene minimizado por el back (labels/montos/fechas); el front lo
  muestra tal cual.
- **Montos verbatim** + `font-mono tabular-nums`.

## Sub-plan v8-05-01 — Types + service + hooks
- `owner-novedades.types.ts` — `DanosResponse`, `DamageTicket`, `DigestListItem`, `DigestPayload`, `Digest`.
- `owner-novedades.service.ts` — `getDanos(propertyRef?)`, `getDigests()`, `getDigest(periodo)`.
- Hooks: `useOwnerNovedades` (digests + danos en paralelo), `useOwnerDigest(periodo)`.

## Sub-plan v8-05-02 — Hub Novedades (`/panel/novedades/page.tsx`)
- loading/unavailable/data. Secciones:
  - **Resumen mensual**: lista de digests (periodo, entregado/generado) → link a detalle.
  - **Daños de tus inmuebles**: si `available:false` → nota "Próximamente"; si tickets → lista con
    estado (Badge), categoría/severidad, costo final (mono) y fechas.

## Sub-plan v8-05-03 — Detalle de digest (`/panel/novedades/[periodo]/page.tsx`)
- Render del `DigestPayload`: recaudo del mes, ocupación, solicitudes (creadas/resueltas/abiertas),
  daños resueltos, contratos por vencer, action items (decisiones pendientes + preavisos). Todo
  informativo, numerales mono, sin alarmismo.

## Gates
- tsc + `next build` verdes (`/panel/novedades`, `/[periodo]`).
- Cero imports de inmobiliaria; inmobiliaria intacto.
- **DS**: tokens Cadence, `font-mono tabular-nums` en números, `Badge` para estado de daños.
- **Fail-soft** de daños respetado (`available:false` no rompe).
- Sin data falsa: flag-OFF → "Próximamente".
