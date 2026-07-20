# Handoff a integración — v7.0 Portal del Inquilino (front · rent/mvp)

**Rama:** `plan/v7.0-portal-inquilino` (off `feat/leasefy-ds-redesign`, **NO** main) · worktree `~/rent/mvp-portal-inquilino`
**Commits:** 94 (init `cc5c7f47` → tope `80be15b8`) · **main intacto** (`e5e0f825`) · **nada pusheado**
**Estado:** las 7 fases DONE + verificadas (cada una con su `VERIFICATION.md`). Build `next build` verde en todas.
**Emparejado con:** `Leasefy/agent` — **pendiente** (este front va por delante; ver §Cross-repo).

> **La línea de corte la deciden Nico/Victor.** Este doc NO decide el tag ni mete PRs en `v1.md`
> (esa versión ABIERTA rastrea el redesign, otra rama). Cuando Victor confirme que toma v7.0, se
> apila en la versión ABIERTA del tren (o se crea la que corresponda) y se corta el tag. Este
> archivo es el **ledger del milestone** para ese momento.

---

## TL;DR para Victor

- Es **frontend-first + aditivo**: sube 3 pilares parcial→real (Pagos, Documentos, Comunicación),
  suma 3 (Casos, PQRS, Acuerdos) y limpia lo fake. **No rompe** el portal `/inquilino` ni el CRM.
- **Todo el UI + los contratos api-client + el honest-degrade ya están.** Donde el backend no existe,
  la pantalla muestra un empty-state **"Próximamente"** — **no hay data falsa en ningún path que un
  inquilino real alcance**. Habilitar la data real = exponer las rutas de §Cross-repo (no tocar el front).
- **No hay migraciones de front, no hay flags que prender.** El gating es automático: `404/403/0` →
  "Próximamente". Cuando la ruta responde, la pantalla se puebla sola.
- **Sí hay 2 secrets nuevos server-only** para el checkout Wompi (§Secrets).

---

## Migraciones

**Ninguna en el front** (es frontend puro, aditivo — 0 cambios de schema en este repo).
Las migraciones reales (Postgres/Prisma + **RLS tenant-scoped**) viven en `Leasefy/agent` / el backend
NestJS y son la precondición de §Cross-repo. No hay nada que correr en `rent/mvp`.

---

## Secrets / env (setear antes de deploy)

**Server-only (NUNCA `NEXT_PUBLIC_`)** — los leen las 2 rutas `runtime='nodejs'` de checkout:

| Var | Uso | Nota |
|-----|-----|------|
| `WOMPI_INTEGRITY_SECRET` | firma del hash de integridad del checkout (SHA-256) | **secreto** — jamás al bundle cliente; sin `NEXT_PUBLIC_` |
| `WOMPI_PUBLIC_KEY` | llave pública Wompi en la respuesta del checkout | pública, pero se lee server-side |

**Ya existentes (reutilizadas, no nuevas):**

| Var | Uso |
|-----|-----|
| `NEXT_PUBLIC_BACKEND_URL` | BFF NestJS — **todos** los servicios tenant de v7 pegan acá (incl. resolución server-side del monto Wompi). Es el borde por A6 (nunca `/api/agency/`). |
| `NEXT_PUBLIC_AGENT_URL` | microservicio `agent` (lo usa el lado agencia; los servicios tenant de v7 **no** lo tocan directo) |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | auth rol `tenant` (compartido) |

> El front productivo debe apuntar `WOMPI_*` a llaves productivas de Wompi; hoy el checkout **inicia**
> contra el sandbox. El settlement real necesita el gateway productivo + webhook (§Cross-repo).

---

## Flags

**Ninguno.** v7.0 no introduce feature flags. Las superficies gated NO se prenden con un flag: el
`honest-degrade` las abre solas cuando el backend responde `200` en vez de `404/403/0`.

---

## Cross-repo — rutas que `agent` / NestJS deben exponer (lo que desbloquea cada "Próximamente")

Todo **tenant-scoped por JWT (RLS)** y forwardeado por el BFF (`NEXT_PUBLIC_BACKEND_URL`). Sin esto, la
UI funciona igual pero en "Próximamente". Orden sugerido = orden de valor.

