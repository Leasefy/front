# Roadmap: Leasefy

## Overview

Leasefy evoluciona de un frontend con mock data a una plataforma AI-agent donde propietarios e inmobiliarias hablan con un orquestador que despacha agentes especializados. **v7.0 — Portal del Inquilino** cierra P1: hoy el portal `/inquilino` es un **funnel de adquisición** (buscar → aplicar → firmar → pagar) **sin capa de operación post-firma**; después de firmar, el inquilino solo tiene a quién escribir si hay un problema. v7.0 **suma** la capa de operar la relación (Estado de casos, Solicitudes/PQRS, Acuerdos de pago), **sube parcial→real** 3 pilares (Pagos Wompi, Documentos del arriendo, Comunicación atada al caso) y **limpia** superficies fake (dashboard/perfil/config). Frontend-first + aditivo: UI + contrato de api-client + empty-states honestos ahora; la data real (Wompi productivo, RLS tenant en `agent`, endpoints lease-scoped NestJS) se cablea detrás.

## Milestones

- ✅ **v1.0 Frontend MVP** — Phases 1-11 (shipped 2026-01-29)
- ✅ **v2.0 Design System & QA** — Phases 12-16 (shipped 2026-02-02)
- ✅ **v3.0 Inmobiliaria Module** — 10 phases (shipped 2026-02-08)
- ✅ **v3.1 Landing & SEO** — (shipped 2026-02-10)
- ✅ **v4.0 AI Agent Beta** — Phases 17-25 (shipped 2026-02-10)
- ⏸️ **v5.0 Agency Plan-Gated Features** — Phases 26-33 (paused 2026-05-12)
- ✅ **v6.0 Backoffice Unificado ERP·CRM·Autopilot** — Phases v6-01..v6-08 (frontend-first; **8/8 COMPLETO** 2026-05-30) → detalle en `milestones/v6.0-ROADMAP.md`
- 🚧 **v7.0 Portal del Inquilino** — Phases v7-01..v7-07 (frontend-first; **en progreso** 2026-07-16) → este documento

---

## 🚧 v7.0 — Portal del Inquilino (Frontend-First, Aditivo)

**Milestone goal:** Darle al inquilino un portal donde **opere su arriendo** (pagar, pedir, ver, seguir, acordar, comunicar), no solo un canal de queja. Suma la capa post-firma, sube 3 pilares de parcial→real y limpia lo fake — sin romper el portal `/inquilino` ni el CRM existente.

> ⚠️ **Numeración `v7-NN` (NO enteros sueltos):** el repo `agent` aterriza commits de FRONTEND en ESTE repo (`mvp`) con numeración `3x-xx` (`ai/cobranza`, `ai/cotizador`). Fases con enteros sueltos colisionarían en el historial de `mvp`. v7.0 usa su propio namespace **`v7-NN`**, igual que v6.0 usó `v6-NN`. Commits: `feat(v7-01): …`. **No crear directorios de fase con enteros sueltos.**

> **Regla frontend-first:** cada success criterion = capacidad tenant-facing (UI + contrato api-client + empty-state honesto). Donde una **dependencia externa** bloquea la data real (Wompi productivo, rutas/RLS tenant en `agent`, endpoints lease-scoped NestJS), el criterio es la UI + el contrato + el empty-state "Próximamente" honesto — NO data falsa. La data real se cablea detrás (mismo playbook que v6.0).

> **Guardrails legales Colombia (NO negociables — codificados como success criteria):** PQRS reusa `pqrs.types.ts` (no forkear) · SLA PQRS 15 días hábiles (Ley 1480/2011) computado y visible · acuerdos NUNCA auto-aprueban (T-323/2024 + SIC 001/2025) · mensajes respetan el gate de contacto del `agent` (Ley 2300/2023: máx 1/día) y no preguntan "por qué" la mora (art. 7) · docs con Habeas Data (Ley 1581/2012: consentimiento por propósito, ARCO/borrar, sin IDOR) · saldo/acuerdo trazan a la única fuente de verdad (`tenant-payment-requests`) sin dark patterns · nada de amenazas a centrales de riesgo sin el gate de 3 partes (Ley 1266/2008 + 2157/2021).

