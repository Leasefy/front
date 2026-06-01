# Auditoría Funcional — Leasefy (ERP · CRM · Autopilot)

> Panel multi-agente (13 expertos, uno por componente) + verificación adversarial de cada veredicto "funcional"/"roto" y cada bug high/critical, varios **verificados en vivo contra el agent en `:4000`**.
> 13 componentes evaluados · 1 veredicto corregido · 18 bugs high/critical confirmados. Fecha: 2026-05-31.

## Veredicto honesto

**No.** No están todos los agentes y el ERP totalmente funcionales. Hay mucho software sofisticado y bien testeado, pero **ninguno de los componentes de cara al cliente opera hoy end-to-end desde el navegador**. Dos bugs **críticos de integración** (CORS ausente en `/api/agency/*` y `SUPABASE_JWT_PUBLIC_KEY` vacío) bloquean por completo que la UI de cobranza/cotizador/AI-Hub cargue data real — verificado en vivo. Encima, el "autopilot" tiene la mitad del lazo roto: **no existe dialer** que coloque llamadas Vapi automáticamente, **la cadencia planificada nunca se despacha**, y **la dispersión no mueve dinero** (solo asiento contable). El ERP frontend es mitad real (propiedades/contratos/cobros pegan a un backend desplegado y vivo) y mitad humo: varios flujos de escritura (propietarios, importar portafolio, generar dispersiones, crear acta, eliminar cuenta) son `setTimeout` + estado local que **no persisten nada**, y Tesorería/Conciliación/Facturación son estados-vacíos honestos esperando un motor M1/M2 que **no existe**. El cotizador es la pieza más madura, pero comercialmente está muerto: **cero carriers reales integrados** (todo stub con prima sintética por hash).

En resumen: el "cerebro" de varios agentes está completo y probado, pero los "brazos y piernas" (marcado, envío de dinero, integración carriers, auth cross-origin) o están sin cablear o bloqueados por credenciales externas.

## Matriz de prontitud funcional

| Componente | Capa | Status | Cableado E2E | Tests | Bloqueador principal |
|---|---|---|---|---|---|
| Agente 01 — Validador / Tenant Scoring | agent | 🟡 partial | ❌ | ✅ 97 | DataCrédito mock (30% del score aleatorio); contrato FE↔BE roto; sin PDF/QR ni notify |
| Agente 02 — Smart Matching | agent | 🟡 partial | ❌ | ✅ 9 | No notifica/reasigna; cron stale no escanea propiedades; depende del monolito |
| Cobranza — Voz / Llamadas (Vapi) | agent | 🟡 partial | ❌ | ✅ 44+ | **No existe dialer** que consuma `call.scheduled`; Vapi keys ausentes |
| Cobranza — WhatsApp / Negociación | agent | 🟡 partial | ✅ | ✅ 200 | 360dialog key ausente (envío real = stub); ANTHROPIC para LLM |
| Cobranza — Compliance + Legal | agent | 🟡 partial | ❌ | ✅ | EscalationRouter cableado a cero (código muerto); RNE/Certicámara externos |
| Cobranza — Pagos + Cadencia + Dispersión | agent | 🟡 partial | ❌ | ✅ parcial | Cadencia no se despacha; dispersión no transfiere dinero; Wompi/Bold keys |
| Cotizador (seguros arrendamiento) | agent | ⛔ blocked-on-external | ✅ | ✅ 15 | **Cero carriers reales** (Sura/Mapfre/Bolívar solo stub); Bolívar REST hace throw |
| v6-07/08 — Extracción terceros + captura propiedad | agent | 🟡 partial | ✅ | ✅ 27 | `OPENAI_API_KEY` vacío → captura de audio lanza 500 (verificado); terceros sí opera |
| ERP Financiero | erp-mvp | 🟡 partial | ❌ | 🔴 sin | Motor M1/M2 ausente; wizard dispersiones no persiste |
| ERP CRM / Portafolio | erp-mvp | 🟡 partial | ❌ | 🔴 sin | Propietarios/importar/wizard no persisten; resto pega a backend real |
| ERP Operaciones / Comunicaciones / Informes | erp-mvp | 🟡 partial | ❌ | 🔴 sin | Monolito externo; varias escrituras toast-only; pqrs/agenda empty-state M1 |
| AI Hub UI (tenant-scoring + matching) | ai-ui | 🟡 partial | ❌ | ✅ parcial | Ejecución es código muerto inalcanzable; activity feed forzado a vacío |
| Integración / Auth / Permisos / Config | cross-cutting | 🔴 **broken** | ❌ | ✅ | **CORS ausente + JWT ES256 sin verificar** → toda la UI agent bloqueada |

Estados-vacíos honestos dentro de erp-mvp: **Tesorería, Conciliación, Facturación, PQRS, Agenda** = ⚪ stub/empty-state esperando motor M1/M2.

## 🔴 Roto / bugs confirmados (impiden que algo funcione HOY)

**Críticos (verificados en vivo contra `:4000`):**

