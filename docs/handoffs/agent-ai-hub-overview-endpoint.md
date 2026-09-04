# Handoff: implementar el endpoint `overview` del AI Hub en el micro `agent`

> **Para quién:** el agente / desarrollador que trabaja en el repo `Leasefy/agent`.
> **Origen:** el front (`Leasefy/front`) ya consume este contrato; hoy responde 404 y la UI lo muestra como estado "el agente aún no reporta". Este doc es el contrato exacto + la guía de implementación.
> **Autoridad del contrato:** los tipos TypeScript de este documento son un espejo **verbatim** de `front/src/lib/api/agent-workspace.ts` y `front/src/lib/api/work-item.ts`. Si algo acá contradice esos archivos, **ganan esos archivos** — no cambies el contrato sin coordinar con el front.

---

## 1. Contexto y objetivo

El front tiene una "Sala" por agente en `/panel/inmobiliaria/ai/{agente}`. Cada Sala hace, al montar:

```
GET /api/agency/{agencyId}/ai-hub/agentes/{agente}/overview
```

Ese endpoint **no existe** en el `agent` todavía (solo está registrado `ai-hub/chat/stream`). El front está codeado contra el contrato, no contra un server vivo, y maneja el 404 como `notAvailable` (empty state, no error). El objetivo es **implementar el endpoint** para que la Sala muestre KPIs + pipeline + feed reales.

**Alcance de este handoff:** el endpoint `overview` (P0 — es el que rompe la página hoy). Los endpoints hermanos (`work-items/{id}`, `autonomia`, `analitica`, `resumen`) comparten patrón y están documentados en §7 como roadmap, pero NO son parte de esta entrega.

### Agentes (`agente` path param)

`AgenteId` es un enum cerrado (roster cerrado 2026-06-08; `avaluos` agregado 2026-06-10):

```
'cobranza' | 'cotizador' | 'conciliacion' | 'pagos' | 'estudio' | 'matching' | 'avaluos'
```

El endpoint debe responder para **cualquiera** de estos 7 valores. Si un agente no tiene datos todavía, la respuesta correcta es un `200` con arrays vacíos + KPIs en cero (NO un 404 — reservá el 404 para agente inexistente / ruta no montada).

---

## 2. Contrato de respuesta (autoridad: `agent-workspace.ts`)

`GET /api/agency/:agencyId/ai-hub/agentes/:agente/overview` → `200 AgentOverviewResponse`:

```ts
type KpiFormat = 'number' | 'percent' | 'cop'

interface OverviewKpi {
  id: string
  label: string
  value: number          // percent → FRACCIÓN 0..1 (ej. 0.42 = 42%), NO 42
  format: KpiFormat
}

interface OverviewPipelineSegment {
  estado: WorkItemEstado // uno de los 8 estados (ver §3)
  count: number
}

type ActorType = 'user' | 'agent' | 'system'

interface OverviewFeedEntry {
  id: string
  titulo: string
  detalle: string
  actorType: ActorType
  occurredAt: string     // ISO 8601 con timezone (ej. "2026-07-20T14:32:00-05:00")
}

interface AgentOverviewResponse {
  agente: AgenteId       // eco del path param
  kpis: OverviewKpi[]
  pipeline: OverviewPipelineSegment[]
  feed: OverviewFeedEntry[]
  generatedAt: string    // ISO 8601 con timezone
}
```

### Reglas de los campos

- **`value` de un KPI con `format: 'percent'` es una FRACCIÓN entre 0 y 1.** El front multiplica por 100 al renderizar. Mandar `42` en vez de `0.42` muestra "4200%".
- **`format: 'cop'`** → entero en pesos colombianos (sin decimales, sin símbolo).
- **`pipeline[].estado`** debe ser uno de los 8 estados del §3. Podés omitir estados con count 0 o incluirlos en cero — el front tolera ambos. Recomendado: incluir los estados relevantes al agente aunque estén en 0, para que el pipeline no "salte" visualmente.
- **`occurredAt` / `generatedAt`**: ISO 8601 **con offset de timezone**. La app opera en calendario Bogotá (UTC-5). Serializá con offset explícito.
- **`feed`**: ordená del más reciente al más antiguo. Sugerido: limitar a ~20-50 entradas (es un feed de actividad, no un historial completo).
- **Todo `id`** debe ser estable y único dentro de su array (el front lo usa como React key).

