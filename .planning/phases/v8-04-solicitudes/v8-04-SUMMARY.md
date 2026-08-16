# v8-04 · Solicitudes (F4) — SUMMARY

**Estado:** ✅ Completo · tsc limpio · next build verde · aislamiento + anti-PII + no-auto-terminación verificados.

## Qué se entregó

Flujo real de solicitudes: crear, listar y ver detalle con timeline de debido proceso.

### Capa de datos
- `owner-solicitudes.types.ts` — tipos exactos + `REQUEST_TYPE_OPTIONS` (7 tipos con label español) +
  `STATUS_LABELS` (6 estados). Timeline = unión `evento | llamado`.
- `owner-solicitudes.service.ts` — `getSolicitudes`, `getSolicitud(id)`, `crear(body)` (ownerPost).
- Hooks: `useOwnerSolicitudes` (lista; vacío = legítimo) y `useOwnerSolicitud(id)` (detalle+timeline).

### Vistas
- `/panel/solicitudes/page.tsx` — lista con estado/fecha + botón "Nueva solicitud".
- `/panel/solicitudes/nueva/page.tsx` — form: inmueble (reusa `getInmuebles` F3), tipo (7 opciones),
  descripción (1..4000 con contador). Submit → `crear` → detalle; unavailable→"Próximamente".
  Ruta estática `nueva` gana sobre `[requestId]` (sin conflicto).
- `/panel/solicitudes/[requestId]/page.tsx` + `SolicitudTimeline.tsx` — cabecera (tipo/estado/
  descripción/rejectionReason) + timeline unificado (eventos + llamados), newest-first.

## Invariantes respetadas
- **Anti-PII (LEGAL Q5)**: el `llamado` se muestra sólo con `{ situationKey, at }` — sin emisor/notas.
- **Sin auto-terminación**: el front NO computa ni sugiere "terminación elegible"; sólo muestra la
  línea de tiempo. La decisión de terminar es humana (agencia).
- **Acción vs degrade**: `crear` usa `OwnerActionResult` (éxito → detalle; unavailable → "Próximamente";
  error de validación → aviso con motivo).
- Sin data falsa (flag-OFF → "Próximamente"); lista vacía con agencyId → estado legítimo.

## Archivos
- NUEVOS: owner-solicitudes.types.ts, owner-solicitudes.service.ts, SolicitudTimeline.tsx,
  solicitudes/nueva/page.tsx, solicitudes/[requestId]/page.tsx.
- EDITADOS: solicitudes/page.tsx (shell→real), useOwnerPortal.ts (+2 hooks).