1. **CORS ausente en `/api/agency/*`** — `agent/src/server/index.ts:452-461`. El middleware `cors()` solo se monta en `/terceros` y `/property-capture` (lo que se arregló para v6-07/08). `OPTIONS /api/agency/<id>/cobranza/debtors` desde `Origin: localhost:3000` → **401 sin headers Access-Control-***. El navegador bloquea el preflight → **toda la UI ERP de cobranza/cotizador/AI-Hub no puede cargar data cross-origin**. *Fix:* montar el mismo middleware CORS allowlist en `/api/agency/*` (o un rewrite/proxy en Next.js).

2. **`SUPABASE_JWT_PUBLIC_KEY` vacío deshabilita verificación ES256** — `agent/src/server/lib/agency-jwt.ts:98-125`. `loadSupabaseKey()` → null, se salta ES256 y cae a HS256 con `AGENT_JWT_SECRET`, que no puede verificar el token ES256 de Supabase → **401**. Inconsistencia: `jwt-verify.ts` (en `/tenant-scoring`) sí verifica ES256 vía JWKS, pero `agency-jwt.ts` usa otra variable que nadie configuró. *Fix:* setear `SUPABASE_JWT_PUBLIC_KEY` o migrar `agency-jwt.ts` a `SUPABASE_JWKS_URL`.

**Altos:**

3. **No existe dialer automático** — `agent/src/inngest/functions/index.ts`. `pre-call-workflow`/`follow-up-workflow` **emiten** `cobranza/call.scheduled`, pero **cero consumidores** en las 26 funciones registradas. La única salida real (`POST api.vapi.ai/call`) es `manual-call`. El marcado autónomo no opera.

4. **~50 hooks del agent envían `credentials:'include'` sin Authorization** — p.ej. `mvp/src/lib/hooks/use-ai-hub-landing.ts:54-57`. El agent solo lee `Authorization: Bearer`. Aun arreglando CORS, estas llamadas → 401.

5. **`use-agent.ts` triple bug** — `mvp/src/lib/hooks/use-agent.ts:77-100`. Sin `Authorization`; envía `{applicationId, agencyId}` cuando el backend exige `tenantId+monthlyRent+documents[]` (400); lee `data.score` cuando el backend responde 202 `{runId, status:'pending'}` sin polling. Mismo patrón en `runMatching` (`:159`).

6. **Ejecución de tenant-scoring/smart-matching es código muerto** — `mvp/src/components/inmobiliaria/ai/AIAgentCard.tsx`. `setShowRunPopover(true)` nunca se llama; `<AIAgentExecutionPanel>` no se renderiza. La card es solo un `<Link>`; `runScoring/runMatching` son inalcanzables.

7. **EscalationRouter cableado a cero** — `agent/src/mastra/agents/cobranza/escalation-router.ts`. Sin callers fuera de tests. Cuando el guardrail fuerza `FRAUD_FLAG`/`ESCALATE_HUMAN`, no crea fila de escalación ni decisión auditable (T-323).

8. **Score depende de bureau mock aleatorio (30% del peso)** — `agent/src/lib/credit-score.ts:39`. Con `provider='mock'` (default), `rawScore = 300 + Math.random()*...`. El provider `'datacredito'` hace `throw 'not implemented yet'`.

**Frontend ERP que finge éxito sin persistir (verificado):**

9. **Wizard "Generar dispersiones"** — `mvp/src/components/inmobiliaria/DispersionWizard.tsx:364-393`. `setTimeout(1500)` + `transferReference` random + toast; **nunca llama `dispersionesApi.create`**.
10. **Propietarios CRUD** — `mvp/src/app/.../propietarios/page.tsx:254-306`. `setTimeout` + estado local; `propietariosApi` existe pero no se usa.
11. **Importar portafolio** — `mvp/src/components/inmobiliaria/import/steps/StepConfirmImport.tsx:34-58`. `setTimeout` + `console.log` + toast. Cero API.
12. **Crear Acta de Entrega** — `mvp/src/app/.../documentos/page.tsx:320`. Solo `toast.success`; nunca `actasApi.create`.
13. **Eliminar cuenta** — `mvp/src/app/.../perfil/page.tsx:224`. `setTimeout` + toast; nunca `settingsApi.deleteAccount`. **Riesgo de cumplimiento (derecho de borrado) + UX engañosa.**

**Mediano:**

14. **Cadencia nunca se despacha** — `agent/src/inngest/functions/cartera-cadence-cron.ts`. Escribe `cadence_contacts` pero ningún cron las lee para disparar outreach.
15. **Dispersión no mueve dinero** — `agent/src/inngest/functions/daily-dispersion.ts`. Crea `payout` con `bankAccount={note:'Phase 12 stub'}`; nunca llama API SPT. Asiento contable, no transferencia.
16. **`generate-fresh-payment-link` stub** — `agent/src/mastra/tools/generate-fresh-payment-link.ts:62`. Devuelve URL `pay.leasefy.co/stub/...` no pagable.

## ⛔ Bloqueado por externos (código completo, no puede operar sin credenciales)