### Phases

- [ ] **v7-01: Fundación & Limpieza del Portal** — Shell real post-firma: dashboard con estado real, estado de cuenta, perfil Colombia, config, nav; borra dead code.
- [ ] **v7-02: Documentos del Arriendo** — Docs del arriendo (contrato, recibos, paz y salvo, cert. retención) con disciplina Habeas Data.
- [ ] **v7-03: Estado de Casos (Hub)** — "Mis casos" unificado (PQRS + mantenimiento + acuerdos + pagos) con estado, responsable y timeline. Fija P1.
- [ ] **v7-04: Pagos Reales (Wompi)** — Pago de arriendo con Wompi/Bold real, comprobantes PDF, autopago; reemplaza el PSE-mock.
- [ ] **v7-05: Comunicación atada al arriendo/caso** — Chat lease-scoped, adjuntos y acciones reales, saliente respeta el gate de contacto.
- [ ] **v7-06: Solicitudes / PQRS** — Abrir/seguir mantenimiento y PQRS tipadas (reusa `pqrs.types.ts`) con SLA 15 días visible.
- [ ] **v7-07: Acuerdos de Pago (LAST)** — Ver/aceptar/pagar acuerdo aprobado por la agencia; nunca auto-aprueba. Contract-first hasta que `agent` exponga RLS tenant.

## Phase Details

### v7-01: Fundación & Limpieza del Portal
**Goal**: El shell del portal `/inquilino` refleja el **estado real post-firma** del arriendo (arriendo activo, próximo pago, casos abiertos, perfil Colombia) — la base de verdad que todos los demás pilares leen — y elimina las superficies fake (perfil chileno mock, config theater, dead code).
**Depends on**: Nothing (fase de fundación)
**Requirements**: BASE-01, BASE-02, BASE-03, BASE-04, PAGO-01
**Success Criteria** (what must be TRUE):
  1. El dashboard `/inquilino` muestra el arriendo activo y el próximo pago (fecha + monto) con data real del lease, sin los arrays hardcodeados vacíos (`TODO(Backend)`); los **casos abiertos** quedan como placeholder honesto (sin conteo fabricado) — su data real llega en v7-03, no se entrega en v7-01 (BASE-01, PAGO-01).
  2. El estado de cuenta (saldo vigente + próximo pago) traza a `tenant-payment-requests`/lease como única fuente de verdad — no computa su propio número — y sin dark patterns/guilt-tripping en mora (PAGO-01).
  3. El perfil del inquilino carga y guarda vía API real con datos de Colombia (cédula, `+57`), eliminando los datos chilenos mock (RUT, `+56`) (BASE-02).
  4. La configuración ejecuta acciones reales donde existe backend o muestra empty-state honesto, eliminando el `setTimeout` theater (password/sesiones/descargar/borrar) (BASE-03).
  5. La navegación del layout expone Notificaciones/Perfil/Configuración y el dead code (`TenantDashboardSidebar.tsx`) queda eliminado (BASE-04).
**External deps**: NestJS perfil get/update endpoint; endpoints de config (password/sesiones). Frontend-first: donde el backend no exista, entra el contrato api-client + empty-state honesto. La data del lease (arriendo/próximo pago/casos) **ya es real** hoy — esta fase la cablea al dashboard. **Nota (recon):** perfil get/update, password, data-export, delete y notif-prefs **ya existen y están cableados** al service layer — solo `active sessions` es gap real (empty-state honesto). Cases aggregation = forward-ref a v7-03 (no fabricar conteo).
**Plans**: 4 plans
- [ ] v7-01-01-PLAN.md — Dashboard + estado de cuenta con data real (lease/payment-info) + fix status hardcodeado (BASE-01, PAGO-01)
- [ ] v7-01-02-PLAN.md — Perfil Colombia real (seed de `user`, `updateProfile`, delete ARCO; cédula/+57/es-CO/COP) (BASE-02)
- [ ] v7-01-03-PLAN.md — Config acciones reales (password/export/delete/notif) + sessions honesto (BASE-03)
- [ ] v7-01-04-PLAN.md — Nav expone Notif/Perfil/Config + badge real + borra `TenantDashboardSidebar.tsx` (BASE-04)
**UI hint**: yes

