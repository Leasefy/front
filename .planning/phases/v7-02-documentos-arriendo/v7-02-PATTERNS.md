# Phase v7-02: Documentos del Arriendo — Pattern Map

**Mapped:** 2026-07-17
**Worktree:** `/Users/nicolasgarcia/rent/mvp-portal-inquilino` (branch `plan/v7.0-portal-inquilino`)
**Files analyzed:** 6 surfaces (doc list/viewer, signed-URL service/hook, lease-docs data, paz y salvo, cert retención, Habeas Data consent + ARCO delete)
**Analogs found:** 4 exact / 2 no-analog (contract + honest empty-state)

> **Headline for the planner:** v7-02 is a **mixed** phase, not a "copy the twin" phase like v7-01.
> - A real **signed/expiring-URL pattern already exists** — `useSignedPdfUrl` → `contractsApi.getSignedPdfUrl` → `GET /contracts/:id/pdf` returning `ContractSignedPdf { url, expiresAt }`, with a blob-download idiom (`DownloadContractPdfButton`) that hides the Supabase URL. **This is the DOCU-04 signed-URL contract — reuse its shape verbatim for a new `documentsApi.getSignedUrl`.**
> - **BUT** the current documents page (`documentos/page.tsx`) and lease detail (`arriendo/[leaseId]/page.tsx`) serve **raw Supabase URLs** (`doc.url`, `lease.contractUrl`) in `<a href download>` / `<iframe src>` — an **IDOR-shaped gap**. v7-02's DOCU-04 work is routing every doc through the signed-URL contract instead of the raw URL.
> - **Contrato firmado + application docs = REAL today.** **Recibos** = list is real (`tenant-payment-requests`) but a per-payment **receipt PDF does not exist** (only `hasReceipt: boolean`, no `receiptUrl`) → label "comprobante interno", not "factura". **Paz y salvo** and **cert. retención 3.5%** have **no analog anywhere** → contract + honest "Próximamente" empty-state (frontend-first, same as v7-01).
> - The canonical **Habeas Data consent-by-purpose** pattern is the **avalúo** flow: `AvaluoFormData` with 3 separate consent booleans, factory defaults **all `false` (never pre-tick)** + `StepContacto.tsx` checkbox UI. Reuse it for DOCU-04.
> - ⚠️ The existing documents **viewer modal predates Cadence** (raw framer-motion + `bg-black/60`). Read DESIGN.md §17 (Dialog z-[300] vs drawer), §11 (empty/loading), §4 (banners/cards), §16 (dates → fix `es-CL` → `es-CO`) before touching it.

---

## File Classification

| New/changed file | Role | Data Flow | Closest analog (path:line) | Match |
|------------------|------|-----------|----------------------------|-------|
| `src/app/inquilino/documentos/page.tsx` (extend to lease docs; route via signed URL) | page/container | request-response (read) + file-I/O | *(itself — card grid + viewer)* + `arriendo/[leaseId]/page.tsx:560-602` (lease download rows) | self / role-match |
| `src/lib/api/documents.service.ts` (add `getSignedUrl`) + hook | service/client | file-I/O (signed URL) | `contracts.service.ts:214` `getSignedPdfUrl` + `useContracts.ts:182` `useSignedPdfUrl` | exact |
| *(component)* signed-PDF download button | component | file-I/O (blob) | `src/components/contract/DownloadContractPdfButton.tsx:36-63` | exact |
| Lease docs data (contrato + recibos) | service/hook | request-response (read) | `contracts.service.ts:214` (contrato) · `tenant-payment-requests.service.ts:14` (recibos list) | exact / partial |
| `paz-y-salvo` self-service generate+download | page/section | request-response + file-I/O (async gen) | *(no analog)* → avaluo async flow `avaluo.ts:165-174` (`downloadUrl?`) + `EmptyState` | no-analog |
| `cert-retencion` (3.5%) auto-generated | page/section | request-response + file-I/O (async gen) | *(no analog)* → same as paz y salvo | no-analog |
| Habeas Data consent-by-purpose gate | component/type | transform (form) | `src/lib/types/avaluo.ts:65-103,116` + `src/components/avaluo/StepContacto.tsx:63-143` | exact |
| ARCO delete (per-document) | service action | CRUD (delete) | `documents.service.ts:101` `delete(id)` → `DELETE /documents/:id` · `settings.service.ts:84,90` export/delete | exact |

---

## Pattern Assignments

### 1. Documentos page — extend to lease docs + route through signed URL — `src/app/inquilino/documentos/page.tsx`

