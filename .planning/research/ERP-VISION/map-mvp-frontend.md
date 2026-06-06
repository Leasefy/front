# Capability Map — `rent/mvp` (Leasefy agency-facing frontend)

**Repo**: `/Users/nicolasgarcia/rent/mvp` (package name `arriendo-facil`)
**Role**: Agency (inmobiliaria) dashboard. Next.js 14 App Router, React, TypeScript, Tailwind.
**Scope of this map**: `src/app/panel/inmobiliaria/**`, `src/components/inmobiliaria/**`, `src/lib/**`.
**Date**: 2026-05-29

## How "real" was judged

Two distinct backends are wired:

1. **Monolith backend** (`NEXT_PUBLIC_BACKEND_URL`, default `:3000`) via `src/lib/api/client.ts` (`apiClient`, JWT Bearer). Used by `inmobiliaria.service.ts`, `contracts.service.ts`, `properties.service.ts`, `applications.service.ts`, `documents.service.ts`, `messages.service.ts`, `notifications.service.ts`, `visits.service.ts`. These are real fetch-backed services — functional only if the backend is up, but NOT mocked in the code path.
2. **Agent microservice** (`NEXT_PUBLIC_AGENT_URL`) via raw `fetch(..., { credentials: 'include' })` inside `src/lib/hooks/cobranza/**` and `src/lib/hooks/cotizador/**`, with OpenAPI-generated types in `src/lib/api/generated/{agent,cartera,cotizador,agency}.ts` (regen `pnpm api:gen` from `~/rent/agent` openapi v0.1.2). Also Supabase Realtime channels.

Mock surfaces that DO exist: `src/lib/api/mock.ts` + `src/lib/data/mock-*.ts` + the beta chat (`LeasefyAIClient` in `client.ts`, gated by `NEXT_PUBLIC_USE_MOCK_API`, `config.ts`) — these power the hidden beta chat, NOT the agency operational modules. `getMockAgentActivity()` in `ai-agents.ts` is a hardcoded seed for the AI hub activity feed.

Skeptical caveats noted per-domain below (especially: AI hub activity feed is an empty stub; import "AI" is a heuristic, not an LLM; the "facturación" tab is SaaS self-billing, not DIAN invoicing; portal import is a disabled "Próximamente" shell).

---

## D1 — Conciliación bancaria
**Status: MISSING**
- Evidence: grep for `concilia|reconcil|bancolombia|movimiento` across `src/app/panel/inmobiliaria` and `src/lib` returns only seed/mock/type files (`src/lib/seed-data.ts`, `src/lib/types/payment-accounts.ts`, `src/lib/data/mock-*`). No reconciliation UI, no bank-file import, no movement→contract matching.
- Note: Payments are tracked manually via `cobros` (register payment on a cobro: `POST /inmobiliaria/cobros/{id}/pay`), but there is no bank-statement ingestion or auto-matching. The cobranza module does payment identification on the agent side, but no bank-conciliation UI here.

## D2 — Facturación (facturas venta/compra, DIAN, notas)
**Status: MISSING** (the only "facturación" present is SaaS self-billing)
- Evidence: The `facturacion` tab in `src/app/panel/inmobiliaria/configuracion/page.tsx` (line 496, `ConfigFacturacion`) renders the agency's OWN subscription invoices via `useAgencyBilling` → `GET /inmobiliaria/config/billing` + `/config/billing/invoices` (`inmobiliaria.service.ts:665-691`). That is "what the agency pays Leasefy", not facturas de venta/compra to owners/tenants, no DIAN electrónica, no notas débito/crédito, no recurring per-period invoicing, no payment links on invoices.
- Note: Closest adjacent real artifact is the owner comprobante de egreso / extracto (see D4), which is a payout statement, not a tax invoice.

