# Gap Analysis — Portal del Inquilino (milestone candidato v7.0)

> Síntesis de 2 auditorías del portal existente + 4 research (FEATURES, PITFALLS, ARCHITECTURE, STACK).
> Fecha: 2026-07-16. Fuente detallada: `AUDIT-A.md`, `AUDIT-B.md`, `FEATURES.md`, `PITFALLS.md`, `ARCHITECTURE.md`, `STACK.md` (esta carpeta).

## Problema (P1)

Después de firmar, el inquilino **solo tiene a quién escribir si hay un problema**. El producto está construido para **cerrar** (funnel de adquisición: buscar → aplicar → firmar → pagar), no para **operar la relación**. Consecuencia: mora, quejas, menor renovación, mala reputación. Canal actual: WhatsApp + llamadas sueltas.

## Veredicto en una frase

El portal `/inquilino` **ya existe y está ~55-60% cableado a datos reales** (backend NestJS vía `NEXT_PUBLIC_BACKEND_URL` + Supabase Auth rol `tenant`, no mock). Es un **funnel de adquisición completo con firma electrónica OTP real**, pero **sin capa de operación post-firma**. El milestone NO es "construir el portal" — es **sumar la capa de operar la relación + subir de parcial→real 3 pilares + limpiar superficies fake**.

## 1. Estado actual por pilar (auditoría)

| Pilar | Estado | Qué hay hoy | Qué le falta |
|---|---|---|---|
| **1 · Pagos** | 🟡 Parcial | Estado de cuenta + historial reales | Pasarela es **MOCK** (`/pse-mock/process`); sin Wompi/Bold real, sin comprobante PDF, solo PSE, sin autopago |
| **2 · Solicitudes/PQRS** | 🔴 Falta | — (agency-side `inmobiliaria/pqrs` + `agent` sí) | Superficie tenant: crear ticket con fotos, seguir estado, tipos PQRS formales |
| **3 · Documentos** | 🟡 Parcial | Docs de la *aplicación* (cédula, ingresos) vía API real | Docs del *arriendo*: contrato, paz y salvo, recibos, póliza, cert. retención |
| **4 · Estado de casos** | 🔴 Falta | — | "Mis casos" unificado (PQRS + mantenimiento + acuerdos + responsable) |
| **5 · Acuerdos de pago** | 🔴 Falta | — (motor en `agent`: `computeOffer`, T-323) | Ver/aceptar/pagar acuerdo aprobado por agencia, cuotas |
| **6 · Comunicación** | 🟡 Parcial | Chat real + polling, puente inquilino↔agencia (`MessagesWidget`) | Está scoped a `applicationId` (no al arriendo/caso); adjuntar/emoji inertes; archivar/reportar = `alert()` |

**Infra alrededor:** 🟢 Arriendo/lease (real, la página más fuerte) · 🟢 Notificaciones (real) · 🟢 Auth (Supabase, rol tenant) · 🟡 **Dashboard home hardcodea vacío** (`activeLeases=[]`, `nextPayment=null`, `TODO(Backend)`) · 🔴 **Perfil 100% mock** (datos chilenos: RUT, `+56`) · 🟡 **Config** mayormente `setTimeout` theater · 🗑️ `TenantDashboardSidebar.tsx` es dead code (layout usa `PlanSidebar`); nav omite Notificaciones/Perfil/Config.

## 2. Objetivo por pilar (FEATURES — qué debe tener)

| Pilar | Table stakes | Diferenciador |
|---|---|---|
| **1 · Pagos** | Multi-rail (PSE+tarjeta+Nequi vía Wompi/Bold), historial/recibos | Autopago/domiciliación (Wompi tokenizado) + cert. retención en la fuente auto |
| **2 · PQRS** | Enviar ticket con fotos, seguir estado, tipos PQRS formales | Transparencia de responsabilidad de costo (Ley 820: dueño/inquilino/split) + aprobación de cotización antes de reparaciones a cargo del inquilino |
| **3 · Documentos** | Acceso a contrato/recibos | Cert. retención en la fuente auto (3.5%, deadline 31-mar) + paz y salvo self-service |
| **4 · Estado de casos** | "Mis casos" que agrega PQRS + mantenimiento + acuerdos con responsable | **Push/WhatsApp proactivo al cambiar estado** ← fix directo de P1 |
| **5 · Acuerdos** | Ver/aceptar/pagar acuerdo aprobado por agencia con plan de cuotas; **aceptación explícita** (nunca auto-aprobar) | "Pedir un plan" iniciado por inquilino pre-mora, alimentando el pipeline de aprobación existente |
| **6 · Comunicación** | Mensajería in-app atada al caso, WhatsApp como canal de primera | Inbox unificado WhatsApp+in-app (diferir a v2, alto costo) |

## 3. Restricciones legales Colombia (PITFALLS — guardrails NO negociables)

