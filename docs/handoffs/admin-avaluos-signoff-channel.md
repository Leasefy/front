# Handoff — Canal admin de firma de avalúos

> Estado: **front listo · micro de avalúos listo · falta el proxy del back admin.**
> El panel `/admin/avaluos` del front ya consume este contrato vía `adminApi`. El micro
> confirmó las 4 rutas, dejó `identities` **opcional** (broad-scope) para el canal
> service-token, y publicó el doc canónico `docs/ADMIN-AVALUO-API.md` (repo del micro) +
> el snippet `mintServiceToken` (interop probado). Falta implementar el proxy en el back
> admin usando ese snippet. Hasta entonces el panel del front muestra `ErrorBlock`.
>
> Front relacionado: `src/lib/admin/avaluos.ts` (tipos + cliente),
> `src/app/admin/(panel)/avaluos/page.tsx` (cola), `src/app/admin/(panel)/avaluos/[id]/page.tsx`
> (detalle + signoff), `src/components/admin/Nav.tsx` (`code: '28'`).

## 1. Flujo de conexión

El front **nunca** habla directo con el micro de avalúos en el canal admin. El back admin
actúa de **proxy server-to-server**, inyectando las credenciales que no pueden vivir en el browser.

```
┌─────────┐   adminApi (Bearer Supabase)      ┌──────────────┐
│  FRONT  │ ────────────────────────────────► │  BACK ADMIN  │
│ /admin  │   GET /api/v1/admin/avaluos/*      │  (NestJS)    │
│ /avaluos│                                    │              │
└─────────┘                                    │  valida:     │
     ▲                                         │  • Bearer    │
     │         respuesta del micro             │    Supabase  │
     │         (passthrough del shape)         │  • allowlist │
     └──────────────────────────────────────  │    ADMIN_EMAILS
                                               │  agrega:     │
                                               │  • service   │
                                               │    token HMAC│
                                               │  • X-Avaluo- │
                                               │    Signer    │
                                               │  • identities│
                                               └──────┬───────┘
                                                      │ Authorization: Bearer <service token>
                                                      │ X-Avaluo-Signer (solo signoff)
                                                      ▼
                                               ┌──────────────┐
                                               │ MICRO AVALÚOS│
                                               │ /api/avaluo/*│
                                               └──────────────┘
```

- El front usa el **Bearer de Supabase** (la misma auth que todo el panel admin).
- El back admin **valida** que sea admin (allowlist `ADMIN_EMAILS`) y **proxea** al micro.
- El micro confía en el **service token HMAC** (ventana replay 120s) + `X-Avaluo-Signer`.
- El `NEXT_PUBLIC_AVALUO_API_URL` (`:3003`) queda **solo** para el flujo del ciudadano
  (wizard público con capability-token); el canal admin **no** lo toca.

### Mapa de rutas (front → back admin → micro)

| Front (adminApi)                     | Back admin expone                          | Micro de avalúos                                  |
|--------------------------------------|--------------------------------------------|---------------------------------------------------|
| `GET /avaluos/pending-review`        | `GET /api/v1/admin/avaluos/pending-review` | `GET /api/avaluo/list/pending-review`             |
| `GET /avaluos/:id/detail`            | `GET /api/v1/admin/avaluos/:id/detail`     | `GET /api/avaluo/:id/detail?identities=<csv>`     |
| `POST /avaluos/:id/signoff`          | `POST /api/v1/admin/avaluos/:id/signoff`   | `POST /api/avaluo/:id/signoff`                    |
| `GET /avaluos?state=&page=`          | `GET /api/v1/admin/avaluos?state=&page=`   | `GET /api/avaluo/list/all?state=&page=`           |

### Variables de entorno

