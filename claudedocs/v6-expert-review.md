# Revisión de expertos — Milestone v6.0 (ERP·CRM·Autopilot)

> Generado por panel multi-agente (8 revisores por dimensión + verificación adversarial por hallazgo + síntesis).
> Alcance: solo código nuevo de v6.0 (commits `feat(v6-*)`) en `rent/mvp` + archivos cross-repo en `rent/agent`.
> Resultado: **55 hallazgos → 45 confirmados, 10 descartados** por verificación adversarial.
> Fecha: 2026-05-31.

## Veredicto general

v6.0 es sólido en lo que se propuso: las vistas ERP son aditivas y honestas (empty states reales, datos de ejemplo etiquetados, banners "motor llega en M1/M2"), el motor de insights es puro y testeable, el contrato de datos cliente↔agente coincide 1:1 (URLs, métodos, nombres de campo, shapes de respuesta, enums), y la nueva nav agrupada respeta el gating sin romper el CRM. **Pero v6-07 y v6-08 NO están listos para E2E ni merge**: el servidor del agente no monta ningún middleware CORS, por lo que toda llamada del navegador cross-origin se bloquea antes de que el cliente vea la respuesta — esto explica por qué estos dos flujos nunca corrieron end-to-end. El resto son bugs de robustez/UX de gravedad media-baja y nits de a11y/consistencia, ninguno bloqueante para el CRM existente.

---

## 🔴 Crítico

### 1. El servidor del agente NO tiene CORS — rompe TODO el E2E de v6-07 y v6-08
**`agent/src/server/index.ts:293-577`** (y middlewares en `:432-451`)

Ambos clientes (`mvp`, componentes `'use client'`) hacen `fetch` desde el navegador hacia `NEXT_PUBLIC_AGENT_URL` (mvp en `:3000/:3005`, agente en `:4000` → cross-origin) con header `Authorization: Bearer` + `Content-Type: application/json`. Esos headers hacen la request **no-simple**, así que el navegador dispara un preflight `OPTIONS`. El servidor Hono no monta `hono/cors` ni maneja `OPTIONS` (`grep 'hono/cors'|'Access-Control'` en `src/` = 0 resultados; no está en `package.json`). Sin `Access-Control-Allow-*`, el navegador **bloquea la respuesta** → `extractTerceroFromImage`/`extractPropertyFromCapture` lanzan `TypeError` de red → `step='error'`. Verificado: `next.config.mjs` no tiene rewrites/proxy que vuelva same-origin.

> Nota: el patrón cross-origin es sistémico (el stream cotizador usa lo mismo). Si en algún deployment "funciona", es porque corre detrás de un proxy/gateway con CORS a nivel infra — en cuyo caso hay que confirmar que ese gateway cubre las rutas nuevas `/terceros` y `/property-capture`. Pero en el código de estos repos, cross-origin directo desde navegador está roto.

**Fix:** montar `hono/cors` ANTES de las rutas, allowlist explícita por env (NO `'*'`, NO reflejo de origin):
```ts
app.use('*', cors({
  origin: [process.env.FRONTEND_URL],
  allowMethods: ['POST','OPTIONS'],
  allowHeaders: ['Content-Type','Authorization'],
}))
```
Y en el cliente, quitar `credentials:'include'` (ver Bajo — la auth es 100% Bearer). **Probar navegador→agente end-to-end antes de cerrar el milestone.**

---

## 🟠 Alto

Ninguno confirmado tras verificación. Varios reportados como `high` (límites de tamaño cliente, fuga de `err.message`, fail-open de role-check, cobertura de tests) fueron ajustados a `medium`. El único riesgo de impacto alto real es el CORS (crítico).

---

## 🟡 Medio

### 2. Sin límite de tamaño de imagen en cliente → 413 con fotos de cédula reales
**`mvp/src/components/inmobiliaria/TerceroIACapture.tsx:57-68`** — bug
`onPickFile` solo valida `f.type.startsWith('image/')`, nunca `f.size`. El agente corta a 12MB. Foto cruda > ~9.4MB (base64 infla ~1.33×) → 413 tras subir todo. Mensaje del agente hardcodeado en español (no i18n).
**Fix:** validar `f.size` (~8MB) con toast i18n antes de subir; idealmente comprimir con canvas.

### 3. Sin límite de duración/tamaño de audio en cliente → 413 con grabaciones largas
**`mvp/src/components/inmobiliaria/PropertyIACapture.tsx:136-168`** — bug
Sin tope de grabación; el agente corta a 24MB (~22-44 min). Happy path (1-5 min) pasa, grabación larga falla con error opaco. Relacionado con #5.
**Fix:** auto-detener a ~3-4 min y/o validar `audioBlob.size` antes de enviar; mostrar el límite.

