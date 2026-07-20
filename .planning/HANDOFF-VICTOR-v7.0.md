---
project: portal-inquilino
milestone: v7.0
audience: Victor (integración) + cualquiera que necesite entender qué es y cómo encenderlo
generated: 2026-07-20
branch: plan/v7.0-portal-inquilino (worktree ~/rent/mvp-portal-inquilino, off feat/leasefy-ds-redesign, NO main)
estado: 7/7 fases DONE + verificadas · 95 commits · main intacto (e5e0f825) · sin push/PR
---

# Portal del Inquilino (v7.0) — HANDOFF

> Este doc se puede leer de arriba a abajo sin contexto previo. Primero **qué es y qué resuelve**,
> después **qué hace paso por paso**, y al final el **contrato de integración** (secrets, rutas, flags).

---

## 0. En 30 segundos

- **Qué es:** la capa que le faltaba al portal `/inquilino` para que el inquilino **opere su arriendo**
  después de firmar (pagar, pedir, ver, seguir, acordar, comunicar) — no solo buscar/aplicar/firmar.
- **Cómo se hizo:** **frontend-first + aditivo** sobre el portal que ya existía. No reescribe nada; suma
  encima. Donde el backend existe → data real; donde no → UI + contrato de API + empty-state honesto
  **"Próximamente"**. **Nunca hay data falsa en un path que un inquilino real alcance.**
- **¿Tiene agentes de IA?** **No.** Es un frontend Next.js. Se apoya en el microservicio `agent` por HTTP
  para 3 decisiones legales puntuales (ver §3), pero no despliega ni contiene agentes.
- **Estado:** 7 fases, todas terminadas y verificadas, build de producción verde, 95 commits **locales**
  en rama aislada (main intacto, nada pusheado). Listo para que Victor lo tome cuando confirme el corte.
- **Para encenderlo del todo:** exponer las rutas backend/agent de §8 (hoy responden 404 → "Próximamente").

---

## 1. El problema (por qué existe esto)

**P1 — el producto cierra la venta pero no opera la relación.** Hoy el portal `/inquilino` es un **embudo
de adquisición**: buscar propiedad → aplicar → firmar contrato → pagar. **Después de firmar, el inquilino
se queda sin nada:** su única herramienta es "escribirle a alguien" si algo falla. No puede ver el estado
de sus gestiones, no puede abrir una solicitud formal, no puede ver ni aceptar un acuerdo de pago, sus
documentos del arriendo no están, y el "pago" era simulado.

**Consecuencia de negocio:** sin capa de operación post-firma → más mora, más quejas mal canalizadas, menor
renovación. El inquilino no siente que la inmobiliaria "está ahí" durante el arriendo.

**Lo que encontró la auditoría (por qué NO era greenfield):** el portal `/inquilino` **ya existía**
(~9.800 líneas, ~55-60% cableado a datos reales — backend NestJS + Supabase Auth rol `tenant`, firma
electrónica OTP real). Era un embudo de adquisición **completo pero sin capa post-firma**, con además
superficies **fake** (perfil 100% mock con datos chilenos RUT/+56, dashboard con arrays vacíos
hardcodeados, config que era puro `setTimeout` de mentira, dead code).

---

## 2. La solución (qué construimos)

**v7.0 hace tres cosas sobre el portal existente:**

- **(A) SUMA 3 pilares nuevos** que no existían: **Estado de casos**, **Solicitudes/PQRS**, **Acuerdos de pago**.
- **(B) SUBE de parcial→real 3 pilares**: **Pagos** (PSE-mock → Wompi real), **Documentos del arriendo**,
  **Comunicación** (chat atado al caso).
- **(C) LIMPIA lo fake**: perfil chileno mock → perfil Colombia real; dashboard hardcodeado → data real;
  config theater → acciones reales; borra dead code.

**La regla que gobierna todo (frontend-first honesto):** cada capacidad = UI real + un contrato de
api-client + un comportamiento honesto. Donde el backend responde → data real. Donde el backend **todavía
no existe** (rutas RLS tenant en `agent`, Wompi productivo, endpoints lease-scoped NestJS), la pantalla
muestra un empty-state **"Próximamente"** — **jamás data inventada**. Cuando la ruta backend se prenda, la
pantalla se puebla sola (sin cambiar el front).