**What it is today (verified):** a real, paginated card grid of **application** docs only. Data via `useMyApplications()` (`:45`) → `documentsApi.getByApplication(app.id)` fan-out (`:62-65`). Each card + viewer opens the doc via **raw `doc.url`** in `<a href={doc.url} download>` (`:371`, `:495`) and `<iframe src={doc.url}>` (`:526`). `DOC_TYPE_CONFIG` (`:19-34`) maps UPPER_SNAKE backend keys → label + Phosphor icon.

**Changes for DOCU-01 / DOCU-04:**
- **Add lease-doc categories** to `DOC_TYPE_CONFIG` (CONTRATO, RECIBO, PAZ_Y_SALVO, CERT_RETENCION) alongside the application keys.
- **Merge sources**: keep `getByApplication` fan-out; add contrato (via contracts signed URL — §4) and recibos (via `tenant-payment-requests` — §4). Use the same 403/404→`[]` honest-empty idiom (`leases.service.ts:120`) so a missing source degrades to empty, not crash.
- **Replace raw `doc.url`** everywhere with a **signed-URL fetch** (§2) — this is the concrete DOCU-04 "no IDOR" fix.
- **Loading/empty**: keep the existing `EmptyState` (`:291`) + spinner gate (`:142`); DESIGN.md §11.
- **Date bug**: `formatDate` uses `'es-CL'` (`:126`) — change to `'es-CO'` (DESIGN.md §16).

**Key idioms to copy from the lease-detail download rows** (`arriendo/[leaseId]/page.tsx:564-601`): the per-doc row = icon + label + `Download` icon, one row per available URL, conditionally rendered (`{lease.contractUrl && ...}`). But swap the raw `href={lease.contractUrl}` for the signed-URL download.

**⚠️ Viewer modal (`:452-556`) is pre-Cadence:** raw framer-motion + `bg-black/60 backdrop-blur-sm`. If the planner touches it, migrate to the canonical **Dialog** (`src/components/ui/dialog.tsx`, z-[300], DESIGN.md §17) or the drawer pattern (§4), scrim = warm-ink `#14130F/40` not black, and add `data-lenis-prevent` on the scroll body (DESIGN.md §8). Otherwise leave as-is (out of scope for DOCU-*).

---

### 2. Signed / expiring URL service + hook — `src/lib/api/documents.service.ts` (add `getSignedUrl`)

**This is the DOCU-04 backbone and it already exists for contracts — copy it verbatim.**

**Analog service** (`contracts.service.ts:214-216`):
```ts
async getSignedPdfUrl(id: string): Promise<ContractSignedPdf> {
  return apiClient.get<ContractSignedPdf>(`/contracts/${id}/pdf`);
}
```
**Analog type** (`contracts.types.ts:176-179`) — the exact "signed + expiring" shape for DOCU-04:
```ts
export interface ContractSignedPdf {
  url: string;
  expiresAt: string;   // ← expiry = the anti-IDOR guarantee to surface in UI
}
```
**Analog hook** (`useContracts.ts:182-208`) — `useSignedPdfUrl(id, { enabled })`, sets `url`/`isLoading`/`error`, `enabled` gate to avoid calling before it's needed, returns `{ url, isLoading, error, refetch }`.

**What to build:** `documentsApi.getSignedUrl(docId)` → `GET /documents/:id/signed-url` (or `/download-url`) returning `{ url, expiresAt }`, plus a `useSignedDocUrl` hook cloned from `useSignedPdfUrl`. Frontend-first: if the endpoint 403/404s, fall back to the raw `doc.url` behind an honest note OR empty — do **not** invent a fake signed URL. **Contract is the deliverable; backend wires the real signing behind it.**

**Current `getDownloadUrl` is the anti-pattern to replace** (`documents.service.ts:106-109`): it returns `doc.url` unchanged ("already a valid download URL (Supabase storage)") — that is the IDOR-shaped raw-URL exposure DOCU-04 removes.

---

### 3. PDF download idiom (blob, hides Supabase URL) — `src/components/contract/DownloadContractPdfButton.tsx`

**Analog** (`DownloadContractPdfButton.tsx:36-63`) — canonical: fetch the signed URL → `fetch(url)` → `.blob()` → `URL.createObjectURL` → `<a download>` click → `revokeObjectURL`. The inline comment states the intent: *"el usuario NO ve la URL de Supabase en la barra."* Uses `Button` primitive (`hideArrow`, `isLoading`), Sonner `toast.error` on failure, Cadence variant mapping (`:67-69`). **Copy this whole idiom** for every doc download in v7-02 (contrato, recibo, paz y salvo, cert). The v7-01 config data-export used the same Blob→`a.download` idiom (`landlord/configuracion/page.tsx:140-161`).