## D3 — Recaudo & Cobranza
**Status: HAVE-REAL** (deepest module in the repo, agent-microservice backed)
- Evidence (routes): `src/app/panel/inmobiliaria/ai/cobranza/` with ~25 pages: `page.tsx` (cartera funnel), `deudores/[id]` (debtor 360 with tabs + realtime), `pagos` (funnel) + `pagos/planes/[planId]` (payment plans), `escalaciones/[id]` (escalation flow + assign/resolve), `llamadas/[callId]` (voice call detail + transcript + audio player), `cartas/[id]` (collection letters w/ approval), `siniestros/[id]` (insurance claim approval), `compliance/` (ley-2300, opt-out, audit), `reporte/` (daily non-payment report + thresholds + subscription), `arco/` (habeas data ARCO requests).
- Evidence (hooks, all hit `NEXT_PUBLIC_AGENT_URL`): `src/lib/hooks/cobranza/use-debtor-list.ts` (cursor pagination + 30s poll, `GET /api/agency/{id}/cobranza/debtors`), `use-daily-report.ts` (`/cobranza/daily-report/today|history|history.csv`), `use-payments-funnel.ts`, `use-escalations.ts`, `use-carta-approval.ts`, `use-payment-plan-approval.ts`, `use-siniestro-approval.ts`, `use-stage-transitions-realtime.ts` + `use-debtor-calls-realtime.ts` (Supabase Realtime), `use-thresholds.ts`, `use-compliance-overview.ts`, `use-audit-log.ts`.
- Note: Real collections automation surface — staged escalation (S1..Sn), voice/letter channels, payment plans, mora thresholds, daily non-payment report w/ CSV export, Ley 2300 / habeas-data compliance, PII masking. Functional only against the running agent service; types are OpenAPI-generated (`generated/cartera.ts`). Intereses de mora not explicitly surfaced as a separate UI but balance/DPD is.

## D4 — Egresos a propietarios
**Status: HAVE-REAL** (monolith-backed, depends on backend)
- Evidence: `src/app/panel/inmobiliaria/dispersiones/page.tsx` + `dispersiones/generar/page.tsx`; `dispersionesApi` in `inmobiliaria.service.ts:299-332`: `GET /inmobiliaria/dispersiones`, `/dispersiones/summary`, `/dispersiones/preview?propietarioId=&period=`, `PATCH /dispersiones/{id}/process`, `GET /dispersiones/{id}/extracto`. Consumed via `useDispersiones` / `useExtractoPropietario` (`useInmobiliaria.ts:196,291`). PDF generation: `src/lib/utils/generate-extracto-pdf.ts` (`downloadExtractoPDF`).
- Note: Computes neto and produces an owner extracto/comprobante PDF client-side. Real wiring; preview/process endpoints exist. Actual dispersal execution (bank transfer) is delegated to backend.

## D5 — Contratos & Firma
**Status: HAVE-REAL** (monolith-backed; full lifecycle)
- Evidence: routes `contratos/nuevo` (modes `upload | template | generate`, `nuevo/page.tsx:29`), `contratos/[id]`, `contratos/[id]/editar`, `contratos/[id]/firmar`. `contracts.service.ts`: `create`, `send`, `signAsLandlord`, `signAsTenant`, `activate`, `remind`, `getPreview`, `getSignedPdfUrl`, `reject`, `cancel`, `getRejections`, **OTP** `sendOtp`/`verifyOtp` (`/contracts/{id}/otp/send|verify`). `useContracts.ts` / `useContractActions`.
- Note: Real e-signature flow with OTP and reminders, candidate→contract handoff (`contratos/nuevo?applicationId=`). Renewals/increments handled separately in D-Operaciones (renovaciones + IPC). Legal templates: `src/lib/constants/contract-templates.ts` exists; "template"/"generate" creation modes present. Pre-send completeness validation is partial (form-level, not the full bank-acct/mascotas/escenario-tributario gate the vision describes).