### Ejemplo de respuesta (avaluos, con datos)

```json
{
  "agente": "avaluos",
  "kpis": [
    { "id": "solicitudes_mes", "label": "Solicitudes del mes", "value": 34, "format": "number" },
    { "id": "tasa_completado", "label": "Tasa de completado", "value": 0.82, "format": "percent" },
    { "id": "valor_promedio", "label": "Valor promedio", "value": 285000000, "format": "cop" }
  ],
  "pipeline": [
    { "estado": "detectado", "count": 5 },
    { "estado": "en_revision", "count": 3 },
    { "estado": "resuelto", "count": 26 },
    { "estado": "fallo", "count": 0 }
  ],
  "feed": [
    {
      "id": "evt_9f2a",
      "titulo": "Avalúo completado",
      "detalle": "Apartamento en Chapinero — $310.000.000",
      "actorType": "agent",
      "occurredAt": "2026-07-20T14:32:00-05:00"
    }
  ],
  "generatedAt": "2026-07-20T14:35:10-05:00"
}
```

### Ejemplo de respuesta (agente sin datos — 200, NO 404)

```json
{
  "agente": "matching",
  "kpis": [
    { "id": "matches_mes", "label": "Matches del mes", "value": 0, "format": "number" }
  ],
  "pipeline": [],
  "feed": [],
  "generatedAt": "2026-07-20T14:35:10-05:00"
}
```

---

## 3. Los 8 estados del pipeline (autoridad: `work-item.ts`)

`WorkItemEstado` — ciclo de vida unificado (AGENT-WORKSPACE-SPEC §1.2):

```
'detectado' | 'sugerido' | 'en_revision' | 'aprobado' | 'ejecutando' | 'resuelto' | 'rechazado' | 'fallo'
```

Cada agente mapea sus propios estados de dominio a estos 8. No inventes estados nuevos: el front tiene un `<PipelineBar>` genérico que solo conoce estos valores y descarta cualquier otro.

---

## 4. Autenticación y autorización (ya resuelto — reusá el patrón existente)

El front manda `Authorization: Bearer <supabase access_token>` (ver `front/src/lib/api/agent-auth.ts`). NO manda cookies.

El agent ya tiene el middleware que valida esto: **`agencyRoleMiddleware`** (`agent/src/server/middleware/agency-role.ts`). Hace, en orden:

1. **AuthN**: verifica el Bearer JWT vía `verifyAgentJwt` (path ES256/Supabase con lookup en `agency_members`, o HS256 back-main).
2. **AuthZ cross-tenant**: `jwt.agencyId === :agencyId` o 403 (un JWT de tenant A no se puede replayear contra tenant B).
3. **AuthZ rol**: busca `agency_members(tenantId, email)` bajo `withTenantScope`; si no hay fila o el rol no está en `allowed` → 403.

En caso de éxito setea en el contexto Hono: `claims`, `agencyId`, `memberRole`, `memberEmail`.

**Roles para el overview:** es una vista de lectura de dashboard → permitir los 4 roles:

```ts
agencyRoleMiddleware({ allowed: ['OWNER', 'ADMIN', 'OPERATOR', 'VIEWER'] })
```

> ⚠️ **Precondición de datos (aprendida en debugging del front):** el middleware exige una fila en `agency.agency_members(tenant_id, email)`. Una agencia aprovisionada antes de la migración del agent (2026-04-07) puede figurar `ACTIVE` en el back pero NO existir en el schema `agent.`. Si al probar te da 401/403 con un token válido, verificá que la agencia esté aprovisionada (`POST /internal/agencies/provision`) y que exista la membresía. No es un bug del endpoint — es data faltante del tenant de prueba.

