# Leasefy v6.0 — Auditoría QA de Producto Completo

**Fecha:** 2026-06-01
**Alcance:** Todo el producto — frontend (`Leasefy/front`, `rent/mvp`) + microservicio de agentes (`Leasefy/agent`). 20 áreas de QA: inquilino, propietario, panel inmobiliaria core, cobranza UI, cotizador/AI-Hub, auth/onboarding, seguridad frontend, a11y/diseño, performance, capa de datos; y en el agente: rutas HTTP, scoring/matching, cobranza, cotizador, money/pagos, compliance, Inngest, Prisma/RLS, seguridad, y cobertura de tests cross-repo.

**Cómo se generó:** Fan-out de 20 agentes especialistas, cada uno auditando un área con lectura estática de código (file:line). Un subconjunto de hallazgos críticos/altos pasó por **verificación adversarial** (un segundo agente intentó refutar el hallazgo contra el código real, emitiendo veredicto `confirmed` / `refuted` / `uncertain`). Los hallazgos refutados se excluyen del cuerpo principal (Apéndice). Los hallazgos se deduplicaron cuando se solapaban entre áreas. **No se ejecutó la aplicación ni el backend en navegador** salvo donde se indica; los hallazgos están fundados en análisis estático con evidencia de archivo y línea.

> **Nota de transparencia:** Ningún hallazgo de severidad alta/crítica fue refutado en la verificación adversarial — todos los que se verificaron resultaron `confirmed` (6 verificados, incluyendo un ajuste de severidad a la baja en `agent-sec-1`). Los hallazgos sin veredicto (`null`) se reportan en su severidad declarada y marcan `confianza` según lo evaluó el especialista; deben tratarse como `uncertain` hasta validación en runtime/backend.

---

## 1. Veredicto ejecutivo

El producto tiene un esqueleto funcional sólido y, en varias áreas (panel inmobiliaria core, cobranza/cotizador del agente, compliance Ley 2300, capa de pagos), código de calidad notablemente alta para un MVP — con honestidad de stubs, idempotencia y gating multi-tenant reales. Pero **no está listo para producción con datos/dinero reales**: hay defectos confirmados de pérdida de dinero (la clave de dedup de webhooks se quema antes de escribir el ledger; doble facturación DIAN en el cron mensual), un agujero de compliance crítico (la pausa de contacto de 72h por revisión humana T-323/2024 se escribe pero nunca se aplica), un borrado de cuenta totalmente simulado que muestra "cuenta eliminada" sin borrar nada (exposición Ley 1581/ARCO), y un crash garantizado por Rules-of-Hooks en la lista de deudores (la pantalla de cobranza más transitada). La postura de seguridad es débil por diseño: todo el gating es client-side (middleware pass-through), la RLS del agente es no-op bajo un rol BYPASSRLS, hay un IDOR cross-tenant en las rutas v1 de scoring/matching, XSS sin sanitizar en la firma de contratos, y secretos de webhook que fallan en abierto si faltan en prod. Además, ninguno de los dos repos corre sus 357 tests en CI, así que toda la buena disciplina de testing no protege contra regresiones en merge. **Resumen honesto:** los caminos felices funcionan y el diseño es deliberado, pero los bordes que importan — dinero, compliance, autorización, documentos — tienen defectos reales que hay que cerrar antes de cualquier piloto con dinero/PII real.

---

## 2. Tablero de severidad

Conteos sobre hallazgos **confirmados o uncertain** (refutados excluidos; duplicados fusionados en un solo hallazgo y contados una vez).

| Severidad | Conteo |
|-----------|--------|
| 🔴 Crítica | 5 |
| 🟠 Alta | 24 |
| 🟡 Media | 33 |
| 🟢 Baja | 23 |
| **Total** | **85** |

### Por área (post-dedupe)

| Área | 🔴 Crít | 🟠 Alta | 🟡 Media | 🟢 Baja |
|------|:------:|:------:|:------:|:------:|
| mvp-tenant | 0 | 2 | 3 | 3 |
| mvp-landlord | 1 | 2 | 6 | 3 |
| mvp-inmo-core | 0 | 0 | 1 | 3 |
| mvp-cobranza-ui | 1 | 4 | 4 | 3 |
| mvp-cotizador-aihub | 0 | 2 | 3 | 3 |
| mvp-auth-onboarding | 0 | 2 | 4 | 5 |
| mvp-security | 0 | 3 | 3 | 1 |
| mvp-a11y-design | 0 | 3 | 5 | 3 |
| mvp-perf | 1 | 3 | 5 | 2 |
| mvp-data-layer | 0 | 0 | 3 | 5 |
| agent-routes | 0 | 2 | 1 | 3 |
| agent-scoring-matching | 0 | 2 | 5 | 3 |
| agent-cobranza | 0 | 3 | 2 | 2 |
| agent-cotizador | 0 | 3 | 3 | 2 |
| agent-money | 2 | 2 | 4 | 2 |
| agent-compliance | 1 | 1 | 1 | 3 |
| agent-inngest | 0 | 2 | 2 | 3 |
| agent-prisma-rls | 0 | 2 | 2 | 2 |
| agent-security | 1 | 2 | 5 | 3 |
| qa-test-coverage | 0 | 2 | 2 | 2 |

> Los conteos por área suman más que el total porque varios hallazgos fusionados aparecen en dos áreas (p.ej. el crash de deudores cuenta para mvp-cobranza-ui y mvp-perf; el redirect abierto para mvp-auth y mvp-security). El total de filas 4 está deduplicado a 85 hallazgos únicos.

---

## 3. 🔴 CRÍTICOS

### C-1 — Borrado de cuenta de propietario totalmente simulado (nunca borra, nunca desloguea)
- **Área:** mvp-landlord · **Archivo:** `src/app/panel/(landlord)/perfil/page.tsx:157-168`
- **Veredicto:** ✅ confirmed (severidad mantenida) · **Confianza:** alta
- **Evidencia:** `handleDeleteAccount()` solo hace `setTimeout(2000)` → `toast.success('Tu cuenta ha sido eliminada')` y muestra pantalla de éxito "Cuenta eliminada". No hay `settingsApi.deleteAccount()`, no hay `supabase.auth.signOut()`, no hay redirect. El usuario queda autenticado con todos sus datos intactos. Existe un borrado REAL en `configuracion/page.tsx:154-171` (`settingsApi.deleteAccount()` + signOut) → dos flujos de borrado contradictorios coexisten. La página de perfil es navegable (`PlanHeader.tsx:858`).
- **Impacto:** El derecho de supresión (Ley 1581/ARCO) se presenta como cumplido pero no lo es — exposición legal en Colombia. Engañoso y peligroso: un usuario que cree que su PII fue borrada sigue con cuenta viva y poblada.
- **Fix:** Eliminar el borrado falso de perfil; enlazar al flujo de `configuracion` o llamar `settingsApi.deleteAccount()` + `signOut()` + redirect. Nunca mostrar un estado de éxito irreversible sin efecto persistido en backend.

### C-2 — `DeudoresListClient` viola Rules of Hooks → crash garantizado en la transición loading→loaded
- **Área:** mvp-cobranza-ui / mvp-perf · **Archivo:** `src/app/panel/inmobiliaria/ai/cobranza/deudores/DeudoresListClient.tsx:138-179`
- **Veredicto:** ✅ confirmed (severidad mantenida) · **Confianza:** alta
- **Evidencia:** `useRef` (línea 162) y su `useEffect` (163) se declaran DESPUÉS de dos `return` condicionales (skeleton en 138, empty-state en 146). `useDebtorList` arranca `isLoading:true, pages:[]`, así que el primer render sale en 138 (15 hooks); cuando llega data el render pasa de 138/146 y ahora corre 17 hooks → React lanza "Rendered more hooks than during the previous render". Es el camino feliz normal (loading→loaded) de la pantalla de cobranza más transitada, no un caso borde. `eslint` lo confirma (`react-hooks/rules-of-hooks 162:23`). No existe test de lista que cubra la transición. *(Reportado por dos áreas: `cobranza-ui-1` y `fe-perf-1`; fusionado.)*
- **Impacto:** La lista de deudores cae al error boundary (pantalla blanca) al cargar datos, en la navegación más común de cobranza. CI no lo detecta (no hay test); solo eslint.
- **Fix:** Mover `sentinelRef` + `useEffect` del observer ARRIBA de los early returns; guardar el cuerpo con `if (!hasMore) return`. Agregar un test que monte con `isLoading` y luego resuelva el fetch.

### C-3 — La clave de dedup del webhook se quema antes de escribir el ledger → pérdida permanente de un pago aprobado
- **Área:** agent-money · **Archivo:** `src/server/routes/wompi-webhook.ts:179-192, 322-331` (idéntico en `bold-webhook.ts:183`)
- **Veredicto:** ✅ confirmed (severidad mantenida) · **Confianza:** alta
- **Evidencia:** `SETNX wompi:webhook:${transactionId}` (TTL 24h) se adquiere en línea 179 ANTES del `payment.update` + `billing_events` (270-319). Si esa transacción lanza, el handler devuelve 500 pero NO borra la clave de dedup (el catch solo loguea). La ventana de retry de Wompi (~24h, `R2-wompi-marketplace.md`) cae DENTRO del TTL aún vivo → los reintentos pegan la clave y devuelven `{idempotent:true}` (184-192) sin escribir el pago jamás. `daily-dispersion.ts` solo procesa pagos ya `approved`, y el paso de reconcile solo loguea warnings — nunca recupera la fila perdida.
- **Impacto:** Un pago aprobado que pega un solo tropiezo transitorio de Postgres se pierde silenciosa y permanentemente: el ledger nunca lo registra, la dispersión nunca lo paga, la factura de success-fee lo subcuenta. Pérdida de dinero + integridad sin alerta.
- **Fix:** Adquirir la clave de dedup SOLO tras el commit de la transacción DB, O borrar la clave en el catch del 500 antes de retornar, O usar el índice único de DB (`payments_provider_event_unique`) como dedup autoritativo y tratar Redis como fast-path. El índice único ya existe — apóyate en él.

### C-4 — El cron de facturación mensual puede emitir doble factura electrónica DIAN (doble cobro vía Alegra)
- **Área:** agent-money · **Archivo:** `src/inngest/functions/monthly-billing-aggregation.ts:318-343, 349-357, 426-440`
- **Veredicto:** ✅ confirmed (severidad mantenida) · **Confianza:** alta
- **Evidencia:** La idempotencia es read-before-write (`findFirst` por `invoice.issued` + `monthYear`, 318-343); solo si falta llama `alegraClient.createInvoice` (349, que hace el stamp DIAN real con `generateStamp:true`), y SOLO DESPUÉS escribe la fila de dedup (426-440). Las tres operaciones viven en UN único `step.run('compute-and-issue-per-tenant')` sin `step.run` anidado por tenant. `createInvoice` no recibe idempotency/external-id (verificado en `alegra.ts`), y `BillingEvent` no tiene `@@unique` en `(tenantId, monthYear)`. Un crash/throw entre el stamp y el commit del dedup-row hace que Inngest re-ejecute el cuerpo del step → segunda factura legal (CUFE nuevo) para el mismo tenant+mes. El comentario del propio archivo (312-317) admite "step body may re-execute after a partial failure". Solo stub-mode protege; producción no.
- **Impacto:** Facturas electrónicas DIAN duplicadas a un cliente real = sobrecobro + exposición tributaria/legal (una factura stamped tiene CUFE reportado a DIAN; revertir requiere nota crédito).
- **Fix:** Idempotencia en proveedor Y DB: (a) pasar external-id determinista a Alegra (`inv|${tenantId}|${monthYear}`); (b) constraint único DB para una `invoice.issued` por `(tenantId, monthYear)` y escribir una fila "claim" dentro de `withTenantScope` ANTES de llamar `createInvoice`, tratando violación de único como ya-emitida; (c) envolver claim+stamp+record por tenant para que un crash no deje una factura stamped sin registrar.