## D6 — Gestión documental
**Status: PARTIAL** (real storage/upload + templates + actas; little AI classification/extraction)
- Evidence: `documentos/page.tsx` uses `usePropertyDocuments`, `useDocumentTemplates`, `useActasEntrega` (`useInmobiliaria.ts:343-356`). `documents.service.ts`: `GET/POST/DELETE /documents`, `/documents/application/{id}`, `upload` (multipart). `inmobiliaria.service.ts` adds `/templates`, `/documents`, `/actas`. Document-analysis hook exists: `src/lib/hooks/useDocumentAnalysis.ts` + `src/lib/api/ai-analysis.service.ts`.
- Note: Real upload/store/associate (per contract/property/application) and acta de entrega flow. Missing the vision's auto-classify / key-date extraction / expiry alerts / clause-risk / smart-search as agency-facing features. `useDocumentAnalysis` is oriented to applicant document analysis (scoring pipeline), not portfolio doc intelligence.

## D7 — CRM / Captación / Propiedades
**Status: HAVE-REAL** (monolith-backed) with thin spots
- Evidence: `propiedades/page.tsx` (list, links to `propiedades/[id]/candidatos`), `propiedades/nueva` (create form → `propertiesApi.create`), `portafolio/` (`page.tsx`, `[id]`, `nuevo`, `importar`). `properties.service.ts` (full CRUD + filters + `naturalQuery`), `pipeline` (Kanban: `pipelineApi` move-stage/convert-to-lease, `usePipelineItems`), `agentes` (assignment/leaderboard), `visits.service.ts` (slots, scheduling — public slot endpoint), `candidatos/page.tsx` (postulación: pre-approve/approve/reject via `landlordApplicationsApi`).
- Note: Property capture, photos (via property form/types), inventory ficha attributes, lead/candidate management, agent assignment, visits, pipeline funnel are all real-API. Gaps: no explicit "ficha compartible por WhatsApp" share action found, and portal publication is not real (see D8). Arriendo flow strong; venta flow less evident.

## D8 — Creación de propiedades por app móvil + audio
**Status: MISSING** (no audio/mobile-capture); portal-import is a disabled shell
- Evidence: `propiedades/nueva/page.tsx` is a plain text form — no `audio|microphone|record|voice|transcribe|camera` references. `portafolio/importar` → `ImportWizard` steps `StepChooseMethod / StepUploadFile / StepColumnMapping / StepAIReview / StepConfirmImport / StepPortalImport / StepSoftwareMigration`.
- Note: `StepPortalImport.tsx` lists fincaraiz/metrocuadrado but shows a "Próximamente" badge with a **disabled** URL input → MOCK. `StepAIReview` uses `gapFiller.ts` which is self-described "Mock AI gap-filling engine — deterministic heuristic rules, no real AI backend" → not LLM. CSV upload + column mapping (`parseFile.ts`, `columnMapping.ts`) is the only real import path. No audio→IA→ficha pipeline anywhere.

## D9 — PQRS / Solicitudes
**Status: PARTIAL** (maintenance/solicitudes real; no AI classify/route/close)
- Evidence: `operaciones/page.tsx` uses `useMantenimientos` + `mantenimientoApi` (`inmobiliaria.service.ts:341-376`): `GET/POST/PATCH /inmobiliaria/mantenimiento`, `/mantenimiento/{id}/status`, `/mantenimiento/{id}/approve-quote` (cotización→proveedor flow), `/mantenimiento/kanban`.
- Note: Real maintenance/solicitud register with status workflow and quote approval (the repair→proveedor cotización flow exists). But it is generic "mantenimiento", not a full PQRS taxonomy (quién/tipo/inmueble/asignado/respuesta), and there is no AI classification/routing/auto-close. So PARTIAL.

## D10 — Creación de terceros automatizada
**Status: MISSING** (manual only)
- Evidence: `propietarios/page.tsx` create flow uses `usePropietarios` → `propietariosApi.create` (`POST /inmobiliaria/propietarios`) with a manual form. No `cedula|RUT|OCR|prefill|extract` references in the owner-create path.
- Note: Terceros (propietarios) creation is fully manual today, exactly the "~15 min manual" state the vision wants to automate. No foto-cédula/RUT/audio extraction.

