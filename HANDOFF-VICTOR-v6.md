# HANDOFF para Víctor (+ tu Claude) — v6.0 ERP·CRM·Autopilot + Auditoría funcional + Fixes P0/P1/P2

> **Qué es esto:** el estado COMPLETO y accionable de todo lo que se hizo en la sesión 2026-05-30 → 2026-06-01 sobre los repos `mvp` (frontend) y `agent` (microservicio IA). Incluye: el milestone v6.0, una auditoría funcional honesta de TODO el sistema (agentes + ERP), y los fixes aplicados (P0 desbloquear UI, P1 autopilot, P2 persistencia ERP). Está escrito para que tú y tu Claude sepan exactamente **qué quedó hecho, qué falta, qué se necesita de ti, y qué simplemente falta por construir**.
>
> **Cómo usarlo con tu Claude:** pásale este archivo + los 2 reportes en `mvp/claudedocs/` (`v6-functional-audit.md`, `v6-expert-review.md`). Este doc es el índice maestro; los otros dos tienen el detalle file:line de cada hallazgo.
>
> **Fecha:** 2026-06-01 · **Autor de los cambios:** sesión Claude de Nico (cuenta `nicolasgardila`, **sin push access al repo `agent`**).

---

## 0. TL;DR — lee esto primero

1. **El frontend (`mvp`) está pusheado al PR #14.** El backend de IA (`agent`) tiene **4 commits LOCALES sin pushear** porque la cuenta de esta sesión no tiene write access a `Leasefy/agent`. **TÚ debes pushearlos + desplegar.**
2. **La verdad honesta (auditoría funcional):** hay mucho software bueno y testeado, pero **hoy nada de cara al cliente opera end-to-end** porque (a) faltaba CORS/JWT en el agent (YA arreglado en código, falta deploy) y (b) faltan credenciales externas (Vapi, 360dialog, Wompi, DataCrédito, carriers) y el motor ERP (M1/M2) que **no existe**.
3. **Tu camino crítico para que algo funcione en vivo:** push + deploy del `agent` → setear `CORS_ALLOWED_ORIGINS` + credenciales → validar end-to-end. Detalle en §4.
4. **Lo que NO es código (decisiones tuyas/de negocio):** ver §6 (credenciales) y §7 (decisiones de arquitectura, p.ej. cadencia).

---

## 1. El ecosistema de repos (`~/rent/`)

| Repo | Qué es | Tech | Estado en esta sesión |
|---|---|---|---|
| **`mvp`** (`Leafefy/front`) | Frontend del panel inmobiliaria (ERP·CRM·Autopilot) + UI de los agentes | Next.js 14 App Router, React, TS, Tailwind, Phosphor, i18n propio, Lenis | **Mucho trabajo nuevo, pusheado a PR #14** |
| **`agent`** (`Leasefy/agent`) | Microservicio de IA: agentes Mastra + tools, Inngest (pipelines/crons), servidor Hono (91 rutas), Prisma + Supabase | Mastra, Vercel AI SDK, Claude (Anthropic), OpenAI Whisper, Hono, Inngest, Prisma | **4 commits nuevos LOCALES — falta tu push + deploy** |
| **`back-main`** (`Leasefy/back`) | Monolito NestJS — pensado como "motor ERP" (M1/M2) | NestJS | **Scaffold — el motor ERP NO existe aún** |
| **`admin`** | Panel interno de ops de Leasefy | Next.js 14, :3100 | No tocado esta sesión |
| **`avaluo`** | App de avalúos de propiedad (appraisal) | Next.js 14 + Prisma | **No tocada esta sesión** — separada; si requiere trabajo es otro esfuerzo |
| **`mvp-agents-sandbox`**, **`roadmap`** | Sandbox / roadmap | — | No tocados |

**Reparto de responsabilidades (decidido en el programa):** UI = `mvp` · motor ERP = `back-main` · IA = `agent` (Mastra) · ops internas = `admin`.

