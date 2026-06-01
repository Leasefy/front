# HANDOFF para Víctor (backend) + tu Claude — v6.0 ERP·CRM·Autopilot · revisión & hardening

> **Qué es esto:** el estado COMPLETO, honesto y accionable de todo lo construido sobre los repos `mvp` (frontend Next.js 14) y `agent` (microservicio IA). Este documento es el **índice maestro y la guía de revisión backend**. Reúne: el milestone v6.0, lo que se hizo en las sesiones 2026-05-30 → 2026-06-01, una auditoría funcional honesta, la revisión experta del código, y — lo nuevo y central — una **guía de revisión & hardening para ti como ingeniero de backend** sobre código que fue *vibe-coded* (construido rápido con IA, todavía sin revisión rigurosa de backend).
>
> **Premisa honesta:** este código funciona en su mayoría en modo stub y tiene buen "cerebro", pero **no ha pasado una revisión de backend de producción**. Tu trabajo no es solo desplegarlo: es **escrutarlo y endurecerlo**. La §6 es el corazón de este doc.
>
> **Fecha:** 2026-06-01 · **Autor de los cambios:** sesiones Claude de Nico (cuenta `nicolasgardila`, **sin push access al repo `agent`**).

---

## 1. Cómo usar este doc con tu Claude + orden de lectura

Pásale a tu Claude este archivo **+** los 2 reportes en `mvp/claudedocs/`. Orden de lectura recomendado:

1. **Este doc** (`HANDOFF-VICTOR-v6.md`) — el mapa maestro. Empieza por §2 (TL;DR) y §6 (hardening).
2. **`mvp/claudedocs/v6-functional-audit.md`** — auditoría funcional de TODO el sistema (13 componentes, matriz honesta, 18 bugs high/critical con file:line). La fuente de verdad del *estado funcional*.
3. **`mvp/claudedocs/v6-expert-review.md`** — revisión experta del milestone v6.0 (45 hallazgos confirmados, con file:line). El detalle más fino de cada bug del frontend y de v6-07/08.
4. Estado del lado agent: `agent/.planning/STATE.md` y `agent/HANDOFF-VICTOR.md` (cotizador / phases pausadas / blockers de credenciales).

> ⚠️ **Advertencia sobre file:line:** el repo `agent` fue **restructurado** en carpetas por dominio bajo `src/` (`auth`, `billing`, `cartera`, `centrales`, `compliance`, `crm`, `email`, `erp`, `followup`, `inngest`, `legal`, `lib`, `mastra`, `onboarding`, `payments`, `qa`, `server`, `services`, `types`, `voice`, `whatsapp`). Las refs file:line de las auditorías viejas (paths como `src/server/index.ts:452`, `src/mastra/tools/...`) están **stale**. Las refs de este doc fueron verificadas contra el código ACTUAL (branch `restructure/per-agent-organization`, commit `bcd3193`) el 2026-06-01.

---

## 2. TL;DR — lo que debes internalizar primero

1. **Esto fue vibe-coded.** Hay mucho software y muchos tests, pero **no ha tenido revisión de backend**. La §6 te da un checklist concreto de qué escrutar, el riesgo, y el fix correcto, con file:line real. Es lo que te pidió Nico.
2. **El frontend (`mvp`) está pusheado al PR #14.** El backend de IA (`agent`) tiene **4 commits LOCALES sin pushear** (`09ff301`, `3d8e398`, `30fb573`, `5616e76`) — la cuenta de esta sesión **no tiene write access** a `Leasefy/agent`. **TÚ debes pushearlos + desplegar.** (Verificado: el branch `restructure/per-agent-organization` no tiene tracking remoto con esos commits.)
3. **Hoy nada de cara al cliente corre end-to-end** — por dos razones: (a) faltaban CORS/JWT en el agent (YA arreglados en código por los 4 commits, falta deploy + env) y (b) faltan credenciales externas (Vapi, 360dialog, Wompi, DataCrédito, carriers) y el motor ERP M1/M2 que **no existe**.
4. **Hay un deploy-blocker introducido por el propio fix de JWT:** el gate de secretos (`assert-production-secrets.ts:39-40`) **no reconoce `SUPABASE_JWKS_URL`** como fuente válida de firma, pero esa es justo la var que el commit `3d8e398` empezó a usar en prod. Con un deploy "correcto" (solo `SUPABASE_JWKS_URL`), el server hace `process.exit(1)` y **no arranca**. Verificado en código. Arréglalo ANTES de pushear (§6-A1).
5. **El "cerebro" está; las "extremidades" no.** La orquestación (Mastra, state machines), el scoring determinístico, el OCR Vision y los guardrails de compliance están construidos y razonablemente probados. Lo que falta son: integraciones que **ni existen** (buró real, despachador de cadencia, envío/reasignación en matching, pasos 7-8 del validador, los 4 carriers reales) e integraciones **env-gated listas pero nunca verificadas en vivo** (360dialog, Vapi, Wompi/Bold).
6. **Riesgo de seguridad de máxima prioridad: el aislamiento multi-tenant es decorativo.** El rol de conexión de Postgres tiene `rolbypassrls=true` → todas las políticas RLS `tenant_isolation` son no-ops en runtime. `withTenantScope` setea un GUC que nada hace cumplir. **Bloqueante antes de PII/dinero real multi-tenant** (§6-B).
7. **El dinero no se mueve.** La dispersión (`daily-dispersion.ts`) solo escribe un ledger con cuenta bancaria stub; no hay integración SPT real. Los links de pago inbound son URLs stub no pagables. **Bloqueante antes de operar con dinero real** (§6-B).

---

## 3. El ecosistema de repos (`~/rent/`)

| Repo | Qué es | Tech | Estado en estas sesiones |
|---|---|---|---|
| **`mvp`** (`Leasefy/front`) | Frontend del panel inmobiliaria (ERP·CRM·Autopilot) + UI de los agentes | Next.js 14 App Router, React, TS, Tailwind, Phosphor, i18n propio, Lenis | **Trabajo nuevo, pusheado a PR #14**. `tsc --noEmit` → exit 0 (limpio) |
| **`agent`** (`Leasefy/agent`) | Microservicio IA: agentes Mastra + tools, Inngest (pipelines/crons), servidor Hono (~91 rutas), Prisma + Supabase | Mastra, Vercel AI SDK, Claude (Anthropic), OpenAI Whisper, Hono, Inngest, Prisma | **4 commits LOCALES — falta tu push + deploy** |
| **`back-main`** (`Leasefy/back`) | Monolito NestJS — designado "motor ERP" (M1/M2) | NestJS | **Scaffold — el motor ERP NO existe** |
| **`admin`** | Panel interno de ops de Leasefy | Next.js 14, :3100 | No tocado |
| **`avaluo`** | App de avalúos (appraisal) | Next.js 14 + Prisma | **No tocada** — esfuerzo aparte si requiere trabajo |
| **`mvp-agents-sandbox`**, **`roadmap`** | Sandbox / roadmap | — | No tocados |

**Reparto de responsabilidades:** UI = `mvp` · motor ERP = `back-main` (a decidir, ver §10) · IA = `agent` (Mastra) · ops internas = `admin`.

**Dos backends, dos clientes HTTP distintos** (no confundirlos):

| | Monolito (ERP/CRM) | Microservicio `agent` (IA) |
|---|---|---|
| Env var | `NEXT_PUBLIC_BACKEND_URL` | `NEXT_PUBLIC_AGENT_URL` |
| Valor (`.env.local`) | `https://api.leasefy.co/api` ⚠️ **incluye `/api`** (vivo y desplegado) | `http://localhost:4000` (dev) |
| Cliente | `apiClient` (`mvp/src/lib/api/client.ts:99`) | `fetch` directo + `agentAuthHeaders()` |
| Auth | `Authorization: Bearer <supabase>` (`client.ts:36`) | `Authorization: Bearer <supabase>` (`agent-auth.ts:18`) |
| Default si falta | `http://localhost:3000` (`client.ts:1`) | `''` → URL relativa (rompe en prod si falta) |

⚠️ **Contrato crítico de URL del monolito:** `NEXT_PUBLIC_BACKEND_URL` ya trae `/api`, y los servicios anteponen `BASE='/inmobiliaria'` (`inmobiliaria.service.ts:52`). Ruta efectiva: `https://api.leasefy.co/api/inmobiliaria/...`. Un doble `/api` o mover `/inmobiliaria` rompería ~todo el ERP en silencio (network error → `ApiError(0)`).

---

## 4. Todo lo que se hizo — por repo, con commits exactos

### 4.1 `agent` (branch `restructure/per-agent-organization`) — **LOCAL, sin pushear**