### C-5 — La pausa de contacto de 72h por revisión humana (T-323/2024) se escribe pero NUNCA se aplica
- **Área:** agent-compliance · **Archivo:** `src/server/routes/automated-decisions-review.ts:432-446`
- **Veredicto:** ✅ confirmed (severidad mantenida) · **Confianza:** alta
- **Evidencia:** Ante una solicitud de revisión, la ruta siembra 3 filas `compliance_events` con `eventType='contact_pause_review_pending'` y el JSDoc afirma que `checkFrequencyTool` rechazará intentos de contacto en esos días — "la pausa se aplica en la capa de frecuencia". Pero un grep de `contact_pause_review_pending` encuentra CERO lectores en producción: `check-frequency.ts:136,265`, `cadence-orchestrator.ts`, `pre-call-workflow.ts`, `follow-up-workflow.ts` filtran SOLO `eventType:'contact_attempt'`. Las filas sembradas son inertes; la respuesta HTTP le promete al titular `contactWillPauseUntil = now+72h` que el sistema no cumple. (El cap diario Ley 2300 bloquea incidentalmente días con un contact_attempt previo, pero no es la pausa de revisión ni honra la ventana de 72h.)
- **Impacto:** La garantía de la Sentencia T-323/2024 (derecho a revisión humana) se incumple materialmente: el deudor que ejerce su derecho es informado de una pausa de 72h, el sistema la registra, pero el contacto de cobranza puede seguir el mismo día. Hueco de defensibilidad regulatoria y exposición legal (el rastro de auditoría documenta una promesa que el sistema no cumple).
- **Fix:** Hacer que `checkFrequencyTool` (o el gate pre-contacto del guardrail) lea `compliance_events` con `eventType='contact_pause_review_pending' AND dayBucket=hoy` para el deudor y devuelva `allowed=false reason='review_pause_active'`. Test que asegure bloqueo en un día de pausa sembrado. Hasta entonces, la respuesta no debe anunciar una pausa que no puede entregar.

---

## 4. 🟠 ALTOS

### H-1 — IDOR / autorización a nivel de objeto rota en `/tenant-scoring` y `/smart-matching` (tenantId del body, nunca ligado al JWT)
- **Área:** agent-security · **Archivo:** `src/server/routes/tenant-scoring.ts:11-19`; `src/server/middleware/role-check.ts:31-47`
- **Veredicto:** ✅ confirmed (**severidad bajada de crítica a alta**) · **Confianza:** alta
- **Evidencia:** `tenantScoringBody` lee `tenantId: z.string()` directo del body y lo reenvía sin cambios al payload Inngest (89). El único auth es `roleCheckMiddleware`, que valida `user.role ∈ {LANDLORD,AGENT,ADMIN}` pero NUNCA compara el `tenantId/agencyId` del body con la membresía real del usuario. Contraste: las rutas `/api/agency/:agencyId/*` SÍ imponen `claims.agencyId !== agencyId → 403`. `GET /:runId` en ambas rutas hace `findUnique` por id sin filtro de tenant (IDOR de lectura adicional). *(Severidad bajada porque `fetchCreditScore` hoy ignora su arg de tenantId en mock-mode y `PipelineRun` se llavea por userId, no tenantId — el abuso de credit-bureau es latente, no live; pero el IDOR de autorización es real y explotable.)*
- **Impacto:** Cualquier usuario autenticado puede lanzar scoring/matching para un `tenantId/agencyId` arbitrario, leyendo/contaminando datos de otra agencia y disparando costos. Independiente del B1 RLS — incluso con RLS arreglado, la ruta confía en el cliente para el scope de tenant.
- **Fix:** Derivar `tenantId/agencyId` del JWT verificado (lookup de membresía), no del body. Reutilizar `agencyRoleMiddleware`. Rechazar cuando el body no coincide con la membresía. Filtrar `GET /:runId` por tenant del JWT.

### H-2 — XSS almacenado en la previsualización de contrato (`dangerouslySetInnerHTML` sin sanitizar)
- **Área:** mvp-security · **Archivo:** `src/app/panel/inmobiliaria/contratos/[id]/firmar/page.tsx:192` (y `inquilino/.../firmar:123`, `contratos/[id]/page.tsx:341`)
- **Veredicto:** null (uncertain — depende de escaping del backend) · **Confianza:** media
- **Evidencia:** `preview.html` viene del backend y se inyecta con `dangerouslySetInnerHTML={{__html: preview.html}}` sin sanitización. No hay DOMPurify/rehype-sanitize en el proyecto y no hay CSP de respaldo (H-9). El HTML de contrato se plantilla desde campos con texto libre del inquilino/propietario; si algún campo fluye sin escapar, un atacante inyecta `<script>`/`<img onerror>` que ejecuta en la sesión autenticada de la contraparte.
- **Impacto:** XSS almacenado en el flujo de firma — la superficie de mayor confianza/valor (docs legales, firmas). Permite exfiltrar el access token Supabase en memoria, forjar firmas, o pivotar a endpoints de dinero.
- **Fix:** Agregar DOMPurify y envolver cada render: `DOMPurify.sanitize(preview.html, {USE_PROFILES:{html:true}})`. Quitar script/style/handlers. Combinar con CSP estricta. Tratar todo HTML del backend como no confiable (defensa en profundidad).

### H-3 — Redirect abierto en login/onboarding (`returnUrl` sin validar → `window.location.href`)
- **Área:** mvp-security / mvp-auth-onboarding · **Archivo:** `src/components/auth/AuthForm.tsx:105,122-123` (y `onboarding/inmobiliaria/page.tsx:48,220`; `callback/route.ts:42`)
- **Veredicto:** null (uncertain) · **Confianza:** alta
- **Evidencia:** `returnUrl = searchParams.get('returnUrl') || '/'` se asigna a `window.location.href` sin verificar same-origin/relativo. Un atacante envía `https://app.leasefy.co/auth?returnUrl=https://evil.com`; tras login legítimo el navegador navega al dominio atacante. *(Fusión de `fe-sec-2` alto + `auth-open-redirect-1` medio.)*
- **Impacto:** Phishing/credential-harvest con dominio leasefy.co de confianza como entrada (CWE-601). Asignar un URI absoluto/`javascript:`/`data:` también es vector de ejecución de script en algunos motores.
- **Fix:** Validar antes de redirigir: solo paths relativos same-origin — `const safe = returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/'`. Rechazar valores con `://` o esquema. Aplicar el mismo guard en onboarding y `callback/route.ts`.

### H-4 — `ProtectedRoute` confía en `localStorage('arriendo-facil-auth')` como sesión válida (bypass de auth de test cableado en producción)
- **Área:** mvp-auth-onboarding · **Archivo:** `src/components/auth/ProtectedRoute.tsx:49-65, 126-135, 205-229`
- **Veredicto:** null (uncertain) · **Confianza:** alta
- **Evidencia:** `effectiveUser = user || storageUser` y `effectiveIsAuthenticated = isAuthenticated || !!storageUser`. Ningún código de producción escribe esa clave (grep `setItem('arriendo-facil-auth')` = 0); solo helpers E2E la siembran, uno comentando textualmente "Auth bypass: ProtectedRoute trusts a localStorage fallback... lets PageGuard pass without a real Supabase session". `auth-context.tsx:124` y `PermissionsContext.tsx:64` también confían en esa clave para `agencyId`.
- **Impacto:** Cualquiera pega `localStorage.setItem('arriendo-facil-auth', JSON.stringify({role:'agency',...}))` en DevTools y `ProtectedRoute` renderiza el shell del panel sin sesión Supabase. No es brecha de datos por sí solo (las APIs hacen 401 sin token), pero es un bypass real del gate de auth client-side y compone con el fail-open de permisos legacy y el B1 RLS no-op.
- **Fix:** Remover el fallback localStorage-como-auth del código de producción. `ProtectedRoute` debe gatear solo en el contexto de auth real. Para tests, sembrar una sesión Supabase mockeada o stubear el provider.

### H-5 — Submisión pública ARCO (`/api/arco`) sin CORS en el agente → formulario Ley 1581 roto cross-origin en prod
- **Área:** mvp-auth-onboarding · **Archivo:** `mvp/src/app/arco/ArcoFormClient.tsx:74`; `agent/src/server/index.ts:405,474-480`
- **Veredicto:** null (uncertain — análisis de contrato CORS) · **Confianza:** alta
- **Evidencia:** `ArcoFormClient` hace POST cross-origin a `${AGENT_URL}/api/arco` con `Content-Type: application/json` → preflight OPTIONS. El middleware CORS del agente está montado solo en `/api/agency*`, `/terceros*`, `/property-capture*`. El router público ARCO (`index.ts:405`) NO tiene `cors()` ni handler OPTIONS; no hay CORS global. El preflight queda sin respuesta → el navegador bloquea el POST. Las auditorías previas cubrieron CORS para agency/terceros/property pero omitieron `/api/arco`.
- **Impacto:** El formulario ARCO público (Acceso/Rectificación/Cancelación/Oposición — obligación regulatoria Ley 1581/2012) falla silenciosamente para todo usuario cross-origin real: el fetch rechaza con TypeError → error genérico. Los titulares no pueden ejercer habeas data por el canal anunciado; riesgo de queja/multa SIC.
- **Fix:** Montar `cors()` en `/api/arco` y `/api/arco/*` antes de la ruta (espejo de `agencyCors`, methods `['GET','POST','OPTIONS']`, headers `['Content-Type']`) y responder el preflight. Test E2E que envíe el formulario cross-origin antes de shippear. Asegurar `CORS_ALLOWED_ORIGINS` incluya el origen del sitio que hospeda `/arco`.

### H-6 — VIEWER de solo-lectura puede mutar registros de compliance ARCO (triage/resolve/reject) — escalada de privilegios
- **Área:** agent-routes · **Archivo:** `agent/src/server/routes/agency-arco-requests.ts:237-240, 379, 444, 552`
- **Veredicto:** null (uncertain) · **Confianza:** alta
- **Evidencia:** Todo el router aplica UN gate amplio: `.use('/*', agencyRoleMiddleware({allowed:['OWNER','ADMIN','OPERATOR','VIEWER']}))`. Los tres handlers mutantes (`triage`/`resolve`/`reject`) no tienen chequeo secundario de rol — grep de las líneas devuelve cero referencias a `VIEWER`/`403`/`permissions`. Las rutas hermanas (interventions/escalations) sí restringen escrituras a `[OWNER,ADMIN,OPERATOR]`, y `reveal-pii` mantiene VIEWER en `allowed` pero agrega un chequeo de matriz secundario. ARCO no tiene ninguno.
- **Impacto:** Un VIEWER (provisionado explícitamente como solo-lectura) puede resolver/rechazar/triagear solicitudes ARCO — acciones legalmente significativas bajo Ley 1581. El `audit_log` atribuirá la acción a él. Problema de integridad + compliance.
- **Fix:** Reemplazar el `.use('/*')` único por allowlists por-método (lecturas con VIEWER, escrituras `[OWNER,ADMIN,OPERATOR]`), O agregar chequeo de matriz dentro de cada POST como hace reveal-pii. Test que asegure 403 para un JWT VIEWER en POST resolve.

