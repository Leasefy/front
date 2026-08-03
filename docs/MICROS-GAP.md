# Brecha de integración front ↔ micros (back · agent · avaluo)

> Qué expone hoy cada micro que el front NO integró, qué CAMBIÓ (puede romper en silencio) y
> qué está ROTO (el front lo llama y no existe). Verificado contra código + git el 2026-06-23.
> Lectura previa: `INTEGRATION-MAP.md` (cómo consume el front hoy).

## TL;DR por micro

| Micro | Roto (urgente) | Cambió (revisar) | Nuevo (oportunidad) | Estado |
| --- | --- | --- | --- | --- |
| **back** | nada real | 6 contratos | decenas de endpoints | sano, en producción |
| **agent** | bloque AI-Hub + pagos/home | 4 contratos | ~50 endpoints (Fases 30-41) | parcial: UI sobre specs no implementadas |
| **avaluo** | `GET /:id/status` | intake + photo-presign | 4 endpoints de flujo + internos | **stub: sin DB, todo 503** |

---

## 1. back (core-api) — sano, pero revisá 6 contratos

No hay endpoints que el front llame y no existan. Pero hay cambios que rompen en silencio:

### CAMBIÓ — revisar (puede romper sin error visible)
- **`GET /subscription-plans`**: el enum de tiers se renombró `FREE→STARTER`, `BUSINESS→FLEX`; el query `planType` ahora acepta `TENANT/LANDLORD/AGENCY`. Si el front filtra por los nombres viejos, falla.
- **`GET /scoring/:applicationId`**: ahora es **tenant-only**. Un landlord recibe **403** — su acceso se movió a `GET /evaluations/:id/result` (commit `7ee21b6`).
- **`GET /contracts/:id/pdf`**: ahora exige `@RequirePermission` de agencia. Verificar que el front mande los headers correctos.
- **`GET /legal/consent-text`**: ahora versionado, espera query params `type`, `lang`, `version`.
- **`PATCH /visits/:id/cancel`**: espera body `{ reason }`.
- **Export de datos**: el path real es `POST /users/me/data-export` (no `/settings/export`).

### NUEVO — no integrado (oportunidades)
Superficie nueva sin consumir, agrupada: en **users** (`/users/me/documents`, `/preferences` GET+PATCH, `/profile`, `/fcm-token`, `/onboarding/status`, `/notification-settings`, `/team`), **visits** (`/visits/:id/reschedule`), **documents** (`/documents/upload` que resuelve el applicationId solo), más endpoints adicionales en evaluations, contracts, leases, inmobiliaria, dashboard. Decenas en total — el detalle completo está en el análisis del subagente.

---

## 2. agent (agents-worker) — UI construida sobre specs no implementadas

⚠️ **Hallazgo principal**: el front tiene pantallas (AI Hub chat, Pagos home) que llaman endpoints
que NO existen en el agent. Funcionan hoy porque caen al **mock fallback** (recordá: el mock se
activa por ausencia de `NEXT_PUBLIC_AGENT_URL`). Son specs futuras de `.planning/AGENT-WORKSPACE-F0.md`.

### ROTO — el front lo llama y NO existe
- **Todo `/api/agency/:id/ai-hub/*` excepto `/ai-hub/landing`**: `chat`, `chat/stream` (SSE), `briefing`, `actions/execute`, `resumen`, `agentes/:a/overview|autonomia|analitica`, `work-items/:a/:id`. Lo único real es `GET /ai-hub/landing` (KPIs cross-agent, Fase 37-11).
- **`/api/agency/:id/pagos/home/*`** (`metrics`, `attention`, `payment/:id`, `owner-inbox`): no existen. Datos reales de pagos están en `/cobranza/pagos` y en el módulo `/ap/*`.
- **`GET /api/agency/:id/cotizador/quote`** (lista paginada): no existe. Usar `GET /cotizador/overview` (embebe las últimas 10).
- **`GET /api/agency/:id/members/me/preferences`**: solo existe `PATCH`, no `GET`. Leer preferencias con GET da 404/405.

### CAMBIÓ — revisar
- **`/cobranza/calls/:id/transcript`**: ahora acepta `?redacted=true` (Fase 38) para redactar PII.
- **`policy` vs `policies`**: el front usa `/api/agency/:id/policy` (singular). Existe ahora `/policies` (plural, versionado) con `versions`, `rollback/:v`, `impact`. Comportamientos distintos.
- **`audit-log`**: `/cobranza/audit-log` (agencia-wide, Fase 34) es distinto de `/debtors/:id/audit` (sub-tab de deudor). No confundirlos.
- **Cotizador auth**: el front browser debe usar `/api/agency/:id/cotizador/*` con **Supabase JWT**, NO el B2B `/api/cotizador/*` con `AGENT_API_KEY`.

