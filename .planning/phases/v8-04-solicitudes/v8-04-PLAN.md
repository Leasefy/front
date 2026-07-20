# v8-04 · Solicitudes (F4) — PLAN

**Goal:** reemplazar el shell de `/panel/solicitudes` con el flujo real: crear solicitud operativa,
listarlas y ver el detalle con **timeline de debido proceso** (eventos + llamados de atención) —
degrade honesto (back flag-OFF). Aditivo, sin tocar inmobiliaria.

## Contrato del back (verificado en `portal-propietario-solicitudes.ts` + `request-store.ts`)

| Endpoint | Shape |
|---|---|
| `GET /solicitudes?status&limit&offset` | `[{ id, propertyRef, contractRef: string|null, tipo, descripcion, status, rejectionReason: string|null, createdAt, updatedAt }]` |
| `POST /solicitudes` | body `{ propertyRef, tipo, descripcion (1..4000) }` (strict) → la solicitud creada |
| `GET /solicitudes/{id}` | solicitud + `timeline: (Evento | Llamado)[]` |

- **Evento**: `{ kind:'evento', at, tipo, from?, to?, rejectionReason?, motivo? }`
- **Llamado**: `{ kind:'llamado', at, situationKey }` — MÍNIMO (anti-PII, LEGAL Q5): sin notes/emisor.
- `REQUEST_TYPES`: ruido · mascotas · numero_personas · convivencia · no_renovar · reubicacion · otra.
- `REQUEST_STATUSES`: recibida · en_gestion · esperando_verificacion · resuelta · cerrada · rechazada.

**Debido proceso:** los `llamado` del timeline son los llamados de atención documentados; el front los
muestra como parte de la línea de tiempo (informativo). La decisión de terminar es humana (agencia) —
el front NUNCA sugiere "terminación elegible" ni auto-cancela.

## Sub-plan v8-04-01 — Types + service + hooks
- `owner-solicitudes.types.ts` — tipos exactos + `REQUEST_TYPE_OPTIONS` (value+label español).
- `owner-solicitudes.service.ts` — `getSolicitudes`, `getSolicitud(id)`, `crear(body)` (ownerPost).
- Hooks: `useOwnerSolicitudes`, `useOwnerSolicitud(id)`.

## Sub-plan v8-04-02 — Lista + crear
- `/panel/solicitudes/page.tsx` — loading/unavailable/lista; botón "Nueva solicitud".
- `/panel/solicitudes/nueva/page.tsx` — form: inmueble (de `getInmuebles` F3), tipo (REQUEST_TYPES),
  descripción (1..4000, con contador). Submit → `crear` → redirige a la lista o al detalle.
  (Ruta estática `nueva` gana sobre `[requestId]` — sin conflicto.)

## Sub-plan v8-04-03 — Detalle + timeline
- `/panel/solicitudes/[requestId]/page.tsx` — cabecera (tipo, estado, descripción, rejectionReason)
  + timeline unificado (eventos + llamados) ordenado, con copy honesto por tipo de entrada.

## Gates
- tsc + `next build` verdes (`/panel/solicitudes`, `/nueva`, `/[requestId]`).
- Cero imports de inmobiliaria; inmobiliaria intacto.
- **Anti-PII**: el llamado se muestra con `{situationKey, at}` solamente (sin emisor/notas).
- **Sin auto-terminación**: el front no computa ni sugiere "terminación elegible"; sólo muestra la
  línea de tiempo. La decisión es de la agencia (humana).
- Sin data falsa: back flag-OFF → "Próximamente".