---

### 4. Lease documents data (contrato firmado + recibos) — data sources

| Doc type | Real source today | Signed? | Notes for planner |
|----------|-------------------|---------|-------------------|
| **Contrato firmado** | `contractsApi.getSignedPdfUrl(contractId)` (`contracts.service.ts:214`) via `useSignedPdfUrl`; OR `lease.contractUrl` (`lease.ts:59`, raw) | **YES** (contracts endpoint) / raw (lease field) | Prefer the contracts signed endpoint — it already returns `{ url, expiresAt }` and picks the correct stamped PDF by status. REAL today. |
| **Recibos de pago** | `tenantPaymentRequestsApi.getMine()` (`tenant-payment-requests.service.ts:14`) → `GET /tenant-payments/requests/mine`, via `useMyPaymentRequests()` | list REAL; **no receipt PDF** | `BackendTenantPaymentRequest` (`tenant-payment-requests.types.ts:22-49`) has `hasReceipt: boolean` (`:32`) but **no `receiptUrl`**. A downloadable per-payment receipt PDF **does not exist** → show the history list now; the PDF comprobante is v7-04 (Wompi). **Label "comprobante interno", never "factura"** (guardrail DIAN). |
| **Póliza / inventario** | `lease.insuranceUrl` / `lease.inventoryUrl` (`lease.ts:60-61`, raw) | raw | Same raw-URL → route through signed URL (§2) if surfaced here. |
| **Application docs** | `documentsApi.getByApplication(app.id)` (`documents.service.ts:56`) | raw | REAL today; the existing page already shows these. |

**Single-source-of-truth rule:** recibos/saldo trace to `tenant-payment-requests` (its header comment declares it *"la FUENTE ÚNICA del historial"*). Do not compute a second number.

---

### 5. Paz y salvo (self-service) & Cert. retención en la fuente 3.5% (auto-generated) — NO ANALOG

**Verified: neither feature exists anywhere tenant-facing.** `grep` for `paz y salvo` / `retención`/`retencion` / `3.5%` returns only marketing/landing/privacy copy and the seguro price "3.5%" — **zero** tenant document surface.

**Frontend-first plan (same playbook as v7-01):** build the UI card/section + the api-client **contract** + an honest **"Próximamente"** empty-state (DESIGN.md §11 `EmptyState`, `src/components/ui/empty-state.tsx`). **No fake generated document** on a path a real tenant can reach.

**Closest "request generation → poll → download" analog = the avalúo async flow** (`src/lib/types/avaluo.ts`):
- `IntakeResponse { id }` (`:159-162`) — POST to start generation.
- `AvaluoStatusResponse { status, downloadUrl? }` (`:165-174`) — poll `GET /:id/status`; `downloadUrl` (presigned) appears only when ready.
- Model the cert/paz-y-salvo contract on this: `POST /documents/paz-y-salvo` → id, then poll for a signed `downloadUrl`, then use the §3 blob-download idiom. Until the backend exists → empty-state.

**Cert retención framing:** it is a 3.5% withholding certificate (`retención en la fuente`) — auto-generated server-side; the frontend never computes the tax number (guardrail: single source of truth). Contract + empty-state until backend.

---

### 6. Habeas Data consent-by-purpose (Ley 1581/2012) — `AvaluoFormData` + `StepContacto.tsx`

**This is the canonical DOCU-04 consent pattern — reuse it, do not invent.**