### NUEVO — no integrado (real y disponible, ~50 endpoints, Fases 30-41)
Prioridad para el front:
1. **Analítica de cobranza** (6): `/cobranza/analytics/{agency-gate,recovery-rate,top-objections,cadence,cost-per-peso,top-scripts}`.
2. **Cotizador completo** (~20): `aseguradoras/registry`, `aseguradoras/:carrier` (+ recent-quotes, sla, override), `insights/*` (4), `costos/{summary,series}`, `ask-why` + `ask-why/usage`, `quote/:id/verdict.pdf`.
3. **Conciliación** (Fase 41): `/conciliacion/{ingest,queue,queue/:id/confirm|reject|reverse}`.
4. **AP / cuentas por pagar** (Fase 40): más allá de `/ap/bills` → `vendors`, `aging`, `matrix`, `payment-runs`, `cost-centers`.
5. **ARCO admin** (5, Fase 36): `/arco/{gate-status,requests,requests/:id/triage|resolve|reject}`.
6. **Templates de scripts** (4, Fase 36): `/cobranza/templates` (+ draft, publish, wa-status).
7. **Escalaciones** (5, Fase 34): `/cobranza/escalations` (+ claim, assign, resolve).
8. **Compliance** (4, Fase 34): `/cobranza/compliance/{overview,ley-2300/attempts,opt-out}`.
9. **Daily-report ampliado**: `today`, `history`(+csv), `thresholds`, `subscription`.

---

## 3. avaluo — flujo roto + micro en stub (sin DB)

⚠️ **El micro corre en stub mode**: `AVALUO_DATABASE_URL` no está provisionada, hay 7 migraciones
sin aplicar, y todo handler con DB devuelve **503**. La integración real no funciona hasta provisionar la DB.

### ROTO — el front lo llama y NUNCA existió
- **`GET /api/avaluo/:id/status`**: no hay route handler, no hay spec, no hay commit. El front está usando su **mock fallback** (`{status:'en_revisión'}`). Si se necesita polling de estado real, hay que negociar el endpoint con el micro como feature nueva.

### CAMBIÓ — rompe el flujo de fotos y pago
- **`POST /api/avaluo/intake`**: la respuesta 201 ahora es `{ id, token }` (antes `{ id }`). Ese `token` es un **capability token** indispensable para photo-presign, certificate, memoria y pay. Si el front lo descarta, todo lo posterior da 403/404. El body además acepta un campo nuevo `finalidad` (valores regulados → 422).
- **`POST /api/avaluo/photo-presign`**: el body ahora exige `token` (el capability token) y `sizeBytes`. Sin `token` → **403**.

### NUEVO — no integrado (flujo completo de cert + pago)
Todos requieren el capability token del intake. Ojo: en estos, `[id]` es el **certificateId** (del workflow), NO el submissionId:
- `POST /api/avaluo/[id]/photos` — adjunta los photoKeys subidos a S3 (sin esto, las fotos se pierden).
- `POST /api/avaluo/[id]/pay` — genera el link de pago Wompi (cert en estado `firmado`).
- `GET /api/avaluo/[id]/certificate?token=` — PDF (preview con marca de agua pre-pago; limpio post-pago).
- `GET /api/avaluo/[id]/memoria?token=` — memoria de cálculo JSON (post-pago).
- Internos (service token, para backoffice, no front público): `list/pending-review`, `list/all`, `list/by-identity`, `[id]/signoff`.

### Riesgo de calidad de dato
El **bug C1 (inputHash no-inyectivo** en `canonicalize.ts`: no incluye `areaM2`/`geoDistanceM`/`features` de los comparables) **no aparece resuelto en git**. Si la DB se provisiona con esto activo, dos propiedades distintas pueden compartir snapshot y recibir el mismo avalúo. No mostrar números al usuario final hasta confirmar el fix.

---

## Plan de acción sugerido para el front

1. **Apagar incendios (ROTO)**: decidir qué hacer con AI-Hub chat y Pagos home del agent (¿quitar la UI, dejarla en mock explícito, o pedir los endpoints?), y con `avaluo/:id/status`.
2. **Blindar (CAMBIÓ)**: ajustar subscription-plans (enum), scoring landlord→evaluations, y el capability token de avaluo intake/photo-presign. Estos rompen en silencio.
3. **Capitalizar (NUEVO)**: priorizar el cotizador y la analítica de cobranza del agent, que ya están listos y son features grandes sin UI.