### H-7 — Secretos de webhook nunca exigidos en boot — todos los webhooks de pago/voz aceptan-todo si el secreto no está (stub-mode), permitiendo confirmaciones de pago forjadas en prod
- **Área:** agent-security / agent-routes · **Archivo:** `agent/src/server/lib/assert-production-secrets.ts`; `whatsapp/dialog360.ts:532`; `vapi-webhook.ts:405-408`; `habeas-data-opt-out.ts:191`
- **Veredicto:** null (uncertain) · **Confianza:** alta
- **Evidencia:** Todos los verificadores devuelven `true` si su secreto está vacío: dialog360 `if(!webhookSecret) return true`, certicamara `if(!secret) return true`, vapi/wompi/bold igual; opt-out `if(!secret) return true`. `enforceProductionSecretsOrExit` solo chequea secretos JWT/JWKS — grep por `WOMPI/VAPI/BOLD/CERTICAMARA/360DIALOG/OPT_OUT_TOKEN/REVIEW_REQUEST_TOKEN/INNGEST_SIGNING` devuelve nada. *(Fusión de `agent-http-2` + `agent-sec-3`.)*
- **Impacto:** Un deploy de prod que olvide un secreto corre en accept-all silenciosamente. Concretamente: sin `WOMPI_EVENTS_SECRET` → pagos forjados (`payment.recovered` falso, marcar deudores como pagos); sin `OPT_OUT_TOKEN_SECRET` → cualquiera puede opt-out a cualquier deudor por teléfono; sin secreto vapi/whatsapp → webhooks de llamada/mensaje forjados que escriben `compliance_events` o transicionan estado. CWE-347, gateado solo por un env var fácil de olvidar.
- **Fix:** Agregar todos los secretos de webhook/token a `assertProductionSecrets` como fail-closed-en-prod (fallar en boot como el gate JWT), O hacer que cada verificador devuelva `false` cuando `NODE_ENV==='production'` y el secreto falta.

### H-8 — Sin headers de seguridad (CSP, X-Frame-Options, nosniff, Referrer-Policy)
- **Área:** mvp-security · **Archivo:** `next.config.mjs:1`
- **Veredicto:** null (uncertain) · **Confianza:** alta
- **Evidencia:** `next.config` define solo `images.remotePatterns` — no hay bloque `async headers()`. `middleware.ts` es pass-through. Cero CSP (sin respaldo para el XSS de H-2), sin X-Frame-Options/frame-ancestors (clickjacking de firma/pago), sin nosniff (relevante al proxy de docs H-10), sin Referrer-Policy (`returnUrl`/`cedula` en query string fugan vía Referer).
- **Impacto:** Elimina las defensas estándar del navegador para un SaaS financiero/legal. Su ausencia amplifica cada otro hallazgo de seguridad.
- **Fix:** Agregar `async headers()` con CSP (script-src 'self' + orígenes requeridos; frame-ancestors 'none'), X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy. Desplegar CSP en report-only primero.