### v7-02: Documentos del Arriendo
**Goal**: El inquilino accede y descarga los documentos de su **arriendo** (contrato firmado, recibos, paz y salvo, certificado de retención en la fuente), no solo los docs de la aplicación — con disciplina Habeas Data end-to-end.
**Depends on**: v7-01
**Requirements**: DOCU-01, DOCU-02, DOCU-03, DOCU-04
**Success Criteria** (what must be TRUE):
  1. El inquilino ve y abre los documentos de su arriendo (contrato firmado, recibos de pago) además de los docs de la aplicación (DOCU-01).
  2. El inquilino descarga su paz y salvo self-service (DOCU-02).
  3. El inquilino obtiene su certificado de retención en la fuente (3.5%) auto-generado (DOCU-03).
  4. Cada documento se sirve por URL firmada/expira (sin IDOR), con consentimiento por propósito (checkbox no pre-marcado por propósito) y una acción de borrar (ARCO) funcional — Habeas Data (Ley 1581/2012) (DOCU-04).
**External deps**: NestJS documents.service.ts lease-scoped + signed/expiring URLs (contrato `useSignedPdfUrl`); auto-generación real de cert. retención → backend (frontend-first: contrato + empty-state). El comprobante/recibo del portal se etiqueta **"comprobante interno"**, no "factura", hasta que exista la FE-DIAN (FACT/M2).
**Plans**: TBD
**UI hint**: yes

### v7-03: Estado de Casos (Hub — fija P1)
**Goal**: "Mis casos" — un hub unificado que agrega PQRS + mantenimiento + acuerdos + pagos abiertos, cada uno con estado, responsable y timeline. Composición frontend de servicios existentes (apps + leases + contracts). Es el fix directo de P1: el inquilino **opera** la relación en un solo lugar, no solo se queja.
**Depends on**: v7-01
**Requirements**: CASO-01, CASO-02, CASO-03
**Success Criteria** (what must be TRUE):
  1. El inquilino ve "Mis casos": un hub que agrega PQRS + mantenimiento + acuerdos + pagos abiertos, cada uno con su estado y responsable (CASO-01).
  2. Cada caso enlaza a su detalle (solicitud, acuerdo o conversación) y muestra su timeline de estados; el inquilino solo ve sus propios casos (las notas internas de la agencia quedan excluidas de la vista tenant) (CASO-02).
  3. El inquilino recibe notificación in-app al cambiar el estado de un caso; push/WhatsApp entra cuando el canal esté disponible, con empty-state honesto mientras tanto (CASO-03).
  4. Los estados y el SLA mostrados trazan a los servicios existentes (no computan un segundo número) y los casos "al día" usan estados neutros — sin badges de alarma ni urgencia inventada (guardrail PITFALLS 8).
**External deps**: push/WhatsApp proactivo real depende de rutas tenant en `agent` + gateway de mensajería (frontend-first: notificación in-app ya funciona; push = "Próximamente"). Realtime tenant-scoped depende de RLS tenant en `agent`; fallback hoy = polling (`useVisibilityPolling`).
**Plans**: TBD
**UI hint**: yes

