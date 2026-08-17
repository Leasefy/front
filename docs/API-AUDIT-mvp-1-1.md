# API Contract Audit — `feature/mvp-1-1`

> Front ↔ micros (back / agent / avaluo). Cruce: llamada del front → micro → spec (`scripts/openapi.json`, `scripts/openapi-snapshot.json`) → tipo generado (`generated/back.ts`, `generated/agent.ts`) → source del micro.
> Fecha: 2026-08-17. Método: 8 auditorías verticales en paralelo + verificación contra catálogo de paths (386 back / 276 agent) y lectura directa de archivos clave.

## Leyenda de severidad
- 🔴 **P0 — roto en producción**: el front llama un endpoint que no existe / path o verbo equivocado, y **hay un caller vivo** (no mock-guarded).
- 🟠 **P1 — mentira de tipo con riesgo**: el tipo a mano diverge del contrato real y puede romper render o el momento en que el back se prenda.
- 🟡 **P2 — fantasma muerto / no-publicado-aún**: sin caller, o degrada honesto esperando al back.
- 🟢 **OK**.

---

## 1. 🔴 P0 — Endpoints rotos que se llaman en producción

| # | Feature | Front (file:line) | Llama | Ruta real (back/agent) | Impacto |
|---|---------|-------------------|-------|------------------------|---------|
| 1 | Documentos (subir) | `documents.service.ts:104` (`useDocuments.ts:78`) | `POST /documents` | `POST /documents/upload` | Subir documento **rompe** (panel landlord, CandidateDrawer, PostulacionDirecta, ApplicationContext) |
| 2 | Documentos (borrar) | `documents.service.ts:125` (`useDocuments.ts:103`) | `DELETE /documents/{id}` | `DELETE /applications/{appId}/documents/{docId}` | Borrar documento **rompe**. Fix real: threadear `applicationId` por los callers |
| 3 | Cuentas de pago (asignar) | `payment-methods.service.ts:48` (`PaymentAccountsSection.tsx:203`) | `POST /landlords/me/payment-methods/{id}/assign` | (no existe) | 404 silencioso en cada "crear cuenta" |
| 4 | Postulaciones por propiedad | `applications.service.ts:238` (`useApplications.ts:298`) | `GET /applications/property/{propertyId}` | (no existe) | 404 |
| 5 | Visitas (confirmar) | `visits.service.ts:82` (`useVisits.ts:121`) | `PATCH /visits/{id}/confirm` | `PATCH /visits/{id}/accept` | Confirmar visita rompe |
| 6 | Cobros (registrar pago) | `inmobiliaria.service.ts:500` (`cobros/page.tsx:232`) | `PATCH /inmobiliaria/cobros/{id}/pay` | `POST /inmobiliaria/cobros/{id}/payment` | Registrar pago rompe |
| 7 | Cobros (recordatorio) | `inmobiliaria.service.ts:547` (`cobros/page.tsx:278`) | `POST /inmobiliaria/cobros/{id}/reminder` | `PUT /inmobiliaria/cobros/{id}/send-reminder` | Recordatorio rompe |
| 8 | Mantenimiento (cambiar estado) | `inmobiliaria.service.ts:776` (`operaciones/page.tsx:404`) | `PATCH /inmobiliaria/mantenimiento/{id}/status` | (no existe; hay `approve/complete/cancel` PUT) | Cambiar estado rompe |
| 9 | Mantenimiento (aprobar cotización) | `inmobiliaria.service.ts:785` (`operaciones/page.tsx:430`) | `PATCH /inmobiliaria/mantenimiento/{id}/approve-quote` | `PUT /inmobiliaria/mantenimiento/{id}/select-quote` | Aprobar cotización rompe |
| 10 | Analítica agencia | `inmobiliaria.service.ts:1041,1055` (`useInmobiliaria.ts:591,596`) | `GET /inmobiliaria/analytics/trends?metricId=` (query, sin arg) | `GET /inmobiliaria/analytics/trends/{metricId}` (path param) | Siempre 404 |
| 11 | Plantillas agencia | `inmobiliaria.service.ts:1116` (`useInmobiliaria.ts:623`) | `GET /inmobiliaria/templates` | `GET /inmobiliaria/documents/templates` | 404 |
| 12 | AI chat — confirmar acción | `ai-hub-chat.ts:392` (`useBetaChat.ts:1260`) | `POST /ai-hub/actions/execute` | `POST /ai-hub/chat/approvals/{approvalId}/resolve` (body `{outcome}`, key `approvalId`) | Confirmar acción en el chat = 404 siempre. **+ semántica**: `resolve` NO ejecuta, solo registra señal de aprendizaje |
| 13 | AI work-item detalle | `agent-workspace.ts:200` (`use-work-item-detail.ts`) | `GET /ai-hub/work-items/{agente}/{id}` | (no existe; solo el list) | 4+ páginas de detalle (matching, conciliación, avalúos…) siempre en `notAvailable` |
| 14 | AI métricas | `use-agent-metrics.ts:64` (`ai/page.tsx`) | `GET ${AGENT_URL}/metrics` con JWT de usuario | Existe pero `apiKeyAuth('AGENT_API_KEY')` server-to-server | 401/403 perpetuo (el propio comentario lo admite) |
| 15 | Avalúo — pago ciudadano | `avaluo.service.ts:300` (`AvaluoEstadoCard.tsx:117`) + `submitIntake` drop de `paymentUrl` | `POST /api/avaluo/{certId}/pay` → **410 Gone permanente** | pago movido a `POST /api/avaluo/intake` (devuelve `paymentUrl`) | **No hay camino funcional para que el ciudadano pague**: el CTA clickea a 410 y el front descarta el `paymentUrl` del intake. **[FIXED `b4b51f2b`]** |
| 15b | Avalúo — `WompiPayButton` | `WompiPayButton.tsx` | `POST /api/avaluo/wompi-session` | (no existe en el micro) | **4º camino de pago fantasma** — además no estaba montado (solo en docstrings). **[FIXED `b4b51f2b`: eliminado]** |