| Fase | Método + ruta (esperada por el front) | Devuelve / hace | Desbloquea |
|------|----------------------------------------|-----------------|------------|
| **v7-02** | `GET /documents/:id/signed-url` | URL firmada (no cruda) por doc | Cierra el **IDOR** de `/documents` (hoy servía URLs crudas) |
| v7-02 | `GET /lease-documents/paz-y-salvo` · `GET /lease-documents/cert-retencion` · `GET /lease-documents/:id/status` | paz y salvo + cert. retención 3.5% (auto-gen fiscal) | Esos 2 docs dejan de ser "Próximamente" |
| **v7-04** | `GET /leases/:id/payment-info` | saldo/monto del arriendo (lo consume la ruta Wompi server-side) | Ya real hoy si existe; es la fuente del monto anti-tamper |
| v7-04 | `GET /tenant-payments/requests/:id/receipt-url` | URL del comprobante interno (PDF firmado) | Botón "Descargar comprobante" |
| v7-04 | `GET/POST/DELETE /tenant-payments/autopago[/:leaseId]` | autopago tokenizado | Sección Autopago |
| v7-04 | **Wompi productivo + webhook de reconciliación de arriendo** | flip de estado `TenantPaymentRequest` post-pago | Settlement real (hoy: return "confirmando") |
| **v7-05** | `GET /leases/:id/chat` · `POST /leases/:id/chat/messages` | hilo de chat **lease-scoped** | Chat por-arriendo (hoy cae al app-scoped + nota "Próximamente") |
| v7-05 | `PATCH /messages/conversations/:id/{archive,mute,report}` · `GET /messages/unread-count` | acciones de conversación + badge | Archivar/silenciar/reportar reales |
| v7-05 | upload de adjuntos de chat + campo `attachment` en `BackendChatMessage` (+ retrieval por `signed-url`) | envío real de adjuntos | Adjuntar en el chat |
| v7-05 | `canContact` (ledger de contacto Ley 2300, **owner = agent**, expuesto por HTTP vía BFF) | `{ allowed, reason }` — gate máx 1/día | WhatsApp/recordatorios ruteados por el agent |
| **v7-06** | `POST /pqrs` (multipart, fotos) · `GET /pqrs/mine` · `POST /pqrs/:id/aprobar-cotizacion` | CRUD PQRS/mantenimiento tenant-scoped | Crear/seguir solicitudes reales |
| v7-06 | motor de triage: `slaVenceAt` real + valor de `costoResponsable` (Ley 820) | SLA autoritativo + responsabilidad de costo | Reemplaza el SLA "estimado" + la card de costo |
| **v7-07** | `GET /cartera/payment-plans/mine` · `GET /cartera/payment-plans/:id` | acuerdos aprobados + plan de cuotas (el shape **ya existe** en el schema del agent) | Ver acuerdos (hoy `[]`→"Próximamente") |
| v7-07 | `POST /cartera/payment-plans/:id/accept` (firma+OTP) | aceptación firmada | Aceptar acuerdo firmando |
| v7-07 | `GET /cartera/payment-plans/:id/payment-url` · `.../installments/:n/payment-url` | `paymentUrl` de la cuota (lo consume la ruta Wompi de cuota) | Pagar cuota |
| v7-07 | `POST /cartera/payment-plans/request` | alta de solicitud de plan pre-mora (pipeline agencia) | Solicitar plan pre-mora |
| v7-07 | gates `requiresHumanReview()` / `canContact()` expuestos por HTTP | decisión de política **server-side** | Necesario para T-323 (el front nunca decide política) |

**Invariantes que el backend debe preservar (el front las asume):**
- **RLS tenant estricta** — cada ruta responde SOLO los recursos del inquirente (el front resuelve
  own-only con `.find`, nunca `fetch-by-id`; no confíes en el cliente para el scope).
- **A5 / T-323** — la **aprobación de acuerdos y la política viven en el `agent`** (`requiresHumanReview`).
  El front nunca aprueba ni fija términos; solo ve/acepta/paga/propone.
- **Anti-tamper Wompi** — el monto lo resuelve el server desde `payment-info` / `installments[n].amountCop`;
  la ruta del front **nunca** lee `body.amount`. Mantené el webhook como única fuente del flip a "pagado".
- **PQRS** — el backend fuerza `solicitanteTipo:'inquilino'` desde el JWT; el vocabulario de estados es
  el **mismo** que el lado agencia (el front reusa `pqrs.types.ts`, no forkea).

---

## Smoke (antes de marcar INTEGRADA)

- [ ] `pnpm install` + `pnpm build` verde (CI del repo solo corre tsc+vitest — **corré `next build`**).
- [ ] `WOMPI_INTEGRITY_SECRET` / `WOMPI_PUBLIC_KEY` seteadas server-side (grep: **0** `NEXT_PUBLIC_WOMPI` en `src`).
- [ ] Login inquilino → `/inquilino`: dashboard, estado de cuenta, contrato firmado, chat in-app, historial de pagos **con data real**.
- [ ] Superficies gated (`/inquilino/acuerdos`, `/solicitudes`, adjuntos de chat, autopago, pagar cuota)
      muestran **"Próximamente"** honesto mientras las rutas de §Cross-repo no estén productivas — **no** data fabricada.
- [ ] Checkout de arriendo y de cuota: inician contra Wompi; el return dice **"confirmando"** (nunca "pagado" del lado cliente).
- [ ] Sin regresión en el panel de la inmobiliaria ni en el flujo de firma de contratos (el OTP se generalizó de forma aditiva).

---

## Referencias

- Por fase: `.planning/phases/v7-0N-*/v7-0N-VERIFICATION.md` (veredicto + evidencia + boundaries "Próximamente").
- Contexto/gotchas de la sesión: `.planning/SESSION-RESUME-v7-2026-07-19.md`.
- Roadmap + trazabilidad 27/27 REQ: `.planning/ROADMAP.md`.