### v7-04: Pagos Reales (Wompi)
**Goal**: El inquilino paga su arriendo con Wompi/Bold real (PSE + tarjeta + Nequi), ve su historial y descarga comprobantes, y configura autopago — reemplazando el `/pse-mock`, con el monto resuelto server-side.
**Depends on**: v7-01 (estado de cuenta / lease payment-info)
**Requirements**: PAGO-02, PAGO-03, PAGO-04, PAGO-05
**Success Criteria** (what must be TRUE):
  1. El inquilino paga su arriendo con Wompi/Bold real (PSE + tarjeta + Nequi) vía checkout hosted, con el monto resuelto server-side (nueva ruta `POST /api/inquilino/pagos/wompi-session` con hash de integridad, modelada 1:1 en `src/app/api/avaluo/wompi-session/route.ts`), reemplazando `/pse-mock` (PAGO-02).
  2. El inquilino ve el historial de pagos y descarga el comprobante/recibo PDF de cada pago, etiquetado **"comprobante interno"** (no "factura") hasta que exista la FE-DIAN (PAGO-03, guardrail DIAN).
  3. El inquilino configura, cambia y cancela autopago (domiciliación tokenizada) (PAGO-04).
  4. El saldo/estado de mora traza a `tenant-payment-requests` (única fuente de verdad), sin computar su propio número; el costo total (cuota de manejo/recargo) se muestra **antes** de elegir método, sin método de mayor comisión pre-seleccionado y sin guilt-tripping (PAGO-05, guardrails PITFALLS 8/9).
**External deps**: Wompi/Bold **productivo** habilitado para arriendo (hoy PSE-mock); `WOMPI_INTEGRITY_SECRET` server-only; webhook rent-specific en NestJS para reconciliar `TenantPaymentRequest`. Autopago tokenizado depende de soporte Wompi + backend. Frontend-first: la ruta server-side + `WompiPayButton` entran ya; la data real se activa cuando la pasarela productiva esté lista.
**Plans**: TBD
**UI hint**: yes

### v7-05: Comunicación atada al arriendo/caso
**Goal**: El chat del inquilino con la inmobiliaria queda atado al **arriendo/caso** (hoy solo a `applicationId`), con adjuntos y acciones reales, y todo mensaje saliente respeta el gate de contacto legal del `agent`.
**Depends on**: v7-01 (lease context)
**Requirements**: COMU-01, COMU-02, COMU-03
**Success Criteria** (what must be TRUE):
  1. El chat del inquilino está atado al arriendo/caso (no solo a `applicationId`), extendiendo `messages.service.ts` a lease-scoped (COMU-01).
  2. El inquilino adjunta archivos/fotos en el chat y las acciones de conversación (archivar/reportar) funcionan de verdad, no `alert()`/inertes (COMU-02).
  3. Todo mensaje/recordatorio saliente respeta el gate de contacto del `agent` (Ley 2300/2023: máx 1/día, 1 canal/semana): el frontend no envía por su cuenta vía Twilio ni pregunta "por qué" la mora (art. 7); WhatsApp es canal de primera pero ruteado por el `agent` (COMU-03, guardrails PITFALLS 3/5).
  4. El chat expone una ventana de respuesta esperada (consistente con el SLA de PQRS), sin implicar respuesta humana instantánea (guardrail PITFALLS UX).
**External deps**: NestJS messages.service.ts lease-scoped + upload de adjuntos; WhatsApp/recordatorios salientes ruteados por el contact-ledger/gate del `agent` (bloqueante para envío real — frontend-first: in-app funciona, saliente detrás del gate).
**Plans**: TBD
**UI hint**: yes

### v7-06: Solicitudes / PQRS
**Goal**: El inquilino abre solicitudes de mantenimiento y PQRS formales tipadas (reusando `pqrs.types.ts`, no forkear) y sigue su estado en un timeline con el SLA de 15 días hábiles computado y visible.
**Depends on**: v7-01; enlaza al hub de v7-03
**Requirements**: SOLI-01, SOLI-02, SOLI-03, SOLI-04
**Success Criteria** (what must be TRUE):
  1. El inquilino abre una solicitud de mantenimiento/reparación con descripción + fotos (SOLI-01).
  2. El inquilino abre una PQRS formal tipada reusando el contrato `pqrs.types.ts` (mismo entity, `solicitanteTipo: 'inquilino'`, sin forkear) — la agencia la ve con el mismo vocabulario de estados (SOLI-02, guardrail PITFALLS 1).
  3. El inquilino sigue el estado de sus solicitudes/PQRS en un timeline con el SLA (15 días hábiles, Ley 1480/2011) computado y visible — nunca en blanco; interino etiquetado "estimado" (SOLI-03, guardrail PITFALLS 6).
  4. La solicitud muestra transparencia de responsabilidad de costo (Ley 820: dueño/inquilino/split) y, cuando el costo es a cargo del inquilino, requiere aprobación de cotización antes de ejecutar (SOLI-04).