---

## 5. Dónde y cómo implementarlo (guía para el repo `agent`)

### 5.1 Patrón de ruta (Hono)

Seguí el patrón de `agent/src/server/routes/agency-ai-hub-chat-stream.ts`. Crear un archivo nuevo, ej. `agent/src/server/routes/agency-ai-hub-overview.ts`:

```ts
import { Hono } from 'hono'
import { agencyRoleMiddleware } from '../middleware/agency-role.js'

type AgencyVariables = {
  claims: unknown
  agencyId: string
  memberRole: string
  memberEmail: string
}

const AGENTE_IDS = [
  'cobranza', 'cotizador', 'conciliacion', 'pagos', 'estudio', 'matching', 'avaluos',
] as const
type AgenteId = (typeof AGENTE_IDS)[number]

export const agencyAiHubOverviewRoute = new Hono<{ Variables: AgencyVariables }>()

agencyAiHubOverviewRoute.use(
  '/:agencyId/*',
  agencyRoleMiddleware({ allowed: ['OWNER', 'ADMIN', 'OPERATOR', 'VIEWER'] }),
)

agencyAiHubOverviewRoute.get(
  '/:agencyId/ai-hub/agentes/:agente/overview',
  async (c) => {
    const agente = c.req.param('agente')
    if (!AGENTE_IDS.includes(agente as AgenteId)) {
      // Agente desconocido → 404 (el front lo trata como notAvailable).
      return c.json({ error: 'unknown agente' }, 404)
    }
    const agencyId = c.get('agencyId') // ya validado por el middleware

    const overview = await buildAgentOverview(agencyId, agente as AgenteId)
    return c.json(overview) // 200 AgentOverviewResponse
  },
)
```

Registrar en `agent/src/server/index.ts` junto a las otras rutas `app.route('/api/agency', ...)`:

```ts
import { agencyAiHubOverviewRoute } from './routes/agency-ai-hub-overview.js'
// ...
app.route('/api/agency', agencyAiHubOverviewRoute)
```

### 5.2 De dónde sale la data (a resolver contra el schema `agent.`)

Esto es lo que ustedes conocen mejor que el front. La lógica de `buildAgentOverview(agencyId, agente)` debe, **scopeada por tenant** (`withTenantScope`):

- **`kpis`**: 2-4 métricas relevantes por agente. Para `avaluos` ya existe `agent/src/mastra/agents/avaluo/avaluo-service.ts` — probablemente tenga los conteos/valores que necesitás. Para el resto, agregá sobre las tablas de dominio de cada agente.
- **`pipeline`**: `GROUP BY estado` sobre los work-items/casos del agente, mapeando el estado de dominio a uno de los 8 estados unificados (§3).
- **`feed`**: las últimas N entradas de actividad (eventos, decisiones, ejecuciones) ordenadas desc por `occurredAt`, con `actorType` correcto (`user` = humano operó, `agent` = el agente actuó, `system` = automático).

> **Estrategia sugerida de entrega incremental:** implementá primero `avaluos` de punta a punta (es el que el usuario está mirando), devolviendo `200` con datos reales. Para los otros 6 agentes, podés devolver `200` con la forma correcta pero KPIs en cero / arrays vacíos hasta tener su fuente de datos. El front ya renderiza el empty state correctamente. Lo importante es NO devolver 404 para un agente válido si podés devolver la estructura vacía.

---

## 6. Criterios de aceptación

- [ ] `GET .../ai-hub/agentes/avaluos/overview` con un JWT válido de un miembro de la agencia → `200` con `AgentOverviewResponse` bien formado (agente eco, KPIs con `value` numérico, percent como fracción 0..1, `generatedAt` ISO con offset).
- [ ] Los otros 6 `agente` válidos → `200` (con datos o estructura vacía), **nunca 404**.
- [ ] `agente` inválido (ej. `foobar`) → `404`.
- [ ] Sin `Authorization` → `401`. JWT de otro tenant contra este `:agencyId` → `403`.
- [ ] Miembro con rol `VIEWER` → `200` (es lectura).
- [ ] Ningún KPI `percent` sale como entero > 1 (revisar que sea fracción).
- [ ] `pipeline[].estado` ∈ los 8 estados válidos; ningún otro string.
- [ ] Tests: al menos un caso por rama (200 con datos, 200 vacío, 404 agente inválido, 401, 403 cross-tenant). Seguí el patrón de test de las rutas existentes del agent.