**El frontend consume al agent vía HTTP** (`NEXT_PUBLIC_AGENT_URL`) y al monolito vía `NEXT_PUBLIC_BACKEND_URL` (= `https://api.leasefy.co`, vivo y desplegado).

---

## 2. Qué se hizo esta sesión — resumen por repo + commits exactos

### 2.1 `agent` (branch `restructure/per-agent-organization`) — **LOCAL, sin pushear**

| Commit | Qué |
|---|---|
| `09ff301` | **Hardening v6-07/08** (terceros + property-capture): CORS en `/terceros` + `/property-capture`, sanitización de errores 500 (no filtrar SDK), role-check fail-closed en prod, timeouts Anthropic/OpenAI, clamps de rangos del LLM, SSRF guard, `Cache-Control: no-store` PII, + **2 suites de tests reales** de extracción (27 tests). |
| `3d8e398` | **P0 — desbloquear UI:** CORS también en `/api/agency/*` (toda la UI de cobranza/cotizador/AI-Hub estaba bloqueada por preflight) + `agency-jwt.ts` ahora verifica el token ES256 de Supabase vía `SUPABASE_JWKS_URL` (la var que sí está configurada; antes usaba `SUPABASE_JWT_PUBLIC_KEY` que estaba vacía → 401). 38 tests. |
| `30fb573` | **P1 — dialer autónomo:** nuevo consumer de `cobranza/call.scheduled` (antes el evento se emitía al vacío) + helper Vapi stub-safe + guardrails (opt-out → horario Ley 2300 → frecuencia) + audit. 17 tests. |
| `5616e76` | **P1 — EscalationRouter en el path de voz:** cuando la voz fuerza FRAUD_FLAG/ESCALATE_HUMAN, ahora crea la fila `agent.escalations` + decisión auditable (T-323/Ley 1581), idempotente, stub-safe, sin LLM. 57 tests. |

> ⚠️ **Estos 4 commits están en tu branch local pero NO en el remoto de `Leasefy/agent`.** Confirma `git log` en tu copia; si no los ves, hay que transferirlos (push desde una cuenta con acceso, o cherry-pick).

### 2.2 `mvp` (branch `feat/v6.0-01-ia-unificada-command-center`, **PR #14 abierto**)

Además del milestone v6.0 completo (8 fases, ver §5.1), esta sesión agregó:

| Commit | Qué |
|---|---|
| `36ded83` | **Fixes de la revisión experta de v6.0:** guards de tamaño foto/audio, cleanup de object URLs, confirmación al re-extraer, mapeo 401, a11y del sidebar (+ re-aplicado el fix `data-lenis-prevent`), `formatCurrency` es-CO (era es-CL/CLP de Chile), retenciones colombianas en el contrato de tesorería, i18n. |
| `d8c7579` | **P0 — Authorization:** los ~50 hooks de cobranza/cotizador llamaban al agent **sin header `Authorization`** (con `credentials:'include'` que el agent no lee). Migré **75 sitios** a `Authorization: Bearer` vía un helper nuevo `@/lib/api/agent-auth`. |
| `ea62079` | **P2 — persistir ERP:** 5 flujos de escritura **fingían éxito** (`setTimeout` + toast, sin persistir). Conectados a sus APIs reales: dispersiones, propietarios CRUD, crear acta, eliminar cuenta (cumplimiento), importar portafolio. |
| `eaa0c91` | **P1 — AI Hub run:** el `AIAgentExecutionPanel` era código muerto (nunca se renderizaba). Ahora se monta + botón Run + `use-agent` arreglado (payload real + 202-then-poll + resolver de documentos). |

> ✅ **Todo `mvp` está pusheado al PR #14.** Reviewer puede ver el diff en GitHub.

### 2.3 Reportes de referencia (en `mvp/claudedocs/`)
- **`v6-functional-audit.md`** — auditoría funcional de TODO el sistema (13 componentes, matriz honesta, 18 bugs high/critical con file:line). **Léelo, es la fuente de verdad del estado.**
- **`v6-expert-review.md`** — revisión experta del milestone v6.0 (45 hallazgos confirmados).

---

## 3. Estado funcional honesto (matriz) — ¿qué funciona de verdad HOY?