**External deps**: NestJS/agent PQRS CRUD tenant-scoped (create + list `/pqrs/mine`) — el backend puede ir atrás (frontend-first: contrato reusando `pqrs.types.ts`; motor de triage/SLA/asignación → M1). `slaVenceAt` real del motor; interino = `createdAt + 15 días hábiles` (calendario Colombia, sin festivos) etiquetado "estimado".
**Plans**: TBD
**UI hint**: yes

### v7-07: Acuerdos de Pago (LAST)
**Goal**: El inquilino ve, acepta y paga acuerdos de pago aprobados por la agencia, y puede solicitar un plan pre-mora — sin que la UI decida nada que la ley reserva a un humano. Contract-first: types + empty-state honesto "Próximamente" hasta que el repo `agent` exponga rutas/RLS tenant.
**Depends on**: v7-03 (hub de casos), v7-04 (rail Wompi para cuotas), y **dependencia dura cross-repo** en `agent` (rutas/RLS tenant)
**Requirements**: ACUE-01, ACUE-02, ACUE-03, ACUE-04
**Success Criteria** (what must be TRUE):
  1. El inquilino ve los acuerdos que la agencia le aprobó con el plan de cuotas (fechas, montos, estado), trazando al único registro del `agent` (no un segundo motor de saldo) (ACUE-01, guardrail PITFALLS 9).
  2. El inquilino acepta explícitamente un acuerdo (firma reusando `SignaturePad` + `OTPVerification` generalizado); nunca se auto-aprueba ni fija términos, y todo lo fuera de la matriz de política pasa por el gate `requiresHumanReview()` del `agent` (T-323/2024 + SIC 001/2025) (ACUE-02, guardrail PITFALLS 2).
  3. El inquilino paga una cuota de su acuerdo con el mismo rail Wompi (vía `agent` `cartera/payment-plans` → `paymentUrl`) (ACUE-03).
  4. El inquilino puede solicitar un plan de pago pre-mora que alimenta el pipeline de aprobación de la agencia (propone, no fija términos); ningún form pregunta "por qué" la mora ni menciona centrales de riesgo sin el gate de 3 partes (ACUE-04, guardrails PITFALLS 4/5).
**External deps** (HARD, cross-repo): rutas + RLS tenant-scoped en el repo `agent` para leer/persistir acuerdos y pagar cuotas; los gates `requiresHumanReview`/`canContact` expuestos vía HTTP. Hasta que existan → UI shell + contrato types-only (`tenant-acuerdos.types.ts`) + empty-state honesto "Próximamente" (igual que la página agency de acuerdos ya hace). **NO fake data** en un path que un inquilino real pueda alcanzar.
**Plans**: TBD
**UI hint**: yes

## Traceability (REQ → Phase)

| Phase | Requirements |
|-------|--------------|
| v7-01 Fundación & Limpieza | BASE-01, BASE-02, BASE-03, BASE-04, PAGO-01 |
| v7-02 Documentos del Arriendo | DOCU-01, DOCU-02, DOCU-03, DOCU-04 |
| v7-03 Estado de Casos (Hub) | CASO-01, CASO-02, CASO-03 |
| v7-04 Pagos Reales (Wompi) | PAGO-02, PAGO-03, PAGO-04, PAGO-05 |
| v7-05 Comunicación | COMU-01, COMU-02, COMU-03 |
| v7-06 Solicitudes / PQRS | SOLI-01, SOLI-02, SOLI-03, SOLI-04 |
| v7-07 Acuerdos de Pago | ACUE-01, ACUE-02, ACUE-03, ACUE-04 |

**27/27 requirements v7.0 mapeados a exactamente una fase ✓** — sin huérfanos, sin duplicados.

## Progress