---

## 3. ¿Tiene agentes? (respuesta directa)

**El producto NO tiene agentes de IA propios — es un frontend Next.js 14.** No orquesta LLMs ni despliega
nada autónomo.

**Sí consume el microservicio `agent` (repo `Leasefy/agent`) por HTTP, para 3 decisiones que la ley o el
diseño reservan al backend:**

| Decisión | Fase | Por qué vive en el `agent`, no en el front |
|----------|------|--------------------------------------------|
| `canContact` — gate de contacto Ley 2300/2023 (máx 1/día) | v7-05 | El tope se cuenta UNA vez, central, en el ledger del agent. El front nunca envía ni cuenta. |
| `requiresHumanReview` — aprobación de acuerdos (T-323/2024) | v7-07 | La ley reserva la aprobación a un humano. El front nunca auto-aprueba ni fija términos. |
| `cartera/payment-plans` — motor de acuerdos/cuotas | v7-07 | El agent es el dueño del registro único del acuerdo (una sola fuente de saldo). |

> Aparte: **se construyó** con el workflow GSD multi-agente (recon → plan → check → execute → verify), pero
> eso es **cómo se hizo**, no algo que se despliegue. Lo que se entrega es frontend + contratos de API.

---

## 4. Qué hace, paso por paso — las 7 fases

Cada fase resuelve un problema puntual del inquilino. **Output = lo que el inquilino ve/hace hoy;
"Próximamente" = lo que queda gated hasta que el backend lo exponga.**

### v7-01 · Fundación & Limpieza  *(BASE-01..04, PAGO-01)*
- **Problema:** dashboard con arrays vacíos hardcodeados; perfil 100% mock chileno; config de mentira; dead code.
- **Qué hace:** cablea dashboard + estado de cuenta a la data real del lease; perfil **Colombia** real
  (cédula, `+57`, COP) vía API; config con acciones reales (cambiar contraseña / exportar / borrar ARCO);
  nav expone Notificaciones/Perfil/Config; borra `TenantDashboardSidebar.tsx`.
- **Output:** el inquilino ve su **arriendo activo + próximo pago (fecha y monto) reales** y edita su perfil colombiano.
- **Próximamente:** sesiones activas (empty-state honesto — no hay endpoint).

### v7-02 · Documentos del Arriendo  *(DOCU-01..04)*
- **Problema:** los documentos se servían con URLs crudas de Supabase = **IDOR real** (cualquiera con el link accede). Faltaban paz y salvo y certificado de retención.
- **Qué hace:** documentos del arriendo (contrato firmado + recibos "comprobante interno") servidos por
  **URL firmada** (`getSignedUrl`, no cruda); consentimiento por propósito (Habeas Data Ley 1581); borrado ARCO.
- **Output:** el inquilino **descarga su contrato firmado y recibos** por URL firmada temporal.
- **Próximamente:** paz y salvo + certificado de retención 3.5% (auto-generación fiscal en backend).

### v7-03 · Estado de Casos (Hub)  *(CASO-01..03) — la que fija P1*
- **Problema:** no había un solo lugar para ver el estado de las gestiones del inquilino.
- **Qué hace:** hub **"Mis casos"** que agrega en una vista pagos + aplicaciones en proceso (real hoy) con
  estado, responsable y **timeline**; detalle por caso.
- **Output:** el inquilino ve **todos sus casos en un solo lugar** con su línea de tiempo.
- **Próximamente:** PQRS/mantenimiento (v7-06) y acuerdos (v7-07) aparecen como secciones "Próximamente" hasta que sus fases aterrizan.

### v7-04 · Pagos Reales (Wompi)  *(PAGO-02..05)*
- **Problema:** el pago de arriendo era un **PSE-mock** (simulado).
- **Qué hace:** reemplaza el mock por **checkout hosted de Wompi real**. El monto se resuelve
  **server-side** (el cliente no lo puede manipular), el secreto de integridad es **server-only**, y el
  retorno dice **"confirmando"** (nunca "pagado" del lado cliente — eso solo lo confirma el webhook).
- **Output:** el inquilino **inicia un pago real de arriendo por Wompi** (contra sandbox hoy) + ve su historial real.
- **Próximamente:** gateway Wompi productivo + webhook de reconciliación; recibo PDF; autopago tokenizado.