- **`OPENAI_API_KEY` vacío** → captura de propiedad por audio (v6-08) hace 500. (Terceros sí opera con ANTHROPIC presente.)
- **Vapi** → ninguna llamada real; `manual-call` cae a stub 202.
- **360dialog / Kapso** → `sendTemplate` = `{status:'stubbed'}`; ningún WhatsApp sale.
- **Wompi/Bold** → link y webhooks en stub; sin pago ni conciliación.
- **API de dispersión bancaria (Wompi SPT)** → no implementada.
- **DataCrédito / TransUnion** → integración hace `throw`; score con mock aleatorio.
- **Carriers (Sura, Mapfre, Bolívar/Conecta, Sekure)** → **cero integraciones reales**; toda cotización es `stub_mode:true`.
- **Certicámara, RNE/SIC, Resend** → en stub.
- **Proveedor DIAN autorizado** → bloquea Facturación electrónica.
- **Monolito NestJS `api.leasefy.co`** → vivo y desplegado, requiere JWT de agencia válido.

## ⚪ Frontend-first / estados vacíos (UI sin backend, esperando M1/M2)

El motor ERP **M1/M2 en `back-main` no existe**. UI + contratos honestos, sin fetch: **Tesorería, Conciliación, Facturación, PQRS, Agenda**. El dashboard "Hoy" (`hoy/page.tsx:101`) alimenta el motor de insights con números hardcodeados de preview.

## ✅ Lo que SÍ funciona de verdad hoy

- **Cobranza WhatsApp end-to-end cableado** (in-call, post-call, inbound) con opt-out 3 capas, frequency cap Ley 2300, SAGRILAFT. 200 tests. *Falta key 360dialog.*
- **El "cerebro" en-llamada de voz** — webhook HMAC + idempotencia + máquina de estados + VoiceConductor + ComplianceGuardrail + post-call. 44+ tests. *Falta dialer + keys Vapi.*
- **Extracción de terceros (cédula/RUT)** — Claude Vision real, cableado E2E con CORS+JWT correctos. **Opera hoy.** 27 tests.
- **Maquinaria del cotizador** (pipeline TS-puro → scoring determinista → PDF `@react-pdf` → SSE). La pieza más madura. *Faltan carriers reales.*
- **ERP propiedades + contratos** — CRUD real contra el monolito vivo (`GET /properties` → 200 con data real; ciclo de contrato completo).
- **ERP cobros + pipeline candidatos** — registrar pago, mover etapa, recordatorios — real contra el backend.
- **Capa de payments providers** (Wompi/Bold con failover, webhooks HMAC+dedup). 24+27+18+14 tests. *Faltan credenciales.*
- **ARCO** (Ley 1581) end-to-end + crons legales con cuerpos reales.

## Qué falta para "totalmente funcional" — checklist priorizado

**P0 — Desbloquear la UI (sin esto nada de cobranza/cotizador funciona en el navegador):**
1. [ ] Montar CORS en `/api/agency/*` (mismo allowlist que `/property-capture`).
2. [ ] Configurar `SUPABASE_JWT_PUBLIC_KEY` (o migrar `agency-jwt.ts` a `SUPABASE_JWKS_URL`/ES256).
3. [ ] ~50 hooks del agent: enviar `Authorization: Bearer` (no `credentials:'include'`).
4. [ ] `use-agent.ts`: header auth + payload completo (`tenantId/monthlyRent/documents[]`) + polling de `GET /tenant-scoring/:runId`.

**P1 — Cerrar lazos de autopilot rotos:**
5. [ ] Implementar el **dialer** que consuma `cobranza/call.scheduled` → `POST api.vapi.ai/call`.
6. [ ] Conectar `cadence_contacts` a un dispatcher real de outreach.
7. [ ] Cablear el **EscalationRouter** en el camino crítico de voz.
8. [ ] Renderizar `AIAgentExecutionPanel` + `setShowRunPopover(true)` (o eliminar el código muerto).

**P2 — Eliminar el "humo" del frontend ERP (persistir de verdad):**
9. [ ] DispersionWizard → `dispersionesApi.create`.
10. [ ] Propietarios CRUD → `propietariosApi.*`.
11. [ ] Importar portafolio → endpoint real.
12. [ ] Crear Acta → `actasApi.create`; Eliminar cuenta → `settingsApi.deleteAccount` (cumplimiento); Avatar → `settingsApi.uploadAvatar`.

**P3 — Credenciales/contratos externos (negocio, no código):**
13. [ ] `OPENAI_API_KEY` (desbloquea captura de propiedad por audio).
14. [ ] Vapi, 360dialog, Wompi/Bold + webhooks.
15. [ ] DataCrédito/TransUnion + al menos un carrier (terminar `bolivar/rest.ts`, OQ-2).
16. [ ] API de dispersión bancaria (SPT).

**P4 — Motor ausente + gaps de spec:**
17. [ ] Motor ERP M1/M2 en `back-main` (Tesorería, Conciliación, Facturación-DIAN).
18. [ ] Tenant-scoring: PDF con QR + notificación al equipo.
19. [ ] Smart Matching: envío real de sugerencias + reasignación + re-scan.
20. [ ] Tests: `calculate-payment-plan`, `daily-dispersion`, caminos financieros del ERP frontend.