### Verificación end-to-end contra el front

1. Levantá el agent en `:4000` con el endpoint montado.
2. En el front, entrá como inmobiliaria a `http://localhost:3001/panel/inmobiliaria/inmuebles/avaluos`.
3. La Sala debe mostrar KPIs/pipeline/feed reales (ya no el estado "aún no reporta").
4. En DevTools Network, `overview` debe dar `200` (antes daba `404`).

---

## 7. Endpoint de la Cola (P1 — página `/ai/{agente}/cola`)

> **Estado:** el `overview` ya está entregado. Este es el **siguiente** necesario: la página `/panel/inmobiliaria/ai/{agente}/cola` lo llama al montar. Hoy da 404 y el front lo trata como **cola vacía** (empty state, sin banner de error — `use-agent-work-items.ts:103`), así que la página funciona pero no muestra casos.

**Ojo — NO es el endpoint de detalle del §8.** Este es la **lista** (plural, query param), el otro es el **detalle** (un caso por id):

```
GET /api/agency/{agencyId}/ai-hub/work-items?agente={agente}[&status={estado}][&page={n}][&pageSize={n}]
→ 200 AgentWorkItemsResponse
```

Autoridad del contrato: `front/src/lib/api/work-item.ts`.

### Query params

- `agente` (requerido) — uno de los 7 `AgenteId`.
- `status` (opcional) — filtra por uno de los 8 `WorkItemEstado` (§3).
- `page` / `pageSize` (opcional) — paginación. Definí un `pageSize` default razonable (ej. 20) si no viene.

### Respuesta

```ts
interface AgentWorkItemsResponse {
  items: WorkItem[]
  total: number      // total SIN paginar (para el contador de la cola)
  page: number       // eco de la página servida
  pageSize: number   // eco del tamaño servido
}
```

### `WorkItem` (la unidad normalizada de trabajo humano)

```ts
type WorkItemEstado =
  | 'detectado' | 'sugerido' | 'en_revision' | 'aprobado'
  | 'ejecutando' | 'resuelto' | 'rechazado' | 'fallo'

type WorkItemFlag = 'necesita_humano' | 'en_espera' | 't323'   // acumulan; NO son estados
type Severidad = 'baja' | 'media' | 'alta' | 'critica'
type OwnerRole = 'cobrador' | 'analista_riesgo' | 'contador' | 'comercial'

interface WorkItemAction {
  id: string
  label: string
  kind: 'primary' | 'danger' | 'neutral'
  method: 'POST'
  path: string                                    // endpoint REAL ya existente, ya templado (/api/...)
  bodyHint?: Record<string, 'string' | 'number' | 'enum' | 'empty'>
  requiresReason?: boolean
  perm?: string
}

interface AccionSugerida {
  label: string
  confianza?: number                              // 0..1
  razon: string
  evidencia?: Array<{ label: string; value: string }>
}

interface WorkItem {
  id: string
  agente: AgenteId
  tipo: string
  estado: WorkItemEstado
  flags: WorkItemFlag[]
  ownerRole: OwnerRole
  severidad: Severidad
  titulo: string
  accionSugerida: AccionSugerida
  actions: WorkItemAction[]
  subject: { kind: string; id: string; masked?: string }
  amountCop?: number
  slaAt?: string                                  // ISO 8601 con offset
  createdAt: string                               // ISO 8601 con offset
  decidedBy?: string | null
  decidedAt?: string | null
  source: { endpoint: string; entity: string }
}
```

### Reglas clave