### v7-05 · Comunicación atada al arriendo  *(COMU-01..03)*
- **Problema:** el chat solo estaba atado a la aplicación; adjuntos y acciones eran `alert()` inertes; no había gate de contacto legal.
- **Qué hace:** ata el chat al **arriendo/caso**; adjuntos con picker real + acciones (archivar/silenciar/
  reportar) reales con toast (adiós `alert()`); y el **gate de contacto Ley 2300** (`canContact`
  default-gated, WhatsApp ruteado por el agent, **sin campo "por qué la mora"**, sin presencia falsa).
- **Output:** el inquilino **chatea in-app atado a su arriendo**.
- **Próximamente:** hilo lease-scoped real, envío real de adjuntos, y WhatsApp/recordatorios (detrás del gate del agent).

### v7-06 · Solicitudes / PQRS  *(SOLI-01..04)*
- **Problema:** no había forma de abrir ni seguir mantenimiento o una PQRS formal.
- **Qué hace:** crear una solicitud (con **fotos reales**) + PQRS tipada **reusando `pqrs.types.ts`** (mismo
  vocabulario de estados que la agencia, no forkea); **timeline con SLA de 15 días hábiles "estimado"**
  (nunca en blanco); transparencia de costo Ley 820 (dueño/inquilino/split) con aprobar-cotización.
- **Output:** el inquilino **abre una solicitud/PQRS con fotos y ve su SLA estimado** dentro del hub de casos.
- **Próximamente:** CRUD backend `/pqrs`, motor de SLA real (`slaVenceAt`), valor real de `costoResponsable`.

### v7-07 · Acuerdos de Pago  *(ACUE-01..04) — la última, la más gated*
- **Problema:** no había forma de ver/aceptar/pagar un acuerdo de pago, y la ley (T-323/2024) reserva la **aprobación** a un humano.
- **Qué hace:** ver acuerdos que **la agencia aprobó** con su plan de cuotas (mostrado **verbatim** del
  registro del agent); **aceptar firmando** (SignaturePad + OTP); **pagar una cuota** en el mismo rail Wompi
  de v7-04 (monto server-side); **solicitar un plan pre-mora** (propone, **no fija términos**). El front
  **nunca auto-aprueba** ni edita términos — la política vive en el `agent`.
- **Output:** **toda la UI + los contratos** (ver acuerdos, aceptar, pagar cuota, solicitar plan). Como las
  rutas RLS-tenant del agent aún no existen, la **data** y el settlement quedan **"Próximamente"** honesto.
- **Próximamente:** rutas tenant-scoped de `cartera/payment-plans` (listar/aceptar/pay-cuota/request) + los gates expuestos por HTTP.

---

## 5. Estado y verificación

- **7/7 fases DONE + verificadas.** Cada una tiene su `.planning/phases/v7-0N-*/v7-0N-VERIFICATION.md` con
  veredicto **GOAL ACHIEVED**, el mapeo de criterios de éxito y la evidencia (gates + build).
- **`next build` verde** en las 7 fases (el CI del repo solo corre tsc+vitest — este build es el gate real).
- **Tests:** cada fase agregó tests unitarios; hay **7 fallos pre-existentes** en suites no relacionadas
  (cotizador/asegurabilidad/risk — documentados en `deferred-items.md`), **0 nuevos** introducidos por v7.
- **95 commits** en `plan/v7.0-portal-inquilino`, **locales** (sin push). **main intacto** (`e5e0f825`).
- **27/27 requisitos** v7.0 mapeados a exactamente una fase (trazabilidad en `ROADMAP.md`).

---

## 6. Cómo verlo / correrlo

```bash
cd ~/rent/mvp-portal-inquilino     # rama plan/v7.0-portal-inquilino
pnpm install
pnpm dev                           # → localhost:3000/inquilino (login rol inquilino)
```

- **Se ve poblado con data real:** dashboard, estado de cuenta, contrato firmado, chat in-app, historial de pagos.
- **Se ve "Próximamente" (esperado, no bug):** acuerdos, PQRS/solicitudes, envío de adjuntos, autopago,
  pagar cuota — porque sus rutas backend (§8) aún no existen. **No hay data fabricada en ninguna de esas.**