## D11 — Informes & Insights
**Status: HAVE-REAL** (reports real; insights are early/dashboard-level)
- Evidence: `reportes/page.tsx` (`REPORT_DEFINITIONS` from `src/lib/constants/inmobiliaria-data.ts` is a static catalog of report types; actual data via `inmobiliaria.service.ts` reports endpoints: `/reports/cartera`, `/reports/comisiones`, `/reports/flujo-caja`, `/reports/extracto/{id}`, `/reports/export` (Blob), `/reports/definitions`). Report components: `OccupancyReport`, `CollectionsReport`, `AgentPerformanceReport`, `ExecutiveSummary`, `ReportPDFExport` in `src/components/inmobiliaria/reports/`. Analytics: `useAnalyticsData`, `useTrendAnalysis`, `useForecastData` (`/analytics/charts|forecast`).
- Note: Real reporting (administrativos/comerciales/cartera/flujo-caja, PDF + CSV export). Proactive insights exist only as a dashboard alerts panel (`page.tsx:535` — late payments / pending maintenance counts) and the cobranza daily-report; not the broad proactive "tienes 18 contratos por vencer" engine. Helisa export / certificado tributario not found.

## D12 — Agenda interna
**Status: MISSING**
- Evidence: No `/agenda` or `/calendario` route exists (route list confirmed). grep hits for "agenda/calendar" are icon imports (e.g. `Calendar` phosphor icon) in unrelated pages, not a calendar module.
- Note: System events exist (visitas via `visits.service`, renovaciones vencimientos, firmas pendientes, seguimientos) but there is no unified internal calendar/agenda that ties them together or auto-creates tasks.

## D13 — Notificaciones automáticas
**Status: PARTIAL** (in-app notifications real; multi-channel auto-triggers live in agent service, not here)
- Evidence: `notifications.service.ts` real: `GET /notifications`, `PATCH /notifications/{id}/read`, `POST /notifications/mark-all-read`, `DELETE`. `useNotifications.ts`, `usePushNotifications.ts` (web push). Cobranza configurable subscriptions/thresholds: `use-subscription.ts`, `use-thresholds.ts`, `SubscriptionToggles.tsx`. Operaciones has `ReminderConfigPanel` + `ReminderLog`.
- Note: In-app + push notification plumbing is real. The actual automatic event-driven multi-channel sends (WhatsApp/email on pago/mora/vencimiento/firma) are owned by the agent/back microservices; this frontend surfaces config (toggles/thresholds/reminder config) and the resulting notifications, not the send engine.

## D14 — Conversación / asesoría automática
**Status: PARTIAL** (real in-app application chat; voice/whatsapp only inside cobranza; general advisory bot is hidden beta)
- Evidence: `mensajes/page.tsx` → `MessagesWidget` uses real `useConversations`/`useChat` (`messages.service.ts`: `/messages/conversations`, `/applications/{id}/chat/messages`) — but this is application-scoped chat between agency and candidate, not an autonomous advisor. Cobranza has real voice-call detail + transcript (`llamadas/[callId]`, `use-call-transcript.ts`, `use-audio-player.ts`) and WhatsApp as a collections channel. A conversational AI assistant exists but is the **hidden beta** (`src/components/beta/`, `useBetaChat.ts`, mock-backed via `LeasefyAIClient`).
- Note: No production multi-channel (web/app/email/WhatsApp) autonomous advisor connected to live operations on the agency side. Real conversational surfaces are: (a) human-to-candidate app chat, (b) cobranza voice/WhatsApp collections, (c) hidden mock beta chat.

