# AUDIT B — Tenant Portal: Missing Pillars, Pre-lease, Integration

Scope: `src/app/inquilino/**` + `src/components/tenant/**`. Method: read files + grep across `src/`.
Date: 2026-07-16.

## Tenant routes (from `src/app/inquilino/layout.tsx` nav + filesystem)
Nav: Panel (`/inquilino`), Explorar, Arriendo, Aplicaciones, Contratos, Pagos, Documentos, Mensajes.
Non-nav routes: `guardados`, `para-ti`, `notificaciones`, `perfil`, `configuracion`.

## 3-Pillar Verdict

| Pillar | Verdict | Evidence |
|---|---|---|
| **2 — Solicitudes / mantenimiento / PQRS / reparaciones** | **MISSING** (tenant) | Zero `pqrs\|queja\|reclamo\|petici[oó]n` matches anywhere under `src/app/inquilino` or `src/components/tenant`. Every `solicitud` hit refers to the rental *application* ("revisando tu solicitud", "Cancelar solicitud" — `aplicaciones/[applicationId]/page.tsx:95,935`), not a maintenance ticket. No `mantenimiento`/`reparación`/`ticket` route or component for the tenant. PQRS exists **agency-side only**: `src/app/panel/inmobiliaria/pqrs/page.tsx` (guarded by `PageGuard`, fed by empty stub `RESUMEN_PQRS_VACIO` from `@/lib/api/pqrs.types`; icons incl. `Wrench` = maintenance). Tenant cannot create or view a PQRS/maintenance request. |
| **4 — Estado de casos / expediente** | **MISSING** | No `caso`/`case`/`expediente` feature. Only two hits, both incidental comments: "viene del caso PSE PENDING (verificación bancaria)" in `pagos/page.tsx:508` and `PayRentModal.tsx:630` — a payment-state comment, not a case-management surface. No open-issue timeline for the tenant. (Note: `ApplicationTimeline` exists but tracks *application* progress, not service cases.) |
| **5 — Acuerdos de pago / promesa de pago / plan de pago** | **MISSING** (tenant) | No `acuerdo`/`promesa de pago`/`plan de pago`/`cuota` feature. The only `agreement` hits mean "lease agreement" (`perfil/page.tsx:1024`, `arriendo/[leaseId]/page.tsx:572` = "Contrato de arriendo"). The `arriendo` (post-lease) page surfaces **only payments** (historial de pagos, día de pago, métodos de pago) — no payment-plan/negotiated-agreement UI. Cobranza/acuerdos logic lives agency-side (`panel/inmobiliaria/ai/cobranza/acuerdos`) and in the sibling `agent` microservice; **none surfaced to the tenant**. |

## Pre-lease vs Post-lease classification

**Pre-lease (shopping → apply → get approved):**
- `explorar` — property search (`PropertySearchView embedded`, same engine as public `/propiedades`).
- `guardados` — wishlist (`useWishlist` store + `useWishlistedProperties`).
- `para-ti` — recommendations (`useRecommendations`).
- `aplicaciones` (+ `[applicationId]` + `[applicationId]/completar`) — application tracking, respond-to-info, withdraw.

**Transitional (pre→post handoff):**
- `contratos` (+ `[contractId]/firmar`) — review + e-sign; becomes the gateway to the active lease.

**Post-lease (operate the active relationship):**
- `arriendo` (+ `[leaseId]`) — active lease hub; today = payments only.
- `pagos` — pay rent (PSE / bank validation), payment history.
- `documentos` — document vault.

**Spans both:** `mensajes` — application-scoped chat, active from application through signed lease.

## Integration / Data source

- **Pattern: real backend via `NEXT_PUBLIC_BACKEND_URL`** (default `http://localhost:3000`), NOT mock. Tenant pages call typed service objects (`applicationsApi.getMine()`, `contractsApi.getMine()`, `messagesApi`, `properties.service`, `recommendations.service`, `documents.service`, `settings.service`) through `src/lib/api/*.service.ts` + `src/lib/api/client.ts`, consumed by hooks (`useApplications`, `useContracts`, `useMessages`, `useProperties`, `useRecommendations`).
- **Supabase** (`src/lib/supabase/client.ts`) present but only via `NEXT_PUBLIC_SUPABASE_*` (auth/storage); primary domain data is the NestJS-style backend REST API. The `agent` microservice (`AGENT_SERVICE_URL`) is **not** referenced from tenant pages.
- **Tenant↔agency messaging bridge: YES.** `src/components/messages/MessagesWidget.tsx` is shared, parametrized by `actor: 'tenant' | 'landlord'`, keyed on `applicationId`. Backend: `GET /messages/conversations`, `POST /applications/:id/chat/messages` (`messages.service.ts`). Tenant `/inquilino/mensajes` and agency `/panel/inmobiliaria/mensajes` render the same widget over the same application-scoped conversations. The contract signing page even deep-links `chatHref = /inquilino/mensajes?applicationId=...`. It is a **generic chat channel**, not structured case/ticket/agreement management.

## Aplicaciones + Contratos depth

- **Contratos: real, not mock.** Full signing flow with **real e-signature**: `SignatureForm` with `requireOTP={true}`, OTP verification token, `signAsTenant()` posting `acceptedTerms` + `consentText` + `signatureData`, `AuditTrail`, signed-PDF stamping via `useSignedPdfUrl` (iframe of backend signed URL), reject/request-changes (`rejectAsTenant`, `MODIFICATIONS`), cancel flow, dual origin (`GENERATED` template vs `UPLOADED_PDF`). Status machine: draft → pending_tenant → pending_landlord → signed → active (+ expired/cancelled/rejected). Backend-backed via `contractsApi` / `useContractActions`.
- **Aplicaciones: real, backend-backed.** List with list/grid views, pagination, active/history tabs, status→contract-status derivation (`displayStatusForApproved`), stats. Detail + `completar` (respond to info requests, doc upload via `POST /documents/upload`), withdraw. Fed by `applicationsApi.getMine()` / `getByIdForDisplay()`.

## Biggest structural gap

The tenant portal is a complete **acquisition funnel** (shop → apply → sign → pay) but has **no post-lease service/operations layer**. A tenant cannot raise a maintenance/repair request, file a PQRS, track an open case/expediente, or view/accept a payment agreement (acuerdo de pago) — all three pillars live only agency-side (`panel/inmobiliaria/pqrs`, `.../ai/cobranza/acuerdos`) or in the sibling `agent` microservice, with **zero tenant-facing surface**. The only bidirectional tenant↔agency channel is the application-scoped chat, which is unstructured messaging, not case/ticket/agreement management. Closing pillars 2/4/5 means building a new tenant "operate the relationship" section (routes + components + `*.service.ts` against the same `NEXT_PUBLIC_BACKEND_URL`), likely mirroring the agency PQRS/cobranza data models.