| Servicio        | Variable                         | Uso                                                        |
|-----------------|----------------------------------|------------------------------------------------------------|
| Front           | `NEXT_PUBLIC_ADMIN_API_URL`      | origen del back admin (ya existe)                          |
| Front           | `NEXT_PUBLIC_AVALUO_API_URL`     | micro avalúos — **solo flujo ciudadano** (`:3003`)         |
| Back admin      | `AVALUO_INTERNAL_URL`            | URL interna del micro (server-only, NO reutilizar la pública) |
| Back admin      | `AVALUO_SERVICE_TOKEN_SECRET`    | secreto HMAC compartido con el micro (server-only)         |
| Micro avalúos   | `AVALUO_SERVICE_TOKEN_SECRET`    | mismo secreto para validar el token                        |

### Auth server-to-server

- **Service token** (las 4 rutas): `Authorization: Bearer <token>`, HMAC-SHA256, ventana
  replay 120s. Faltante/ inválido → `403 { error: 'service token required' }`. Se genera
  uno nuevo por request. **Formato: snippet `mintServiceToken` del micro** (doc canónico
  `docs/ADMIN-AVALUO-API.md` del repo del micro; interop ya probado).
- **X-Avaluo-Signer** (solo signoff): `base64url(JSON { userId, org })`, `org ∈
  'portofino' | 'leasefy'`. Solo vale si el service token también verifica. **Nunca en el body.**
- **identities** (solo /detail): **RESUELTO** — el micro lo dejó opcional para el canal
  service-token (broad-scope si se omite). El back admin lo omite; el front nunca lo maneja.

### Puntos abiertos

1. ✅ **`identities` en /detail** — RESUELTO por el micro: opcional para el canal
   service-token (broad-scope si se omite). El back admin lo omite.
2. **Fotos y PDF** — no hay endpoint admin (gateados por capability-token del dueño). El
   detalle del front NO los muestra. Si se quieren, el micro debe exponer endpoint admin-scoped.
3. **`GET /avaluos/:id` single-item** — la data de decisión (valor, narrativa, canonLey820,
   confianza) sólo viaja en pending-review. El front la busca por id en la cola; sería más
   limpio un endpoint de un solo item. Mejora opcional.

### Avisos

- Todos los `*Bps` son **basis points** (100 = 1%).
- `city` hoy es el literal `'Inmueble'` en pending-review y `null` en list/all.
- **`docs/INTEGRATION.md` §4.1 está DESACTUALIZADO** (muestra el shape de list/all como si
  fuera pending-review; /detail no documentado). No construir desde ahí.

---

## 2. Prompt — Micro de avalúos