### 4. Re-extraer pisa silenciosamente las ediciones manuales del formulario
**`mvp/src/components/inmobiliaria/PropertyIACapture.tsx:203-204`** — bug
En `review`, "Atrás" vuelve a `capture` sin limpiar estado; re-pulsar "Procesar" ejecuta `setForm(fichaToForm(res.ficha))` y sobrescribe ediciones sin confirmar.
**Fix:** confirmar antes de sobrescribir si el form fue editado, o preservar el form al volver.

### 5. Desajuste de contrato: cliente permite ~26.7MB de audio pero el server corta a 24MB
**`agent/src/server/index.ts:442-445`** vs **`agent/src/mastra/tools/extract-property.ts:45`** — bug
Schema acepta `audioBase64.max(28_000_000)` pero `bodyLimit` = `24*1024*1024`. El bodyLimit corta antes → el techo de 28M es inalcanzable.
**Fix:** alinear ambos (subir bodyLimit a ~28MB o bajar `.max` a `24*1024*1024`). Validar en cliente.

### 6. Fuga de object URL: `previewUrl` nunca se revoca al cerrar el modal
**`mvp/src/components/inmobiliaria/TerceroIACapture.tsx:51-68`** — perf
Crea `previewUrl` con `URL.createObjectURL` sin cleanup de unmount. El `Modal` desmonta al cerrar → object URL sin revocar por ciclo. `PropertyIACapture` sí tiene el cleanup canónico.
**Fix:** `useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [])` con ref.

### 7. Respuestas 500 devuelven `err.message` crudo de los SDKs (Anthropic/OpenAI)
**`agent/src/server/routes/tercero-extract.ts:75-78`** y **`property-extract.ts:73-75`** — security (CWE-209)
El catch devuelve `err.message` en el body 500 → expone tipo de error, billing/cuota ("credit balance too low"), org deshabilitada; se pinta en pantalla. No filtra la API key.
**Fix:** loguear `err` server-side, devolver mensaje genérico fijo en español.

### 8. Fail-open heredado: con `prisma` null el role-check se salta sin guard de NODE_ENV
**`agent/src/server/middleware/role-check.ts:16-22`** — security
Si `prisma` es null (DB caída / `DATABASE_URL` unset), entra en "stub mode" y deja pasar a cualquier JWT válido sin verificar rol. Bypass condicional (el JWT sí se verifica). Patrón preexistente heredado en `/terceros` y `/property-capture`.
**Fix:** en producción con `prisma` null → 503 (fail-closed), o exigir `DATABASE_URL` en el gate de secrets.

### 9. Sin timeout explícito en clientes Anthropic/OpenAI
**`agent/src/mastra/tools/extract-property.ts:16-29`** — perf
`new Anthropic()`/`new OpenAI()` sin `{ timeout, maxRetries }` → default ~10 min. Whisper+Claude encadenados sin presupuesto de tiempo (+ `callWithRetry` apilado sobre `maxRetries:2`) → puede superar el límite de un proxy/edge y dar 504 opaco.
**Fix:** `new Anthropic({ timeout: 30_000, maxRetries: 2 })`, `new OpenAI({ timeout: 60_000 })`; timeout → 504/503 en español.

### 10. Valores numéricos del LLM sin validar rango (estrato, baños, área, canon)
**`agent/src/mastra/tools/extract-property.ts:232-247`** — bug *(ajustado a low, pero accionable)*
`asNumber` solo verifica `Number.isFinite`; no acota rangos. Puede devolver `estrato=8`, `area=0`, habitaciones decimales. Mitigado por revisión humana.
**Fix:** clamp tras extraer; null fuera de rango.

> **Nota de dominio (design, medium):** `mvp/src/lib/api/tesoreria.types.ts:16-40` — `EgresoNeto`/`calcularNeto` modelan `neto = canon − comisión − IVA − descuentos` pero **no modelan retenciones colombianas** (ReteFuente, ReteICA, ReteIVA) sobre honorarios, pese a que el comentario dice "fórmula completa". No rompe nada hoy (cómputo es de M1) pero el contrato quedaría incompleto. **Fix:** añadir `retencionFuente?/reteIca?/reteIva?` opcionales o documentar que se modelan en M1.

---

## 🟢 Bajo / Nits