Leyenda: ✅ funcional · 🟡 parcial · ⚪ stub/estado-vacío · ⛔ bloqueado por credenciales/externos · 🔴 roto.

| Componente | Capa | Status | Bloqueador principal |
|---|---|---|---|
| Validador / Tenant Scoring | agent | 🟡 | DataCrédito mock (30% del score es aleatorio); falta PDF/QR + notify |
| Smart Matching | agent | 🟡 | No notifica/reasigna; depende del monolito |
| Cobranza — Voz (Vapi) | agent | 🟡 | Dialer YA cableado (`30fb573`); faltan **VAPI keys** |
| Cobranza — WhatsApp/Negociación | agent | 🟡 | Falta **360dialog/Kapso key** (envío real = stub) |
| Cobranza — Compliance/Legal | agent | 🟡 | EscalationRouter YA cableado (`5616e76`); RNE/Certicámara externos |
| Cobranza — Pagos/Cadencia/Dispersión | agent | 🟡 | Cadencia sin dispatcher (decisión, §7); dispersión no mueve dinero (falta SPT); **Wompi/Bold keys** |
| Cotizador (seguros) | agent | ⛔ | **Cero carriers reales** (Sura/Mapfre/Bolívar solo stub) |
| Terceros + Captura propiedad (v6-07/08) | agent | 🟡 | Terceros opera (ANTHROPIC presente); captura audio necesita **`OPENAI_API_KEY`** |
| ERP Financiero (cobros/dispersiones) | mvp | 🟡 | Cobros/dispersiones reales contra monolito; tesorería/conciliación/facturación = ⚪ esperan motor M1/M2 |
| ERP CRM/Portafolio | mvp | 🟡 | propiedades/contratos reales contra monolito; flujos de escritura YA persisten (`ea62079`) |
| ERP Operaciones/Comms/Informes | mvp | 🟡 | Monolito externo; pqrs/agenda = ⚪ esperan M1 |
| AI Hub UI | mvp | 🟡 | ExecutionPanel YA renderiza (`eaa0c91`); run real necesita agent desplegado |
| Integración / Auth / CORS | cross | ✅(código) | YA arreglado (`3d8e398` + `d8c7579`); **necesita deploy + env** |

---

## 4. 🚨 ACCIONES REQUERIDAS DE TI (Víctor) — lo accionable, en orden

### P0 — Desbloquear la UI (sin esto, cobranza/cotizador/AI-Hub no cargan nada en el navegador)
1. **Pushear + desplegar `agent`** con los 4 commits locales (`09ff301`, `3d8e398`, `30fb573`, `5616e76`). Branch `restructure/per-agent-organization`.
2. **Setear `CORS_ALLOWED_ORIGINS`** en el deploy del agent = el/los origen(es) reales del frontend (ej. `https://app.leasefy.co`). Hoy el default es `http://localhost:3000,http://localhost:3005` (solo dev). **Sin esto, el navegador bloquea todo el cross-origin.**
3. **Verificar el JWT de agencia:** el fix migró `agency-jwt.ts` a usar `SUPABASE_JWKS_URL` (que ya está seteado). Confirma que `SUPABASE_JWKS_URL` + `SUPABASE_URL` estén en el env del agent en prod. (Alternativa legacy: setear `SUPABASE_JWT_PUBLIC_KEY` con el JWK — pero ya no hace falta.)
4. **Mergear PR #14** (`mvp`) tras review. Ojo: incluye también el stream paralelo de cobranza `37-xx`/`38-xx` (es un mega-PR mixto).

### P1 — Que el "run real" del scoring funcione
5. El AI Hub (`eaa0c91`) hace `POST /tenant-scoring` + polling `GET /tenant-scoring/:runId`. Confirma que esos endpoints respondan en prod con el JWT de agencia. Necesita una cuenta Supabase de agencia válida (ver §6).