Verificado contra catálogo de paths del back (los reales existen, los llamados no) y lectura directa de `documents.service.ts` / `config.ts`.

---

## 2. 🟠 P1 — Mentiras de tipo con riesgo UX

| Feature | Dónde | Divergencia | Riesgo |
|---------|-------|-------------|--------|
| **Retención — CaseBundle** | `retencion.ts:86-91` vs `generated/agent.ts:10824-10900` | Tipos a mano esperan shapes **planos**; el real **envuelve**: `guard→{guard:{}}`, `message→{draft,blocked,blockReason}`, `plan→{plan,note}`, `profile→{profile,generatedAt,coverage,diagnostics}` (inner `unknown`) | El `try/catch→mock` lo enmascara. Cuando retención salga en vivo: `usingMock=false` pero data mal formada → UI lee `undefined` (`guard.canDraftMessage`, `message.body`, `plan.tasks`, `profile.header`). **Rompe en silencio** |
| **Payment-methods (módulo entero)** | `payment-methods.service.ts` + `types/payment-accounts.ts` | Tipado vs mock (`type:'bank'\|'wallet'`, `bankCode` enum, `isDefault`) que el back **nunca** devuelve. Prisma real: `bankName`(str), `accountType:AHORROS\|CORRIENTE`, `holderName`, `holderDocumentNumber`(null), `methodType`, `isActive`; **sin discriminante ni `isDefault`** | Type-guards `isBankAccount/isDigitalWallet` (`payment-accounts.ts:156-161`) **nunca matchean** → render de lista roto. `update(id,{isDefault:true})` (`PaymentAccountsSection.tsx:224`) manda campo que el back rechaza/dropea |
| **Avalúo — status** | `types/avaluo.ts:222-230` | Falta el campo `paid: boolean` que el micro devuelve (`status/route.ts:84`) | Quien pagó no ve confirmación (solo "procesando") |
| **Owner Portal — Digest.payload** | `owner-novedades.types.ts:91-97` vs `generated/agent.ts:12190` | Front lo tipa completo y **obligatorio**; back es `z.any()` → generado `payload?: unknown` (cero validación) | `DigestView.tsx:15,27` hace `const p=digest.payload; p.periodo…` sin guardar null → **crash** si el back manda `payload:null`, en vez de "Próximamente" |
| **Propietario.email/phone** | `types/inmobiliaria.ts:24-25` vs `schema.prisma:2242` (`String?`) | Tipado obligatorio, real nullable | `DispersionDetail.tsx:365` `propietario.phone.replace(/\D/g,'')` → **throw** si null. + ~10 sitios más blandos (`PropietarioCard/Table`, `ExtractoPropietario`, `CobroDetail`, `ConsignacionDetailSections`) |
| **Retención — decisions** | `types/retencion.ts:205` | `ownerId` real `string\|null` vs front `string`; `decisionType/reviewOutcome` real `string` libre vs unión cerrada front | Null en link/render; nuevos tipos del back caen por el `switch` sin error de compilación |