**Orden de ejecución:** v7-01 → v7-02 → v7-03 → v7-04 → v7-05 → v7-06 → v7-07 (Acuerdos al final por la dependencia dura cross-repo).

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| v7-01. Fundación & Limpieza | v7.0 | 0/4 | Not started | - |
| v7-02. Documentos del Arriendo | v7.0 | 0/TBD | Not started | - |
| v7-03. Estado de Casos (Hub) | v7.0 | 0/TBD | Not started | - |
| v7-04. Pagos Reales (Wompi) | v7.0 | 0/TBD | Not started | - |
| v7-05. Comunicación | v7.0 | 0/TBD | Not started | - |
| v7-06. Solicitudes / PQRS | v7.0 | 0/TBD | Not started | - |
| v7-07. Acuerdos de Pago | v7.0 | 0/TBD | Not started | - |

---

<details>
<summary>📦 Milestones anteriores (v5.0 pausado · v6.0 completo · standalone) — detalle archivado</summary>

### ⏸️ v5.0 — Agency Plan-Gated Features (Phases 26-33, paused 2026-05-12)

Foco se movió al Collections Agent en `Leasefy/agent`. Detalle completo: `milestones/v5.0-ROADMAP.md`.

- [x] **Phase 26: Plan Gating System** — Hook de gating + upgrade prompts (GATE-01..05). Complete 2026-03-26.
- [x] **Phase 27: Agent Dashboard UX** — Polish agent cards/feed/execution panel (ADUX-01..05). Complete 2026-03-26.
- [x] **Phase 28: Agency Pricing Modal** — Modal Flex vs Subscription (PRIC-01..04). Complete 2026-03-26.
- [x] **Phase 29: Advanced Reports** — Ocupación/cobranza/agentes con charts (REPT-01..06). Complete 2026-03-26.
- [x] **Phase 30: Executive Reports** — Dashboard C-level + health score (EXEC-01..04). Complete 2026-03-26.
- [x] **Phase 31: Automatic Reminders** — Config de recordatorios + log (RMDR-01..07). Complete 2026-03-26.
- [x] **Phase 32: Integration & QA** — Wire gating + test de tiers. Complete 2026-03-26.
- [ ] **Phase 33: Property Import System** — Import Excel/CSV con AI column mapping (deferido, sin planear).

### ✅ v6.0 — Backoffice Unificado ERP·CRM·Autopilot (Phases v6-01..v6-08, COMPLETO 2026-05-30)

Frontend-first, aditivo. Detalle completo + success criteria: `milestones/v6.0-ROADMAP.md`. Backbone: `ERP-CRM-AUTOPILOT-PROGRAM.md`. Namespace `v6-NN` (misma razón que v7-NN: no colisionar con el stream `agent` `3x-xx`).

- [x] **v6-01: IA Unificada & Command Center** — Nav en bloques + landing "Hoy" (UNIF-01..04).
- [x] **v6-02: Facturación** ⭐ — Ventas/compras/FE-DIAN/notas + contrato; motor → M2 (FACT-01..06).
- [x] **v6-03: Conciliación bancaria** — Cargar fuente + matches + cola; motor → M2 (CONC-01..05).
- [x] **v6-04: Egresos a propietarios / Tesorería** — Neto + comprobante sobre `dispersiones` (EGR-01..04).
- [x] **v6-05: Informes & Insights** — `lib/insights` + `InsightsPanel` en /hoy (INFO-01..05).
- [x] **v6-06: PQRS / Solicitudes + Agenda interna** — Ciclo completo + agenda (PQRS-01..03, AGEN-01..02).
- [x] **v6-07: Creación de terceros por IA** — Foto cédula/RUT → IA extrae → prellena (TERC-01..04). Cross-repo.
- [x] **v6-08: Captura de propiedad foto+audio** (stretch) — Fotos + audio → ficha (CAPT-01..04). Cross-repo.

### Standalone (post-v6.0)

- [x] **Phase 34: Avalúos UI** — Wizard de solicitud + tracking + certificado público + pago Wompi + integración panel agencia (5 plans). Detalle: `phases/34-avaluos-ui/`.

</details>