### Decisiones que SOLO tú/equipo pueden tomar (no es código)
6. **Cadencia (P1 #2) — DIFERIDO a propósito:** hoy `pre-call-workflow` + `follow-up-workflow` ya emiten `cobranza/call.scheduled`. Agregar un dispatcher desde `cadence_contacts` crearía **DOBLE-MARCADO**. Hay que **decidir la "única fuente de verdad"** del outreach (¿cadence_contacts reemplaza a la priorización del pre-call-workflow?) + hacer una **migración Prisma**. No lo implementé para no meter un bug en producción. Ver `v6-functional-audit.md` §"Cadence" + el plan en mi sesión.
7. **Motor ERP M1/M2** (Tesorería, Conciliación, Facturación electrónica DIAN) **no existe** — `back-main` es scaffold. Decidir qué monolito lo implementa y arrancarlo. El frontend ya tiene las secciones + contratos de tipos listos (ver §5.1).

### Build blocker pre-existente (no es mío, pero bloquea CI)
8. **`mvp/src/components/inmobiliaria/cobranza/CostPerPesoKpi.tsx:105`** tiene un error de tsc (type `Formatter` de recharts) del stream paralelo cobranza — **bloquea `next build`**. El equipo de cobranza debe arreglarlo.

---

## 5. Detalle por feature — qué hace, status, qué falta, cómo funciona

### 5.1 ERP v6.0 (frontend-first) — secciones nuevas en `mvp` (`/panel/inmobiliaria`)

El milestone v6.0 entregó **8 fases** (`v6-01`..`v6-08`) **aditivas** (no rompen el CRM existente). Cada sección ERP nueva existe en UI con **estado vacío honesto + contrato de tipos** (`src/lib/api/<sección>.types.ts`) que el motor M1/M2 implementará.

| Sección | Ruta | Status | Qué falta (backend) |
|---|---|---|---|
| Command Center "Hoy" + sidebar agrupada | `/hoy` | ✅ UI; insights con data de preview hardcodeada | Cablear `deriveInsights(datosReales)` desde hooks reales |
| Facturación ⭐ | `/facturacion` | ⚪ UI + contrato | **Motor DIAN (M2)** + proveedor tecnológico autorizado |
| Conciliación bancaria | `/conciliacion` | ⚪ UI + contrato | **Motor M2** (ingesta bancaria + matching) |
| Tesorería / Egresos | `/tesoreria` | ⚪ UI + fórmula neto (canon−comisión−IVA−retenciones−descuentos) | **Motor M1** (ledger autoritativo) |
| Informes & Insights | `/hoy` (panel) | ✅ motor de insights puro | Data real |
| PQRS + Agenda | `/pqrs`, `/agenda` | ⚪ UI + contrato | **Motor M1** (triage IA + agregación) |
| **Terceros por IA (v6-07)** | botón en `/propietarios` | 🟡 cross-repo | Ver 5.2 |
| **Captura propiedad foto+audio (v6-08)** | `/propiedades/captura` | 🟡 cross-repo | Ver 5.2 |

**Tecnología de las secciones ERP:** son páginas `'use client'` Next.js que, cuando exista el motor, reemplazarán el empty-state por hooks que peguen a `NEXT_PUBLIC_BACKEND_URL`. El contrato (request/response shape) que el motor debe implementar ya está escrito en `src/lib/api/*.types.ts`.

### 5.2 Agentes de IA nuevos (cross-repo: `agent` + UI en `mvp`)

**Terceros por IA (v6-07)** — `agent`: `POST /terceros/extract` (`src/mastra/tools/extract-tercero.ts`, Claude Vision sobre cédula/RUT). **Opera hoy** (requiere `ANTHROPIC_API_KEY`, que está presente). UI: botón "Crear con IA" en propietarios → foto → prellena el form. CORS + JWT ya correctos.

**Captura de propiedad foto+audio (v6-08)** — `agent`: `POST /property-capture/extract` (`extract-property.ts`, OpenAI Whisper transcribe + Claude arma la ficha). UI: `/propiedades/captura`. **Bloqueado por `OPENAI_API_KEY` vacío** → la transcripción lanza 500. Setear esa key lo desbloquea.

### 5.3 Los 4 dominios de agentes (preexistentes, auditados)

- **Validador / Tenant Scoring** (`src/mastra/agents/validador/`): pipeline OCR→bureau→consistencia→score. **El score corre con bureau MOCK aleatorio** (`src/lib/credit-score.ts`: `provider='datacredito'` hace `throw 'not implemented'`). Falta: contrato DataCrédito/TransUnion + pasos 7-8 (PDF con QR + notify).
- **Smart Matching** (`src/mastra/agents/matching/`): cálculo de compatibilidad. Falta: envío real de sugerencias + reasignación de leads + re-scan de propiedades estancadas con data real.
- **Cobranza** (12 sub-agentes en `src/mastra/agents/cobranza/`): el más maduro. WhatsApp end-to-end cableado (200 tests) — falta key 360dialog. Voz: "cerebro" completo + **dialer ya cableado** (`30fb573`) — falta keys Vapi. Compliance/legal + **EscalationRouter ya cableado** (`5616e76`) — RNE/Certicámara externos. Pagos: capa Wompi/Bold lista — falta keys + la **API de dispersión bancaria (SPT) NO existe** (la dispersión hoy es asiento contable, no transferencia real).
- **Cotizador** (`src/mastra/agents/cotizador/`): pipeline TS-puro maduro (scoring determinista + PDF + SSE). **Cero carriers reales integrados** — todo `stub_mode:true` con prima sintética. Falta: terminar `bolivar/rest.ts` (OQ-2) + contratos con aseguradoras.

### 5.4 Autopilot — los lazos que cerré esta sesión (P1)
- **Dialer autónomo** (`30fb573`, `src/inngest/functions/autonomous-dialer-workflow.ts`): consume `cobranza/call.scheduled`, chequea guardrails (opt-out/horario/frecuencia), coloca la llamada vía el helper Vapi `src/lib/vapi/place-outbound-call.ts` (stub-safe), registra la llamada + audit. **Opera en stub sin VAPI keys.**
- **EscalationRouter en voz** (`5616e76`, `src/server/routes/lib/persist-escalation-from-verdict.ts`): cuando la voz fuerza FRAUD_FLAG/ESCALATE_HUMAN, crea la fila de escalación auditable. **Stub-safe sin DATABASE_URL.**

---

## 6. 🔑 Credenciales / servicios externos que faltan (lista completa)

Cada uno desbloquea lo indicado. Todo el código degrada a **stub** cuando falta (no crashea).

| Credencial / servicio | Desbloquea | Notas |
|---|---|---|
| `OPENAI_API_KEY` | Captura de propiedad por audio (v6-08, Whisper) | Hoy vacía → 500 |
| `VAPI_API_KEY` + `VAPI_OUTBOUND_ASSISTANT_ID` + `VAPI_OUTBOUND_PHONE_NUMBER_ID` | Llamadas de voz reales (dialer + manual-call) | Config a nivel env (no per-tenant) |
| `WHATSAPP_360DIALOG_API_KEY` + plantillas Meta aprobadas | WhatsApp real (cobranza) | Hoy `{status:'stubbed'}` |
| `WOMPI_*` / `BOLD_*` | Links de pago + webhooks de conciliación | Capa lista, falta key |
| **API de dispersión bancaria (Wompi SPT / payout rails)** | Transferir dinero real al arrendador | **NO implementada** — hoy solo asiento contable |
| `DATACREDITO_*` / TransUnion | Score real (hoy 30% aleatorio) | Integración hace `throw` |
| Carriers (Sura, Mapfre, Bolívar/Conecta, Sekure) | Cotizador real | Cero integraciones; terminar `bolivar/rest.ts` |
| `CERTICAMARA_*`, `SIC_RNE_*`, `RESEND_API_KEY` | Notificaciones certificadas / RNE / emails ARCO | Hoy stub |
| Proveedor DIAN autorizado | Facturación electrónica (CUFE) | Bloquea `/facturacion` |
| Cuenta Supabase de agencia válida (proyecto `jraqurdcjwnifzpdqtnm`) | Login real + data real en dev/prod | El login de prueba daba 400 invalid_credentials |
| `CORS_ALLOWED_ORIGINS` (env del agent) | Toda la UI cross-origin | **Crítico para P0** |

---

## 7. Decisiones de arquitectura pendientes (no es código)

1. **Fuente única de verdad del outreach de cobranza** (bloquea el dispatcher de cadencia P1 #2). Hoy hay 2 fuentes emitiendo `call.scheduled`. Decidir si `cadence_contacts` reemplaza la priorización → requiere migración Prisma. **No tocar hasta decidir** (riesgo de doble-marcado).
2. **Qué monolito es el motor ERP** (M1/M2). `back-main` es scaffold. Bloquea Tesorería/Conciliación/Facturación con data real.
3. **Handler de `cobranza/escalation.live`** (live-transfer) no existe — el EscalationRouter usa `urgency:'high'` a propósito para no emitir un evento Inngest huérfano. Si quieren live-transfer, es una fase nueva.

---

## 8. Cómo verificar end-to-end (cuando despliegues)

1. Agent desplegado + `CORS_ALLOWED_ORIGINS` seteado → desde el navegador, `OPTIONS /api/agency/<id>/cobranza/debtors` debe responder `204` con `access-control-allow-origin`. (Lo verifiqué en local contra `:4000`.)
2. Login de agencia real (Supabase) → la UI de cobranza/cotizador debe cargar data (no 401).
3. Terceros IA: subir foto de cédula en `/propietarios` → prellena el form (requiere ANTHROPIC, ya presente).
4. Captura propiedad: setear `OPENAI_API_KEY` → grabar audio en `/propiedades/captura` → ficha.
5. Dialer/voz: setear VAPI keys → el dialer coloca llamadas al consumir `call.scheduled`.

---

## 9. Notas de proceso / advertencias

- **Concurrencia:** una sesión paralela (gsd-phase-38, stream cobranza) compartió el working tree de `mvp` y **barrió ediciones i18n mías dentro de sus commits** un par de veces (contenido correcto, mensaje mislabeled). Si ves claves i18n nuevas en commits `38-xx`, son legítimas.
- **`avaluo`** (app de avalúos) **no se tocó** esta sesión. Si requiere trabajo, es un esfuerzo aparte — no está cubierto aquí.
- **Tests:** agent suma ~140 tests nuevos/afectados verdes esta sesión (terceros/property 27, agency-jwt 38, dialer 17, escalation 57). mvp: 8 (AI Hub) + 4 cotizador actualizados + format 55. **tsc limpio en todos mis archivos** en ambos repos (el único error es el `CostPerPesoKpi.tsx` ajeno).
- **Todo el código del agent es stub-safe:** corre sin credenciales (degrada a stub), así que puedes desplegar y luego ir sumando keys sin romper nada.

---

## 10. Resumen de "qué se requiere de ti" vs "qué falta por construir"

**Se requiere de TI (acción directa, desbloquea lo ya hecho):**
- Push + deploy del `agent` (4 commits).
- Setear `CORS_ALLOWED_ORIGINS` + `OPENAI_API_KEY` + confirmar `SUPABASE_JWKS_URL`.
- Cuenta Supabase de agencia válida.
- Mergear PR #14.
- Conseguir credenciales (Vapi, 360dialog, Wompi/Bold).
- Arreglar el build blocker `CostPerPesoKpi.tsx` (o asignar al equipo cobranza).

**Falta por CONSTRUIR (no es solo credenciales — es desarrollo nuevo):**
- Motor ERP M1/M2 (Tesorería/Conciliación/Facturación-DIAN).
- API de dispersión bancaria (SPT) para mover dinero real.
- Integraciones de carriers de seguro (cotizador).
- Integración real DataCrédito/TransUnion.
- Dispatcher de cadencia (tras decidir la fuente única de verdad).
- Pasos 7-8 del tenant-scoring (PDF con QR + notify) y el envío real de sugerencias del matching.

**Decisiones de negocio/arquitectura (§7):** fuente única de outreach, monolito motor ERP, live-transfer.