```
Sos el desarrollador del micro de avalúos (Next.js/API, NEXT_PUBLIC_AVALUO_API_URL,
local :3003). El front del panel admin de Leasify ya está construido y va a
consumir tu canal admin A TRAVÉS del back admin (proxy server-to-server). Tu tarea
es dejar ese canal admin listo y documentar el contrato exacto para que el back
admin pueda firmarte las requests.

## Contexto
El back admin NO reenvía el Bearer del usuario: te llama con un SERVICE TOKEN
(HMAC-SHA256, ventana replay 120s) y, solo en signoff, un header X-Avaluo-Signer.
El front nunca te habla directo.

## Objetivo
1. Confirmar que estas 4 rutas del canal admin están activas y estables:
   - GET  /api/avaluo/list/pending-review      (solo `en_revisión`, take 50, createdAt desc)
   - GET  /api/avaluo/[id]/detail?identities=<csv>
   - POST /api/avaluo/[id]/signoff
   - GET  /api/avaluo/list/all?state=<state>&page=<n>   (pageSize fijo 100)

2. DOCUMENTAR con precisión, para entregar al equipo del back admin, el esquema del
   SERVICE TOKEN que ya validás:
   - Header exacto (`Authorization: Bearer <token>`).
   - Estructura del token: qué campos contiene, qué string canónico se firma,
     cómo se calcula el HMAC-SHA256, y qué env guarda el secreto compartido
     (proponé el nombre AVALUO_SERVICE_TOKEN_SECRET si aún no existe).
   - Cómo implementás la ventana de replay de 120s (¿timestamp dentro del token?,
     ¿nonce store?). El back admin debe generar un token nuevo por request.
   - Respuesta ante token faltante/ inválido: 403 { error: 'service token required' }.

3. DOCUMENTAR el header X-Avaluo-Signer (solo signoff):
   - Formato: base64url(JSON { userId, org }), org ∈ 'portofino' | 'leasefy'.
   - Solo válido si el service token también verifica. NUNCA en el body.
   - Firmante server-derived en tu lado.

## Contrato de datos (confirmá que devolvés EXACTAMENTE esto)
- pending-review → { items: PendingReviewItem[] }
  PendingReviewItem: { id, slug, city, method, valueCop:number|null,
    bandLowCop:number|null, bandHighCop:number|null, narrativaEs:string,
    adjustments:{factor,pctBps}[], comps:{id,observedValue,observedType}[],
    canonLey820:{canonSugeridoCop,topeLegalCop,capped,incrementoMaxNote}|null,
    confianza:{nivel:'alta'|'media'|'baja',anchoRelativoBps,nota}|null }
- detail → { id, comparables:{id,observedValue,observedType,adjustments:{factor,pctBps}[]}[],
    band:{lowCop:number|null,highCop:number|null,coverageBps}|null,   // null si REFUSED
    sufficiency:{status,scoreBps,compCount}|null }
- signoff body: { action:'approve' } | { action:'reject', reason:string (min 1) }
  → approve: { id, state:'firmado', signedBy, signedAt(ISO) }
  → reject:  { id, state:'rechazado', reason }
- list/all → { items: AvaluoListItem[], total, page, pageSize }
  AvaluoListItem: { id, slug, state, valueCop:number|null, signedBy:string|null,
    signedAt:string|null, createdAt, updatedAt, city:string|null, method }
- Todos los *Bps son basis points (100 = 1%).

## Errores (mantené estos status; el back admin los propaga tal cual)
403 sin/ mal token · 429 rate limit · 503 sin DB · 422 { errors:[…] } validación ·
detail: 400 { error:'identities required' } · 400 { error:'too many identities' } (>200) ·
404 { error:'not found' } (no existe o fuera de scope) ·
signoff: 403 { error:'an authenticated reviewer session is required' } ·
404 { error:'certificate not found' } ·
409 { error:"illegal transition '…' from state '…'" }  ← concurrencia (otro admin decidió)

## DECISIÓN A RESOLVER (importante)
En /detail, `identities` es OBLIGATORIO como scope anti-IDOR. Ese modelo tiene
sentido para el capability-token del DUEÑO, pero en el canal SERVICE-TOKEN (confianza
server-to-server) el back admin no siempre conoce las identidades del dueño anónimo.
Decidí y documentá una de estas:
  (a) que el service token pueda pasar un scope amplio / identities opcional, o
  (b) exponer un endpoint admin que dado un cert id devuelva sus identities válidas,
      para que el back admin las resuelva antes de llamar a /detail.
Recomendación: (a) — para el canal service-token, identities opcional.

## Fuera de alcance / avisos que ya conoce el front
- NO hay endpoint admin para fotos ni PDF (gateados por capability-token del dueño).
  Si querés que el admin los vea, exponé un endpoint admin-scoped y avisá.
- docs/INTEGRATION.md §4.1 está DESACTUALIZADO (muestra el shape de list/all como si
  fuera pending-review, y /detail no está documentado). Actualizalo o marcá que no se use.
- `city` hoy es el literal 'Inmueble' en pending-review y null en list/all. Si podés
  mandar la ciudad real, avisá al front.

## Criterio de aceptación
- Un curl con service token válido a las 4 rutas devuelve los shapes de arriba.
- Sin token → 403. Token vencido (>120s) → 403.
- signoff approve mueve el estado a 'firmado'; un segundo signoff → 409.
- Entregado: doc del formato del service token + del X-Avaluo-Signer al back admin.
```

---

