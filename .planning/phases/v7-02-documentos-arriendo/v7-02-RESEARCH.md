# Phase v7-02: Documentos del Arriendo — Research

**Researched:** 2026-07-17
**Domain:** Tenant lease-document access (Next.js 14 App Router, TypeScript, Tailwind/Cadence) — surfacing signed lease docs + Habeas Data discipline over an existing NestJS `/documents` + `/contracts` backend
**Confidence:** HIGH (reality map grounded in read file:line this session; guardrails cross-verified in PITFALLS against official Colombian norms)

> Milestone research already exists (`.planning/research/portal-inquilino/{PITFALLS,GAP-ANALYSIS,STACK}.md`). This RESEARCH synthesizes only the parts that bear on v7-02 and grounds every claim in current repo code. Companion: `v7-01-RESEARCH.md` (house style + api-client/empty-state pattern) — read it for the `403/404 → []` service pattern this phase reuses.

## Summary

Today `/inquilino/documentos` shows **only application documents** (`documentsApi.getByApplication` for each of the tenant's applications — `documentos/page.tsx:62-65`). It never touches lease documents. Meanwhile the repo **already has** a real, IDOR-safe signed-URL pattern — but it lives entirely in the **contracts** feature: `useSignedPdfUrl(id, {enabled})` (`useContracts.ts:182-208`) → `GET /contracts/:id/pdf` → `ContractSignedPdf { url, expiresAt }` valid 1h (`contracts.types.ts:171-179`). The signed contract PDF (with SHA-256 hash) is therefore **real and reachable today** via the contracts flow, but the documentos page reaches contract data (if at all) through raw persistent Supabase URLs, not the signed path.

So v7-02 splits cleanly: **contrato firmado** = real data + a real signed-URL contract already exists (wire it into documentos); **recibos** = payment history is real (`/tenant-payment-requests`) but the *receipt PDF* is a v7-04 deliverable (PAGO-03); **paz y salvo** and **cert. retención 3.5%** = **no code exists anywhere** (grep-verified) and both are backend auto-generation → contract + honest "Próximamente". The central Habeas Data correction: the documentos page serves files from **raw `doc.url`** (`documents.service.ts:106-109`, comment "already a valid download URL (Supabase storage)") with **no `expiresAt`, no consent capture, and no ARCO-delete surfaced** — even though `documentsApi.delete()` (`:101`) already exists. That is the IDOR/consent gap DOCU-04 targets.

**Primary recommendation:** Extend the documentos view to aggregate lease/contract docs alongside application docs, and route file access through a signed-URL contract modeled 1:1 on `ContractSignedPdf { url, expiresAt }` (mirror `useSignedPdfUrl`) — not raw `doc.url`. Surface the already-existing `documentsApi.delete()` as the ARCO action (behind the type-to-confirm gate; `safety.always_confirm_destructive=true`). Add per-purpose consent checkboxes modeled on the avalúo 3-boolean pattern (`avaluo.ts:65-111`, all default `false`). Ship **paz y salvo** and **cert. retención** as UI + api-client contract + "Próximamente" empty-state — never fabricate either (both are legal/fiscal assertions).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOCU-01 | Ve/abre docs del **arriendo** (contrato firmado, recibos de pago), no solo de la aplicación | Contrato firmado is REAL: `lease.contractUrl` (`leases.types.ts:33`, surfaced raw at `arriendo/[leaseId]/page.tsx:564-576`) **and** signed via `contractsApi.getSignedPdfUrl` → `GET /contracts/:id/pdf`. Recibos = payment rows real (`/tenant-payment-requests`); recibo **PDF** = v7-04 (PAGO-03). App docs already shown (`documentos/page.tsx:62`). |
| DOCU-02 | Descarga su paz y salvo self-service | **No code exists** (grep: 0 hits for `paz y salvo` outside landing copy). Backend must certify "sin deuda" against the single source of truth → contract + "Próximamente". |
| DOCU-03 | Obtiene cert. de retención en la fuente (3.5%) auto-generado | **No code exists** (grep: 0 hits). Fiscal document, backend auto-gen → contract + "Próximamente". |
| DOCU-04 | Habeas Data: URL firmada/expira (sin IDOR), consentimiento por propósito, borrar (ARCO) | Signed-URL model exists for contracts (`ContractSignedPdf`); documentos uses **raw `doc.url`** (`documents.service.ts:106`). ARCO delete method EXISTS (`documentsApi.delete`, `:101`) but not surfaced in UI. Consent model = avalúo 3-boolean (`avaluo.ts:65-111`). |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Signed/expiring file URL issuance | API/Backend (NestJS `/contracts/:id/pdf`, `/documents/*`) | Frontend hook (`useSignedPdfUrl`-style) | Only the server can mint a short-lived signed URL scoped to the caller's JWT; frontend just consumes `{ url, expiresAt }` |
| Contrato firmado (final PDF + hash) | API/Backend (`/contracts/:id/pdf`) | Frontend (contracts feature) | Backend stamps signatures + SHA-256; already real |
| Recibo PDF de pago | API/Backend (v7-04 / FACT module) | Frontend label "comprobante interno" | Fiscal-adjacent; must not be a client-rendered "factura" (PITFALLS 10) |
| Paz y salvo generation | API/Backend (certifies against `tenant-payment-requests`) | — | Legal "no-debt" assertion; cannot be computed client-side |
| Cert. retención 3.5% auto-gen | API/Backend (tax computation) | — | Fiscal certificate; backend-owned |
| Consent-by-purpose capture | Frontend form + API/Backend (audit store) | — | UI enforces unchecked-default per purpose; backend persists for SIC audit |
| ARCO delete (suprimir) | Frontend action → API/Backend (`DELETE /documents/:id`) | — | Method exists; frontend surfaces it behind confirm |
| Access logging (who/when read) | API/Backend | — | Purpose-limitation audit trail; out of frontend scope (note as dependency) |

## Document Reality Map (the core finding)

Legend: 🟢 real & wired · 🟡 real API exists but documentos page ignores it · 🔴 no backend / genuinely absent

| Doc type | State | What is REAL today (file:line) | Gap / where | v7-02 verdict |
|---|---|---|---|---|
| **Contrato firmado** | 🟡 | Signed PDF valid 1h via `contractsApi.getSignedPdfUrl` → `GET /contracts/:id/pdf` (`contracts.service.ts:214`; type `ContractSignedPdf{url,expiresAt}` `contracts.types.ts:171-179`), consumed by `useSignedPdfUrl` (`useContracts.ts:182-208`). Also raw `lease.contractUrl` (`leases.types.ts:33`) shown at `arriendo/[leaseId]/page.tsx:564-576`. | Documentos page never fetches it — only app docs (`documentos/page.tsx:62`). Raw-URL path (`lease.contractUrl`) has no expiry. | **Wire the signed path into documentos.** Data + signed-URL contract already real. |
| **Recibos de pago** | 🟡→🔴 | Payment history rows real: `useMyPaymentRequests` → `/tenant-payment-requests` ("fuente única"); `useMyPayments`. | **No receipt-PDF generator exists for rent.** ROADMAP assigns recibo PDF to **v7-04 / PAGO-03**. | **List/link payment rows; recibo PDF = forward-ref to v7-04.** If any receipt surface ships, label "comprobante interno" (never "factura"). |
| **Paz y salvo** | 🔴 | Nothing — grep 0 hits in `src/**` (only landing/privacy copy). | Requires backend to certify "al día" against the single source of truth. | **UI + api-client contract + "Próximamente".** NO fabrication (it is a legal no-debt statement). |
| **Cert. retención 3.5%** | 🔴 | Nothing — grep 0 hits (the seguro `3.5%` at `productos/seguro/page.tsx:686` is unrelated). | Fiscal auto-generation → backend. | **UI + api-client contract + "Próximamente".** NO fabrication (fiscal document). |
| **App docs (cédula, extractos, laboral, etc.)** | 🟢 | `documentsApi.getByApplication` (`documentos/page.tsx:62-65`); typed `DocumentItem`. | Served via **raw `doc.url`** (no signing/expiry); no consent record; no delete UI. | **Keep listing; harden per DOCU-04** (signed URL contract + consent + ARCO delete). |

**Bottom line:** 1 of 4 doc types (contrato firmado) is real *and* already has a signed-URL contract — it just isn't wired into documentos. Recibos are half-real (rows yes, PDF is v7-04). Paz y salvo + cert. retención are genuinely absent → contract + "Próximamente" only. The ROADMAP's "external-deps" framing is **correct** for paz y salvo / cert. retención; it *understates* how much of contrato firmado is already built (signed-URL contract exists — reuse, don't invent).

## Signed / Expiring URL Reality (DOCU-04 anti-IDOR)

**Does `useSignedPdfUrl` exist? YES — but scoped to contracts, not documents.**

- `useContracts.ts:182-208` — `useSignedPdfUrl(id, { enabled })` loads `contractsApi.getSignedPdfUrl(id)`.
- `contracts.service.ts:206-215` — `getPreview` → `GET /contracts/:id/preview` (`ContractPreview`: `GENERATED` html **or** `UPLOADED_PDF` with `pdfUrl`+`expiresAt`); `getSignedPdfUrl` → `GET /contracts/:id/pdf` → `ContractSignedPdf { url, expiresAt }` (**valid 1h**, backend picks the right PDF per signature state).
- Secure-file precedent #2 (agency/agent side): cobranza cartas use an **S3 presigned `signedUrl`** valid 7 days (`use-carta-approval.ts:128`; `generated/agent.ts:2965` `presignedUrl`/`expiresIn`). Precedent #3: avalúo uses presigned **PUT** for photo upload (`avaluo.service.ts`).

**Where secure file access is NOT done today:** the documentos page. `documents.service.ts:106-109` (`getDownloadUrl`) returns the raw `doc.url` verbatim with the comment "already a valid download URL (Supabase storage)"; the page binds it directly into `href`/`iframe src`/`img src` (`documentos/page.tsx:371, 495, 520, 526, 540`). `BackendDocumentFull` has **no `expiresAt`** (`documents.types.ts:6-20`). From the frontend this is an opaque, persistent URL — its IDOR-safety depends entirely on the backend's storage ACL, which we cannot assert.

**Honest frontend-first stance (state this to the planner verbatim):**
1. Define an api-client contract `getSignedUrl(docId) → { url, expiresAt }` for the generic documents endpoint, **modeled 1:1 on `ContractSignedPdf`**, and a `useSignedDocUrl` hook mirroring `useSignedPdfUrl`. Consume `{ url, expiresAt }`; re-fetch on expiry.
2. For **contrato firmado**, use the *existing* `getSignedPdfUrl`/`useSignedPdfUrl` — do not build a parallel one.
3. Where the backend still returns a raw persistent Supabase URL (today's `/documents` behavior), **flag it as a backend gap** and do not claim the criterion "sin IDOR" is met by the frontend alone. DOCU-04's IDOR clause is only fully satisfiable once `/documents/:id` returns a signed, short-lived, ownership-checked URL — that is an external dependency, honestly disclosed, not something the frontend can fake.

## Habeas Data Guardrails (concrete do/don't — success criteria, non-negotiable)

From PITFALLS 7 + Security-Mistakes rows + DOCU-04 + Ley 1581/2012 / Decreto 1377/2013. Each is a hard constraint on the plan:

1. **Signed/expiring URLs, no IDOR (PITFALLS security row 1).**
   - DO: serve every doc via a `{ url, expiresAt }` contract (contract model); use opaque UUIDs, server-side ownership check.
   - DON'T: bind raw/persistent `doc.url` into `href`/`iframe` on a tenant-reachable path; DON'T expose sequential/guessable IDs in download URLs.
2. **Consent by purpose — checkbox NOT pre-checked, one purpose each (PITFALLS security row 2 + Decreto 1377/2013).** Canonical model already in-repo: `avaluo.ts:65-111` — **three separate booleans** (`purposeAvaluo` mandatory, `purposeDataset`/`purposeContacto` optional), each with its own inline purpose string, **all default `false`** ("never pre-tick").
   - DO: mirror that — one unchecked-by-default checkbox per purpose, purpose stated inline.
   - DON'T: a single blanket "acepto tratamiento de datos" covering all doc types/uses; DON'T bundle consent into generic ToS; DON'T reuse application-time consent to justify a *new* post-lease purpose.
3. **Working ARCO delete / "suprimir" (PITFALLS 7 + "Looks Done But Isn't").** `documentsApi.delete(id)` → `DELETE /documents/${id}` **already exists** (`documents.service.ts:101`) but is **not surfaced** in the documentos UI.
   - DO: surface a real "solicitar eliminación" action wired to `documentsApi.delete`, behind the type-to-confirm gate (`safety.always_confirm_destructive=true`).
   - DON'T: fake the delete (theater); DON'T offer delete on documents under legal/contractual retention (a **signed contract is a legal record** — ARCO "suprimir" has statutory exceptions; delete applies to application/uploaded personal docs, not the executed contract). Surface this distinction, don't blanket-delete.
4. **Access logging (who/when/why read).** Backend concern (out of frontend scope) — note as a dependency for SIC-auditability; do not claim it's satisfied by the frontend.

## "comprobante interno" ≠ "factura" (DIAN guardrail — PITFALLS 10)

Any portal-generated payment receipt must be labeled **"comprobante interno"**, never "factura", until the FE-DIAN engine (FACT / M2) issues a real electronic invoice with CUFE.

- **Where it applies in v7-02:** the recibo/receipt surface. Today **no receipt PDF exists** in the portal (grep-verified) and the ROADMAP assigns the receipt PDF + label to **v7-04 / PAGO-03**. So v7-02's exposure is limited: if this phase lists recibos at all, any label/button must say "comprobante interno" and must **not** render a client-side "factura".
- **Where the label lives:** wherever a receipt is rendered/linked (the documentos recibos surface, and later the v7-04 pagos receipt). The repo has both PDF toolchains available (`jspdf ^4.2.1`, `@react-pdf/renderer ^4.5.1`; client precedent `generate-score-pdf.ts`, backend-render precedent `use-pdf-download.ts`) — but a *client-rendered* rent receipt on a real-tenant path invites the fiscal-standing problem. Prefer forward-referencing the receipt PDF to v7-04's backend path; if a placeholder is needed now, label it "comprobante interno" and gate it honestly.

## Frontend-First Boundaries (per success criterion)

| Criterion | Verdict | Why |
|---|---|---|
| **DOCU-01** contrato firmado visible | **Fully doable now** | Signed PDF contract + `useSignedPdfUrl` already real; aggregate into documentos view |
| **DOCU-01** recibos visible | **Partial — rows now, PDF v7-04** | Payment rows real (`/tenant-payment-requests`); recibo PDF = PAGO-03. List/link now, forward-ref the PDF |
| **DOCU-02** paz y salvo self-service | **Contract + "Próximamente"** | No backend; legal no-debt assertion — cannot fabricate |
| **DOCU-03** cert. retención 3.5% auto-gen | **Contract + "Próximamente"** | No backend; fiscal auto-gen — cannot fabricate |
| **DOCU-04** signed URL / no IDOR | **Contract now; full satisfaction needs backend** | Consume `{url,expiresAt}` contract; raw-URL `/documents` remains a disclosed backend gap |
| **DOCU-04** consent by purpose | **Fully doable now** | Mirror avalúo 3-boolean unchecked-default pattern |
| **DOCU-04** ARCO delete | **Fully doable now** | `documentsApi.delete` exists — surface behind confirm gate |

**NO fake data on any path a real tenant can reach.** Paz y salvo and cert. retención get honest "Próximamente" empty-states (same discipline as the agency acuerdos page and v7-01 sessions).

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| Signed PDF URL for contract | New signing hook | `useSignedPdfUrl` / `contractsApi.getSignedPdfUrl` (`useContracts.ts:182`) | Already real, `{url,expiresAt}` 1h, IDOR-safe |
| Generic doc signed URL | Raw `doc.url` in href | New `getSignedUrl(docId)→{url,expiresAt}` contract modeled on `ContractSignedPdf` | Anti-IDOR; expiry-aware |
| ARCO delete | `setTimeout` theater | `documentsApi.delete(id)` (`documents.service.ts:101`) behind confirm | Real endpoint exists |
| Consent capture | Blanket ToS checkbox | Per-purpose unchecked-default booleans (avalúo model `avaluo.ts:65-111`) | Decreto 1377/2013 validity |
| Doc fetch/list | New fetch loop | `documentsApi.getByApplication` + a lease/contract aggregate | Established, mapped, error-handled |
| Empty/loading/error UI | Bespoke divs | `<EmptyState>` / `<ErrorState>` / `<Spinner>` (DESIGN.md §11) | Cadence canonical |
| Money/date formatting | ad-hoc `toLocaleString`, `es-CL` | `useI18n().formatCurrency` (COP) + Colombian locale | DESIGN.md §16; documentos still uses `es-CL` (`documentos/page.tsx:126`) — fix |
| Receipt PDF | Client "factura" render | Forward-ref v7-04 backend path; label "comprobante interno" | DIAN fiscal standing (PITFALLS 10) |

## Common Pitfalls (v7-02-specific)

### Pitfall 1: Fabricating paz y salvo or cert. retención
**What goes wrong:** treating them as "just another PDF" and client-rendering a placeholder that a real tenant could mistake for an official document. **Why:** they *look* self-contained. **Avoid:** UI + api-client contract + "Próximamente" only — both are legal/fiscal assertions the backend must generate/certify. **Warning sign:** any client-side "paz y salvo" or "retención" string on a real-tenant path with generated content.

### Pitfall 2: Serving lease docs via raw persistent URLs (IDOR)
**What goes wrong:** wiring `lease.contractUrl` / `doc.url` directly into `href`/`iframe` (as documentos already does). **Avoid:** route through `{url,expiresAt}` signed contract; for contrato firmado use the existing `getSignedPdfUrl`. Flag any residual raw-URL path as a backend gap, don't claim "sin IDOR". **Warning sign:** persistent Supabase/S3 URL in a tenant component with no expiry.

### Pitfall 3: One blanket consent checkbox
**What goes wrong:** a single "acepto tratamiento de datos" covering all doc types/uses, or reusing application-time consent for a new post-lease purpose. **Avoid:** per-purpose unchecked-default checkboxes (avalúo model). **Warning sign:** pre-checked box; one boolean for many purposes.

### Pitfall 4: ARCO delete as theater, or deleting the signed contract
**What goes wrong:** a fake "eliminar" toast, OR offering delete on the executed contract (a legal record with statutory retention). **Avoid:** wire `documentsApi.delete` for personal/application docs behind the confirm gate; exclude the signed contract from delete with an honest explanation. **Warning sign:** `setTimeout` in the delete handler; a delete button on the contrato firmado card.

### Pitfall 5: Labeling a receipt "factura"
**What goes wrong:** a "Descargar factura" button producing a non-fiscal PDF (no CUFE). **Avoid:** "comprobante interno"; defer the real receipt PDF to v7-04/FACT. **Warning sign:** "factura" string anywhere in v7-02 receipt copy.

## Runtime State Inventory (additive UI phase)

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None new — docs live in backend `/documents` + Supabase storage; no client datastore key introduced | None (backend owns doc + consent records) |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | Reuses `NEXT_PUBLIC_BACKEND_URL` (already set); no new secret. (Avalúo path uses `NEXT_PUBLIC_AVALUO_URL` — not in scope here) | None |
| Build artifacts | None — additive components; no rename/deletion planned | None |

**Nothing found in any category** — verified: v7-02 is additive UI over existing services; it stores no new client-side state (consent + docs persist server-side).

## Risks / Unknowns (planner must resolve)

| # | Risk / unknown | Recommended approach |
|---|---|---|
| **R1** | `/documents/:id` returns raw persistent Supabase URLs, not signed/expiring — can't assert "sin IDOR" from FE | Define + consume `{url,expiresAt}` contract; use existing `getSignedPdfUrl` for contrato; **disclose the `/documents` signing as a backend dependency** in DOCU-04, don't fake-claim it |
| **R2** | Does the backend expose lease-scoped doc listing, or only per-application (`/documents/application/:id`) and per-contract (`/contracts/:id/pdf`)? | Aggregate client-side from `useMyApplications` + `useContracts`/`useLeases` (contrato firmado); define an aspirational `documentsApi.getByLease` contract for when the backend adds it |
| **R3** | Consent-by-purpose has no persistence endpoint for the documents surface yet | UI enforces unchecked-default now; define the api-client contract to POST consent records; honest empty-state / local gate until backend persists (SIC-audit store = backend dep) |
| **R4** | ARCO delete on which docs? Signed contract must be excluded | Wire `documentsApi.delete` for personal/application docs only; contract card = no delete + inline "documento legal, no eliminable" note |
| **R5** | Recibo PDF overlaps v7-04 (PAGO-03) | v7-02 lists/links payment rows; forward-ref the receipt PDF to v7-04; if any receipt UI appears, label "comprobante interno" |
| **R6** | Paz y salvo / cert. retención auto-gen entirely backend | Contract + "Próximamente" empty-state; no client generation |
| **R7** | Documentos page still `es-CL` locale + no consent/delete UI | Fix locale to Colombian; add consent + ARCO surfaces as part of the DOCU-04 hardening |

## Environment Availability

| Dependency | Required by | Available | Notes |
|---|---|---|---|
| NestJS backend (`NEXT_PUBLIC_BACKEND_URL`) | `/documents`, `/contracts/:id/pdf`, `/tenant-payment-requests` | ✓ (assumed running) | `apiClient` degrades to `[]`/error-state if down |
| Supabase auth (`tenant` JWT) | all reads/writes | ✓ | Same JWT across portal |
| `/documents/:id` signed-URL support | DOCU-04 anti-IDOR | ✗ (raw URL today) | **Backend gap** — disclosed, not faked |
| Paz y salvo / cert. retención generation | DOCU-02, DOCU-03 | ✗ | **Backend gap** — "Próximamente" |
| New npm packages | — | N/A | **Zero** new deps; `jspdf`/`@react-pdf/renderer` already present if a comprobante is rendered |

**Missing with no fallback (block full criterion):** `/documents` signing (DOCU-04 IDOR clause), paz y salvo + cert. retención auto-gen (DOCU-02/03). **Missing with fallback:** none require a workaround — all use the honest contract + "Próximamente" pattern.

## Package Legitimacy Audit

**None — v7-02 installs zero external packages.** It reuses existing hooks/services (`documentsApi`, `contractsApi`, `useSignedPdfUrl`) and Cadence primitives; PDF libs (`jspdf`, `@react-pdf/renderer`) are already in `package.json`. No slopcheck/registry verification applicable.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config | vitest defaults (no standalone config) |
| Run command | `pnpm test` (`vitest run`) · watch `pnpm test:watch` |
| Existing coverage | service tests in `src/lib/api/*.test.ts`; `transcript-pdf-document.test.tsx` (PDF render precedent) |

### Phase Requirements → Test Map
| Req | Behavior | Test type | Command | Exists? |
|-----|----------|-----------|---------|---------|
| DOCU-01 | documentos aggregates contract + app docs; contract via signed URL not raw | unit (mock services) / manual | `pnpm test` | ❌ Wave 0 |
| DOCU-02/03 | paz y salvo + cert. retención render honest "Próximamente", no generated content | unit / manual | `pnpm test` | ❌ Wave 0 |
| DOCU-04 | consent boxes unchecked by default; ARCO delete calls `documentsApi.delete`; no raw `doc.url` in tenant href | unit + grep gate | `grep -n "doc.url" src/app/inquilino/documentos` | ❌ Wave 0 |

### Sampling
- Per task: `pnpm test` + `pnpm build` (CI does NOT run `next build` — MEMORY `project-mvp-ci-build-gap`; run locally before calling a PR mergeable).
- Phase gate: `pnpm test` green + `pnpm build` green + manual smoke of documentos as a `tenant` (contract opens via signed URL; paz y salvo/retención show "Próximamente"; delete confirms + calls real endpoint; no "factura" string).

### Wave 0 Gaps
- [ ] No component/page tests for documentos today — add a smoke test asserting contract docs use the signed-URL path and that consent checkboxes default `false`.
- [ ] Grep gate: no raw `doc.url`/`lease.contractUrl` bound into a tenant `href`/`iframe` without going through the signed contract; no "factura" string in v7-02 receipt copy.

## Security Domain

### Applicable ASVS categories
| ASVS | Applies | Control |
|------|---------|---------|
| V4 Access Control | **yes** | Every doc fetch ownership-checked + served via short-lived signed URL (`{url,expiresAt}`); no raw persistent URL, no guessable IDs → **the core IDOR control for DOCU-04** |
| V5 Input Validation | yes | Consent booleans validated (mandatory purpose must be true before proceeding); doc-type filter sanitized |
| V6 Cryptography | no (frontend) | Signing happens server-side; frontend never mints URLs |
| Privacy / Habeas Data | **yes** | Per-purpose consent (unchecked default), ARCO delete surfaced, access-log dependency disclosed (Ley 1581/2012, Decreto 1377/2013) |

### Threat patterns for this stack
| Pattern | STRIDE | Mitigation |
|---|---|---|
| IDOR via guessable/persistent doc URL | Info disclosure | Signed short-lived URL + server ownership check (DOCU-04); flag raw-URL `/documents` as backend gap |
| Invalid consent (pre-checked/bundled) | Repudiation / compliance | Per-purpose unchecked-default (avalúo model) |
| ARCO-delete theater | Repudiation | Wire real `documentsApi.delete` behind confirm gate |
| Non-fiscal PDF presented as "factura" | Consumer-law (Ley 1480) / DIAN | Label "comprobante interno"; defer real receipt to v7-04 |
| Deleting a legal record (signed contract) | Compliance | Exclude executed contract from ARCO delete; explain inline |

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | `/contracts/:id/pdf` returns a tenant-scoped signed URL (`{url,expiresAt}`, 1h) for the tenant's own contract | Signed-URL Reality, DOCU-01 | If tenant lacks read access, contrato firmado falls back to `lease.contractUrl` (raw) — still shows, but not IDOR-hardened |
| A2 | `/documents/*` returns raw persistent Supabase URLs (no `expiresAt`) | R1, DOCU-04 | If backend already signs them, the IDOR clause is closer to met — verify at plan time; the contract we define is forward-compatible either way |
| A3 | Paz y salvo + cert. retención have **no** backend endpoint yet | DOCU-02/03 | If an endpoint exists, upgrade from "Próximamente" to real fetch — cheap change |
| A4 | Recibo PDF belongs to v7-04 (PAGO-03), not v7-02 | DOCU-01 recibos, R5 | If receipts must ship in v7-02, scope expands — confirm in discuss-phase; still "comprobante interno" |
| A5 | `documentsApi.delete` (`DELETE /documents/:id`) is authorized for the tenant on their own docs | ARCO, R4 | If 403 for tenants, ARCO delete becomes a "request deletion" contract + backend dep (still honest, not theater) |

## Sources

### Primary (HIGH — in-repo code read this session)
- `src/app/inquilino/documentos/page.tsx:62-65,126,371,495,520,540` (app-docs-only fetch; raw `doc.url`; `es-CL` locale; no consent/delete)
- `src/lib/api/documents.service.ts:50,56,73,101,106-109` (`getByApplication`, `delete`, `getDownloadUrl` returns raw url); `documents.types.ts:6-20` (`BackendDocumentFull`, no `expiresAt`)
- `src/lib/hooks/useContracts.ts:182-208` (`useSignedPdfUrl`); `src/lib/api/contracts.service.ts:206-215` (`getPreview`, `getSignedPdfUrl`); `contracts.types.ts:164-179` (`ContractPreview`, `ContractSignedPdf{url,expiresAt}`)
- `src/lib/api/leases.types.ts:32-35` (`contractUrl`/`insuranceUrl`/`inventoryUrl`); `src/app/inquilino/arriendo/[leaseId]/page.tsx:560-593` (raw lease-doc hrefs)
- `src/lib/types/avaluo.ts:65-111` (3-consent-boolean unchecked-default model); `src/app/avaluo/verificar/[slug]/page.tsx` (public cert / QR verification pattern, placeholder)
- `src/lib/hooks/cobranza/use-carta-approval.ts:128`, `src/lib/api/generated/agent.ts:2965` (S3 presigned `signedUrl`/`expiresIn` precedent); `src/lib/utils/generate-score-pdf.ts`, `src/lib/cotizador/use-pdf-download.ts` (client vs backend PDF render precedents); `package.json:57,70` (`@react-pdf/renderer`, `jspdf`)
- grep (0 hits): `paz y salvo`, `retención en la fuente` in `src/**` → both genuinely absent
- `.planning/config.json` (`safety.always_confirm_destructive=true`; nyquist/security keys absent → treated enabled)

### Milestone research (HIGH — synthesized, not re-derived)
- `.planning/research/portal-inquilino/PITFALLS.md` (Pitfalls 7, 10; Security/UX rows — official-norm-verified); `.planning/{ROADMAP,REQUIREMENTS}.md`; `v7-01-RESEARCH.md` (api-client/empty-state pattern)

## Metadata

**Confidence breakdown:**
- Document reality map: HIGH — every claim cites a read file:line or a grep-verified absence.
- Signed-URL finding: HIGH — `useSignedPdfUrl` + `ContractSignedPdf` read directly.
- Guardrails: HIGH — PITFALLS cross-verified against official Colombian norms; consent model grounded in in-repo avalúo code.
- Backend availability (A1–A5): MEDIUM — service methods exist and are typed; runtime behavior of `/documents` signing not runtime-verified this session.

**Research date:** 2026-07-17
**Valid until:** ~2026-08-16 (stable; revisit if backend `/documents` or `/contracts/:id/pdf` contracts change)