| Commit | Qué | Tests |
|---|---|---|
| `09ff301` | **Hardening terceros + property-capture (v6-07/08):** CORS en `/terceros` + `/property-capture`, sanitización de errores 500 (no filtra el SDK), role-check fail-closed en prod, timeouts Anthropic(30s)/OpenAI(60s), clamps de rangos del LLM, SSRF guard, `Cache-Control: no-store` PII. | +27 reales (extracción) |
| `3d8e398` | **P0 — desbloquear UI:** CORS también en `/api/agency/*` (toda la UI de cobranza/cotizador/AI-Hub estaba bloqueada por preflight) + `agency-jwt.ts` verifica el token ES256 de Supabase vía `SUPABASE_JWKS_URL` (la var que sí está configurada; antes usaba `SUPABASE_JWT_PUBLIC_KEY` que estaba vacía → 401). | +38 |
| `30fb573` | **P1 — dialer autónomo:** nuevo consumer de `cobranza/call.scheduled` (antes el evento se emitía al vacío) + helper Vapi stub-safe + guardrails (opt-out → horario Ley 2300 → frecuencia) + audit. Registrado en el array Inngest. | +17 |
| `5616e76` | **P1 — EscalationRouter en el path de voz:** cuando la voz fuerza FRAUD_FLAG/ESCALATE_HUMAN, crea fila `agent.escalations` + decisión auditable (T-323/Ley 1581), idempotente, stub-safe, sin LLM. | +57 |

> ⚠️ **Confirma `git log` en tu copia.** Estos 4 commits están en tu branch local pero NO en el remoto. Si no los ves, hay que transferirlos (push desde una cuenta con acceso, o cherry-pick). Verificado en esta máquina: HEAD es `bcd3193` (phase-38 docs), con `5616e76` y `30fb573` visibles en el historial reciente.

**Reconciliación auditoría vieja vs código actual (verificado):** los 4 commits SÍ cierran lo que dicen — CORS `/api/agency/*` real (`src/server/index.ts:473-474`), ES256-vía-JWKS real (`src/server/lib/agency-jwt.ts:110-127`), dialer consumer real y registrado (`src/inngest/functions/index.ts:40`), EscalationRouter en voz real (`vapi-webhook.ts` vía `persist-escalation-from-verdict.ts`). **Quedan ABIERTOS** el gate de secretos no-actualizado-para-JWKS (§6-A1) y CORS sin documentar (§6-C3) — ambos romperán el deploy/operación si no se atienden antes del push.

### 4.2 `mvp` (branch `feat/v6.0-01-ia-unificada-command-center`, **PR #14 abierto, pusheado**)

| Commit | Qué |
|---|---|
| **milestone v6.0** | 8 fases (`v6-01`..`v6-08`) **aditivas** (no rompen el CRM existente). Detalle en §7/§8. |
| `36ded83` | **Fixes de la revisión experta v6.0:** guards de tamaño foto/audio, cleanup de object URLs, confirmación al re-extraer, mapeo 401, a11y del sidebar (`data-lenis-prevent` re-aplicado), `formatCurrency` es-CO (era es-CL/CLP de Chile), retenciones colombianas en el contrato de tesorería, i18n. |
| `d8c7579` | **P0 — Authorization:** ~50 hooks de cobranza/cotizador llamaban al agent **sin header `Authorization`** (con `credentials:'include'` que el agent no lee). Migrados **75+ sitios** a `Authorization: Bearer` vía helper nuevo `@/lib/api/agent-auth`. |
| `ea62079` | **P2 — persistir ERP:** 5 flujos de escritura **fingían éxito** (`setTimeout` + toast). Conectados a sus APIs reales: dispersiones, propietarios CRUD, crear acta, eliminar cuenta, importar portafolio. |
| `eaa0c91` | **P1 — AI Hub run:** `AIAgentExecutionPanel` era código muerto. Ahora se monta + botón Run + `use-agent` arreglado (payload real + 202-then-poll + resolver de documentos). |
| `9b42edc` (esta sesión) | **build-fix:** `CostPerPesoKpi.tsx` tooltip formatter type — `tsc --noEmit` ahora exit 0, desbloquea `next build`. |

**Limpieza del working tree (esta sesión, 2026-06-01):** se revirtió un bypass de mock-auth de demo (peligroso), se resolvió un conflicto de stash-pop en `PlanSidebar.tsx`, y se eliminó el stash de mock-auth peligroso. El árbol quedó limpio.

> **Nota:** PR #14 es un **mega-PR mixto** — incluye también el stream paralelo de cobranza analytics `37-xx`/`38-xx` (phase-38 DONE/committed en ambos repos). Corré la suite completa antes de mergear.

---

## 5. Matriz funcional honesta — ¿qué funciona de verdad HOY?

Leyenda: ✅ funcional · 🟡 parcial · ⚪ stub/empty-state · ⛔ bloqueado por credenciales/externos · 🔴 roto.

| Componente | Capa | Status | Bloqueador principal (reconciliado con los 4 commits) |
|---|---|---|---|
| Validador / Tenant Scoring | agent | 🟡 | Buró DataCrédito es `Math.random()` (30% del score); falta PDF/QR (paso 7) + notify (paso 8) |
| Smart Matching | agent | 🟡 | No envía sugerencias ni reasigna; cron stale es placebo; pesos no cuadran con spec |
| Cobranza — Voz (Vapi) | agent | 🟡 | Dialer YA cableado (`30fb573`); faltan **VAPI keys**; sin retries/concurrency en el workflow |
| Cobranza — WhatsApp/Negociación | agent | 🟡 | end-to-end cableado; falta **360dialog key**; nunca verificado en sandbox vivo |
| Cobranza — Compliance/Legal | agent | 🟡 | EscalationRouter YA cableado (`5616e76`); Ley 2300 real; RNE/Certicámara externos |
| Cobranza — Cadencia | agent | 🔴 | **El despachador no existe** — escribe `cadence_contacts` y nadie las lee (§7.3) |
| Cobranza — Pagos/Dispersión | agent | 🟡 | Dispersión NO mueve dinero (falta SPT); link inbound es stub no pagable; **Wompi/Bold keys** |
| Cotizador (seguros) | agent | ⛔ | **Cero carriers reales** (todo `stub_mode:true`, prima sintética por hash) |
| Terceros + Captura propiedad (v6-07/08) | agent | 🟡 | Terceros opera (ANTHROPIC presente); captura audio necesita **`OPENAI_API_KEY`** |
| ERP Financiero (cobros/dispersiones) | mvp | 🟡 | Cobros/dispersiones reales contra monolito; tesorería/conciliación/facturación = ⚪ esperan M1/M2 |
| ERP CRM/Portafolio | mvp | 🟡 | propiedades/contratos reales; flujos de escritura YA persisten (`ea62079`); acta con identidad demo (§7) |
| ERP Operaciones/Comms/Informes | mvp | 🟡 | Monolito externo; pqrs/agenda = ⚪ esperan M1 |
| AI Hub UI | mvp | 🟡 | ExecutionPanel YA renderiza (`eaa0c91`); run real necesita agent desplegado |
| Integración / Auth / CORS | cross | ✅(código) | YA arreglado (`3d8e398` + `d8c7579`); **necesita deploy + env + el fix del gate §6-A1** |

---

## 6. ⭐ Guía de revisión & hardening para Víctor (backend)

> El corazón de este handoff. Cada item: **archivo:línea — riesgo — fix correcto — prioridad**. Todas las refs verificadas contra el código actual (branch `restructure/per-agent-organization`). Organizado por área de riesgo.

> **✅ Actualización 2026-06-01 — fixes de backend aplicados (4 commits LOCALES en `agent`, sin pushear).** Esta sesión resolvió en código 5 hallazgos de §6 (marcados abajo), todos con tests verdes (72 en los suites tocados). Commits: `24d5949` (A1 secrets-gate JWKS), `be8b6b2` (A2 compare constante), `6d16c3f` (D2 dialer concurrency/retries), `b607940` (B1 guard de arranque + F1 migración append-only). **Quedan ABIERTOS (no son fix de código):** el rol de DB sin BYPASSRLS de B1 (ops), **B2/B4** mover dinero real (Wompi SPT + credenciales), y correr `prisma migrate deploy` de F1. El push del repo `agent` sigue bloqueado en Víctor (sin write access esta cuenta).

### A. Auth, secretos y CORS (lo que rompe el deploy/operación)