## 3. Prompt — Back admin

```
Sos el desarrollador del back admin de Leasify (NestJS/API, NEXT_PUBLIC_ADMIN_API_URL,
base /api/v1/admin). El front del panel /admin/avaluos ya está construido y te va a
llamar. Tu tarea es exponer 4 endpoints admin-scoped que actúan de PROXY hacia el
micro de avalúos, agregando las credenciales server-to-server que el front no puede tener.

## Flujo
FRONT (Bearer Supabase) → BACK ADMIN → MICRO AVALÚOS (service token + signer + identities)
El front NUNCA llama al micro directo. Vos sos el único que le habla al micro.

## Auth entrante (del front)
Igual que el resto del admin: Bearer de Supabase + allowlist ADMIN_EMAILS. Rechazá
igual que las demás rutas admin (401/403). Derivá de la sesión: userId y org
('portofino' | 'leasefy') del admin logueado.

## Endpoints a exponer (reenvían al micro)
1. GET  /api/v1/admin/avaluos/pending-review
     → micro GET /api/avaluo/list/pending-review
     → devolvé { items: PendingReviewItem[] } tal cual.

2. GET  /api/v1/admin/avaluos/:id/detail
     → micro GET /api/avaluo/:id/detail?identities=<csv>
     ⚠️ Vos resolvés e inyectás `identities` (el front NO las manda). Ver "identities" abajo.
     → devolvé AvaluoDetailResponse tal cual.

3. POST /api/v1/admin/avaluos/:id/signoff
     body del front: { action:'approve' } | { action:'reject', reason }
     → micro POST /api/avaluo/:id/signoff  (mismo body)
     → agregá header X-Avaluo-Signer derivado de la sesión. NUNCA lo pongas en el body.
     → devolvé { id, state, signedBy?, signedAt?, reason? } tal cual.

4. GET  /api/v1/admin/avaluos?state=<state>&page=<n>
     → micro GET /api/avaluo/list/all?state=&page=
     → devolvé { items: AvaluoListItem[], total, page, pageSize } tal cual.

## Credenciales que agregás al llamar al micro
- Authorization: Bearer <SERVICE TOKEN>. Generá un token NUEVO por request usando el
  snippet `mintServiceToken` del micro (doc canónico docs/ADMIN-AVALUO-API.md del repo
  del micro; interop ya probado). Ventana replay 120s.
  Secreto compartido en env (server-only, NUNCA NEXT_PUBLIC_): AVALUO_SERVICE_TOKEN_SECRET
  (mismo valor en micro y back admin).
  URL interna del micro en env: AVALUO_INTERNAL_URL (no reutilices la pública del browser).
- X-Avaluo-Signer (solo signoff): base64url(JSON({ userId, org })) de la sesión admin.

## identities (para /detail)
RESUELTO: el micro dejó `identities` OPCIONAL para el canal service-token (si se omite,
usa broad-scope). NO mandes identities — llamá a /detail sin ese query param.

## Errores (propagá el status del micro al front SIN reescribir)
403 (token) · 429 · 503 · 422 · 400 identities · 404 not found · 409 illegal transition.
El 409 es el caso de concurrencia que el front ya maneja (dos admins deciden a la vez).
El front lee el envelope { message } — mantené message legible.

## Tipos (deben coincidir byte a byte con el front; ver src/lib/admin/avaluos.ts del front)
PendingReviewItem, AvaluoDetailResponse, AvaluoListItem, SignoffResult — shapes en el
PROMPT del micro. Todos los *Bps son basis points. valueCop/bandCop son NUMBER (no string).

## Criterio de aceptación
- Con un admin logueado, las 4 rutas responden desde el front sin CORS ni auth issues.
- signoff approve → 'firmado'; reintento → 409 propagado.
- El service token y el secreto NUNCA aparecen en respuestas ni logs de red del browser.
- pending-review y detail cargan la pantalla /admin/avaluos y /admin/avaluos/:id del front.
```