---

## 3. 🟡 P2 — Fantasmas muertos y no-publicados-aún

### Fantasmas muertos (sin caller — borrar seguro)
`subscriptions.service.ts:161 createSubscription` (`POST /subscriptions`) · `documents.service.ts:68 getById` (`GET /documents/{id}`) · `payment-methods.service.ts:52 unassign` · `mantenimientoApi.getKanban` · `renovacionesApi.getIPC` · `reportesApi.getDefinitions` · `actasApi.complete` · `propietariosApi.getConsignaciones/getCobros/getDispersiones` · `inmobiliariaConfigApi.updateUser`.

### Fantasmas mock-guarded (no pegan a prod a ciegas)
`funnel.service.ts:185` `POST /api/funnel/preaprobacion` · `funnel-applications.service.ts:111` `GET /api/agency/{id}/funnel/applications` — "viven solo en ramas locales del agente".
`estudio-pago.service.ts:68,78` `GET/POST /tenant/estudio/pago[/checkout]` — degradan a `CobroNoDisponible`; alimentan el **flujo de pago paralelo muerto** `/inquilino/aprobacion/pago` (el pago real es `/aprobacion`).

### No-publicado-aún (existe en source o roadmap; degrada honesto)
- **Agent, existe en source pero excluido del OpenAPI builder**: `GET /tenant-scoring/{runId}` (`use-estudio-run.ts:86`) — nunca va a aparecer en el snapshot; hand-typed permanente. `/arco/gate-status`, `/arco/requests[/{id}]` (registrados en `index.ts:402`, snapshot viejo).
- **Agent, roadmap declarado**: `ai-hub/briefing`, `ai-hub/agentes/{a}/autonomia|analitica`, `ai-hub/resumen`, todo `pagos/home/*` (pin a `feat/pagos-phase-43`, fail-open 404+503).
- **Mantenimiento**: `/mantenimiento/inbox|overview|tickets/{id}` — **cero rutas HTTP** en el agent (la lógica mastra de triage existe, sin registrar ruta). Mock-only honesto.
- **Retención NO es no-publicado**: sus endpoints están **implementados y en el generado** — es mock-*fallback*, no mock-*first*.

### Orphan confirmado muerto
`/aprobacion/estado/[orderId]` — los Payment Links de Wompi **no** mandan `redirect_url` (`back/.../wompi.service.ts:324`); nadie linkea. Borrar (confirmar config Wompi antes).

---

## 4. Estado de tipos generados / migración

**Causa raíz de los P0 de back**: los 8 servicios de back-core (`properties/leases/contracts/applications/inmobiliaria/landlord/visits/agenda`) están **100% hand-typed, ninguno importa `generated/back.ts`**, y **no hay `api:check` cableado para el back** (solo el agent tiene `api:gen`/`api:check`). Un diff de tipos generados hubiera cazado los path/verbo equivocados al instante.

- `generated/back.ts` + `scripts/openapi.json` + `scripts/back-openapi.json` son **nuevos y sin commitear** — scaffolding de codegen del back todavía no consumido por nadie.
- `generated/agent.ts` con el schema del Owner Portal está **sin commitear** (working tree +14.496/-6.772). En HEAD hay **cero** ops del portal.
- Owner Portal: los 5 `owner-*.types.ts` ya son field-idénticos al generado → migrar a re-export de `components['schemas'][Portal*]` una vez commiteado.
- Cobranza/Conciliación: ~23/47 hooks de cobranza + los 7 de conciliación hand-typed pese a existir el path. Sugerido: `generated/conciliacion.ts` (alias, como `cartera.ts`) antes de migrar.
- Admin/avalúos: no puede alinear — los controllers usan `@Res()` passthrough → generado `content?: never`. Migración baja prioridad.