1. **PQRS: reusar `pqrs.types.ts`** (v6-06), no forkear — o los tickets divergen de agencia.
2. **Acuerdos: la UI no decide lo que solo un humano puede** (T-323/2024 + Circular SIC 001/2025) — condonación/planes off-policy/escalada S5 pasan por el gate del `agent`, nunca client-side.
3. **Mensajes del portal no pueden saltarse el gate de frecuencia de contacto** (Ley 2300/2023 art. 3: máx 1/día, 1 canal/semana) — recordatorios salen del ledger `canContact()` del `agent`, no del frontend.
4. **Nada de amenazar reporte a Datacrédito** sin el gate de 3 partes (Ley 1266/2008 + 2157/2021) — default: omitir.
5. **No preguntar "por qué" la mora** (Ley 2300/2023 art. 7) — sin campo `motivo de mora` en ningún form.
6. **SLA PQRS 15 días hábiles** (Ley 1480/2011 art. 58) — `slaVenceAt` debe computarse/mostrarse honesto, no en blanco.
7. **Docs sensibles con disciplina Habeas Data** (Ley 1581/2012): consentimiento por propósito, acción ARCO/borrar, logging de acceso, sin URLs predecibles (IDOR).
8. **Sin dark patterns / guilt-tripping en mora**; "saldo"/"acuerdo" debe trazar a la única fuente de verdad (`tenant-payment-requests.types.ts`), no computar su propio número.

Anti-features (no construir): inquilino auto-fija descuentos/términos, auto-cerrar PQRS, inquilino asigna proveedores, mensajería que salta a la agencia, crypto/BNPL para arriendo.

## 4. Cómo se construye (ARCHITECTURE + STACK)

- **Auth inquilino: nada nuevo.** Misma sesión Supabase (`role: tenant`), y el **mismo JWT sirve para NestJS y el microservicio `agent`**. Hueco: `agent` no tiene rutas/RLS tenant-scoped todavía (solo agency).
- **Cero dependencias npm nuevas.** Todo reusa patrones existentes:
  - Pagos/Acuerdos → patrón Wompi de avalúos (`WompiPayButton` + ruta server-side hash de integridad). El `agent` ya expone `cartera/payment-plans` con `paymentUrl` (wompi|bold|stub).
  - Casos/PQRS/mensajes → `useVisibilityPolling` (sin SSE/WebSocket); Supabase Realtime `postgres_changes` cuando exista RLS tenant.
  - Documentos → iframe/img nativo + `useSignedPdfUrl` (signed/expiring URLs = contrato backend).
  - Firma de acuerdos → reusar `SignaturePad`/`SignatureForm` (`react-signature-canvas` ya instalado); ajuste: generalizar `OTPVerification` (hoy hardcodeado a `contractsApi`).
- **Contrato por pilar:** Documentos = extender `documents.service.ts` (lease-scoped) · Estado de casos = **pura composición frontend** de servicios existentes (apps+leases+contracts), sin backend nuevo · Pagos = extender leases/tenant-payment-requests + **nueva** ruta `POST /api/inquilino/pagos/wompi-session` (modelada 1:1 en avalúo) · Comunicación = extender `messages.service.ts` a lease-scoped · PQRS = servicio tenant reusando `pqrs.types.ts` (tenant-filtered) · Acuerdos = **types-only** por ahora (real requiere ruta+RLS tenant en `agent`).
- **Orden de construcción (dependencias):** (1) Documentos → (2) **Estado de casos** (hub del que cuelgan los demás) → (3) Pagos (Wompi real) → (4) Comunicación → (5) PQRS (contract-first, backend puede ir atrás) → (6) **Acuerdos AL FINAL** (dep dura cross-repo: ruta+RLS tenant en `agent`; hasta entonces "Próximamente" honesto).

## 5. El trabajo, en 3 buckets

- **A) Sumar los 3 pilares faltantes (capa de operación post-firma):** Estado de casos, Solicitudes/PQRS, Acuerdos de pago.
- **B) Subir parcial→real:** Pagos (Wompi real + comprobantes + autopago), Documentos (docs del arriendo + certs), Comunicación (atada al arriendo/caso).
- **C) Limpiar lo fake:** Dashboard (data real), Perfil (API real, quitar datos chilenos), Config (quitar theater), borrar dead code.

## 6. Dependencias externas (bloquean "data real", no la UI frontend-first)

- **Pasarela real:** habilitar Wompi/Bold productivo para arriendo (hoy PSE-mock). Patrón ya existe (avalúos).
- **`agent` tenant-scoped:** rutas + RLS tenant para acuerdos de pago (pilar 5) y push de estado de casos.
- **Backend NestJS:** endpoints lease-scoped para documentos/mensajes; `slaVenceAt` PQRS; perfil get/update.

Consistente con v6.0: **frontend-first** — la UI + contrato api-client + empty-states honestos entran ya; la data real se cablea detrás. Aditivo, sin romper el CRM ni el portal existente.