---

## 7. Migraciones · Secrets · Flags

- **Migraciones:** **ninguna en el front** (es frontend puro, aditivo, 0 cambios de schema aquí). Las de
  schema + **RLS tenant-scoped** viven en `Leasefy/agent`/backend y son la precondición de §8.
- **Flags:** **ninguno.** El gating es automático: `404/403/0` → "Próximamente"; se puebla solo cuando el backend responde `200`.
- **Secrets / env:**

| Var | Tipo | Uso |
|-----|------|-----|
| `WOMPI_INTEGRITY_SECRET` | **server-only** (nunca `NEXT_PUBLIC_`) | firma del hash de integridad del checkout Wompi |
| `WOMPI_PUBLIC_KEY` | server-read (pública) | llave pública Wompi en la respuesta del checkout |
| `NEXT_PUBLIC_BACKEND_URL` | ya existe | BFF NestJS — **todos** los servicios tenant de v7 pegan acá (y la resolución server-side del monto Wompi). Es el borde por A6 (nunca `/api/agency/`). |
| `SUPABASE_URL` / `_ANON_KEY` / `_SERVICE_ROLE_KEY` | ya existen | auth rol `tenant` |

> En producción, `WOMPI_*` deben apuntar a llaves productivas de Wompi (hoy el checkout **inicia** contra sandbox).

---

## 8. Cross-repo — rutas que backend/`agent` deben exponer (lo que desbloquea cada "Próximamente")

Todo **tenant-scoped por JWT (RLS)** y forwardeado por el BFF (`NEXT_PUBLIC_BACKEND_URL`). Sin esto la UI
funciona igual pero en "Próximamente". Orden sugerido = orden de valor.

| Fase | Método + ruta (que el front ya llama) | Devuelve / hace | Desbloquea |
|------|----------------------------------------|-----------------|------------|
| v7-02 | `GET /documents/:id/signed-url` | URL firmada por doc | Cierra el **IDOR** de `/documents` |
| v7-02 | `GET /lease-documents/paz-y-salvo` · `.../cert-retencion` · `.../:id/status` | paz y salvo + cert. retención 3.5% | Esos 2 docs dejan de ser "Próximamente" |
| v7-04 | `GET /leases/:id/payment-info` | saldo/monto del arriendo (lo lee la ruta Wompi server-side) | Fuente del monto anti-tamper |
| v7-04 | `GET /tenant-payments/requests/:id/receipt-url` | URL del comprobante (PDF firmado) | Botón "Descargar comprobante" |
| v7-04 | `GET/POST/DELETE /tenant-payments/autopago[/:leaseId]` | autopago tokenizado | Sección Autopago |
| v7-04 | **Wompi productivo + webhook de reconciliación de arriendo** | flip de estado post-pago | Settlement real (hoy return "confirmando") |
| v7-05 | `GET /leases/:id/chat` · `POST /leases/:id/chat/messages` | hilo de chat **lease-scoped** | Chat por-arriendo real |
| v7-05 | `PATCH /messages/conversations/:id/{archive,mute,report}` · `GET /messages/unread-count` | acciones + badge | Archivar/silenciar/reportar reales |
| v7-05 | upload de adjuntos de chat + campo `attachment` en `BackendChatMessage` (retrieval por signed-url) | envío real de adjuntos | Adjuntar en el chat |
| v7-05 | `canContact` (ledger Ley 2300, **owner = agent**, expuesto por HTTP vía BFF) | `{ allowed, reason }` | WhatsApp/recordatorios ruteados por el agent |
| v7-06 | `POST /pqrs` (multipart, fotos) · `GET /pqrs/mine` · `POST /pqrs/:id/aprobar-cotizacion` | CRUD PQRS/mantenimiento tenant-scoped | Crear/seguir solicitudes reales |
| v7-06 | motor de triage: `slaVenceAt` real + valor de `costoResponsable` (Ley 820) | SLA autoritativo + responsabilidad de costo | Reemplaza el SLA "estimado" + la card de costo |
| v7-07 | `GET /cartera/payment-plans/mine` · `GET /cartera/payment-plans/:id` | acuerdos aprobados + cuotas (shape **ya existe** en el schema del agent) | Ver acuerdos |
| v7-07 | `POST /cartera/payment-plans/:id/accept` (firma+OTP) | aceptación firmada | Aceptar acuerdo firmando |
| v7-07 | `GET /cartera/payment-plans/:id/payment-url` · `.../installments/:n/payment-url` | `paymentUrl` de la cuota | Pagar cuota |
| v7-07 | `POST /cartera/payment-plans/request` | alta de solicitud de plan pre-mora | Solicitar plan pre-mora |
| v7-07 | gates `requiresHumanReview()` / `canContact()` por HTTP | decisión de política server-side | T-323 (el front nunca decide política) |