### H-9 — `--muted-foreground` (#A8A29E) falla WCAG AA en 2.52:1 pero se usa como texto secundario en ~298 archivos
- **Área:** mvp-a11y-design · **Archivo:** `src/app/globals.css:253`
- **Veredicto:** null (uncertain) · **Confianza:** alta
- **Evidencia:** `--muted-foreground: var(--neutral-400)` = #A8A29E con comentario "WCAG AA on white", pero el ratio computado es 2.52:1 sobre blanco y 2.41:1 sobre el bg real #FAFAF9 — muy bajo el 4.5:1 de AA. El propio bloque de auditoría de `globals.css:313` etiqueta #A8A29E como "2.6:1 (decorative only)", pero el token alimenta `text-muted-foreground` usado en 298 archivos para copy secundario real. DESIGN.md §1 cita ese bloque como prueba de AA, enmascarando la deriva. (Dark mode 7.36:1 está bien.)
- **Impacto:** Usuarios de baja visión no pueden leer texto secundario omnipresente en light mode en casi todo el producto. El comentario engañoso + claim de DESIGN.md hacen que los revisores confíen en un nivel de contraste que no existe.
- **Fix:** Oscurecer el `--muted-foreground` de light mode a ≥ neutral-500 (#7A756F = 4.56:1). Mantener #A8A29E solo para texto decorativo/disabled. Corregir el comentario inline y el claim de DESIGN.md §1/§7.

### H-10 — Find/replace corrompió 10 strings EN visibles a "MagnifyingGlass properties"
- **Área:** mvp-a11y-design / mvp-tenant · **Archivo:** `src/components/ui/plan/PlanHeader.tsx:219,314` (y `inquilino/page.tsx:241,389,448`; `guardados:84,125`; `tenant/NoDataEmptyState.tsx:48,94`; `tenant/TenantDashboardEmpty.tsx:53`)
- **Veredicto:** null (uncertain) · **Confianza:** alta
- **Evidencia:** Un rename de iconos (Search→MagnifyingGlass) se filtró a copy EN en ternarios inline. Usuarios en locale EN ven literalmente "MagnifyingGlass properties, candidates..." (219), "Recent MagnifyingGlasses" (314), "FloppyDisk properties you like" (`inquilino:448`), "PaperPlaneTilt message" (`arriendo/[leaseId]:601`). 10-11 ocurrencias. Los `.json` están limpios — la corrupción vive solo en ternarios JSX que evaden los locale files. *(Fusión de `i18n-corrupted-en-strings-2` + `tenant-i18n-1`.)*
- **Impacto:** Inquilinos/agencias en inglés ven texto roto y sin sentido en pantallas de alto tráfico (search del header, dashboard, guardados). Golpe directo a credibilidad/UX.
- **Fix:** Reemplazar las 10-11 ocurrencias por copy correcto ("Search properties"/"Save"/"Send") y moverlas a `en.json` vía `t()`. Grep del repo por nombres de icono filtrados (MagnifyingGlass, FloppyDisk, PaperPlaneTilt, SignOut, CaretDown) dentro de string literals.

### H-11 — El skip link global apunta a `#main-content`, que no existe en ninguna página de panel autenticada
- **Área:** mvp-a11y-design · **Archivo:** `src/app/layout.tsx:116`
- **Veredicto:** null (uncertain) · **Confianza:** alta
- **Evidencia:** El root layout renderiza `<a href="#main-content">`. Solo 10 archivos públicos definen `id="main-content"`. Los layouts autenticados (inmobiliaria:202, landlord:174, inquilino:130) renderizan `<main>` SIN id. En cada página de dashboard el skip link salta a un ancla inexistente.
- **Impacto:** Usuarios de teclado/lector de pantalla en toda la app autenticada (el core del producto) tienen un skip-to-content roto — fallo WCAG 2.4.1 justo donde la nav es más larga.
- **Fix:** Agregar `id="main-content"` (y `tabIndex={-1}`) al `<main>` de cada layout de panel/inquilino/landlord. Verificar que el target recibe foco al activarse.

### H-12 — La lista de candidatos del propietario muestra datos fabricados en cero/vacío (no hace fetch del candidato completo)
- **Área:** mvp-landlord · **Archivo:** `src/app/panel/(landlord)/candidatos/page.tsx:158-193, 322-325, 691-697`
- **Veredicto:** null (unverified) · **Confianza:** alta
- **Evidencia:** `allCandidates` mapea el `LandlordCandidate` slim a un `Candidate` completo con literales hardcoded: `email:'', phone:'', totalIncome:0, monthlyObligations:0, availableForRent:0, documentNumber:''`. `handleRowClick` hace `setSelectedCandidate(row)` (la fila slim) y nunca llama `landlordApi.getCandidate(id)`. El endpoint real `getCandidate` existe (`landlord.service.ts:372`) y se usa correctamente en la página de propiedad.
- **Impacto:** Cada candidato abierto desde la página global Candidatos muestra email/teléfono en blanco y $0 en finanzas — los propietarios no pueden contactar ni evaluar postulantes desde esta pantalla, y las finanzas mostradas son simplemente erróneas (ceros fabricados, no "desconocido").
- **Fix:** En el click de fila, hacer `landlordApi.getCandidate(row.id)` (espejo de la página de propiedad) y alimentar el detail sheet con eso.

### H-13 — Checkout "Pagar" es falso — nunca cambia el plan, usa `alert()`
- **Área:** mvp-landlord · **Archivo:** `src/app/panel/(landlord)/checkout/page.tsx:37-48`
- **Veredicto:** null (unverified) · **Confianza:** alta
- **Evidencia:** `handleSubmit()`: `setTimeout(2000)` → `alert(t('...paymentSuccess'))` → `router.push('/panel')`. Sin llamada a API de suscripción/pago. Tras "pagar", `useMySubscription()` sigue devolviendo el plan previo; todas las features gateadas siguen bloqueadas pese al mensaje de éxito.
- **Impacto:** Todo el camino de monetización/upgrade es no-funcional: se le dice al usuario que el pago tuvo éxito y se le redirige, pero no se compra nada ni se desbloquea nada. Fake-success de dinero sin disclaimer; viola el design system (`alert()` nativo).
- **Fix:** Cablear al endpoint real de billing (o flujo PSE/Wompi) y refetch de suscripción antes del redirect; gatear el mensaje de éxito a un cambio de plan persistido. Reemplazar `alert()` por toast.

### H-14 — El stream SSE en vivo del cotizador usa cookie auth (`withCredentials`) contra una ruta Bearer-JWT-only → 401 en producción
- **Área:** mvp-cotizador-aihub · **Archivo:** `src/lib/hooks/cotizador/use-quote-stream.ts:150`
- **Veredicto:** null (uncertain) · **Confianza:** alta
- **Evidencia:** `new EventSource(url, {withCredentials:true})` para "session-cookie auth". `EventSource` no puede setear header Authorization. La ruta `GET /api/agency/:agencyId/cotizador/quote/:quoteId/stream` está gateada por `agencyRoleMiddleware`, que lee el token SOLO del header Authorization (401 'missing bearer token' si falta). El resto del frontend cotizador ya migró a Bearer (`agentAuthHeaders`); este hook quedó atrás. HANDOFF-VICTOR-v6.md:84 documenta que ~50 hooks con cookies dieron 401 y debieron pasar a Bearer.
- **Impacto:** Toda la experiencia en tiempo real del cotizador (veredictos de aseguradoras en streaming) falla auth en prod. Tras 3 retries (~7s) muestra el banner CONNECTION_INTERRUPTED; las aseguradoras nunca pueblan; el PDF nunca aparece. El wizard hace POST exitoso (Bearer) y redirige a esta página, así que cada cotización termina en un stream roto.
- **Fix:** `EventSource` no puede enviar headers, así que: (a) pasar el access token como query param y aceptarlo en la ruta SSE como excepción documentada (token fuera de logs), o (b) cambiar el stream a `fetch()` + parsing SSE para usar `agentAuthHeaders()` Bearer, o (c) polyfill de EventSource con headers. Actualizar los comentarios "session-cookie auth" y el test que asegura `withCredentials`.

### H-15 — Las métricas headline del AI Hub llaman `/metrics` sin auth → siempre 401 → fallback silencioso a ceros
- **Área:** mvp-cotizador-aihub · **Archivo:** `src/lib/hooks/use-agent-metrics.ts:72`
- **Veredicto:** null (uncertain) · **Confianza:** alta
- **Evidencia:** `useAgentMetrics` hace `fetch(`${agentUrl}/metrics`)` SIN headers. El agente gatea `/metrics` tras el secreto B2B `AGENT_API_KEY` (401 si no). En 401 el hook deja `metrics = DEFAULT_METRICS` (ceros / '< 3 min' / '0%'), renderizados como KPIs reales en `ai/page.tsx:190-200`. Enviar `AGENT_API_KEY` también sería incorrecto — es un secreto server-only que nunca debe llegar al navegador.
- **Impacto:** Cada KPI numérico del AI Hub y vista de detalle muestra ceros fabricados que parecen telemetría real, sin error visible. Las agencias no pueden confiar en ningún número. Trampa latente de exposición de secreto si alguien lo "arregla" agregando la key client-side.
- **Fix:** Exponer un endpoint de métricas por-agencia autenticado con el JWT de la agencia (Bearer vía `agentAuthHeaders()`), como `use-ai-hub-landing`. Mostrar estado de error ('—' o badge) en vez de ceros. Nunca enviar `AGENT_API_KEY` desde el navegador.

### H-16 — `modifyPlan` es una mutación de dinero en dos pasos no-atómica sin rollback → planes de pago duplicados
- **Área:** mvp-cobranza-ui / mvp-data-layer · **Archivo:** `src/lib/hooks/cobranza/use-payment-plan-approval.ts:300-358`
- **Veredicto:** null (uncertain) · **Confianza:** alta
- **Evidencia:** `modifyPlan` hace POST `/cartera/payment-plans/offer` (crea plan NUEVO, paso 1) luego POST `/payment-plans/${planId}/reject` (paso 2). Si el paso 2 falla (red/409/5xx), devuelve `{error}` pero el plan counter-offer ya existe mientras el original sigue activo. No hay delete/void compensatorio. *(Fusión de `cobranza-ui-5` medio + `data-state-1` alto.)*
- **Impacto:** Falla parcial produce dos planes coexistiendo para un deudor (viejo pendiente + counter-offer nuevo), que pueden enviar doble link Wompi o confundir al deudor y la cola de aprobación. Adyacente a dinero/legal.
- **Fix:** Endpoint backend único atómico (counter-offer que supersede el plan previo en una transacción), o al fallar el paso 2 intentar void del plan recién creado y mostrar error claro de que ambos planes pueden estar activos.

### H-17 — El refresh de polling en `useDebtorList` corta el array por el NUEVO tamaño de página, corrompiendo listas multipágina
- **Área:** mvp-cobranza-ui / mvp-data-layer · **Archivo:** `src/lib/hooks/cobranza/use-debtor-list.ts:135-148`
- **Veredicto:** null (uncertain) · **Confianza:** alta
- **Evidencia:** En el poll de 30s: `const newFirstSize = json.items.length; const tail = prev.slice(newFirstSize); return [...json.items, ...tail]`. Asume que el largo de page-1 nuevo iguala el original. Si un deudor entra/sale del set filtrado (page-1 ahora N±1) o cambia el page size, `prev.slice(newFirstSize)` corta en el offset equivocado, duplicando o perdiendo filas de páginas ya cargadas. *(Fusión de `cobranza-ui-8` + `data-state-2`.)*
- **Impacto:** Tras scrollear y esperar 30s, la lista de deudores puede mostrar deudores duplicados o perder filas — socava la confianza en la lista de cobranza más transitada (mora/legal).
- **Fix:** Trackear el conteo original de page-1 en un ref y cortar el tail por ESE conteo, no por el del page entrante. O llavear filas por `debtor_id` y mergear/dedupe en vez de slice por offset.

### H-18 — El player de audio de llamadas no puede autenticar — `<audio crossOrigin="use-credentials">` contra endpoint Bearer-only → 401
- **Área:** mvp-cobranza-ui · **Archivo:** `src/components/inmobiliaria/cobranza/call/CallAudioPlayer.tsx:52-114`
- **Veredicto:** null (uncertain) · **Confianza:** alta
- **Evidencia:** El player setea `src` al endpoint del agente y `<audio crossOrigin="use-credentials">` con comentario afirmando que "la cookie de sesión viaja vía fetch credentials". Pero el endpoint (`agency-cobranza-call-audio.ts:78-81`) declara `bearerAuth` + `agencyRoleMiddleware`, que lee SOLO el header Authorization → 401 si falta. Un `<audio>` nativo no puede adjuntar Authorization.
- **Impacto:** El playback de grabaciones se rompe con auth real. El workflow de QA/compliance (escuchar las llamadas de cobranza de IA) es feature core; los operadores tienen un player que nunca carga audio.
- **Fix:** Hacer `fetch(url,{headers:agentAuthHeaders()})` a un Blob y setear `audio.src = URL.createObjectURL(blob)`, O un endpoint de signed-URL/token de corta vida, O aceptar el access token vía `?token=` solo para la ruta de audio. Quitar el comentario engañoso de cookie.

### H-19 — Previews PDF de carta y siniestro cargan rutas Bearer-only en `<iframe src>` → 401, preview en blanco
- **Área:** mvp-cobranza-ui · **Archivo:** `CartaApprovalClient.tsx:171-177`; `SiniestroApprovalClient.tsx:160-166`
- **Veredicto:** null (uncertain) · **Confianza:** alta
- **Evidencia:** Ambos clients construyen un PDF URL y lo renderizan como `<iframe src={pdfSrc}>`. Las rutas requieren `bearerAuth` + `agencyRoleMiddleware`. Un `<iframe>` no envía Authorization → 401 → frame de PDF en blanco/error.
- **Impacto:** Los previews de carta legal y paquete de siniestro — el artefacto que el operador debe APROBAR para radicación legal/financiera — nunca renderizan. Aprobaría un documento que no puede ver, o queda bloqueado.
- **Fix:** Igual que H-18: fetch con `agentAuthHeaders()` a Blob y object-URL iframe src, o endpoint de signed-URL. No embeber URLs Bearer-protected en src de iframe/audio/img.

### H-20 — El rollback de versión de política (Restaurar) es un no-op silencioso — `agencyId` leído del objeto equivocado
- **Área:** mvp-cobranza-ui · **Archivo:** `src/app/panel/inmobiliaria/ai/cobranza/configuracion/page.tsx:276-293`
- **Veredicto:** null (uncertain) · **Confianza:** alta
- **Evidencia:** `handleRollback` lee `const agencyId = (configData as ...).agencyId`, pero el tipo de respuesta de `usePoliciesConfig` es `{policy, versionNumber}` — no hay campo `agencyId`. Así que `agencyId` siempre es `undefined`, el guard `if(agentUrl && agencyId)` siempre falso, y el POST a `/policies/rollback/...` NUNCA dispara. El diálogo cierra y refetch como si hubiera tenido éxito. Incluso si disparara, el fetch ignora `res.ok`.
- **Impacto:** Un operador que clickea "Restaurar" cree que la política se revirtió, pero no pasa nada — la cadencia/negociación/escalación de cobranza permanece sin cambios silenciosamente. UX engañosa en un control que gobierna límites Ley 2300 y caps de descuento.
- **Fix:** Tomar `agencyId` de `useAuth()` (como todo otro hook). Chequear `res.ok` y mostrar `rollbackError`. Test que asegure que el POST dispara con la URL correcta.

### H-21 — La cadencia de cartera se computa y persiste pero NUNCA se despacha — ningún consumidor de `cadence_contacts` emite contacto
- **Área:** agent-cobranza / agent-inngest · **Archivo:** `src/inngest/functions/cartera-cadence-cron.ts:327-384`
- **Veredicto:** null (uncertain — confianza media en intención) · **Confianza:** media
- **Evidencia:** `carteraCadenceCron` corre diario 06:30 Bogotá, computa el calendario de cadencia e INSERTa filas planeadas en `cadence_contacts`. Grep de lectores devuelve SOLO rutas UI de solo-lectura (`cartera-overview.ts:259`, etc.). NINGUNA función Inngest/cron lee `cadence_contacts` en `planned_for` para emitir `cobranza/call.scheduled` o un send WhatsApp. El único path de marcado vivo (`pre-call-workflow.ts`, cron 03:30) usa su propio `prioritizeCartera()` y no lee `cadence_contacts`. Los dos sistemas están desconectados. *(Fusión de `cobranza-cadence-1` + `inngest-4` + `cobranza-cadence-dispatch-doc-1`.)*
- **Impacto:** Todo el calendario S0–S5 (pre-due T-7/T-3, mora día 5/12/20/25/30/40, pre-jurídico, fiador) nunca se ejecuta. El dashboard muestra "hoy el agente contactará X" mientras tal contacto nunca se envía — divergencia silenciosa entre plan mostrado y comportamiento real.
- **Fix:** (a) agregar un dispatcher cron/evento que lea `cadence_contacts` vencidos en `planned_for` y emita `cobranza/call.scheduled`/send WhatsApp (re-chequeando opt-out/horario/frecuencia al despacho), o (b) si `pre-call-workflow` es el despachador único intencional, marcar `cadence_contacts` como display-only y reconciliar su plan con lo que realmente se marca. Confirmar intención contra el roadmap 17.8.

### H-22 — El dialer autónomo ignora `event.data.channel` y siempre hace llamada de VOZ — candidatos WhatsApp reciben voz y nunca WhatsApp
- **Área:** agent-cobranza · **Archivo:** `src/inngest/functions/autonomous-dialer-workflow.ts:86-91, 415-440`
- **Veredicto:** null (uncertain) · **Confianza:** alta
- **Evidencia:** El dialer hardcodea `const DIAL_CHANNEL = 'voice'` y consume todo `cobranza/call.scheduled`. `event.data.channel` se lee al `eventData` pero NUNCA se ramifica (sin branch `channel === 'whatsapp'`; siempre llama `placeVapiOutboundCall`). El priorizador SÍ emite candidatos WhatsApp (`prioritizer.ts:351 pickChannel()` devuelve 'whatsapp' cuando el cap semanal de voz se consume; `pre-call-workflow.ts:325` emite `data.channel`).
- **Impacto:** Cuando el priorizador rutea a WhatsApp (porque el cap semanal de voz ya se usó), el dialer igual hace llamada de voz — exactamente el contacto que el swap pretendía evitar (posible brecha del cap semanal de voz Ley 2300) — y el WhatsApp nunca se envía. El fallback de canal es inerte silenciosamente.
- **Fix:** Ramificar en `eventData.channel`: para 'whatsapp' rutear al compose/send WhatsApp (con su propio gate opt-out/freq) o skip+audit, y solo hacer llamada Vapi para 'voice'/undefined. Usar el channel del evento en el chequeo de opt-out y registro de contact_attempt, no la constante hardcoded.

### H-23 — Los envíos de WhatsApp nunca registran un `contact_attempt` — los caps Ley 2300 (total diario y semanal por canal) no cuentan WhatsApp
- **Área:** agent-cobranza · **Archivo:** `src/compliance/frequency.ts:195`; callers: solo `autonomous-dialer-workflow.ts:462` (voz)
- **Veredicto:** null (uncertain) · **Confianza:** alta
- **Evidencia:** Los caps se imponen contando filas `compliance_events` con `eventType='contact_attempt'`. `recordContactAttempt()` (único que INSERTa esa fila + bumpea contador Redis) solo es llamado por el dialer de voz. El path WhatsApp no escribe `contact_attempt`: `send-whatsapp.ts:240` escribe solo `billing_events.whatsapp.sent`; `follow-up 'record-sent'` escribe solo `audit_log`.
- **Impacto:** Un WhatsApp exitoso no deja rastro en el ledger de frecuencia. Consecuencias: (1) el cap total diario (1 contacto/día across canales) no lo decrementa WhatsApp → un deudor puede recibir WhatsApp Y llamada el mismo día; (2) el cap semanal por canal de WhatsApp es inejecutable entre runs. Exposición de frecuencia de contacto Ley 2300 para un producto de cobranza colombiano.
- **Fix:** Tras un WhatsApp exitoso, llamar `recordContactAttempt({tenantId, debtorId, channel:'whatsapp'})` — simétrico con el paso 4 del dialer de voz. Guardar para `prisma=null`. Test que asegure que un send WhatsApp incrementa el conteo semanal visto por `checkFrequencyInline`.

### H-24 — El cap por-aseguradora `maxCanonCop` está configurado y almacenado pero NUNCA se impone en el despacho
- **Área:** agent-cotizador · **Archivo:** `src/lib/cotizador/registry-config.ts:81-84,221`
- **Veredicto:** null (uncertain) · **Confianza:** alta
- **Evidencia:** `EffectiveCarrierConfig` declara `maxCanonCop` y `computeEffectiveConfig` lo puebla; la UI admin permite setearlo por aseguradora. Pero grep de uso muestra que aparece SOLO en `registry-config.ts`, rutas de serialización admin, y tests — nunca en `dispatchCarrier`/`dispatchEffectiveQuotes`. No hay `if (candidate.canonCop > carrier.maxCanonCop) skip` en ningún lado; `dispatchEffectiveQuotes` filtra solo en `c.enabled`.
- **Impacto:** Una agencia que configura Bolívar para suscribir solo hasta 5M COP igual hará que Bolívar cotice (y posiblemente sea seleccionado como `mejor_opcion`) para un canon de 20M. La aseguradora luego rechaza la póliza, o la cotización es inválida. El cap es un control fantasma.
- **Fix:** En `dispatchEffectiveQuotes`, tras filtrar carriers enabled, excluir (o registrar como skip estructurado) cualquier carrier donde `c.maxCanonCop != null && candidate.canonCop > c.maxCanonCop`. Test unitario que asegure que un canon sobre-cap dropea ese carrier.

### H-25 — La respuesta API en vivo del cotizador devuelve el reasoning trace SIN redactar; solo la copia persistida en DB recibe el redactor PII completo
- **Área:** agent-cotizador · **Archivo:** `src/server/routes/cotizador.ts:972-998, 1087-1091`
- **Veredicto:** null (uncertain) · **Confianza:** alta
- **Evidencia:** El paso N.0 computa `traceForPersist = await redactPii(reasoning_trace_es, ...)` (4 clases PII: cédula, nombres, teléfonos colombianos, direcciones/NIT/cuenta) y lo pasa a `persistQuoteResponses`. PERO la respuesta HTTP (1087-1091) spreadea `reasoning_trace_es` — la variable RAW, no `traceForPersist`. La respuesta solo está gateada por `checkTraceForPII` que llama SOLO `scanForCedulaLeak` (regex de cédula). Un nombre/teléfono alucinado en el trace se redacta en almacenamiento pero se envía verbatim al caller B2B.
- **Impacto:** Protección PII asimétrica. PII Habeas Data (nombres, teléfonos, direcciones, cuentas) puede fugar al backend de la inmobiliaria vía la respuesta API aunque el mismo dato se limpia de la DB del agente. El mismatch persistido-vs-devuelto también hace que la copia de auditoría subestime lo realmente divulgado.
- **Fix:** Devolver el trace redactado: usar `reasoning_trace_es: traceForPersist` (correr `redactPii` una vez y reusar para persist y respuesta).

### H-26 — El header de consentimiento Habeas Data del cotizador se acepta por prefijo `startsWith('signed-')` sin verificar el ID de autorización
- **Área:** agent-cotizador / agent-routes · **Archivo:** `src/server/routes/cotizador.ts:237-257`
- **Veredicto:** null (uncertain) · **Confianza:** alta (cotizador-3) / media (agent-http-4)
- **Evidencia:** El gate de consentimiento: `const consent = c.req.header('X-Cotizador-Consent'); if (!consent || !consent.startsWith('signed-')) return 400`. `consentAuthorizationId = consent.slice('signed-'.length)`; el único chequeo extra es `length === 0`. El valor se persiste pero grep muestra que `consentAuthorizationId` nunca se valida contra ninguna tabla de consentimiento/firma. Cualquier caller envía `X-Cotizador-Consent: signed-x` y pasa. *(Fusión de `cotizador-3` alto + `agent-http-4` bajo.)*
- **Impacto:** El gate de consentimiento es de presencia, no de consentimiento. No hay prueba de que el titular autorizó la evaluación crediticia/de seguros — la agencia podría cotizar a cualquiera enviando un header constante. Para un producto que jala datos adyacentes a buró sobre ciudadanos colombianos, un token de consentimiento inverificable es exposición legal real que no sobreviviría una auditoría SIC. (Mitigado parcialmente: la ruta ya está gateada por `AGENT_API_KEY` + allowlist de tenant piloto.)
- **Fix:** Verificar `consentAuthorizationId` contra un registro de consentimiento almacenado, tenant-scoped (con binding de cédula-hash del titular + timestamp + scope) antes de proceder, o documentarlo explícitamente como stub no-autoritativo. El contrato B2B debería requerir un ID de autorización opaco emitido por el servidor.

---

## 5. 🟡 MEDIOS (agrupados por categoría)

### Seguridad / autorización
- **Sin enforcement de auth/rol server-side en todo el frontend** — `middleware.ts:25` es pass-through; las 140+ rutas dependen de guards client-side + authz del backend (que tiene huecos confirmados: B1 RLS no-op, A4 role-check fail-open). *(mvp-auth-onboarding, mvp-security; `auth-no-server-gating-1`/`fe-sec-8`)*
- **Fail-open de permisos legacy** — `PermissionsContext.tsx:115` concede acceso a TODO módulo a un no-admin cuando `effectivePermissions` está vacío/null. El path `agentPerms` falla cerrado correctamente; el legacy invierte la intención. *(mvp-auth-onboarding)*
- **Páginas ERP/tesorería sin guard** — `layout.tsx:145-155` declara facturacion/conciliacion/tesoreria/pqrs/agenda con `module:null` (siempre visibles) y sin `PageGuard`. Hoy son placeholders M1 sin data, pero cuando M1 cablee montos de payout de propietario/facturación DIAN, cualquier rol de agencia (VIEWER) los alcanza por URL directa. *(mvp-inmo-core + mvp-auth; fusión `erp-gating-1` + `auth-treasury-unguarded-1`)*
- **Gate MFA cosmético** — `auth-context.tsx:371` deriva `mfaRequired` solo client-side y `signInWithEmail` no llama `checkMfaLevel()`; un token aal1 alcanza el dashboard antes/sin el challenge. Ambos backends aceptan aal1. *(mvp-auth-onboarding)*
- **Binding de email de invitación ausente (client-side)** — `registro/page.tsx:119` auto-acepta y postea `userType:'AGENT'` para cualquier sesión con token cargado, sin verificar que el email logueado iguale `invitation.invitedEmail`. Explotabilidad depende del monolito enforcing server-side. *(mvp-auth-onboarding)*
- **Cédula en query param** — `cotizador/nueva/page.tsx:76` pre-llena desde `?cedula=`; PII regulada (Ley 1581) en historial/Referer/logs (sin Referrer-Policy). *(mvp-security; `fe-sec-5`)*
- **Redacción Sentry incompleta** — `observability.ts:88-107` solo redacta `event.message` + `event.extra` top-level; NO redacta `event.request`, `event.exception.values[].value`, `breadcrumbs[]`, `contexts`, `user`. PII colombiana en mensajes de excepción/datos HTTP llega a Sentry sin redactar. *(agent-security)*
- **`screen-candidate.ts` evita el writer de entrada única `writeAutomatedDecision`** — `screen-candidate.ts:124` llama `prisma.automatedDecision.create` directo (ahora 3 callers donde el invariante exige 1), sin `audit_log` pareado transaccional, con `debtorId = quoteRequestId`. *(agent-compliance; `compliance-data-integrity-1`)*

### Integridad de datos
- **Submisión guest descarta documentos en silencio + pantalla de éxito que promete revisión de docs** — `ApplicationContext.tsx:499`: la rama guest solo llama `createGuest(payload)` y nunca corre el loop de upload de documentos; `ConfirmationScreen` renderiza "Revisaremos tus documentos en 24h" mientras la agencia recibe cero documentos. *(mvp-tenant; `tenant-apply-1`)*
- **Create autenticado traga fallos de upload de docs y aún marca submisión exitosa** — `ApplicationContext.tsx:490-511`: cada `uploadDocument` en try/catch que solo `console.error` y continúa; tras el loop marca `status:'submitted'`. La rama update SÍ re-lanza; el create no. *(mvp-data-layer; `data-state-4`)*
- **Seguro seleccionado en el flujo de contrato nunca se persiste** — `[propertyId]/contract/[candidateId]/page.tsx:274-322`: `handleCreateContract` siempre envía `insuranceTier:'NONE'`; el `InsuranceSelector` solo actualiza state de display. El tier/prima elegido es cosmético y se pierde. *(mvp-landlord)*
- **Edits de perfil y avatar del propietario no persisten** — `perfil/page.tsx:99-110`: `handleSave` solo `setTimeout(800)` + `toast.success`, sin API. Todo revierte al recargar. *(mvp-landlord)*
- **Editor de horarios de disponibilidad no persiste** — `[propertyId]/page.tsx:133-137`: comentario explícito "for now we just update local state". *(mvp-landlord)*
- **PermissionsContext: fallo del endpoint de permisos del monolito aborta todo el `Promise.all`, bloqueando acceso a cobranza/cotizador** — `PermissionsContext.tsx:90-103`: el fetch del agente tiene `.catch(()=>null)` pero el del monolito no; un 5xx del monolito hace `Promise.all` rechazar y bloquea módulos que solo dependen del agente. *(mvp-data-layer; `data-state-5`)*
- **PDF metadata anti-fraude: SSRF server-side sin allowlist/private-IP-guard/timeout** — `pdf-metadata.ts:73`: `fetch(docUrl)` desde el server del agente con `docUrl` validado solo como `z.string().url()`. Permite GET a metadata de instancia cloud/localhost. Amplificado por H-1 (IDOR). *(agent-security; `agent-sec-2`)*
- **Reconciliación de dispersión es unidireccional y nunca actúa** — `daily-dispersion.ts:222-259`: solo flagea txns del proveedor ausentes localmente (warn); nunca chequea la dirección peligrosa (payouts/pagos locales sin match en proveedor) ni remedia. *(agent-money; `money-recon-onedir-6`)*

### Correctness
- **Botón "Retirar aplicación" sin onClick — acción core muerta pese a API funcional** — `inquilino/aplicaciones/[applicationId]/page.tsx:881`: botón rojo prominente sin handler; `applicationsApi.withdraw()` existe sin usar. *(mvp-tenant; `tenant-app-detail-1`)*
- **Acción "Completar" de visita re-confirma en silencio** — `visitas/page.tsx:497-509`: `handleComplete` llama `actions.confirm()` (no existe método complete); status queda 'confirmed' pero el toast dice "completada". *(mvp-landlord)*
- **Tabs de pagos pendientes/atrasados de leases permanentemente vacíos** — `leases/page.tsx:92-117`: `leasePaymentStatus` hardcodeado a `{pending:0,late:0}`; counts siempre 0. `collectionRate` divide por `activeLeases` sin guard (NaN). *(mvp-landlord)*
- **`useAgencyPlan` hardcodea `planId='flex'` permanentemente** — `useAgencyPlan.ts:53-54`: todos los gates devuelven true; agencias STARTER/PRO ven todas las features Flex. *(mvp-data-layer; `data-state-8`)*
- **El agent Mastra `tenantScoringAgent` tiene prompt obsoleto** — `tenant-scoring.ts:25`: instruye pesos 35/25/25/15 pero `calculate-score.ts` usa 40/30/15/10/5 con nombres distintos → un tool call Zod-fallaría. Código muerto/divergente. *(agent-scoring-matching; `scoring-3`)*
- **`fuzzyNameMatch` flagea orden apellido-primero vs nombre-primero como mismatch de alta severidad (falso positivo de fraude)** — `consistency-check.ts`: cédulas colombianas imprimen apellidos primero; bancos imprimen al revés → no son substrings, levenshtein >2 → 'mismatch' → flag 'high' → escala. Sistemático por convenciones colombianas. *(agent-scoring-matching; `scoring-5`)*
- **Comparación de escalación "asignada a mí" compara `assignee_user_id` (ID) con `user.email`** — `escalaciones/[id]/page.tsx:81-85`: gate inconsistente; el agente almacena email en el claim path y UUID en el assign-by-id, así que "funciona" solo por coincidencia. *(mvp-cobranza-ui; `cobranza-ui-6`)*

### Compliance
- **El blocklist ARCO (gate 451) falla en abierto ante cualquier error de DB** — `cotizador.ts:147-168`: `isBlocklisted` hace `catch { return false }`; ambas capas de defensa (451 + force-stub) comparten el mismo lookup fail-open. Un control de objeción legal debería fallar cerrado. *(agent-cotizador; `cotizador-8`)*
- **El reply inbound PAY_NOW envía template sin chequeo de opt-out/frecuencia** — `whatsapp-webhook.ts:447-503`: `handlePayNow` llama `sendTemplate` sin `checkOptOutTool` ni gate de frecuencia. Asimetría de guardrail en un canal compliance-sensible. *(agent-cobranza; `cobranza-whatsapp-paynow-1`)*
- **El token de verificación ARCO público no expira pese a anunciar 72h** — `arco-public.ts:271-290` / `agent/routes/arco-public.ts:264`: `GET /verify/:token` no compara contra `submittedAt`/expiry; el link queda válido indefinidamente. *(agent-routes + agent-compliance; fusión `agent-http-3` + `compliance-arco-1`)*

### Data-integrity (multi-tenant / schema)
- **Escrituras bare a tablas FORCE-RLS fuera de `withTenantScope`** — `screen-candidate.ts:101` y 6 sitios más (`audit_log`, `cartera_stage_transitions`, `cotizador_*`) corren sin GUC de tenant; solo funcionan hoy porque el rol BYPASSRLS overridea FORCE. El fix documentado de §6-B1 (rol no-superusuario) hará que estos INSERT de auditoría/compliance lancen — y la mayoría están en catch que traga → pérdida silenciosa de registros SARLAFT/habeas-data. *(agent-prisma-rls; `data-mt-1`)*
- **Sin unique constraint en debtor `(tenantId, documentNumber)`** — `schema.prisma:169`: solo `@@index`, no `@@unique`. Dos paths de ingesta pueden crear deudores duplicados por cédula → doble-contacto (riesgo Habeas Data), stats fragmentadas, opt-out inconsistente. *(agent-prisma-rls; `data-mt-3`)*
- **Guard de doble-crédito de pago solo en `provider_event_id`; sin unique en `provider_payment_id` + drift de schema** — `schema.prisma` Payment: el índice único parcial vive solo en SQL de migración, no en `schema.prisma` (drift). Sin unique en la transaction id; un re-delivery bajo otro event id puede insertar segunda fila Payment → doble-crédito. *(agent-prisma-rls; `data-mt-4`)*

### Error-handling
- **Opt-out acknowledge traga respuestas no-2xx — fallo silencioso en acción Ley 1581/2300** — `compliance/opt-out/page.tsx:97-124`: solo actúa en `if (res.ok)`; un 403/409/5xx detiene el spinner con la fila aún "Pendiente" sin feedback. *(mvp-cobranza-ui; `cobranza-ui-7`)*
- **Servicios raw-fetch lanzan `Error` plano en vez de `ApiError` — el manejo por status los pierde** — `applications.service.ts:171-181, 251-273`: `createGuest`/`uploadDocument`/property-capture/terceros-extract no lanzan `ApiError`; los callers no pueden distinguir 401/403/offline. *(mvp-data-layer; `data-state-7`)*
- **Guards de cancelación de request inconsistentes en `useApplications`** — `useApplications.ts:20-39,214-239`: algunos hooks usan flag `cancelled`, otros hacen `setState` sin guard tras `await`; un fetch lento de un propertyId previo puede sobreescribir el nuevo. *(mvp-data-layer; `data-state-6`)*
- **`tenant-scoring` pipeline con `retries:0` — un fallo transitorio en el extracto obligatorio falla la evaluación permanentemente** — `tenant-scoring-pipeline.ts:136`: OCR solo reintenta en 429; cualquier 5xx/red transitorio se devuelve `skipped:true`; si es `extracto_bancario` lanza y el run falla sin retry Inngest. *(agent-scoring-matching + agent-inngest; fusión `scoring-7` + `inngest-6`)*
- **Cache de OCR de documentos llavea por URL (nunca contenido) y nunca expira (`expiresAt 2099`)** — `extract-document.ts:61-75,157`: un documento corregido re-subido a la misma URL devuelve el OCR viejo para siempre; el run se corta 30 días. *(agent-scoring-matching; `scoring-4`)*
- **`writeBillingEvent` traga errores dentro de una transacción del caller** — `events.ts:202-227`: en tx-mode hace catch y devuelve `{billingEventId:null}`; o el pago se registra sin `billing_event` (sub-facturación) o envenena la transacción → 500 (alimenta C-3). *(agent-money; `money-billing-event-poison-tx-9`)*

### Performance
- **23 hooks de polling de cobranza disparan cada 30s sin gating de visibilidad de pestaña** — `use-cartera-overview.ts:78` y 20+ más: cero hooks chequean `document.hidden`; un dashboard monta varios timers de 30s que siguen en pestañas en background. *(mvp-perf; `fe-perf-9`)*
- **Ambos locales i18n (es.json 278KB + en.json 263KB) bundleados estáticamente al cliente** — `i18n-context.tsx:6-9`: ~540KB de JSON cargados aunque solo uno renderiza. *(mvp-perf; `fe-perf-10`)*
- **Mapa pesado (maplibre) importado estáticamente en `/propiedades` incluso en list view; sin `next/dynamic` en todo src** — `PropertySearchView.tsx:10`: el motor GL en el chunk de la ruta al primer load. `grep next/dynamic src` = 0. *(mvp-perf; `fe-perf-12`)*
- **`@react-pdf/renderer` importado estáticamente en la ruta de detalle de llamada** — `CallDetailClient.tsx:14`: motor PDF grande en el chunk para todos los que abren una llamada, anulando el `await import` ya presente. *(mvp-perf; `fe-perf-13`)*
- **PermissionsContext / SidebarContext pasan objetos de value inline sin memoizar** — `PermissionsContext.tsx:127-139`, `SidebarContext.tsx:19`: nuevo objeto cada render; re-renderiza todos los consumidores del subtree del panel. *(mvp-perf; `fe-perf-4`)*
- **Lenis: loop rAF global nunca se cancela — fuga y llama `lenis.raf()` en instancia destruida; value sin memoizar** — `SmoothScroll.tsx:48-74`. *(mvp-perf; `fe-perf-5`)*

### UX
- **Archive/Mute/Report de mensajes muestran `alert()` de éxito sin escritura backend (fake success)** — `MessagesWidget.tsx:195-216`: comentario admite "backend no las soporta aún"; "Report" especialmente sin canal real (preocupación safety/compliance). *(mvp-tenant; `tenant-msg-1`)*
- **El panel de ejecución de scoring solo abre TRAS completar — el timeline en vivo nunca se muestra durante el run (hasta 3 min)** — `AIAgentCard.tsx:84`: monta el panel solo cuando `trace.status === 'completed'`; el feature "ver al agente trabajar" está muerto durante el run real. *(mvp-cotizador-aihub; `scoring-run-no-live-panel-4`)*
- **El panel de ejecución renderiza una cédula falsa + pantalla "browser" DataCrédito falsa, presentando una simulación como trace real** — `AIAgentExecutionPanel.tsx:174`: número de documento hardcoded, URL falsa, progreso 60% hardcoded. El credit check real es server-side `Math.random()`. *(mvp-cotizador-aihub; `exec-panel-fake-datacredito-5`)*

### i18n
- **Formato de fecha es-CL (Chile) en vez de es-CO (Colombia) en 62 archivos** — `format.ts:10` hardcodea 'es-CL'; producto Colombia-only con DESIGN.md mandando es-CO. Currency coincide pero el locale de fecha es semánticamente errado. *(múltiples áreas; fusión `i18n-es-cl-vs-es-co-7` + `tenant-i18n-2` + `landlord-perfil-3`)*
- **871 ternarios inline `locale === 'es' ? ...` en 71 archivos evaden el sistema i18n** — `PlanHeader.tsx:286`: varios sin rama EN (usuarios EN ven español); así entraron los strings "MagnifyingGlass" corruptos. Viola DESIGN.md §6. *(mvp-a11y-design; `i18n-locale-ternary-antipattern-5`)*
- **11 keys solo-ES (modal de cuentas de pago) ausentes en `en.json` — usuarios EN ven keys crudas** — `landlordSettings.paymentAccounts.modals.addAccount.*`; el contexto i18n devuelve la key cruda en miss. *(mvp-a11y-design; `i18n-missing-en-keys-6`)*
- **Sobrantes de locale/identidad chilena en perfil de propietario** — `perfil/page.tsx:40-48`: teléfono '+56', label 'RUT' (no cédula), dirección 'Av. Providencia... Santiago'. *(mvp-landlord; `landlord-perfil-3`)*

### A11y
- **Landmarks `<main>` anidados/duplicados en el área inmobiliaria** — `layout.tsx:202` envuelve en `<main>` y ~20 páginas hijas también renderizan su propio `<main>` → dos `<main>` anidados por página (HTML inválido, rompe navegación de landmarks). *(mvp-a11y-design; `a11y-nested-main-4`)*
- **El dropdown de búsqueda del header es un combobox custom sin roles ARIA ni navegación por teclado** — `PlanHeader.tsx:213`: `<input>` + `<div>` de `<button>`s sin `role='combobox'/'listbox'/'option'`, sin `aria-expanded`, sin `onKeyDown`. Solo alcanzable por mouse. Fallo WCAG 2.1.1/4.1.2 en la búsqueda global core. *(mvp-a11y-design; `a11y-search-combobox-8`)*

### Test-gap
- **El extractor OCR core `extract-document.ts` (corazón de Agent 01) no tiene test** — los dos extractores secundarios sí tienen tests bien diseñados; el primario (cédula/labor/extractos) no. La lógica de normalización/confianza/escalación que alimenta el score 0-100 está sin cobertura. *(qa-test-coverage; `test-extract-doc-3`)*
- **Tests de compliance conductual LLM (enforcement de lenguaje de cobranza Ley 2300) gateados por API-key y nunca corren en CI** — `compliance-guardrail.test.ts:508`: las aserciones de "¿el LLM bloquea lenguaje ilegal/abusivo?" viven en bloque `skipIf(!ANTHROPIC_API_KEY)`. Sin CI ni key, la decisión de compliance nunca se verifica en automatización. *(qa-test-coverage; `test-llm-compliance-gated-4`)*

---

## 6. 🟢 BAJOS / nits

- **Página `documentos` keyea labels en lowercase pero el backend emite `UPPER_SNAKE` → strings de tipo crudos al usuario** (`documentos/page.tsx:15`). *(mvp-tenant)*
- **`/demo/score` playground dev públicamente alcanzable en prod (sin auth, sin guard NODE_ENV)** — solo data mock, pero expone UI interna de score. *(fusión `tenant-demo-1` + `demo-score-no-prod-guard-8`)*
- **Detalle de lease muestra "Al día" hardcodeado sin importar estado de pago real** (`arriendo/[leaseId]/page.tsx:375`). *(mvp-tenant)*
- **"Total pagado este año" suma todos los pagos aprobados sin filtro de año** (`pagos/page.tsx:74`). *(mvp-tenant)*
- **Modales del inquilino (PayRent/Reject/Cancel contract, viewer de documentos) no detienen Lenis al abrir (DESIGN.md §8)** (`PayRentModal.tsx:192`). *(mvp-tenant)*
- **Add/remove de wishlist sincroniza fire-and-forget con errores tragados, sin rollback → divergencia cliente/servidor** (`wishlist.tsx:99-126`). *(fusión `tenant-saved-2` + `data-state-3`)*
- **Página guardados resuelve wishlist solo contra top-100 featured → ítems pueden desaparecer y el count no coincide con las cards** (`guardados/page.tsx:22`). *(mvp-tenant)*
- **`agentAuthHeaders` envía `Bearer ` con token vacío cuando no hay token** → 401 confuso (`agent-auth.ts:18`). *(fusión `cobranza-ui-12` + `fe-sec-7`)*
- **Mask renderiza PII no-accionable como `role=button` + `tabIndex=0` cuando `onReveal` está unbound** (`Mask.tsx:106-138`). *(mvp-cobranza-ui)*
- **Hooks de detalle (call/escalation/plan/policies) quedan en skeleton para siempre si la agencia nunca resuelve** (`use-call-detail.ts:101`). *(mvp-cobranza-ui)*
- **Botón "Editar" de propiedad es un no-op muerto; sin acción de borrar propiedad** (`propiedades/page.tsx:231-234`). *(mvp-landlord)*
- **Columna "Propiedad" y búsqueda por propiedad en candidatos no-funcionales (`propertyTitle` no está en la data)** (`candidatos/page.tsx:199-202`). *(mvp-landlord)*
- **Anti-patrones DESIGN.md: glass morphism + gradientes en contenido; modales sin manejo de Lenis** (`[propertyId]/page.tsx:818-877`; `upgrade/page.tsx:66`). *(mvp-landlord)*
- **Contrato creado con términos hardcoded; asume `candidateId === applicationId`** (`contract/[candidateId]/page.tsx:277-294`). *(mvp-landlord)*
- **Tabs de facturación son un patrón ARIA tabs incompleto (sin tabpanel/aria-controls/id linkage)** (`facturacion/page.tsx:122-167`). *(mvp-inmo-core)*
- **Dedup de section-header de nav solo mira un ítem adelante — puede dejar un header de sección colgante** (`layout.tsx:175-179`). *(mvp-inmo-core)*
- **Stats/leaderboard de agentes dereferencian `a.metrics.*` sin guard — posible TypeError si el backend devuelve un agente sin metrics** (`agentes/page.tsx:112-113`). *(mvp-inmo-core)*
- **Mutaciones de notificación tragan errores en silencio; comentarios "optimistic" inexactos (en realidad pesimistas)** (`useNotifications.ts:57-88`). *(mvp-data-layer)*
- **`RouteAnnouncer` anuncia solo en español y usa un mapa de rutas hardcoded de 10 entradas** (`RouteAnnouncer.tsx:40`). *(mvp-a11y-design)*
- **Botones X icon-only en popovers del header sin `aria-label`** (`PlanHeader.tsx:363,469,676`). *(mvp-a11y-design)*
- **`AuthInput`: mensajes de error sin asociación programática (sin `aria-invalid`/`aria-describedby`)** (`AuthInput.tsx:115`). *(mvp-auth-onboarding)*
- **Clases de hex arbitrarias (`bg-[#1a1a1c]`, etc.) en 149 archivos, violando la regla de no-hardcoded-hex** (`dropdown-menu.tsx:68`). *(mvp-a11y-design)*
- **Otros nits agrupados:** módulo dead-code de credenciales demo (`mock-users.ts`) en el bundle; política de contraseñas inconsistente (min 6 registro / min 8 reset); auth/onboarding sin i18n; `verifyCurrentPassword` hace un `signInWithPassword` completo (efecto secundario en la sesión); `LeasefyAIClient` sin Authorization (TODO, beta oculto); loops de polling sin guard de unmount (`use-agent.ts`, `useQuoteStream`); orphan events Inngest (`dispersion.completed`, `cartera.stage.transitioned`, `cobranza/follow-up.scheduled` con typo de guión — ver H-27/H-28); `mapbox-gl` dependencia muerta; 85% de componentes `'use client'`; sin `optimizePackageImports`; ARCO rate-limiter in-memory per-process; CORS default a localhost en prod; emisión voseo argentino del agent suggestion-email; `daily-stale-property-report` mal etiquetado (es un health report); `extractMonthlyIncome` mishandle decimales (~100x); IDs de modelo hardcoded; payout disperse gross-not-net; sumas COP float; `generate-fresh-payment-link` stub impagable; `audit_log.actor_type` sin CHECK DB; lookback 30d en opt-out (derecho permanente); cache smart-matching sin tenantId en la key; `_prisma_migrations` compartido sin protección de orphan; SSE events acumulan unbounded; crons co-agendados 03:00.

> **Nota:** Dos hallazgos de Inngest (typo de evento) son técnicamente *altos* por romper flujos, listados aquí con su detalle:
> - **H-27 — Follow-ups del closer-agent se dropean silenciosamente: emisor usa `cobranza/follow-up.scheduled` (con guión) pero el único consumidor dispara en `cobranza/followup.scheduled` (sin guión)** — `schedule-follow-up.ts:39` vs `follow-up-workflow.ts:90,366`. Cada follow-up programado por el closer agent emite un evento que ningún handler consume; el deudor nunca se re-contacta por ese path, y el tool devuelve `scheduled=true` (monitoreo en verde). *(agent-inngest; `inngest-1`)*
> - **H-28 — `cobranza/cartera.stage.transitioned` se consume pero nunca se emite → la rama S3 pre-jurídica de legal-escalation es inalcanzable en prod** — `legal-escalation-workflow.ts:217` lo registra como trigger pero ningún `inngest.send` lo emite; el cron de cadencia avanza deudores a S3 en DB pero el workflow legal nunca corre. *(agent-inngest; `inngest-2`)*

*(H-27 y H-28 se cuentan como altos en el tablero de §2.)*

---

## 7. Cobertura por área

| Área | Salud | Cobertura / limitación |
|------|-------|------------------------|
| **mvp-tenant** | Caminos felices funcionales; bordes reales rotos (documentos guest descartados, withdraw muerto, sin feedback de error en create). | Leídos en full ~20 archivos del flujo de aplicar/contratos/pagos. NO leídos a fondo: perfil, configuracion, para-ti, ScoreCard/sheets, PropertyDetailSheet. No se corrió la app. Casing de doc-type y endpoint withdraw inferidos del frontend, no verificados en vivo. |
| **mvp-landlord** | Core funcional pero múltiples fake-success que erosionan confianza + 1 bug grado-compliance (borrado de cuenta). | Leídos en full checkout/candidatos/perfil/configuracion/leases + hooks. Sampleados propiedades/visitas/contratos via grep. NO leídos: MessagesWidget interno, leaf components landlord, wizard publicar. Persistencia inferida de código (setTimeout vs servicio tipado). |
| **mvp-inmo-core** | En buena forma; empty-states honestos, motor de insights correcto y determinista. Sin defectos crít/altos. | Inspeccionados engine.ts, hoy/InsightsPanel, páginas ERP, agentes, gating de nav. Sampleados via grep: dashboard 643 líneas, operaciones, documentos, dispersiones, reportes, analytics. Shapes reales del backend (Agente.metrics) no verificados. |
| **mvp-cobranza-ui** | Esqueleto funcionalmente sólido con defectos reales que bloquean/rompen flujos específicos (crash de hooks, auth de streams binarios, rollback no-op). | Leídos en full ~11 hooks + clients de rutas. eslint corrido en todo el árbol (deudores es la única violación). Cross-verificadas 4 rutas del agente para confirmar Bearer-only. NO leídos a fondo: plantillas, sub-páginas de reporte, tabs de detalle de deudor, modales de intervención. Hallazgos de 401 audio/PDF de análisis estático de contrato de auth (no runtime). |
| **mvp-cotizador-aihub** | Las partes estáticas/form son production-grade; las capas de tiempo-real y métricas tienen contract-drift que rompe flujos core con backend real. | Leídos en full hooks y componentes principales + cross-verificación contra el repo agent. NO trazado completamente: emisión SSE dinámica del orquestador (cost_recorded/partial_ranking pueden ser dead handlers, baja confianza). No se corrió la app ni los tests. |
| **mvp-auth-onboarding** | Flujos funcionan en su mayoría, pero la postura auth/authz es débil y sobre-confía en el cliente (todo gating client-side). | Leídos en full auth-context, guards, contexts, páginas de login/mfa/registro/invitación/arco. Cross-check del repo agent para ARCO/CORS. NO leído: monolito (api.leasefy.co, fuera del workspace) — rechazo de tokens aal1 y binding de email son supuestos. SSR/edge no runtime-tested. |
| **mvp-security** | Higiene de secretos client-side buena; debilidades en la capa de rendering/redirect/transport (XSS, open-redirect, sin CSP, proxy de docs). | Grep de todo src para sinks XSS/redirect/storage/PII-en-URL. Leídos en full agent-auth, client, supabase/firebase config, next.config, proxy de docs, AuthForm. Explotabilidad del sink contract-HTML depende de escaping del backend (no runtime-confirmado). Beta oculto no auditado a fondo. |
| **mvp-a11y-design** | Fundación de design system fuerte; varios defectos reales socavan WCAG AA e i18n (contraste, skip link, nested main, combobox, ternarios). | Leídos en full DESIGN.md, primitivos, i18n/format, bloques de contraste de globals.css. Diff de paridad ES/EN sobre ambos locale files; ratios WCAG computados en Node. NO revisadas: las ~142 pantallas individuales; testing de teclado en navegador real no corrido (sin server vivo). Estático-only. |
| **mvp-perf** | Shippable para demo pero con costo UX real (LCP lento en marketing, banda/batería desperdiciadas, 1 flujo core roto). | Inspeccionado via Grep/Read/Bash + introspección de node_modules. NO `next build` ni Lighthouse — claims de bundle-size estructurales, no bytes medidos. Sampleadas superficies de alto tráfico. Conteos de re-render inferidos de context values no-memoizados + conteos de consumidores. |
| **mvp-data-layer** | Robustez despareja — hooks nuevos sólidos (optimistic-revert, reconnect), varios paths de alto tráfico con defectos reales. | Leídos en full client/config/streaming/agent-auth + ~25 hooks/contexts/servicios. Sampleados via grep los 49 servicios + 35 hooks. NO leídos línea-por-línea: properties/leases/contracts/messages/visits/pse services, ~20 hooks de cobranza, beta-chat. El repo agent fuera de scope de esta área. |
| **agent-routes** | En buena forma para su tamaño; modelo de auth core sólido (cross-tenant JWT guard, constant-time, HMAC). Gaps reales en privilegio ARCO y secretos de webhook. | Sampleados ~18 de 166 archivos de ruta + 4 middlewares + helpers clave. Leídos en full middlewares + arco-public + opt-out + secciones auth/CORS de index.ts. NO alcanzados: ~140 archivos cotizador/cartera/onboarding/dashboard para zod-completeness/per-handler authz. No se corrió el suite ni server vivo. |
| **agent-scoring-matching** | Happy-path funcional, pero problemas reales de honestidad e integridad (RNG de crédito comparado contra doc real → falsos flags de fraude; OCR degrada a 0.7 silencioso). | Inspeccionados en full ~14 archivos (pipelines, tools de scoring/extracción, libs). NO leídos a fondo: fraud-detection, consistency-check (solo greps), document-freshness, los 308 test files (solo existencia). No se corrió el código. Validez de model-ID inferida. |
| **agent-cobranza** | Building blocks sólidos, pero el loop de autopilot tiene gaps de wiring (cadencia no despachada, dialer ignora canal) y un gap de conteo de compliance (WhatsApp). | Sampleados ~15 greps + lecturas profundas del código de dispatch/guardrail de mayor riesgo. Trazado cada writer de contact_attempt y cada emisor/consumidor de call.scheduled. NO inspeccionados: 12 prompts de sub-agentes, conductor.ts interno, post-call body, payment-plans/default-watcher, 308 tests. Severidad F-1 asume que la cadencia debe despachar (no encontré doc de intención). |
| **agent-cotizador** | Alta calidad de código, pero varias asimetrías "computado-pero-no-impuesto" y "redactado-para-almacenar-no-para-respuesta" que importan para correctness y compliance. | Leídos en full orquestador, stub-mode, registry-config, scoring, stream, pii-redactor, carriers principales; greps en cotizador.ts (~1100 líneas). NO inspeccionado: PDF generation (claims de QR/verificación NO VERIFICADOS), counterfactual engine, SLA breach-detector, componentes frontend, carriers dormidos. No se corrió tsc/tests. |
| **agent-money** | Scaffolding estructuralmente sano, pero aún no money-safe para fondos reales — consistente con la postura "el dinero no se mueve aún / B2/B4 abiertos por diseño", aunque varios defectos van más allá de los stubs conocidos. | Leídos en full daily-dispersion, billing events/engine, wompi, wompi-webhook, generate-payment-link; parciales bold/monthly-aggregation/alegra + schema. Verificado el índice único phase_12. NO leídos a fondo: src/erp/* adapters, bold-webhook línea-por-línea, Lua de Redis casTransition, cartera/payment-plans math, los .test files. Sin DB/tests en vivo. |
| **agent-compliance** | Inusualmente bien-ingeniada para un MVP (frequency cap race-proof, schedule DST-safe, append-only triggers correctos), pero el loop T-323 está medio-implementado con un hueco crítico. | Leídos en full frequency/schedule/check-*, screening, arco-public, automated-decisions-review, write.ts, migraciones append-only. Grep-verificados todos los callers/readers clave. NO inspeccionados: certicamara, datacredito/transunion adapters, compliance-guardrail prompt interno, holidays accuracy. Frontend ARCO: grep no encontró UI (baja confianza en ese gap). 308 tests no corridos. |
| **agent-inngest** | Disciplina de durabilidad por encima del promedio, pero 2 defectos de flujo roto (typos de evento) + 1 anti-patrón Inngest + confirmación del gap de cadence-dispatcher. | Inspeccionados en profundidad index, client, daily-dispersion, monthly-billing, tenant-scoring-pipeline, cartera-cadence-cron, pre-call-workflow + configs. Análisis sistemático de orphan-events por grep + sweep de cron/TZ en las 26 funciones. NO leídos a fondo: ~12 funciones cotizador, erp-sync, rne-daily-sync internos. Sin correr el suite. |
| **agent-prisma-rls** | Aislamiento de tenant en 2 capas, pero la capa DB-RLS es NO-OP hoy bajo BYPASSRLS — el aislamiento real descansa en que el código de app recuerde tenantId (lo cual mayormente hace). | Sampleo dirigido ~16 greps/reads. Leídos en full tenant-scope, db, assert-rls, agency-role, fingerprint, migraciones clave, modelos Debtor/Payment. Grepeados los 205 data-ops bare pero leídos ~12. NO cubiertos: los ~190 call sites bare restantes individualmente; sin correr DB/migraciones; schema-drift de lectura de SQL, no de `migrate diff` vivo. |
| **agent-security** | Baseline de seguridad genuinamente fuerte para código vibe-coded (HMAC correcto, redactor PII en Sentry, validación UUID), pero varias vulns reales abiertas (IDOR, SSRF, webhook accept-all, timeouts). | Slice budget-limited, ~15 greps/reads dirigidos a superficies de alto riesgo. Verificadas claims §6 (A1/A2/B1 landed; C1/D1/D5 STILL-OPEN). NO alcanzados: read completo de las 164 rutas Hono + 48 Inngest fns; superficie de tool-use de los 12 sub-agentes para prompt-injection; OAuth carriers; datacredito/transunion SSRF. IDOR debería confirmarse contra re-validación downstream (trazado entry + credit-call, no las ~500 líneas del pipeline). |
| **qa-test-coverage** | Tests unitarios de alta calidad a nivel de archivo (no fake-testing), pero el problema sistémico es la EJECUCIÓN: ninguno de los dos repos corre su suite en CI; los tests RLS/E2E están DB-gated y nunca corren. | Sampleados ~16 greps/reads contra los slices de mayor riesgo (skip/only, CI configs, payment-plan math, extracción, compliance gates, RLS no-DB fallback). Corridos 2 archivos MVP en vivo (17 tests pasan). NO corridos los suites completos 308/49 (sin test DB). Coverage-% no recolectado. "No fake-testing" basado en los archivos sampleados, puede no generalizar a los 308. |

---

## 8. Apéndice: hallazgos refutados (false positives)

**Ningún hallazgo de alta/crítica severidad fue refutado en la verificación adversarial.** De los hallazgos sometidos a verificación, los 6 verificados resultaron `confirmed`:

| ID | Veredicto | Ajuste | Razón |
|----|-----------|--------|-------|
| `landlord-perfil-1` (C-1) | confirmed | mantener | Borrado de cuenta verificado como simulado (setTimeout + toast, sin API/signOut); pantalla de éxito falsa; flujo real coexiste en configuracion. |
| `fe-perf-1` / `cobranza-ui-1` (C-2) | confirmed | mantener | Rules-of-Hooks verificado en código real: useRef/useEffect tras early returns en líneas 138/146; crash garantizado en el camino feliz loading→loaded. |
| `money-webhook-dedup-loss-1` (C-3) | confirmed | mantener | SETNX antes del write del ledger; catch del 500 no borra la clave; ventana de retry de Wompi dentro del TTL; daily-dispersion no recupera. |
| `money-double-invoice-window-3` (C-4) | confirmed | mantener | Stamp DIAN antes del dedup-row, sin idempotency key a Alegra, sin @@unique en (tenantId,monthYear), todo en un solo step.run que re-ejecuta tras fallo parcial. |
| `compliance-t323-1` (C-5) | confirmed | mantener | Filas de pausa sembradas con eventType='contact_pause_review_pending'; cero lectores en producción (todos filtran 'contact_attempt'); pausa 72h no aplicada. |
| `agent-sec-1` (H-1) | confirmed | **bajado crít→alto** | IDOR real (tenantId del body, nunca ligado al JWT), pero el abuso de credit-bureau es latente (mock-mode ignora el arg) y PipelineRun se llavea por userId, no tenantId — por eso la severidad se ajustó a la baja. |

Los hallazgos restantes tienen `verdict: null` (no sometidos a verificación adversarial independiente). Se reportan en su severidad declarada y deben tratarse como **uncertain** hasta validación en runtime/backend — particularmente los que dependen de comportamiento del monolito (`api.leasefy.co`, fuera del workspace) o del backend del agente más allá de las rutas verificadas. Ningún false-positive identificado para excluir.

---

## 9. Top 10 acciones priorizadas

1. **Arreglar la pérdida de pagos por dedup de webhook (C-3)** — mover el SETNX después del commit del ledger o borrar la clave en el catch del 500, y apoyarse en el índice único DB existente. Es pérdida directa de dinero sin alerta.
2. **Cerrar la doble-factura DIAN del cron mensual (C-4)** — external-id idempotente a Alegra + `@@unique(tenantId, monthYear)` + fila claim dentro de `withTenantScope` antes del stamp. Sobrecobro legal/tributario.
3. **Implementar y aplicar la pausa de contacto 72h T-323 (C-5)** — hacer que el gate de frecuencia lea las filas `contact_pause_review_pending`; agregar endpoint que registre el outcome de la revisión humana (compliance-t323-2). Incumplimiento regulatorio activo.
4. **Mover los hooks de `DeudoresListClient` arriba de los early returns (C-2)** — crash garantizado de la pantalla de cobranza más usada; agregar test de transición. Fix de bajo esfuerzo, alto impacto.
5. **Reemplazar el borrado de cuenta simulado del perfil de propietario (C-1)** — cablear `settingsApi.deleteAccount()` + `signOut()` o enlazar al flujo real de configuracion. Exposición Ley 1581.
6. **Sanitizar el HTML de contrato + agregar headers de seguridad (H-2, H-8)** — DOMPurify en los tres sinks `dangerouslySetInnerHTML` + bloque `async headers()` con CSP/X-Frame-Options/nosniff/Referrer-Policy. Backstop para el sink XSS de máxima confianza.
7. **Ligar `tenantId/agencyId` al JWT en `/tenant-scoring` y `/smart-matching` (H-1)** — reutilizar `agencyRoleMiddleware`; filtrar `GET /:runId` por tenant. Cierra el IDOR cross-tenant.
8. **Arreglar la auth de los streams binarios de cobranza/cotizador (H-14, H-18, H-19)** — patrón fetch+Blob+object-URL o signed-URL tokenizado para SSE/audio/PDF; quitar `withCredentials`/`crossOrigin=use-credentials`/iframe-src directo. Desbloquea el cotizador en vivo, el playback de llamadas y los previews de aprobación legal.
9. **Exigir secretos de webhook en boot + arreglar CORS de ARCO público (H-7, H-5, H-6)** — `assertProductionSecrets` fail-closed para todos los secretos de webhook/token; montar `cors()` en `/api/arco`; restringir escrituras ARCO a roles no-VIEWER. Cierra forja de pagos y rompe/escala el canal habeas-data.
10. **Levantar CI que corra ambos suites de tests (`test-ci-1`, `test-rls-gated-2`)** — workflow PR con `vitest run` + `tsc --noEmit` en ambos repos, con Postgres efímero para que los tests RLS/E2E DB-gated corran. Convierte la buena disciplina de testing existente de documentación en enforcement, protegiendo todos los fixes anteriores.

---

*Fin del reporte. Generado por síntesis QA a partir de 20 auditorías especialistas con verificación adversarial selectiva. Severidades y file:line preservados de los hallazgos originales; duplicados fusionados; refutados excluidos (ninguno en alta/crítica).*