**A1. ✅ RESUELTO en código (agent `24d5949`) · era 🔴 P0 deploy-blocker — `src/server/lib/assert-production-secrets.ts:39-40`.**
El gate solo reconoce `SUPABASE_JWT_PUBLIC_KEY` y `AGENT_JWT_SECRET` (`hasSupabaseKey = isNonEmpty(env.SUPABASE_JWT_PUBLIC_KEY)`, línea 39), pero post-`3d8e398` la fuente real de firma en prod es **`SUPABASE_JWKS_URL`** (el commit lo dice: "nobody set the inline-JWK var in deploy"). **Riesgo:** un deploy con solo `SUPABASE_JWKS_URL` (lo correcto hoy) hace `process.exit(1)` → restart-loop, el server nunca arranca; *o* el operador setea `SUPABASE_JWT_PUBLIC_KEY` vacío para saltarlo y reabre el back-door de stub-decode. **Fix:** añadir `isNonEmpty(env.SUPABASE_JWKS_URL)` como tercera fuente válida en `hasSupabaseKey`, y exigir `SUPABASE_URL`/`SUPABASE_JWT_ISSUER` cuando se use JWKS (igual que la rama del public-key, líneas 57-67). **Sin esto, push+deploy falla el arranque.** Verificado: el código actual NO menciona `SUPABASE_JWKS_URL` en este archivo.

**A2. ✅ RESUELTO (agent `be8b6b2`, helper `safe-compare.ts` en los 6 compares) · era 🟡 P1 — `src/server/index.ts:410`, `:517`, `:528` — `AGENT_API_KEY` con compare no-constante.**
`token !== process.env.AGENT_API_KEY` (metrics, :410) y `token === process.env.AGENT_API_KEY` (bypass server-to-server de smart-matching, :517/:528). **Riesgo:** side-channel de timing sobre el secreto compartido; además el bypass de smart-matching auto-asigna `userRole:'ADMIN'` — si el secreto se filtra por timing, es ADMIN sobre cualquier tenant. **Fix:** `crypto.timingSafeEqual(Buffer.from(token), Buffer.from(key))` con guard de longitud (el patrón ya se usa para webhooks en el mismo archivo, ~:364). Homogenizar.

**A3. 🟡 P0 (config) — `.env.example` NO documenta `CORS_ALLOWED_ORIGINS`.**
Verificado: la var no aparece en `.env.example`. El default es `'http://localhost:3000,http://localhost:3005'` (`index.ts:447`). **Riesgo:** un deploy que olvide setearla **vuelve a bloquear toda la UI** (cobranza/cotizador/AI-Hub) en el origin de prod — exactamente el bug que `3d8e398` arregló, reintroducido por config. **Fix:** documentar `CORS_ALLOWED_ORIGINS=https://app.leasefy.co` en `.env.example` con comentario "REQUERIDO en prod, sin esto el browser bloquea el frontend"; considerar fail-fast en boot si `NODE_ENV=production` y apunta a localhost.

**A4. 🟡 P1 — `src/server/middleware/role-check.ts:20-29` — fail-open por `NODE_ENV`.**
En prod con `prisma` null → 503 (fail-closed, correcto, cerrado por sesión previa). PERO en `NODE_ENV !== 'production'` sigue pasando cualquier JWT válido sin verificar rol. **Riesgo:** un staging mal etiquetado (`NODE_ENV` ausente) entra en stub passthrough. **Fix:** que el gate dependa de presencia de `DATABASE_URL`, no de `NODE_ENV`; exigir DB en cualquier entorno con datos reales.

**A5. 🟡 P1 — `/inngest` sin verificación de firma si falta `INNGEST_SIGNING_KEY`.**
El handler vive en `index.ts:654` (GET+PUT+POST). `src/inngest/client.ts:21-25` auto-detecta modo por env. **Riesgo:** sin `INNGEST_SIGNING_KEY` en prod, cualquiera puede invocar funciones Inngest. **Fix:** añadir `INNGEST_SIGNING_KEY` al gate de secretos de A1 (fail-closed en prod), y confirmar el registro de la URL pública en Inngest Cloud post-deploy.

**A6. 🟢 contexto frontend — el front NO maneja 401 contra el agent de forma uniforme.**
Los hooks del agent (`use-ai-hub-landing.ts:59`, cobranza/cotizador) hacen `throw new Error(res.status)` crudo — un 401 (token Supabase expirado, JWKS mal) se ve como `"401"` plano, sin refresh ni redirect. El `apiClient` del monolito **sí** mapea 401/403 (`client.ts:69-79`). **Fix:** decidir una estrategia de refresh/redirect compartida del lado front; del lado agent, considerar devolver 401 como JSON (no texto plano — `jwt-verify.ts:14-29`).

### B. Dinero, integridad contable y aislamiento (lo bloqueante para operar real)

**B1. 🟡 GUARD DE ARRANQUE añadido (agent `b607940`, `assert-rls-enforced.ts` — avisa al boot, `RLS_ROLE_ENFORCE=true` falla cerrado); el fix real (rol sin BYPASSRLS) sigue siendo OPS · era 🔴 BLOQUEANTE — RLS es no-op si el rol de conexión tiene `BYPASSRLS`.** `src/lib/tenant-scope.ts:64-72`.
`withTenantScope` setea `SET LOCAL app.current_tenant_id` y confía en políticas `tenant_isolation`. STATE.md confirma: *"el rol `postgres` tiene `rolbypassrls=true`, todas las políticas `tenant_isolation` son no-ops en runtime"*. **Riesgo crítico:** TODA la defensa cross-tenant del servicio (pagos, payouts, escalaciones, PII) es decorativa — una query mal filtrada lee/escribe otros tenants. **Fix antes de PII/dinero real multi-tenant:** correr la app con un rol de DB SIN bypassrls; verificar con `SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user;` + un test de fuga cross-tenant real. *(La validación UUID en `:58-62` SÍ cierra el vector de inyección SQL del `SET LOCAL` — eso está bien.)*

**B2. 🔴 BLOQUEANTE — la dispersión NO mueve dinero.** `src/inngest/functions/daily-dispersion.ts:286-299`.
El cron marca `payments.disbursedAt`, inserta un `payout` con `status:'in_transit'` y `bankAccount: { note: 'Phase 12 stub — real bank account routing via Wompi SPT in Phase 13' }`. NO existe llamada a una API SPT. **Riesgo:** el dashboard muestra "dispersado" sin que el dinero salga; falsa contabilidad de tesorería. **Fix antes de mover dinero real:** integrar SPT (Wompi/Bold payout API); NO insertar el `payout` hasta tener `providerPayoutId`; modelar `requested → confirmed → settled → failed` con reconciliación; marcar `disbursedAt` solo tras confirmación del proveedor (separar "claim" de "ejecución").

**B3. 🟡 idempotencia de payout parcial.** `daily-dispersion.ts:272-284`.
El claim atómico `updateMany({ where:{ id, disbursedAt:null }})` + `count===1` previene doble-marca; el evento Inngest dedupea por `disp|{tenant}|{día}`. **Gap:** cuando se añada la SPT real, si la transferencia falla DESPUÉS de marcar `disbursedAt`, queda marcado como dispersado sin transferencia. **Fix:** estado `claimed` intermedio reversible; confirmar antes de marcar.

**B4. 🔴 BLOQUEANTE — `generate-fresh-payment-link` devuelve URL stub no pagable.** `src/mastra/tools/generate-fresh-payment-link.ts:62`.
`https://pay.leasefy.co/stub/inbound/${debtorId}/${ts}`. Un deudor que toca "Pagar ahora" en WhatsApp recibe un link que no cobra nada. **Riesgo:** flujo de cobro inbound roto en prod; el deudor cree que pagó. **Fix:** invocar `paymentProviderFactory.get(...).generatePaymentLink(...)` (contrato real ya existe en `src/payments/wompi.ts`); envolver en `withTenantScope`. NO desplegar inbound WhatsApp con este stub. *(También: los mensajes WhatsApp hardcodean `/stub/...`, hay que sourcing del link real por deudor.)*

**B5. 🟡 `generatePaymentLink` (Wompi) sin idempotencia de creación.** `src/payments/wompi.ts:239-343`.
Cada llamada hace `POST /payment_links` nuevo → un reintento genera DOS links (no es doble-cobro por `single_use`, pero ensucia reconciliación). **Fix:** key de idempotencia por `reference` o cache del link vigente por `(debtorId, deuda)`.

**B6. 🟡 `writeBillingEvent` no fuerza unicidad por idempotencyKey.** `src/billing/events.ts:28-30` (comentario propio: *"the billing_events schema does NOT enforce uniqueness on the key"*).
Si dos caminos escriben el mismo `payment.recovered`, se duplica el ingreso facturable. Mitigado hoy por el dedup de webhook, pero frágil. **Fix:** índice único `(tenant_id, event_type, event_entity_id)` o constraint sobre `idempotencyKey`. *(Lo bueno: los webhooks de pago SÍ son atómicos — `wompi-webhook.ts:271-319` envuelve `payment.update` + `writeBillingEvent` en un único `withTenantScope`, evento Inngest solo tras commit.)*