**Invariantes que el backend DEBE preservar (el front las asume):**
- **RLS tenant estricta** — cada ruta responde SOLO los recursos del inquirente (el front resuelve own-only con `.find`, nunca fetch-by-id).
- **A5 / T-323** — la aprobación de acuerdos y la política viven en el `agent`; el front solo ve/acepta/paga/propone.
- **Anti-tamper Wompi** — el monto lo resuelve el server desde `payment-info` / `installments[n].amountCop`; la ruta del front **nunca** lee `body.amount`; el webhook es la única fuente del flip a "pagado".
- **PQRS** — el backend fuerza `solicitanteTipo:'inquilino'` desde el JWT; el vocabulario de estados es el mismo que el lado agencia (el front reusa `pqrs.types.ts`, no forkea).

---

## 9. Mapa de archivos (dónde está cada cosa)

- **Rutas (páginas):** `src/app/inquilino/**` — 22 rutas (dashboard, arriendo, pagos, documentos, mensajes,
  casos + `[caseId]`, **solicitudes**, **acuerdos** + `[id]`, configuración, perfil, notificaciones…).
- **Rutas server-only (Wompi):** `src/app/api/inquilino/pagos/wompi-session/route.ts` · `.../acuerdos/wompi-session/route.ts`.
- **Componentes tenant:** `src/components/tenant/*` (AcuerdoAcceptPanel, CuotaPlanTable, NuevaSolicitudModal,
  SolicitarPlanPagoModal, CostoResponsabilidadCard, PayRentModal, AutopagoSection…) + `src/components/messages/MessagesWidget.tsx`.
- **Servicios / hooks / tipos (contratos api-client):** `src/lib/api/{tenant-acuerdos,pqrs,messages,agent-contact,lease-documents,documents,autopago,tenant-payment-requests}.*` · `src/lib/hooks/use-tenant-{cases,pqrs,acuerdos}.ts` · `src/lib/payments/wompi-*.ts` · `src/lib/date/business-days.ts` · `src/lib/constants/response-sla.ts`.

---

## 10. Smoke (antes de marcar INTEGRADA)

- [ ] `pnpm install` + **`pnpm build`** verde (CI del repo NO corre `next build`).
- [ ] `WOMPI_INTEGRITY_SECRET` / `WOMPI_PUBLIC_KEY` seteadas server-side (grep: **0** `NEXT_PUBLIC_WOMPI` en `src`).
- [ ] Login inquilino → `/inquilino`: dashboard, estado de cuenta, contrato firmado, chat in-app, historial **con data real**.
- [ ] Superficies gated (acuerdos, solicitudes, adjuntos, autopago, pagar cuota) muestran **"Próximamente"** — **no** data fabricada.
- [ ] Checkout de arriendo y de cuota inician contra Wompi; el return dice **"confirmando"** (nunca "pagado" del lado cliente).
- [ ] Sin regresión en el panel de la inmobiliaria ni en el flujo de firma de contratos (el OTP se generalizó de forma aditiva).

---

## 11. Referencias

- **Por fase (veredicto + evidencia + boundaries):** `.planning/phases/v7-0N-*/v7-0N-VERIFICATION.md`.
- **Roadmap + trazabilidad 27/27 REQ:** `.planning/ROADMAP.md`.
- **Contexto/gotchas de la construcción:** `.planning/SESSION-RESUME-v7-2026-07-19.md`.

> **La línea de corte la deciden Nico/Victor.** Este doc es el ledger del milestone; no decide el tag ni
> mete PRs en `v1.md` (esa versión ABIERTA rastrea otra rama). Cuando Victor confirme, se apila en la versión
> ABIERTA del tren y se corta el `git tag`.
