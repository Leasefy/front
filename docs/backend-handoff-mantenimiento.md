# Handoff front → agent — Mantenimiento (Fixi)

> Origen: API audit `feature/mvp-1-1` (2026-08-17). El panel de Mantenimiento del front
> (`/panel/inmobiliaria/ai/mantenimiento/*`) está **mock-only**: consume 3 endpoints del agent que
> **no existen** todavía. Fixi está registrado en Mastra (`agent/src/mastra/index.ts`) pero **sin ruta
> HTTP, sin Inngest, sin caller** (solo lo llama su test). El front ya tiene las shapes definidas (los
> mocks) — este handoff las publica para que el agent exponga los endpoints.

## Endpoints a exponer (patrón `ai-hub`: `/api/agency/{agencyId}/…`, JWT + agencyRoleMiddleware)

Los consumidores front y las shapes esperadas (hoy servidas por los mocks):

### 1. `GET /api/agency/{agencyId}/mantenimiento/overview`
- Consumidor: `src/lib/hooks/mantenimiento/use-mantenimiento-overview.ts`.
- Respuesta (`MantenimientoOverviewEnvelope`): `{ kpis: MantenimientoKpis, generatedAt: string (ISO) }`.
  - `kpis`: los KPIs de salud + anti-gaming que hoy arma `getMockKpis` (ver el mock en `use-mantenimiento-overview.ts` / `src/lib/data/` para la forma exacta de cada KPI).

### 2. `GET /api/agency/{agencyId}/mantenimiento/inbox`
- Consumidor: `src/lib/hooks/mantenimiento/use-mantenimiento-inbox.ts`.
- Respuesta: lista de tickets para triage (clasificación/aprobación/proveedor). Ver la shape del mock en ese hook.

### 3. `GET /api/agency/{agencyId}/mantenimiento/tickets/{ticketId}`
- Consumidor: `src/lib/hooks/mantenimiento/use-mantenimiento-ticket.ts` (páginas de detalle de ticket).
- Respuesta: el ticket completo (clasificación, proveedor, evidencia, gate de cierre). Ver el mock.

> **Fuente de verdad de las shapes**: los mocks del front (`getMock*` en los 3 hooks). Al exponer las
> rutas, alinéenlas a esas shapes, o avísennos las diferencias y ajustamos el front. Ideal: registrarlas
> en el OpenAPI del agent (OpenAPIHono, no Hono plano) para que `pnpm api:gen` del front genere los tipos
> y borremos los tipos a mano — misma deuda de contrato que arco/ai-hub (ver §"clase Hono-plano" en la
> auditoría del agent).

## Estado del front mientras tanto
- Mock-only. **Regla del proyecto**: mock nunca en producción (`config.ts` fuerza `useMockApi=false` en
  prod, commit `726bb560`). Efecto: en prod, mantenimiento pega al endpoint inexistente y muestra un
  error crudo (`errorLoading: 404`).
- ⚠️ **Decisión abierta con el front**: qué mostrar en prod hasta que existan los endpoints —
  (a) estado honesto "Próximamente" (recomendado por el front), o (b) mock/demo también en prod (pedido
  por el agent). Ver el hilo de coordinación.
</content>