- **`actions[].path` debe ser un endpoint que YA EXISTE** en el agent, ya templado con los ids concretos. El front hace `POST` a ese path tal cual cuando el operador aprueba/rechaza (ver `runWorkItemAction` en `agent-workspace.ts`). No inventes acciones sin endpoint real detrás.
- **`total` es el conteo SIN paginar** — el front lo usa para el badge de la cola; si devolvés `items.length` en vez del total real, el contador miente.
- Agente válido sin casos → `200` con `items: []`, `total: 0` (NO 404).
- Mismo auth y patrón de ruta que `overview` (§4, §5.1). Podés montar esta ruta en el mismo archivo o en uno nuevo `agency-ai-hub-work-items.ts`.

### Ejemplo mínimo (cola vacía, agente válido)

```json
{ "items": [], "total": 0, "page": 1, "pageSize": 20 }
```

---

## 8. Roadmap: endpoints restantes (NO urgentes)

El front ya tiene el contrato de estos 4 en `agent-workspace.ts`. Mismo prefijo, auth y semántica de 404. Documentados para dimensionar el trabajo total:

| Endpoint | Responde | Alimenta en el front |
|---|---|---|
| `GET .../ai-hub/work-items/{agente}/{id}` | `WorkItemDetailResponse` | Detalle de UN caso (item + contexto + traza) |
| `GET .../ai-hub/agentes/{agente}/autonomia` | `AgentAutonomiaResponse` | Config de autonomía (modo sombra/copiloto/autónomo + vallas) |
| `GET .../ai-hub/agentes/{agente}/analitica` | `AgentAnaliticaResponse` | Página de analítica (KPIs + series diarias 30 días) |
| `GET .../ai-hub/resumen` | `AiHubResumenResponse` | Resumen del hub (6 colas por rol) |

Los tipos completos están en `front/src/lib/api/agent-workspace.ts` (líneas 59-157). Extraé el contrato de ahí igual que con `overview` y la cola.

---

## 9. Checklist de tareas (para el repo `agent`)

**Overview (§2-6) — ✅ ENTREGADO:**
- [x] **T1** — Ruta `overview` + middleware.
- [x] **T2** — `buildAgentOverview` para `avaluos`.
- [x] **T3-T4** — Estructura vacía para el resto + registro en `index.ts`.

**Cola / work-items list (§7) — P1, SIGUIENTE:**
- [ ] **T5** — Ruta `GET .../ai-hub/work-items?agente=…` con el mismo middleware, devolviendo `AgentWorkItemsResponse`.
- [ ] **T6** — Soportar filtros `status`/`page`/`pageSize`; `total` = conteo sin paginar.
- [ ] **T7** — Poblar `WorkItem.actions[].path` con endpoints REALES ya existentes del agent.
- [ ] **T8** — Agente válido sin casos → `200 { items: [], total: 0 }`.
- [ ] **T9** — Tests (200 con items, 200 vacío, filtro por status, 404 agente inválido, 401, 403 cross-tenant).
- [ ] **T10** — Verificación e2e en `/panel/inmobiliaria/inmuebles/avaluos/cola`.

**Resto (§8) — cuando haya prioridad:**
- [ ] **T11** — `work-items/{id}` (detalle), `autonomia`, `analitica`, `resumen`.

---

### Anexo: fuentes del contrato en el front (para verificar/sincronizar)

- `front/src/lib/api/agent-workspace.ts` — tipos de respuesta + fetchers (**autoridad**).
- `front/src/lib/api/work-item.ts` — `AgenteId`, `WorkItemEstado`, `OwnerRole` (**autoridad**).
- `front/src/lib/api/agent-auth.ts` — cómo el front arma el header Bearer.
- `front/src/lib/hooks/ai/use-agent-overview.ts` — cómo el front consume overview y trata el 404.
- `agent/src/server/routes/agency-ai-hub-chat-stream.ts` — patrón de ruta Hono + auth a copiar.
- `agent/src/server/middleware/agency-role.ts` — middleware de auth (ya existe, reusar).