### C. Webhooks de pago/voz y stub-modes degradados

**C1. ✅ verificado bien — HMAC en los 3 webhooks.** Wompi (`src/payments/wompi.ts:345-434` + `src/server/routes/wompi-webhook.ts:155-164`, SHA-256, `timingSafeEqual`, pre-JWT), Bold (`bold-webhook.ts`), Vapi (`vapi-webhook.ts:401-427`, HMAC-SHA256 `x-vapi-signature`). **🟡 residual común:** en stub-mode (sin secreto) aceptan **cualquier** firma — Wompi `wompi.ts:382`, Vapi `:406-409`. **Fix:** que el env-loader exija `WOMPI_EVENTS_SECRET` / `VAPI_WEBHOOK_SECRET` en producción (fail-closed al boot, junto a A1). **Nota:** no hay protección anti-replay por timestamp en ninguno (solo dedup por id) — aceptable si el id es único e inmutable, pero documentar.

**C2. 🟡 idempotencia de webhook depende de Redis; en stub-mode es in-memory por proceso.** `wompi-webhook.ts:145-146` / `bold-webhook.ts:150-151` → `buildInMemoryAdapter`.
Sin Upstash, dos instancias no comparten el dedup → una entrega duplicada por Wompi puede reprocesarse en otra instancia. Mitigado por el índice único parcial `providerEventId` en DB. **Fix prod:** exigir `UPSTASH_REDIS_*` en producción; confirmar que el índice único `(payment_provider, provider_event_id)` esté aplicado en la DB viva (la migración tenía drift según STATE.md D-38-01).

**C3. (CORS doc) → ver A3.** Es el blocker P0 de toda la UI cross-origin. Confirmá `CORS_ALLOWED_ORIGINS` en el deploy = origen(es) reales del front; verificá que el middleware CORS no rompa el **streaming SSE** del cotizador (`/cotizador/quote/:id/stream`) ni el blob `application/pdf` (`verdict.pdf`).

### D. Stub-safe pattern, timeouts y resiliencia de pipelines

**D1. 🟡 P1 — `src/lib/vapi/place-outbound-call.ts:99-106` — `fetch` sin timeout.**
`09ff301` añadió timeouts a Anthropic(30s)/OpenAI(60s) pero este helper nuevo (`30fb573`) no tiene `AbortSignal.timeout`. **Riesgo:** una conexión colgada a `api.vapi.ai` bloquea el `step.run('place-call')` hasta el step-timeout de Inngest, consumiendo concurrencia del dialer. **Fix:** `fetch(url, { signal: AbortSignal.timeout(15_000) })`, mapear abort a `reason:'vapi_unreachable'`.

**D2. ✅ RESUELTO (agent `6d16c3f` — `concurrency` per-tenant + `retries:2`) · era 🟡 P1 — `autonomous-dialer-workflow.ts:237-247` — sin `retries`/`concurrency`/`rateLimit` explícitos.**
El config solo declara `id`+`idempotency`+`triggers` → hereda default Inngest (`retries:4`). **Riesgo:** (a) el `step.run('place-call')` que THROW en fallo transitorio reintenta 4× → hasta 4 llamadas reales si la idempotencia del paso no cubre el caso; (b) sin `concurrency`/`throttle` por tenant, un backlog de `cobranza/call.scheduled` puede ráfaga-dialear y violar la cadencia Ley 2300 a nivel de volumen. **Fix:** `concurrency: { key: 'event.data.tenantId', limit: N }` + `rateLimit`/`throttle` por tenant; mover el `Call.create` real al mismo step que el place (o key de idempotencia a nivel de paso) para que el throw post-place no re-disque.

**D3. 🟡 P1 — `tenant-scoring-pipeline.ts:136` y `smart-matching-pipeline.ts:17` — `retries: 0`.**
Los dos pipelines core de v1 corren sin reintentos. **Riesgo:** un fallo transitorio (timeout DataCrédito, hiccup de DB, rate-limit Claude) pierde la evaluación entera. **Fix:** verificar que los `step.run` sean idempotentes; si lo son, subir a `retries: 2-3`. Si no, hacerlos idempotentes primero (no reintentar a ciegas un pipeline con efectos externos).

**D4. 🟡 evento huérfano `cobranza/escalation.live`.** `src/mastra/tools/escalate-to-human.ts:86,108`.
Emite `cobranza/escalation.live` cuando `urgency==='live'`, pero **no hay consumer** (verificado: no aparece en ningún `triggers:[{event:...}]`). `5616e76` lo evita forzando `urgency:'high'` (`persist-escalation-from-verdict.ts:43,63`), pero el emit sigue vivo en la tool. **Riesgo:** si otro path llama la tool con `urgency:'live'`, el evento cae al vacío → la transferencia en vivo nunca ocurre, silenciosamente. **Fix:** implementar el handler `cobranza/escalation.live` (live-transfer) o quitar el emit hasta que exista.

**D5. 🟡 rate-limiter in-memory de proceso único.** `tercero-extract.ts:24-27` (`userWindowMap = new Map()`) + arco-public.
**Riesgo:** con >1 réplica el cap de 20/min se multiplica por #réplicas → DoS de costo de Claude Vision (cada extracción es facturable). **Fix:** limiter respaldado por Redis (`src/lib/redis.ts` ya es stub-safe) antes de escalar horizontalmente.

**D6. 🟡 desajuste schema↔bodyLimit del audio.** `src/server/index.ts:442-445` (`audioBase64.max(28_000_000)`) vs `extract-property.ts:45` (`bodyLimit 24*1024*1024`).
El bodyLimit corta antes → el techo de 28M es inalcanzable. **Fix:** alinear ambos. (El front ya tiene guards de tamaño tras `36ded83`, pero el contrato sigue inconsistente.)

### E. Observabilidad y health

**E1. 🟡 `/health` (`src/server/routes/health.ts:5-7`) es liveness sin readiness.**
Solo devuelve `{status:'ok', uptime}`. No verifica DB, Redis, ni JWKS. **Riesgo:** el orquestador marca el pod "healthy" aunque Prisma esté caído (y role-check esté 503-eando todo). **Fix:** `/health/ready` con `SELECT 1` (timeout corto) + check de `SUPABASE_JWKS_URL` resoluble; dejar `/health` como liveness puro.

**E2. 🟡 Better Stack es scaffold; no hay request-tracing ni log estructurado.** `src/lib/observability.ts:122-128` solo detecta el token y logea "transport pending Phase 9"; el resto usa `console.log/warn/error` sin request-id. **Riesgo:** difícil correlacionar un fallo de un tenant a través de Hono→Inngest→Vapi. **Fix:** logger estructurado (pino) + middleware `request-id` en Hono; completar el transport de Better Stack; propagar `traceId` a logs y tags de Sentry. *(Lo bueno: `observability.ts:67-107` ya redacta PII en `beforeBreadcrumb`/`beforeSend`, fail-open sin recursión.)*

### F. Cumplimiento Colombia y trazabilidad inmutable

**F1. 🟡 MIGRACIÓN escrita (agent `b607940`, `prisma/migrations/20260601000000_v6_append_only_*`) — falta que Víctor corra `prisma migrate deploy` · era 🔴 BLOQUEANTE para evidencia legal — inmutabilidad de auditoría.** Trigger column-aware verificado contra `automated-decisions-review.ts` (NO rompe el flujo de revisión T-323). `audit_log` y `automated_decisions` se escriben con `.create()` pero antes **no había garantía append-only a nivel DB** (no se ven triggers/permisos que bloqueen UPDATE/DELETE). **Riesgo:** un registro T-323 (decisión automatizada revisable, Ley 1581) mutable no es defendible ante la SIC. **Fix antes de que sea evidencia legal:** revocar UPDATE/DELETE sobre esas tablas al rol de la app, o trigger que rechace mutaciones.

**F2. 🟡 SAGRILAFT/SARLAFT es scaffold, NO screening real.** `src/mastra/tools/screen-candidate.ts:189-214`.
Por defecto devuelve `screening_not_required`; el handler real está detrás de un two-key gate inactivo y, ante error, hace swallow → default seguro. **Riesgo:** si se promociona como "hacemos screening" sin proveedor activo, es incumplimiento. *(El `actorType=SAAS_ORCHESTRATOR` C12 está bien aplicado en audit/billing, pero etiquetar actor ≠ hacer screening.)* **Fix:** activar proveedor real (lista Clinton/ONU/PEP) antes de operar con dinero, o declarar explícitamente que el screening está fuera de alcance.