**Mock-safety**: `config.ts:35` usa `NEXT_PUBLIC_USE_MOCK_API !== 'false'` **sin guarda `NODE_ENV==='production'`** (default = mock ON). Los hooks de **mantenimiento** heredan esto → si la env queda sin setear en prod, **sirven datos inventados**. Portar al patrón guardado de `funnel.service.ts`.

---

## 5. Memorias a corregir (verificadas, ya resueltas por el back/agent)
- `backend-handoff-avaluos-admin` — el back **ya expone** los 6 endpoints admin de avalúos (`openapi.json:15003-15128`).
- `backend-handoff-registration-profiles` — `GET /config/registration-profiles` **ya existe** (`registration-profiles.controller.ts`).
- `backend-handoff-terms-acceptance` — `POST /onboarding/session/{id}/habeas-data/accept-terms` **ya existe** en el snapshot del agent.

---

## 6. Living-docs / drift menor
- SKILL `cotizador-domain`: rutas reales bajo `/panel/inmobiliaria/ai/asegurabilidad/*`, no `/cotizador/*`.
- SKILL `cobranza-domain`: dice que `useCartaApproval` manda solo `{confirmation}`; en realidad manda `physicalSendMethod/sentToAddress` (el spec los acepta).
- `use-conciliacion-queue.ts:16`: comentario dice que no hay endpoint de summary; ya existe `/conciliacion/summary` → `deriveQueueSummary` es 2ª fuente de verdad (puede divergir).
- `ai-hub-chat.ts targetToHref`: caso `'avaluo'` cae al landing genérico en vez de `/ai/avaluos` (singular vs plural en los rosters).
- Duplicados: `PagosHomeMetrics` en `pagos-home.ts:38` **y** `pagos-home.types.ts:12`; dos `usePagosHome` (`hooks/ai/` vs `hooks/pagos-home/`).

---

## 7. Progreso de remediación

### ✅ Hecho (con tests, en `feature/mvp-1-1`)
- **`29449fde`** — 6 P0 triviales de path/verbo (visitas accept, cobros payment/send-reminder, mantenimiento select-quote, documents upload, templates path).
- **`b4b51f2b`** — Pago de avalúo del ciudadano (pay-at-intake): tipos + consumo de `paymentUrl`, `AvaluoEstadoCard` usa `paid`, eliminados los 2 caminos muertos (`startPayment`→410 y `WompiPayButton`→ruta inexistente).
- 3 memorias de handoff marcadas resueltas (avalúos-admin, registration-profiles, terms-acceptance).

### 📤 Handoff al back (esperando contrato)
- **payment-methods** — `docs/backend-handoff-payment-methods.md`: el módulo se hizo contra un mock; el back necesita definir `isDefault`, asignación inmueble→cuenta, soporte de billeteras, y `@ApiResponse` para codegen. Front sin tocar hasta cerrar el contrato.

### 📋 P0 pendientes (necesitan decisión de diseño o backend)
- **Documentos borrar** (`documents.service.ts:125`): la ruta real es `DELETE /applications/{appId}/documents/{docId}` — hay que threadear `applicationId` por los callers (`useDocuments.ts`). Refactor real, no one-line.
- **AI chat confirmar acción** (`ai-hub-chat.ts:392`): ruta real `POST /ai-hub/chat/approvals/{approvalId}/resolve`, pero **`resolve` no ejecuta** (solo aprende) — choque semántico con lo que la UI promete.
- **AI work-item detalle** (`agent-workspace.ts:200`) y **AI métricas** (`use-agent-metrics.ts:64`): fantasma/auth — dependen del back.
- **Analytics** (`inmobiliaria.service.ts:1041`): el path se arregla, pero el caller no pasa `metricId` — necesita decidir qué métrica.
- **`applications/property`** y **`mantenimiento/status`**: fantasma sin ruta real — decidir reemplazo.

### ⚠️ Huecos de producto descubiertos (no inventados)
- **Avalúo — reanudar pago**: si el ciudadano cierra la pestaña sin pagar en el intake, no hay forma de retomar el pago (`paymentUrl` no se persiste; `/pay` y `/wompi-session` muertos).
- **Avalúo — polling**: `use-avaluo-status.ts` deja de polear al llegar a `firmado`; con `!paid` la UI no auto-refresca al confirmar Wompi (recarga manual).
- **payment-methods**: `isDefault` / asignación / billeteras sin respaldo en el back (ver handoff).
</content>
