# Recorrido del inquilino, lado inmobiliaria — qué falta del back

**Para:** Víctor · **De:** Nico · **Fecha:** 2026-08-08
**Repo front:** `rent/mvp` · rama `feat/recorrido-inmobiliaria`
(worktree `~/rent/mvp-inmobiliaria`, `:3002`)

Tercero de la serie. Los otros dos cubren al inquilino:
`HANDOFF-VICTOR-RECORRIDO-INQUILINO.md` (recorrido público) y
`HANDOFF-VICTOR-PANEL-INQUILINO.md` (su panel). Este cubre **lo que la
inmobiliaria tiene que hacer con lo que el inquilino le manda** — los pasos 7 a
11 del flujo que acordamos.

---

## TL;DR — 2 bloqueos nuevos, 1 pregunta

| # | Qué | Severidad |
|---|-----|-----------|
| 1 | **`AGENT_API_KEY` no está en el `.env` del back** → *todo* onboarding de inmobiliaria falla | 🔴 corta el registro entero |
| 2 | **Un fallo de aprovisionamiento traba la cuenta para siempre** | 🔴 sin salida desde la UI |
| 3 | ¿El `applicationId` del funnel es el mismo id que devuelve `GET /landlord/candidates`? | 🟠 pregunta |

Sigue vigente lo de antes: **el funnel sin pushear**. Sin eso el paso 7 no
tiene de dónde leer.

---

## 🔴 1. `AGENT_API_KEY` falta en el `.env` del back

Ninguna inmobiliaria puede registrarse. Verificado de punta a punta:

```
POST /users/me/onboarding  { userType: "INMOBILIARIA", agency: {...} }
  → 400  "No se pudo completar el registro de la inmobiliaria."
```

La cadena, leyendo `users.service.ts:717-737`:

1. El onboarding llama a `agentProvisioningClient.provision(...)`.
2. El cliente arma el header con
   `this.apiKey = config.get('AGENT_API_KEY') ?? ''`
   (`agent-integration/agent-provisioning.client.ts:162`).
3. **Esa variable no existe en el `.env` del back.** Sale
   `Authorization: Bearer ` (vacío).
4. El agente responde **401**.
5. El back lo clasifica como `AgentProvisioningPermanentError` → `400` y marca
   la agencia `FAILED`.

Que es solo la env lo confirma la sonda directa contra el agente, con la key
que el agente sí tiene en el suyo:

```bash
curl -X POST http://localhost:4100/internal/agencies/provision \
  -H "Authorization: Bearer $AGENT_API_KEY" -H 'Content-Type: application/json' \
  -d '{"tenantId":"…","legalName":"Sonda QA","nit":"900000009-1","primaryContactEmail":"sonda@qa.co"}'

→ 200 {"tenantId":"…","agencyId":"…","status":"PROVISIONED"}
```

**Lo que hice de mi lado:** agregué `AGENT_API_KEY` al `.env` local del back
(copiada de `~/rent/agent-develop/.env`), con backup en `.env.bak-claude`.
**No la tomó todavía**: ese proceso corre desde `dist/` sin watch, levantado el
6 de agosto. Necesita reinicio.

**Lo tuyo:** que la variable esté en el `.env.example` del back y en los
entornos desplegados. Si en producción tampoco está, ninguna inmobiliaria se
registró nunca por este camino.

---

## 🔴 2. Un fallo de aprovisionamiento traba la cuenta para siempre

Este es peor que el anterior, porque sobrevive al arreglo del anterior.

Al primer fallo permanente la agencia queda `provisioningStatus: FAILED`. El
siguiente intento —con cualquier dato, incluso corregido— responde:

```json
{ "statusCode": 400,
  "message": "El registro de esta inmobiliaria no se pudo completar previamente. Contacta a soporte para reintentar." }
```

**No hay salida desde la UI.** La persona quedó con cuenta creada, sin agencia,
y su único camino es escribirle a alguien. Quemé tres cuentas de prueba así
antes de entender qué pasaba.

Lo llamativo es que el propio cliente dice que reintentar es seguro
(`agent-provisioning.client.ts:174-176`):

> *"Idempotent on `tenantId` on the agent side — a retry after a prior failure
> completes as a first success (REQ-1105), so it is always safe for us to retry
> with the SAME payload."*

El agente aguanta el reintento. El que no reintenta es el back: la rama
`AgentProvisioningPermanentError` marca `FAILED` y no vuelve a intentar nunca.

**Sugerencia:** que `FAILED` no sea terminal para un reintento explícito del
usuario, o que exista una ruta que lo destrabe. Hoy un 401 de configuración
—algo que se arregla en un minuto— deja cuentas muertas de forma permanente.

---

## 🔴 2b. Una inmobiliaria recién registrada recibe 401 de TODO el agente