**F3. ✅ verificado bien — Ley 2300 con defensa en profundidad.** `src/compliance/frequency.ts:208-278`: índice único parcial Postgres `(debtor_id, day_bucket)` como fuente de verdad (cierra la race T-11-04 con P2002), contador Redis semanal, buckets `America/Bogota`. El dialer re-chequea opt-out→horario→frecuencia ANTES de marcar (`autonomous-dialer-workflow.ts:313-367`). **🟡** `checkFrequencyInline`/`recordContactAttempt` devuelven "permitir" cuando `prisma` es null (`:156-158`) → mismo fix que A4 (exigir DB).

**F4. ✅ verificado bien — Ley 1581/ARCO.** Rutas `/api/arco`, hashing SHA-256 de cédula, defensa de enumeración, SLA 15/10 días hábiles (Phase 36). **🟡 superficie pública:** `/api/arco` y `/api/arco/verify/:token` van **sin Bearer** (titular del dato externo) — confirmá que estén exentos del role-check/JWT pero CON rate-limiting + validación de token propios (es superficie de ataque).

### G. Tests y validación de las zonas de mayor riesgo

**G1. 🟡 cobertura insuficiente en extracción (v6-07/08).** `agent/tercero-extract.test.ts`, `property-extract.test.ts` **mockean por completo** los extractores; solo prueban ruta + happy path + 500. NO ejercitan `readField`/`readCell`, `JSON.parse` del LLM, `normalizeTipoDocumento`/`asNumber`, strip `data:`, promedio de confidence, parseo de markdown. Es la red que más falta dado que v6-07/08 nunca corrieron E2E. **Fix:** unit tests con `anthropic.messages.create`/`openai.audio.transcriptions.create` stubbeados y outputs realistas.

**G2. 🟡 tests financieros ausentes.** Faltan suites de `calculate-payment-plan`, `daily-dispersion`, y los caminos financieros del ERP frontend. Prioritarios dado que son los que mueven dinero (§6-B).

**G3. front — suites de integración a correr antes de mergear PR #14:** `use-agent.test.ts`, `use-ai-hub-landing.test.ts`, `cotizador/nueva/page.test.tsx`, `Carta/Siniestro/PaymentPlanApprovalClient.test.tsx`. `tsc --noEmit` ya está limpio (exit 0, post-`9b42edc`).

### H. Dependencias / supply chain

**H1. 🟡 P1 — 110 vulnerabilidades de dependencias reportadas por Dependabot en `Leasefy/front`** (3 críticas, 37 altas, 60 moderadas, 10 bajas) — https://github.com/Leasefy/front/security/dependabot (visto en el push del 2026-06-01). **Riesgo:** deps con CVEs conocidos en el frontend desplegado. **Fix:** triar las 3 críticas + 37 altas primero (`pnpm audit` + PRs de Dependabot), correr el mismo audit en `agent`. No bloquea el merge funcional, pero es deuda de seguridad real a cerrar antes de prod.

### Resumen de bloqueantes antes de mover dinero real o PII real
- **B1 (BYPASSRLS):** correr con rol sin bypass — sin esto, el aislamiento multi-tenant no existe.
- **B2 + B4 (SPT + fresh-link stub):** no anunciar dispersión/cobro inbound como funcional; ambos son stubs.
- **F1 (inmutabilidad audit/T-323) y F2 (screening AML real):** requisitos de evidencia legal/regulatoria.
- **A1 (gate de secretos para JWKS):** sin esto el deploy ni arranca.
- **C1/C2/A4/F3 stub-modes:** que el env-loader exija en prod `WOMPI_EVENTS_SECRET`, `VAPI_WEBHOOK_SECRET`, `UPSTASH_REDIS_*`, `DATABASE_URL` (fail-closed al boot) en vez de degradar a "aceptar todo / permitir".

---

## 7. Detalle por dominio de agente (real / mock / stub / falta construir)

> Lente: "cerebro completo, extremidades faltantes". Casi todo I/O externo es **stub-mode gated por env var** (ausencia de credencial ⇒ rama determinística sin red) — legítimo para CI/dev, pero significa que en staging/prod **nada funciona hasta cablear credenciales Y, en varios casos, escribir el integrador real que todavía no existe**.

### 7.1 Validador / Tenant Scoring
Pipeline Inngest `tenant-scoring-pipeline.ts:133`: OCR → score crediticio → consistencia → score 0-100 (A/B/C/D) + escalación.

- **REAL:** OCR Claude Vision (`extract-document.ts:97`, cobra tokens, registra costo); análisis financiero/consistencia/fraude/freshness/PDF-metadata (determinístico en `src/lib/`); `calculate-score.ts:22-27` (suma ponderada, re-normaliza si crédito null); escalación a humano; idempotencia + cache 30d (`PipelineRun`).
- **🔴 MOCK — buró de crédito = `Math.random()`:** `src/lib/credit-score.ts:39` → `Math.floor(300 + Math.random() * 651)`. Es el **30% del score** (`calculate-score.ts:24`). `provider='datacredito'` **LANZA** `'DataCrédito real integration not implemented yet'` (`credit-score.ts:35`). **Nota:** existe un adaptador serio en `src/centrales/datacredito.ts` (4 modos, `DATACREDITO_MODE`) pero **lo usa Cobranza para REPORTAR mora, NO el scoring** — el scoring importa el random. Dos caminos distintos.
- **🔴 FALTA — Paso 7 (PDF con QR de verificación) NO EXISTE.** El spec de `CLAUDE.md` lo lista; el pipeline no genera PDF ni QR. El "Step 7" del código es `lazy-explanation` (`:442`), "Step 8" es `save-results` (`:488`).
- **🔴 FALTA — Paso 8 (notificar al equipo) NO EXISTE.** Cero notif/whatsapp/email en el pipeline. Solo persiste a DB; el front debe hacer polling.
- **⚠️ discrepancia de pesos vs spec.** Código: solvencia 40 / crédito 30 / estabilidad 15 / consistencia 10 / identidad 5. Spec CLAUDE.md: financiera 35 / historial 25 / verificación 25 / perfil 15. El historial de arriendo está **deshabilitado** (`calculate-score.ts:11`, feature flag). **Víctor: decidir cuál es la verdad y documentarla.**

### 7.2 Smart Matching
`smart-matching-pipeline.ts:14`: recibe perfil + propiedades, calcula compatibilidad, ordena, persiste por par con cache 30d.

- **REAL:** cálculo de compatibilidad (`calculate-compatibility.ts:82-86`); cache + persistencia; generación de COPY de email (`POST /smart-matching/generate-suggestion-email`, `smart-matching.ts:194`, LLM real).
- **⚠️ pesos vs spec.** Código: income 0.30 / employment 0.20 / budget 0.25 / location 0.10 / credit 0.15. Spec: affordability 40 / risk fit 30 / preferences 15 / acceptance probability 15. **No hay sub-score de "probabilidad de aceptación".**
- **🔴 FALTA — envío de sugerencias (WhatsApp/email) NO ocurre aquí.** El pipeline termina en `save-results` sin emitir nada. El endpoint de email **solo redacta texto** (header: "the backend handles orchestration, consent, throttling, templating, and sending", `smart-matching.ts:192`). El envío se delegó al monolito y este repo no lo implementa.
- **🔴 FALTA — reasignación de leads al agente de zona NO EXISTE.**
- **🔴 FALTA — cron de re-escaneo de propiedades estancadas (7+ días) es placebo.** `daily-stale-property-report.ts:6` cuenta filas de `PipelineRun` como "pragmatic proxy for tenant demand" — NO escanea propiedades reales, NO re-corre matching, solo `console.log` del reporte (`:110`). No emite ningún evento de re-match.

### 7.3 Cobranza (el más maduro, ~12 sub-agentes)
State machine de voz, ~12 agentes Mastra en `src/mastra/agents/cobranza/`, workflows Inngest (pre-call, post-call, follow-up, dialer, cadence cron, legal escalation).