## D15 — Portal/app propietarios e inquilinos
**Status: N/A for this repo (PARTIAL at product level)**
- Evidence: This repo is the *agency-facing* panel (`ProtectedRoute allowedRoles={['agency']}` in `layout.tsx`). It generates owner-facing artifacts (extractos/comprobantes via `generate-extracto-pdf.ts`, owner records via `propietariosApi`) but does not host the owner/tenant self-service portal. Tenant-facing services exist in `src/lib/api/` (`landlord.service.ts`, `tenant-payment-requests.service.ts`, `pse-payments.service.ts`, `wishlists`, `visits`) and there are non-agency panels elsewhere in the app tree (`src/app/panel/` has other roles), but they are out of this map's `inmobiliaria` scope.
- Note: Marked N/A because the owner/tenant portal is not part of `panel/inmobiliaria`. The agency panel feeds it (egresos, comprobantes, mora state) but does not implement it.

## D16 — Afianzadoras / seguros
**Status: HAVE-REAL** (cotizador module, agent-microservice backed; second-deepest module)
- Evidence: `src/app/panel/inmobiliaria/ai/cotizador/`: `page.tsx` (overview KPIs + carriers status + recent quotes), `nueva` (3-step quote wizard `WizardStep1Candidato/2Propiedad/3Review`), `[quoteId]` (quote detail + streaming), `aseguradoras/[carrier]/sla` (carrier registry + SLA + overrides), `insights`, `costos`. Hooks hit agent service / Supabase Realtime: `use-cotizador-overview.ts` (KPIs + Realtime quote inserts), `use-quote-stream.ts` (SSE/streaming carrier verdicts), `use-carrier-registry.ts`, `use-carrier-sla.ts`, `use-costos.ts`, `use-insights.ts`, `use-ask-why.ts`. ~30 components in `src/components/inmobiliaria/cotizador/` (carrier cards, SLA breach windows, cost charts, prima distribution). Types in `generated/cotizador.ts`.
- Note: Real carrier-agnostic insurance quoting against carriers (sura/mapfre/bolivar, route direct|sekure, mode stub|rest), streaming multi-carrier verdicts, SLA monitoring, per-carrier cost tracking and insights. Insurance *claims* (siniestros) handled in cobranza (D3). This is bonding/garantía integration; "Leasefy-as-afianzadora" is future.

---

## Module depth summary (this repo)

**Deep, real, agent-microservice-backed** (`NEXT_PUBLIC_AGENT_URL` + generated OpenAPI types + Supabase Realtime):
- `ai/cobranza/**` (D3) — ~25 pages, ~38 hooks, ~29 components. Most built-out module.
- `ai/cotizador/**` (D16) — ~10 pages, ~18 hooks, ~30 components.

**Real, monolith-backed** (`NEXT_PUBLIC_BACKEND_URL` via `apiClient`, no mock in code path — needs backend up):
- `dispersiones` (D4), `contratos` (D5), `cobros` (D3-adjacent recaudo), `pipeline`/`propiedades`/`portafolio`/`agentes`/`propietarios` (D7), `operaciones` (D9 maintenance + renovaciones), `documentos` (D6), `mensajes` (D14 app chat), `reportes`+`analytics` (D11), `configuracion` (incl. SaaS billing).

**Thin shells / mock / disabled**:
- AI hub `ai/page.tsx` (tenant-scoring + smart-matching cards): metrics real (`/metrics`), but **activity feed is an empty stub** (`use-agent-activity.ts` returns `[]`, TODO to call agent `/activity`); `getMockAgentActivity()` is a hardcoded seed. The 19-agent registry (`ai-agents.ts`) is static config (4 active: tenant-scoring, smart-matching, cobranza, cotizador).
- `portafolio/importar` portal-import step: disabled "Próximamente". Import "AI review" is a heuristic `gapFiller.ts`, not an LLM.
- `creditos`, `checkout`, `upgrade`, `analytics` (forecast) are lighter.

## Notable gaps vs vision (MISSING in this repo)
D1 conciliación bancaria, D2 facturación venta/compra + DIAN + notas, D8 mobile/audio property creation, D10 automated terceros (cédula/RUT/audio), D12 internal agenda/calendar. D6/D9/D13/D14 are PARTIAL (real plumbing, missing the AI-automation layer the vision describes). D15 is N/A (owner/tenant portal lives outside `panel/inmobiliaria`).