- **`PropertyIACapture.tsx:136-162`** (bug) — permiso de micrófono denegado se reporta como cualquier fallo; `catch {}` sin inspeccionar `err.name` ni guardar contra `navigator.mediaDevices` undefined (no-HTTPS).
- **`PropertyIACapture.tsx:250-262`** (bug) — si `create` OK pero `assignAgent` falla, propiedad queda sin agente y el reintento puede duplicarla (sin idempotencia). Patrón pre-existente de `/nueva`.
- **`agent/extract-tercero.ts:36,142-155`** (security) — SSRF latente: `documentUrl: z.string().url()` sin allowlist de host/IPs privadas. Acotado (la fetch la hace Anthropic, no Leasefy; hay rate-limit). Fix: eliminar el campo si el front no lo usa o validar host.
- **`agent/extract-property.ts:176-189`** (security) — inyección de prompt vía transcript de Whisper. Blast radius acotado (salida a JSON, sin tool-use/DB, revisión humana).
- **`mvp/terceros-extract.service.ts:69-77`** (security) — PII (cédula/RUT) viaja como base64; falta `Cache-Control: no-store` en `/terceros` y `/property-capture` (las rutas de cobranza sí lo setean). Fix: header `no-store` + sin logs del body.
- **`mvp/property-capture.service.ts:83-95`** (bug) — `credentials:'include'` innecesario (auth es Bearer); quitar (el bloqueador real es CORS #1).
- **`agent/jwt-verify.ts:14-29`** (design) — `jwk()` devuelve 401 texto plano; cliente muestra `'Error 401'` genérico — justo el caso más probable al integrar. Fix: 401 como JSON o mapear 401→sesión.
- **`agent/extract-property.ts:186-189`** (bug) — `max_tokens:900` fijo puede truncar el JSON → `{}` → ficha vacía con `confidence 0.5` y `success:true`. Fix: chequear `stop_reason==='max_tokens'`.
- **`mvp/property-capture.service.ts:77-80`** (bug) — fotos HEIC (iPhone) forzadas a `media_type:'image/jpeg'` con bytes HEIC → Claude las ignora. Falla silenciosa. (terceros igual.)
- **`mvp/extract-tercero.ts:215`** (bug) — `numeroDocumento` conserva letras (para pasaporte) pero el prompt pide digits-only para CC/NIT. Fix: rama por tipo.
- **`agent/extract-tercero.ts:106-118`** (design) — fallback a `'CC'` cuando el modelo omite `tipo_documento`, aunque CE/PASSPORT también entran. Fix: null si confidence baja.
- **`mvp/tesoreria/page.tsx:9,75,85`** + **InsightsPanel** (bug) — `formatCurrency` usa `es-CL`/`CLP` (Chile) para COP. Hoy invisible ($ pelado) pero incorrecto y pervasivo. Fix: `es-CO`/`COP`, consolidar en un util.
- **`mvp/insights/engine.ts:43-44`** (bug) — `coberturaDispersarPct` no se clampa 0-100. Fix: `Math.max(0, Math.min(100, ...))`.
- **`mvp/PlanSidebar.tsx:168-182`** (a11y) — items activos de escritorio sin `aria-current="page"` (mobile sí). 
- **`mvp/PlanSidebar.tsx:123-149`** (a11y) — botón de grupo colapsable sin `aria-expanded`.
- **`mvp/MobileNavSheet.tsx:48-51`** (bug) — `rows = item.children ?? [item]` oculta el link del padre en overflow. Fix: `rows = [item, ...(item.children ?? [])]`.
- **`mvp/facturacion/page.tsx:122-141`** + `TerceroIACapture.tsx:190-205` (a11y) — tabs/segmented sin `role="tablist"/"tab"`/`aria-selected`.
- **`mvp/propiedades/captura/page.tsx:30-32`** (design) — header `text-2xl font-bold text-neutral-900` en vez de `<SectionLabel>` + `text-h2 text-foreground`.
- Nits puros: severidad `'success'` declarada en insights pero nunca emitida (`types.ts:8`); `params` sin tipo discriminado (`types.ts:23`); IVA `'19%'` literal vs comisión data-driven (`tesoreria/page.tsx:26-27`); import sin usar `ArrowRight` (`tesoreria/page.tsx:4`); asimetría `key/field` (`conciliacion/page.tsx:18`); `<nav>` del sidebar sin `aria-label` (`PlanSidebar.tsx:274`); expansión de grupos no persiste (`PlanSidebar.tsx:74`); inputs PropertyIACapture `border-1`+`ring-2` vs firma `border-2`+`ring-4`; strip de prefijo `data:` frágil (`extract-property.ts:160`); MobileNavSheet sin `data-lenis-prevent` (no dispara con `syncTouch=false`).

---

## ✅ Lo que está bien (sólido — no romper)

- **Contrato cross-repo coincide 1:1**: URLs, método, nombres de campo, shapes de respuesta, enums. El riesgo cross-repo NO está en el shape — está en la transmisión (CORS).
- **Seguridad de red endurecida**: JWT JWKS con `alg` fijado a ES256, `iss`/`aud` pinneados, falla cerrado sin `SUPABASE_JWKS_URL`; role-check; rate-limit por usuario (20/min terceros, 10/min property); body-limit ANTES de jwt/buffering; Zod estricto de MIME + tamaño.
- **Diseño stateless honesto**: extracción no persiste PII/audio; solo SUGIERE campos que el usuario revisa antes de guardar por el flujo manual existente.
- **Vistas ERP aditivas y honestas**: empty states reales, datos etiquetados "ejemplo", banners M1/M2, fórmula de neto aritméticamente correcta, `calcularNeto` puro y DRY, tipos DIAN bien modelados (CUFE, EstadoDIAN, notas).
- **Motor de insights**: puro, testeable, guardas `>0`, `Record` completo en presentación/estilos, claves i18n completas es/en.
- **Nav agrupada aditiva**: `filterItem` aplica `canAccess` recursivamente, elimina headers huérfanos, sin flash de nav vacía, sin colisiones de prefijo, dashboard `exact:true`.
- **Recursos del navegador en PropertyIACapture**: limpia MediaRecorder, detiene tracks, `clearInterval`, revoca URLs en unmount (el patrón que falta en TerceroIACapture).
- **Parseo defensivo del LLM**: extrae primer bloque `{...}` con regex, `JSON.parse` en try/catch con fallback, tolera shapes raras.

---

## 💡 Mejoras opcionales (no bugs)

- **Cobertura de tests insuficiente en la zona de mayor riesgo** (`agent/tercero-extract.test.ts`, `property-extract.test.ts`): ambos suites **mockean por completo** los extractores; solo prueban ruta + happy path + 500. NO ejercitan `readField`/`readCell`, `JSON.parse` del LLM, `normalizeTipoDocumento`/`asNumber`, strip `data:`, promedio de confidence, parseo de markdown/```json```. Es la red de seguridad que más falta dado que v6-07/08 nunca corrieron E2E. **Acción:** unit tests con `anthropic.messages.create`/`openai.audio.transcriptions.create` stubbeados y outputs realistas.
- Consolidar `formatCurrency` en un util `es-CO`/`COP` (patrón `es-CL`/`CLP` pervasivo en todo el repo).
- Extraer el límite de 4 fotos como constante compartida del contrato.
- Decidir la política de `PageGuard` para las vistas ERP antes de que tengan data real (M1/M2).

---

## Próximos pasos recomendados

1. **[BLOQUEANTE — antes de E2E]** Montar `hono/cors` en el agente (allowlist por env + OPTIONS). Quitar `credentials:'include'` de ambos clientes. **Probar navegador→agente E2E** para v6-07/v6-08.
2. **[Antes de merge]** Alinear límite de audio schema(28M)↔bodyLimit(24MB) + guards de tamaño en cliente (foto ~8MB, audio ~18MB/auto-stop) con i18n.
3. **[Antes de merge]** Sanear respuestas 500: mensaje genérico, no `err.message`.
4. **[Antes de prod]** Cerrar fail-open de role-check (503 si `prisma` null).
5. **[Antes de prod]** Timeouts explícitos Anthropic/OpenAI + 504 amigable.
6. **[UX]** Confirmación/preservación de form al re-extraer en PropertyIACapture.
7. **[Limpieza]** `useEffect` cleanup de `previewUrl` en TerceroIACapture.
8. **[Testing]** Unit tests de la lógica de extracción/normalización real (sin mock del extractor).
9. **[Hardening, no bloqueante]** SSRF allowlist, `Cache-Control: no-store` PII, clamp de rangos LLM, clamp 0-100 cobertura.
10. **[A11y, no bloqueante]** `aria-current`/`aria-expanded`/`aria-label` en PlanSidebar; roles de tabs; fila del padre en MobileNavSheet overflow.
11. **[Dominio]** Decidir retenciones colombianas (ReteFuente/ReteICA/ReteIVA) en el contrato `EgresoNeto` ahora o documentar pendiente de M1.