- **🟢 REAL — EscalationRouter cableado** (`5616e76`): `escalation-router.ts:262` + persistencia vía `persistEscalationFromForcedTransition` en `vapi-webhook.ts:84` (invocado en `:980`, `:1480`, `:1585`). Ya no es código huérfano.
- **🟢 REAL — dialer autónomo cableado** (`30fb573`): `autonomous-dialer-workflow.ts:236` consume `cobranza/call.scheduled` (`:246`), re-chequea guardrails a dial-time, coloca la llamada vía `placeVapiOutboundCall`, registra el intento. Registrado en `src/inngest/functions/index.ts:40`.
- **REAL env-gated:** WhatsApp (`dialog360.ts:87` fetch real con `WHATSAPP_360DIALOG_API_KEY`, sin key `{status:'stubbed'}`; loop inbound→reply en `whatsapp-webhook.ts:330`+`:475` — **nunca verificado contra sandbox 360dialog vivo**). Voz (`src/voice/`, `place-outbound-call.ts:69` fetch real con `VAPI_API_KEY`, sin key stub `placed=false`, NUNCA lanza). Pagos (Wompi/Bold `fetch` raw real, mismo patrón env-gated). Dispersión (`daily-dispersion.ts` real pero NO mueve dinero, §6-B2).
- **🔴 FALTA — el despachador de cadencia NO EXISTE.** `cartera-cadence-cron.ts:12` PLANIFICA y **solo INSERTA** filas en `cadence_contacts` (step `write-cadence`, `:328`); el comentario dice "the dispatcher will pick them up at `planned_for`". Pero el único lector de `cadence_contacts` es la vista de UI `cartera-overview.ts:259` (read-only `findMany`). `cobranza/call.scheduled` lo emiten caminos SEPARADOS (`pre-call-workflow.ts:313`, `follow-up-workflow.ts:728`), NO el cron de cadencia. **Resultado: las filas de cadencia se escriben y nunca se disparan.** Falta el cron que lea `cadence_contacts WHERE planned_for <= now()` y emita voice/whatsapp. **OJO — esto choca con la decisión §10.2 (doble fuente de outreach).**

### 7.4 Cotizador (seguros de arrendamiento)
Orquestador Mastra (`quote-orchestrator.ts`, ~728 líneas): fan-out paralelo a tools de aseguradoras, scoring/screening/explainability/counterfactual, PDF de veredicto, streaming SSE, crons.

- **REAL:** orquestación, scoring, screening, explainability, PDF (`src/services/pdf/cotizador-verdict-template.tsx`), SSE (`src/server/routes/cotizador-streaming.ts`); dispatch DB-driven (registry `cotizador_aseguradora_registry`, `quote-orchestrator.ts:138-139`, política D-22-09 `:237-242`); fan-out a 3 tools con `errorStrategy=fallback` (`:177-179`).
- **🔴 CERO aseguradoras reales — todas en `stub_mode:true` con prima sintética.** `shared/stub-mode.ts:170` fija `stub_mode:true` UNCONDITIONAL; prima determinística desde seed: `primaPct = 0.03 + (seed[1]/255)*0.03` → 3-6% del canon anual (`stub-mode.ts:121-127`). Sura/Mapfre/Sekure exponen **solo handler `stub`**.
- **🔴 `bolivar/rest.ts:49` LANZA** `'Conecta integration pending OQ-2 resolution'` (único `throw` intencional de la capa carrier; el orquestador lo degrada a stub vía try/catch D-22-09).
- **🔴 Sekure ni está en el orquestador** — el registry existe (`sekure/index.ts:27`) pero el orquestador solo cablea `quoteSura/quoteMapfre/quoteBolivar` (`:177-179`). Código muerto desde el path de quote.
- **FALTA construir:** integradores REST reales para las 4 aseguradoras (Bolívar tiene esqueleto que lanza; Sura/Mapfre/Sekure ni esqueleto). Bloqueado en research de APIs (Phase 27 PAUSED, ver `agent/HANDOFF-VICTOR.md §1` + STATE.md). **Hoy el Cotizador es un simulador de primas, no un cotizador.**

**Síntesis transversal:** el "cerebro" está construido y de calidad razonable. Las "extremidades" faltan en tres formas: (a) **integraciones que ni existen** — buró real para scoring, despachador de cadencia, envío/reasignación en matching, re-escaneo real, pasos 7-8 del validador, los 4 carriers; (b) **integraciones env-gated listas pero nunca verificadas en vivo** — 360dialog, Vapi, Wompi/Bold; (c) **discrepancias de spec vs código** en los pesos de scoring/matching que hay que reconciliar y documentar antes de declarar cualquier número como "producción".

---

## 8. Motor ERP M1/M2 — spec de lo que Víctor debe construir

> **No existe.** `back-main` (NestJS) es scaffold. El frontend ya tiene las 5 secciones + contratos de tipos honestos (empty-state, sin data falsa, banner "el motor llega en M1/M2"). Esta sección deriva el contrato de cada endpoint/entidad **desde los `.types.ts` reales** del frontend.

**Convenciones transversales:** todo COP es entero en pesos (sin decimales); fechas ISO-8601; multi-tenant por `agencyId` derivado del JWT (nunca del body); paginación `?page&pageSize` devolviendo `{ items, total }`; toda mutación contable idempotente (idempotency-key) + auditoría (Ley 1581).

### 8.1 Facturación electrónica (DIAN) — M2 · `src/lib/api/facturacion.types.ts`
UI: `facturacion/page.tsx:33-85`, 4 tabs (`ventas|compras|electronica|notas`). **Dependencia obligatoria:** la DIAN no emite directo — se requiere un **Proveedor Tecnológico autorizado** (PT: Facture, Carvajal, Siigo, FacturaTech) que firma con certificado digital, genera el **CUFE**, transmite XML UBL 2.1 y devuelve acuse. NO inventar CUFE: `cufe` solo se llena cuando `estadoDIAN==='aceptada'` (`facturacion.types.ts:41`).

| Método + Path | Request | Response |
|---|---|---|
| `GET /facturacion/ventas?page&pageSize` | — | `FacturacionListResponse<FacturaVenta>` |
| `POST /facturacion/ventas` | `{ terceroId, conceptos[], recurrente?, periodicidad? }` | `FacturaVenta` (`borrador`) |
| `POST /facturacion/ventas/:id/emitir` | — (idempotente) | → PT → `emitida`/`aceptada`+`cufe` o `rechazada` |
| `GET /facturacion/compras?page&pageSize` | — | `FacturacionListResponse<FacturaCompra>` |
| `POST /facturacion/compras` | `{ proveedorId, concepto, total, fechaVencimiento?, aCredito? }` | `FacturaCompra` |
| `GET /facturacion/electronica?page&pageSize` | — | `FacturacionListResponse<DocumentoElectronico>` (CUFE) |
| `GET /facturacion/notas?page&pageSize` | — | `FacturacionListResponse<NotaCreditoDebito>` |
| `POST /facturacion/notas` | `{ tipo, facturaRefId, motivo, valor }` | `NotaCreditoDebito` |

**Tablas:** `factura_venta` (numeración consecutiva autorizada por resolución DIAN), `factura_compra`, `nota_credito_debito` (FK `facturaRefId`), `concepto_factura` (líneas, IVA 19/5/0 por línea), `documento_dian_log` (XML, CUFE, acuse, reintentos). **Webhook PT→motor** para acuses asíncronos. **Hardening:** validar NIT/dígito de verificación antes de emitir; `total` recomputado server-side desde `conceptos` (nunca confiar en el cliente); manejar `rechazada` con reintento + motivo legible.

### 8.2 Conciliación bancaria — M2 · `src/lib/api/conciliacion.types.ts`
UI: `conciliacion/page.tsx`, dropzone + 6 contadores + tabla. **Modelo de 6 casos** (`conciliacion.types.ts:11-17`): `conciliado` (match referencia+valor), `parcial`, `duplicado`, `no_identificado`, `diferencia_valor`, `fuera_de_fecha`. Cada match: `EstadoMatch = sugerido|confirmado|rechazado` (revisión humana del fuzzy-match).

| Método + Path | Request | Response |
|---|---|---|
| `POST /conciliacion/fuentes` (multipart) | extracto bancario (CSV/XLSX) | `FuenteConciliacion` (parseo + matching auto) |
| `GET /conciliacion/fuentes/:id` | — | `{ fuente, resumen: ResumenConciliacion, movimientos }` |
| `POST /conciliacion/movimientos/:id/confirmar` | `{ sugerenciaContratoId }` | → `confirmado`, aplica recaudo |
| `POST /conciliacion/movimientos/:id/rechazar` | `{ motivo }` | → `rechazado` |
| `POST /conciliacion/movimientos/:id/asignar` | `{ contratoId }` | resuelve `no_identificado` manual |

**Tablas:** `fuente_conciliacion`, `movimiento_bancario` (`valorBanco` vs `valorEsperado`, `caso`, `estado`, FK contrato/tercero), motor de matching (referencia única + valor + ventana de fecha). `ResumenConciliacion` son conteos derivados. **Hardening:** parseo robusto por banco (empezar Bancolombia); `duplicado` por hash de (fecha+valor+referencia) para evitar doble-aplicación; la confirmación **debe ser transaccional** con el asentamiento en cartera; idempotencia al re-cargar el mismo extracto.