**Type analog** (`src/lib/types/avaluo.ts:65-103`): three **separate** consent booleans, each documented with its Ley 1581 purpose:
- `purposeAvaluo` — REQUIRED (service can't proceed without it)
- `purposeDataset` — OPTIONAL
- `purposeContacto` — OPTIONAL
- `policyVersion` (`:97-102`) — stored server-side for audit.

**Never pre-tick** (`avaluo.ts:109-116`): `createEmptyAvaluoFormData()` defaults **all three consents to `false`** — the exact DOCU-04 requirement ("checkbox NOT pre-checked per purpose").

**UI analog** (`src/components/avaluo/StepContacto.tsx:63-143`): `<Checkbox>` from `src/components/ui/checkbox.tsx` (DESIGN.md §18 primitive), `checked={formData.purposeX}` bound to state (never a `defaultChecked`), `aria-required="true"` on the mandatory one, inline `text-warning` hint when the required consent is unchecked (`:95-99`), and a Ley 1581 policy notice footer (`:139-143`). For v7-02, gate **document access/generation per purpose** with this exact structure (one checkbox per processing purpose, mandatory one blocks the action).

---

### 7. ARCO — per-document delete + account export/delete

**Per-document delete already exists** (`documents.service.ts:101-103`): `documentsApi.delete(id)` → `DELETE /documents/:id`. Wire a real "Eliminar documento" action (DOCU-04 ARCO) behind a **confirmation Dialog** (`src/components/ui/dialog.tsx`, DESIGN.md §17) — never a bare `alert()`. Destructive `Button variant="destructive"` (DESIGN.md §4).

**Account-level ARCO** (already wired in v7-01 config, reuse if the page exposes it): `settingsApi.requestDataExport()` (`settings.service.ts:84`, blob → download JSON) + `settingsApi.deleteAccount()` (`:90`). Cite v7-01 PATTERNS §4 for the wiring.

---

## Shared Patterns

### api-client contract (all doc services)
**Source:** `src/lib/api/client.ts` + `leases.service.ts` (canonical). Typed `apiClient.get/post/delete<T>`; `ApiError(status, message)`; **403/404 → `[]` honest empty** (`leases.service.ts:120`, `tenant-payment-requests.service.ts:19`) — the frontend-first "endpoint may not exist yet → empty, not crash" contract. Reuse for `documentsApi.getSignedUrl` and any new doc service.

### Empty / loading / error states
**Source:** DESIGN.md §11 + `src/components/ui/empty-state.tsx`, `error-state.tsx`, `spinner.tsx`, `skeleton.tsx`. Paz y salvo / cert retención use `EmptyState` with an honest "Próximamente" title — labeled honestly, NOT fake data.

### Signed/expiring URL + blob download (DOCU-04 core)
**Source:** `useContracts.ts:182` (`useSignedPdfUrl`) + `contracts.service.ts:214` (`getSignedPdfUrl`) + `contracts.types.ts:176` (`ContractSignedPdf { url, expiresAt }`) + `DownloadContractPdfButton.tsx:36-63` (blob download that hides the storage URL). One chain covers "signed", "expiring", and "no raw URL in the bar".

### Consent-by-purpose (Habeas Data)
**Source:** `avaluo.ts:65-116` (3 booleans, never pre-tick, policyVersion) + `StepContacto.tsx:63-143` (`Checkbox` UI, required-gate, Ley 1581 notice).

### Money / date formatting
**Source:** DESIGN.md §16 — `formatCurrency()` for COP, `toLocaleDateString('es-CO', …)`. **Fix `es-CL` → `es-CO`** in `documentos/page.tsx:126`.

---

## No Analog Found

| Feature | Role | Data Flow | Reason → planner action |
|---------|------|-----------|-------------------------|
| **Paz y salvo (self-service)** | page/section | file-I/O (async gen) | No tenant-facing feature exists. Closest = avaluo async `downloadUrl` flow (`avaluo.ts:165-174`). → UI + api-client contract + honest "Próximamente" empty-state; blob-download idiom (§3) once backend exists. |
| **Cert. retención en la fuente 3.5%** | page/section | file-I/O (async gen) | Same — no analog; tax number computed server-side, never in frontend. → contract + empty-state. |
| **Per-payment receipt PDF (recibo)** | download | file-I/O | `tenant-payment-requests` list is real but exposes only `hasReceipt: boolean`, no `receiptUrl`. Real comprobante PDF = v7-04 (Wompi). → show list now, label "comprobante interno"; PDF deferred. |

---

## Metadata

**Analog search scope:** `src/app/inquilino/**` (documentos, arriendo/[leaseId], contratos, pagos), `src/lib/api/**` (documents, contracts, tenant-payment-requests, leases, settings, client), `src/lib/hooks/**` (useContracts), `src/lib/types/**` (avaluo, lease, contract), `src/components/contract/**`, `src/components/avaluo/**`, plus repo-wide grep for signed-URL, paz-y-salvo, retención.
**Files read end-to-end:** documentos/page.tsx, StepContacto.tsx, DownloadContractPdfButton.tsx, documents.service.ts; targeted reads of useContracts.ts, contracts.service/types, tenant-payment-requests.service/types, avaluo.ts, leases.types/lease.ts, arriendo/[leaseId] downloads section.
**Pattern extraction date:** 2026-07-17
**Read-only:** no source files modified; this PATTERNS.md is the only write.