Encontrado después de arreglar lo anterior y entrar de verdad al panel con una
agencia nueva.

Todas las llamadas al agente responden `401 {"error":"Unauthorized — invalid
token"}` — no solo el funnel: también `my-permissions`. Verificado **directo
contra `:4100`**, sin pasar por el proxy del front, con un token recién emitido
y válido.

La causa está en `agency-jwt.ts:25-28`: en el camino ES256 (los tokens nuevos
de Supabase), el agente **no confía en un `agencyId` del token** — lo resuelve
buscando al usuario en `agency_members(tenantId, email)`.

`POST /internal/agencies/provision` crea el tenant *mínimo* pero **no deja al
usuario como miembro**. La membresía la crea el segundo paso,
`POST /onboarding/start`, que manda un magic link por correo.

O sea: entre que la inmobiliaria termina de registrarse y que alguien abre ese
correo, **el panel le muestra todos los módulos de IA y todos le fallan**. No
hay nada en pantalla que explique por qué.

**Preguntas:** ¿el magic link es obligatorio para dejar la membresía, o
`provision` debería crearla? Y si es obligatorio, ¿el panel debería saber que
la agencia todavía no está anclada, para decirlo en vez de dar 401 en cada
tarjeta?

---

## 🟠 3. ¿`applicationId` del funnel == `id` de `/landlord/candidates`?

El agente devuelve, por postulación:

```ts
{ applicationId, verdict, score, level, requiresManualReview, escalate, scoredAt }
```

Un id opaco y nada más. Sin nombre ni propiedad, la bandeja del paso 7 es una
lista de `mock-app-0001…` que no le dice nada a quien opera.

`GET /landlord/candidates` sí tiene esos datos (`id`, `tenantName`,
`propertyId`, `propertyTitle`), así que el front **cruza las dos fuentes por
id**. Con eso la fila muestra el nombre real y puede enlazar a la comparación
de candidatos de esa propiedad.

**Lo que necesito que confirmes:** que son el mismo identificador. Son dos
bases distintas y no lo di por hecho — si no cruza, la fila cae a la
referencia corta sin enlace, en lugar de inventar un nombre o mandar a una ruta
que no resuelve. Funciona igual en los dos casos; la diferencia es si sirve.

---

## 🟠 4. Del paso 7 al 8 no se puede saltar

`/ai/estudio/[id]` espera un **`runId` de tenant-scoring** (lee
`GET /tenant-scoring/:runId`), no un `applicationId`. El funnel no devuelve
`runId`.

O sea: llega una postulación evaluada y **no hay forma de abrir su evaluación**
desde la bandeja. Hoy el front no pone ese enlace a propósito — un enlace a una
ruta que no resuelve es peor que no tenerlo.

**Con que el funnel devuelva el `runId` (o un endpoint
`applicationId → runId`), la cadena queda completa.**

---

## Lo que ya está hecho del lado del front

**Paso 7 — `/panel/inmobiliaria/recorrido`.** La bandeja que no existía.
Consume `GET {AGENT_URL}/api/agency/{agencyId}/funnel/applications`, ordena por
antigüedad (las más viejas arriba) y marca las que piden revisión humana.

**El hilo.** `src/lib/recorrido/pasos.ts` define los 11 pasos una sola vez, con
quién actúa en cada uno. Una tira compacta dice, en las pantallas que ya
existían, en qué paso estás y qué sigue — se agregó a la cola de estudio (8),
candidatos (9 y 10) y contrato nuevo (11). Ninguna pantalla se movió ni se
renombró.

**Un mock que producción podía servir.** `funnel-applications.service.ts` era
el tercer servicio con modo mock y el único sin la guarda de producción — su
comentario afirmaba lo contrario. Bastaba que faltara `NEXT_PUBLIC_AGENT_URL`
en el deploy para mostrarle a una inmobiliaria real cuatro candidatos
inventados. Cerrado, con tests.

---

## Lo que falta y es del front (no tuyo)

Para que no lo persigas: el paso 9 todavía no compara lado a lado, el 10 deja
sin estado a los candidatos no elegidos —y al inquilino le prometimos avisarle—
y el 11 no registra qué aseguradora aprobó ni con qué número. Eso lo sigo yo.

---

## Cómo reproducir

```bash
# front :3002 · back :3000 · agente :4100
cd ~/rent/mvp-inmobiliaria && pnpm dev -p 3002

# El bloqueo 1, en una línea:
curl -s -X POST http://localhost:3000/users/me/onboarding \
  -H "Authorization: Bearer <token de un usuario nuevo>" \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"QA","lastName":"X","userType":"INMOBILIARIA","agency":{"name":"QA","nit":"900000001-1"}}'
```

Sin `AGENT_API_KEY` en el back, siempre 400. Y esa cuenta ya no se recupera.