### 8.3 Tesorería / Egresos — M1 · `src/lib/api/tesoreria.types.ts`
**Ledger/desglose contable autoritativo** del egreso neto al propietario; complementa (no reemplaza) el módulo operativo `dispersiones`. `calcularNeto` (`tesoreria.types.ts:41-59`) es el **mirror cliente** de lo que M1 calcula autoritativamente.

**Fórmula del neto (autoritativa en M1):**
`neto = canonRecibido − comisionAdmin − ivaComision − retencionFuente − reteIca − reteIva − descuentos`

> **Retenciones (corrección aplicada):** el contrato ahora incluye `retencionFuente?/reteIca?/reteIva?` opcionales (`tesoreria.types.ts:29-31`). **Lo que falta y le toca a Víctor en M1:** calcularlas según el **régimen tributario del propietario** — ReteFuente sobre honorarios/comisión (tarifa por base UVT y si es declarante), ReteICA municipal (tarifa por ciudad/actividad), ReteIVA. El motor debe almacenar el régimen del tercero y aplicar la tabla vigente.

| Método + Path | Request | Response |
|---|---|---|
| `GET /tesoreria/egresos?periodo=2026-05` | — | `{ periodo, egresos: EgresoNeto[], totalNeto }` |
| `GET /tesoreria/egresos/:id` | — | `EgresoNeto` (desglose con retenciones) |
| `POST /tesoreria/egresos/:id/aprobar` | — | → `aprobado` (gate previo a dispersar) |
| `POST /tesoreria/egresos/:id/comprobante` | genera PDF | `comprobanteUrl` (cuando `procesado`) |

**Tablas:** `egreso_neto` (por `propietarioId`+`periodo`, estados `pendiente|aprobado|procesado|fallido`), `tercero` con `regimenTributario`+`responsabilidadesFiscales`, `cuenta_destino` (enmascarada). El asentamiento `procesado`/`fallido` lo dispara la dispersión real (requiere SPT/PSE — §6-B2). **Hardening:** `neto` y retenciones recomputadas server-side, **nunca** confiar en el cliente; desglose inmutable una vez `procesado`; enmascarar cuenta en toda respuesta; aprobar→dispersar con doble control (separación de funciones).

### 8.4 PQRS + Agenda — M1 (con triage IA en `agent`/Mastra) · `pqrs.types.ts`, `agenda.types.ts`
**PQRS** — ciclo `recibida → asignada → en_proceso → en_cotizacion → resuelta → cerrada` (`pqrs.types.ts:15-21`). El **triage automático** (clasificación de `tipo`/`prioridad`, cálculo de `slaVenceAt`, notificaciones) lo hace el **agente Mastra en `agent`**, no el monolito; M1 persiste y orquesta. Una `reparacion` puede derivar a cotización (`cotizacionId`).

| Método + Path | Request | Response |
|---|---|---|
| `GET /pqrs?page&pageSize` | — | `{ resumen: ResumenPqrs, items[], total }` |
| `POST /pqrs` | `{ tipo, canal, asunto, descripcion, solicitanteNombre, solicitanteTipo, contratoId? }` | `SolicitudPqrs` (radicado `PQRS-2026-NNNN`) → triage IA |
| `POST /pqrs/:id/asignar` | `{ responsableId }` | → `asignada` |
| `POST /pqrs/:id/responder` | `{ respuesta }` | → `resuelta` |
| `POST /pqrs/:id/cerrar` | — | → `cerrada` |
| `POST /pqrs/:id/cotizar` | — | crea `cotizacionId`, → `en_cotizacion` |

**Agenda** — vista que **agrega eventos que el sistema ya conoce** + tareas del usuario (`agenda.types.ts:11-17`: `EventoTipo = visita|firma_pendiente|vencimiento_contrato|seguimiento|inspeccion|tarea`; `EventoOrigen = sistema|usuario`).

| Método + Path | Request | Response |
|---|---|---|
| `GET /agenda?desde&hasta` | — | `{ resumen: ResumenAgenda, eventos[], total }` |
| `POST /agenda/tareas` | `{ titulo, fecha, vinculoTipo?, vinculoId?, responsableId? }` | `EventoAgenda` (`origen:'usuario'`) |
| `PATCH /agenda/eventos/:id` | `{ estado: EventoEstado }` | `EventoAgenda` |

**Tablas:** `solicitud_pqrs` (FK contrato/propiedad/responsable/cotización, `slaVenceAt` por triage), `evento_agenda` solo para tareas de usuario; los eventos `sistema` se **derivan en query-time** desde visitas/contratos/firmas (no se duplican). **Hardening:** radicado = consecutivo atómico sin colisiones bajo concurrencia; SLA respeta **Ley 1581** (términos de petición); notificaciones del triage respetan **Ley 2300** (frecuencia/horario); validar que `vinculoId` pertenezca a la `agencyId` del JWT (IDOR).

---

## 9. Credenciales / servicios externos faltantes

Cada uno desbloquea lo indicado. Todo el código degrada a **stub** cuando falta (no crashea) — pero ver §6-C/A para los stub-modes que deberían fail-closed en prod.

| Credencial / servicio | Desbloquea | Notas |
|---|---|---|
| `CORS_ALLOWED_ORIGINS` (env agent) | Toda la UI cross-origin | **Crítico P0** · default solo localhost · documentar (§6-A3) |
| `SUPABASE_JWKS_URL` + `SUPABASE_URL` (+ gate fix §6-A1) | JWT de agencia en prod | sin el fix del gate, el server no arranca |
| `OPENAI_API_KEY` | Captura de propiedad por audio (v6-08, Whisper) | hoy vacía → 500 |
| `VAPI_API_KEY` + `VAPI_OUTBOUND_ASSISTANT_ID` + `VAPI_OUTBOUND_PHONE_NUMBER_ID` + `VAPI_WEBHOOK_SECRET` | Llamadas de voz reales (dialer + manual) | config a nivel env |
| `WHATSAPP_360DIALOG_API_KEY` + plantillas Meta aprobadas | WhatsApp real (cobranza) | hoy `{status:'stubbed'}`; nunca verificado en sandbox vivo |
| `WOMPI_*` / `BOLD_*` + `WOMPI_EVENTS_SECRET` | Links de pago + webhooks | capa lista; exigir secreto en prod (§6-C1) |
| **API de dispersión bancaria (Wompi SPT / payout rails)** | Transferir dinero real al arrendador | **NO implementada** — hoy solo asiento contable (§6-B2) |
| `DATACREDITO_*` / TransUnion (para scoring) | Score real (hoy 30% aleatorio) | el path de scoring LANZA; reusar `src/centrales/datacredito.ts` o escribir cliente |
| Carriers (Sura, Mapfre, Bolívar/Conecta, Sekure) | Cotizador real | cero integraciones; Bolívar esqueleto lanza (OQ-2); Phase 27 PAUSED |
| `INNGEST_SIGNING_KEY` | Verificación de firma del endpoint `/inngest` en prod | añadir al gate (§6-A5) |
| `UPSTASH_REDIS_*` | Dedup de webhooks + rate-limit + frequency cap compartidos entre réplicas | exigir en prod (§6-C2, §6-D5) |
| `CERTICAMARA_*`, `SIC_RNE_*`, `RESEND_API_KEY` | Notificaciones certificadas / RNE / emails ARCO | hoy stub |
| Proveedor DIAN autorizado (PT) | Facturación electrónica (CUFE) | bloquea `/facturacion` (M2, §8.1) |
| Cuenta Supabase de agencia válida (proyecto `jraqurdcjwnifzpdqtnm`) | Login real + data real | el login de prueba daba 400 invalid_credentials |

---

## 10. Decisiones de arquitectura abiertas (no es código — requieren decisión tuya/equipo)

1. **¿Qué monolito es el motor ERP M1/M2?** `back-main` (NestJS) está designado pero **es scaffold**. En paralelo, `api.leasefy.co` está **vivo y desplegado** y ya sirve JWT de agencia. Decidir: ¿construir el motor **dentro de** `api.leasefy.co` (un solo monolito, menos superficie de deploy/auth/CORS) o levantar `back-main` separado (su propio deploy, CORS, JWT compartido)? El frontend ya apunta a `https://api.leasefy.co/api` — la ruta de menor fricción es extender ese monolito.

2. **Fuente única de verdad del outreach de cobranza** (bloquea el dispatcher de cadencia, §7.3). Hoy **dos fuentes** emiten `cobranza/call.scheduled` (`pre-call-workflow` + `follow-up-workflow`, ya en prod) **y** la cadencia escribe `cadence_contacts` pero **ningún cron las lee**. Agregar un dispatcher que lea `cadence_contacts` **crearía doble-marcado**. Decisión: ¿`cadence_contacts` **reemplaza** la priorización del `pre-call-workflow`, o coexisten con deduplicación? Requiere **migración Prisma**. Se difirió a propósito para no meter un bug en prod — **no tocar hasta decidir.**

