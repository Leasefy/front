# Backend handoff — AI Hub (agent micro)

> Origen: API audit `feature/mvp-1-1` (2026-08-17). Tres features del AI Hub tienen consumidores
> **vivos** en el front pero pegan a endpoints que no existen / no aceptan el auth del browser.
> Micro: `Leasefy/agent` (`NEXT_PUBLIC_AGENT_URL`).

## 1. Detalle de work-item — endpoint fantasma (rompe 5 pantallas)

**Front llama:** `GET /api/agency/{agencyId}/ai-hub/work-items/{agente}/{id}`
(`agent-workspace.ts:200` `fetchWorkItemDetail` → `use-work-item-detail.ts`).

**Consumidores vivos (5 páginas de detalle):**
`ai/asegurabilidad/[quoteId]`, `ai/pagos/[id]`, `ai/conciliacion/[id]`, `ai/matching/[id]`, `ai/avaluos/[id]`.

**Estado back:** solo existe el **list** `GET /ai-hub/work-items?agente=…`. No hay ruta de detalle
→ las 5 pantallas caen siempre en el estado `notAvailable` (feature de detalle no funcional).

**Ask:** exponer `GET /api/agency/{agencyId}/ai-hub/work-items/{agente}/{id}` que devuelva el work-item
completo (contexto, traza/timeline, acciones disponibles). Definir el shape de respuesta (`WorkItemDetailResponse`):
el front ya tiene el tipo tentativo en `use-work-item-detail.ts` — conviene alinearlo o publicarlo en el OpenAPI
del agent para `pnpm api:gen`. Campos nullable esperados: `WorkItemAction.bodyHint`, `requiresReason`, arrays
`contexto`/`traza` posiblemente vacíos.

## 2. Métricas del agente — auth incompatible (rompe la landing IA)

**Front llama:** `GET ${NEXT_PUBLIC_AGENT_URL}/metrics` con **JWT de usuario (Supabase)**
(`use-agent-metrics.ts:64`, consumido por `ai/page.tsx`).

**Estado back:** la ruta `/metrics` existe pero está detrás de `apiKeyAuth('AGENT_API_KEY')`
(server-to-server, fail-closed). El JWT de usuario **nunca** va a ser aceptado → 401/403 perpetuo.
El `AGENT_API_KEY` **no puede** viajar al browser.

**Ask:** exponer un endpoint de métricas **por-agencia, autenticado con el JWT de usuario**, p. ej.
`GET /api/agency/{agencyId}/ai-hub/metrics` (scoreado a la agencia, sin API key). Hasta entonces el front
debería **dejar de llamar** `/metrics` (el propio comentario del hook ya lo advierte).

## 3. Chat "confirmar acción" — endpoint fantasma + choque semántico

**Front llama:** `POST /api/agency/{agencyId}/ai-hub/actions/execute`
(`ai-hub-chat.ts:392` `executeAction` → `useBetaChat.ts:1260` `confirmActionProposal`, en cada "confirmar"
de una card `action_proposal` del chat). **Esa ruta no existe** → 404 siempre.

**Ruta real más cercana:** `POST /api/agency/{agencyId}/ai-hub/chat/approvals/{approvalId}/resolve`
body `{ outcome: 'approved' | 'rejected' }`, keyed por `approvalId` (no `workItemId`). **Pero su propio
docstring dice que NO ejecuta la acción** — solo registra una señal de aprendizaje (F2). O sea: incluso
cableando correctamente, "confirmar" no ejecutaría nada.

**Ask (producto + back):** definir el contrato de "confirmar acción" en el chat:
- ¿Hay/habrá un endpoint que **ejecute** la acción vinculante al confirmar? Si sí, exponerlo y darnos su shape.
- Si `resolve` (solo aprendizaje) es lo correcto, entonces la UI del chat debe **cambiar el copy/expectativa**
  (confirmar = registrar decisión, no ejecutar) y el front debe cablear `approvals/{approvalId}/resolve`
  con `{outcome}` en vez del `actions/execute` inexistente.

## Nota transversal — codegen del agent
Varios de estos endpoints del agent son "raw routes" no registradas en el OpenAPI builder del micro
(p. ej. `work-items`, `chat/stream`), así que `pnpm api:gen`/`api:check` no las cubre y el front las tipa a
mano. Registrar las rutas en el OpenAPI del agent permitiría tipos generados en vez de contratos a mano
(ver `docs/API-AUDIT-mvp-1-1.md`).
</content>