3. **Handler de `cobranza/escalation.live`** (live-transfer) no existe — el EscalationRouter usa `urgency:'high'` a propósito para no emitir un evento Inngest huérfano (§6-D4). Si quieren live-transfer, es una fase nueva.

4. **Proveedor Tecnológico DIAN** (facturación). Elegir y habilitar un PT autorizado (certificado, ambiente de pruebas DIAN, resolución de numeración). Bloquea `estadoDIAN` más allá de `borrador`/`emitida`.

5. **Proveedor de dispersión** (egresos/tesorería). El asentamiento `procesado` de `EgresoNeto` requiere mover dinero real (SPT/PSE/Wompi) — bloqueador de credenciales, no de código.

6. **Régimen tributario por tercero** (retenciones). Antes de calcular ReteFuente/ReteICA/ReteIVA, el modelo de `tercero` necesita campos de régimen y responsabilidades fiscales (declarante, ciudad para ICA, gran contribuyente).

---

## 11. Acciones requeridas de Víctor, en orden de prioridad

### P0 — Desbloquear + arrancar (sin esto, nada de cara al cliente corre en el navegador)
1. **Arreglar el gate de secretos para JWKS** (§6-A1, `assert-production-secrets.ts:39-40`) — **ANTES de pushear**, o el server no arranca.
2. **Pushear + desplegar `agent`** con los 4 commits locales (`09ff301`, `3d8e398`, `30fb573`, `5616e76`). Branch `restructure/per-agent-organization`.
3. **Setear `CORS_ALLOWED_ORIGINS`** = origen(es) reales del front (ej. `https://app.leasefy.co`) + documentarla en `.env.example` (§6-A3).
4. **Confirmar `SUPABASE_JWKS_URL` + `SUPABASE_URL` + `SUPABASE_JWT_ISSUER`** en el env del agent en prod.
5. **Setear `OPENAI_API_KEY`** (desbloquea captura de propiedad por audio).
6. **Mergear PR #14** (`mvp`) tras correr la suite completa (§6-G3) — mega-PR mixto con el stream cobranza `37-xx`/`38-xx`.

### P1 — Endurecer lo que está y cerrar lazos
7. **Auth/secretos:** timing-safe compare de `AGENT_API_KEY` (§6-A2); `INNGEST_SIGNING_KEY` al gate (§6-A5); role-check por `DATABASE_URL` no `NODE_ENV` (§6-A4).
8. **Resiliencia:** timeout en `place-outbound-call` (§6-D1); `concurrency`/`rateLimit`/idempotencia del dialer (§6-D2); `retries` en pipelines core (§6-D3).
9. **Webhooks:** exigir `WOMPI_EVENTS_SECRET`/`VAPI_WEBHOOK_SECRET`/`UPSTASH_REDIS_*` en prod (§6-C1/C2).
10. **Run real del scoring:** confirmar que `POST /tenant-scoring` + poll `GET /tenant-scoring/:runId` respondan en prod con JWT de agencia. Requiere cuenta Supabase válida (§9).
11. **Observabilidad:** `/health/ready` (§6-E1); logger estructurado + request-id (§6-E2).

### P2 — Antes de mover dinero real o PII real (BLOQUEANTES regulatorios)
12. **Aislamiento multi-tenant:** correr con rol de DB sin `BYPASSRLS` + test de fuga cross-tenant (§6-B1).
13. **Dinero:** integración SPT real para dispersión (§6-B2); `generate-fresh-payment-link` real (§6-B4); idempotencia de payout/billing-events (§6-B3/B6).
14. **Compliance:** inmutabilidad append-only de `audit_log`/`automated_decisions` (§6-F1); screening AML real o declararlo fuera de alcance (§6-F2).

### Build / tests
15. **Tests:** cobertura de extracción real (§6-G1); suites financieras (§6-G2). `tsc --noEmit` ya limpio (exit 0).

### Falta por CONSTRUIR (desarrollo nuevo, no solo credenciales)
- Motor ERP M1/M2 (Tesorería/Conciliación/Facturación-DIAN/PQRS/Agenda) — §8.
- Despachador de cadencia (tras decidir §10.2).
- Integraciones de carriers de seguro — §7.4.
- Integración real DataCrédito/TransUnion para scoring — §7.1.
- Pasos 7-8 del tenant-scoring (PDF con QR + notify) — §7.1.
- Envío real de sugerencias + reasignación + re-scan en matching — §7.2.

---

## 12. Cómo verificar end-to-end (cuando despliegues)

1. **Arranque:** con el fix §6-A1 + solo `SUPABASE_JWKS_URL`, el server debe arrancar (no `process.exit(1)`).
2. **CORS:** desde el navegador, `OPTIONS /api/agency/<id>/cobranza/debtors` con `Origin: <front>` debe responder `204` con `access-control-allow-origin`. (Verificado en local contra `:4000`.)
3. **Auth:** login de agencia real (Supabase) → la UI de cobranza/cotizador debe cargar data (no 401).
4. **Terceros IA:** subir foto de cédula en `/propietarios` → prellena el form (requiere ANTHROPIC, presente).
5. **Captura propiedad:** setear `OPENAI_API_KEY` → grabar audio en `/propiedades/captura` → ficha.
6. **Dialer/voz:** setear VAPI keys → el dialer coloca llamadas al consumir `cobranza/call.scheduled` (verificar guardrails Ley 2300 a dial-time).
7. **Scoring real:** desde el AI Hub, Run → `202 {runId}` → poll → `{status:'completed', data}`. **Contrato rígido:** el front espera exactamente `202 {runId}` o `{fromCache:true, data}`, y en el poll `{status, data, error}` (`use-agent.ts:218-228, 395-406`); el timeout del cliente es 3 min. Cualquier cambio de shape rompe el panel en silencio.
8. **SSE cotizador + PDF:** verificar que el middleware CORS no rompa `text/event-stream` ni `application/pdf` con `fetch` autenticado.

---

## 13. Notas de proceso / concurrencia + advertencias

- **Concurrencia:** una sesión paralela (gsd-phase-38, stream cobranza) compartió el working tree de `mvp` y **barrió ediciones i18n** dentro de sus commits un par de veces (contenido correcto, mensaje mislabeled). Si ves claves i18n nuevas en commits `38-xx`, son legítimas. Lección registrada: dos sesiones en un working tree corren con `git add` de paths explícitos (nunca `-A`), o worktrees separados.
- **Limpieza esta sesión (2026-06-01):** se revirtió un bypass de mock-auth de demo, se resolvió el conflicto de stash-pop en `PlanSidebar.tsx`, y se eliminó el stash peligroso de mock-auth. **No reintroducir** ese bypass.
- **`avaluo`** (app de avalúos) **no se tocó** — esfuerzo aparte si requiere trabajo.
- **Todo el código del agent es stub-safe:** corre sin credenciales (degrada a stub). Puedes desplegar y sumar keys sin romper nada — **pero** varios stub-modes deberían fail-closed en prod (§6-C/A): no confíes en el stub-safe como postura de seguridad de producción.
- **Tests:** agent sumó ~140 tests nuevos/afectados verdes (terceros/property 27, agency-jwt 38, dialer 17, escalation 57). mvp: 8 (AI Hub) + 4 cotizador + format. `tsc --noEmit` limpio en ambos repos tras `9b42edc`.

---

### Archivos clave para Víctor
- **Frontend integración:** `mvp/src/lib/api/client.ts`, `agent-auth.ts`, `inmobiliaria.service.ts`, `settings.service.ts`, `terceros-extract.service.ts`, `property-capture.service.ts`; hooks `use-agent.ts`, `use-ai-hub-landing.ts`; `mvp/src/components/inmobiliaria/ActaEntregaForm.tsx`; `.env.local`.
- **Agent seguridad/arranque:** `agent/src/server/lib/assert-production-secrets.ts`, `src/server/index.ts`, `src/server/lib/agency-jwt.ts`, `src/server/middleware/role-check.ts`, `src/lib/tenant-scope.ts`, `.env.example`.
- **Agent dinero/compliance:** `src/inngest/functions/daily-dispersion.ts`, `src/payments/wompi.ts`, `src/billing/events.ts`, `src/compliance/frequency.ts`, `src/lib/automated-decisions/write.ts`, `src/mastra/tools/generate-fresh-payment-link.ts`.
- **Agent autopilot:** `src/inngest/functions/autonomous-dialer-workflow.ts`, `cartera-cadence-cron.ts`, `src/lib/vapi/place-outbound-call.ts`, `src/mastra/tools/escalate-to-human.ts`.
