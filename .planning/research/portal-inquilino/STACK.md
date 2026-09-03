# Stack Research — Enhanced Tenant Portal (Pagos, PQRS, Documentos, Estado de casos, Acuerdos de pago, Comunicación)

**Domain:** Additive enhancement to existing Next.js 14 tenant portal (`src/app/inquilino/`)
**Researched:** 2026-07-16
**Confidence:** HIGH — every conclusion below is grounded in code already present in this repo (read directly), cross-checked against current Wompi/Bold official docs.

## Headline Finding

**No new npm dependency is required for any of the 6 pillars.** Every capability needed (hosted-checkout payment redirect, polling-based "live" updates, PDF/image viewing with signed URLs, canvas e-signature + OTP) already exists in this codebase in a form that generalizes directly. The work for v7.0 is **wiring and generalizing existing patterns**, not stack selection. This is the single most important input for the roadmap: budget these phases as integration/plumbing work, not "new tech" spikes.

## Recommended Stack

### Core Technologies (existing — reused, not added)

| Technology | Version (from package.json) | Purpose in this milestone | Why reused instead of replaced |
|------------|---------|---------|-----------------|
| Next.js App Router API routes (`route.ts`, `runtime = 'nodejs'`) | Next.js 14.2.35 | Server-side Wompi integrity-hash / payment-session endpoints | Exact pattern already shipped for avalúos (`src/app/api/avaluo/wompi-session/route.ts`) — model rent-payment and payment-agreement checkout sessions on it |
| `node:crypto` (Node built-in, no package) | Node 25.9 runtime | SHA-256 integrity hash for Wompi checkout params | Zero new dependency — already how the avalúo route computes `integrity` server-side, secret never touches the client |
| `react-signature-canvas` | ^1.1.0-alpha.2 | Canvas-drawn signature capture for payment-agreement acceptance | Already powers `SignaturePad` for contract e-signature; API is entity-agnostic (just emits a PNG data URL) |
| Plain `setInterval` + `useVisibilityPolling` hook | n/a (in-repo hook, `src/lib/hooks/useVisibilityPolling.ts`) | "Live" updates for messages, case status, payment-agreement status | Already the established pattern across the app (chat: 5s, unread badge: 30s, cobranza dashboards, cotizador quote stream) |
| `<iframe src={signedUrl}>` for PDF, `<img>` for images | n/a (native browser rendering) | Document/case-attachment/agreement viewing | Already used in `documentos/page.tsx` viewer modal and `contratos/[id]/firmar` (`ContractDocumentView`) — zero-dependency, works for any signed URL |
| Backend-issued signed/expiring URLs (Supabase Storage, via agent microservice) | n/a (backend contract) | Habeas Data–safe document access | Already the pattern for contract PDFs (`contractsApi.getSignedPdfUrl` → `useSignedPdfUrl`) and tenant documents; short-TTL URLs are a backend concern, not a frontend library choice |
| `isomorphic-dompurify` | ^2.16.0 | Sanitizing any HTML rendered from PQRS/case descriptions, message bodies, or agreement text (`agreementText` field) | Already used via `sanitizeContractHtml` for GENERATED contract HTML — same risk class (backend-authored HTML shown to the tenant) |
| `sonner` | ^2.0.7 | Toast feedback for payment/agreement/PQRS actions | Already the app-wide toast library |

### Supporting Libraries (existing — confirm reuse, no additions)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@react-pdf/renderer` | ^4.5.1 | Generating any NEW downloadable PDF (e.g., a printable PQRS receipt or payment-agreement summary) | Only if a pillar needs to *generate* a PDF client/server-side that doesn't already exist as a backend artifact. Documents pillar does NOT need this — it only *views* backend-issued PDFs |
| `react-dropzone` | ^15.0.0 | File attachment upload in PQRS/Solicitudes (e.g., photo evidence for a complaint) | Reuse as-is if a PQRS ticket needs attachments, same as application document uploads |
| `zod` | ^3.25.76 | Validating new request bodies (payment-session routes, PQRS forms) | Standard for any new `route.ts` or form in this repo |
| `framer-motion` | ^12.27.1 | Page/modal transitions for new pillar pages | Match existing `inquilino/*` page animation conventions |

### Infrastructure / Provider Contracts (not npm packages — API contracts already defined server-side)

| Contract | Where | Purpose | Frontend implication |
|----------|-------|---------|-----------------|
| `CarteraPaymentPlanOfferResponse` / `CarteraPaymentPlanDetailResponse` (agent microservice, `src/lib/api/generated/agent.ts:3716-3769`) | Leasefy/agent, already generated into this repo's OpenAPI types | Payment-agreement (Acuerdos de pago) offer + detail, including `paymentUrl: string` and `paymentProvider: "wompi" \| "bold" \| "stub"` | Frontend just renders `installments[]`, `agreementText`, and a button/link to `paymentUrl` — **no SDK, no provider branching logic needed**, the URL is already fully formed by the microservice |
| Wompi Web Checkout (hosted redirect) | `https://checkout.wompi.co/p/?...&signature:integrity=...` | Rent payment / avalúo-style one-off payment | Confirmed current via official docs (docs.wompi.co, checked 2026-07-16): Wompi explicitly supports "secure external redirection (Web Checkout)" as an alternative to the embedded Widget — this repo already uses the redirect form. Continue it. |
| Bold Link de Pagos API (`POST /online/link/v1`) | developers.bold.co | Alternative rail already modeled in the agent's `paymentProvider` enum | Server-side only (agent microservice mints the link); frontend never talks to Bold directly |

## Installation

```bash
# No installation needed. All required capabilities are already in dependencies.
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Hosted-checkout redirect (Wompi Web Checkout / Bold Link de Pagos), server-mints URL | Wompi embedded Widget (`checkout.wompi.co/widget.js`) | Only if product wants payment to happen without leaving the page (popup). Adds a third-party script + client-side event wiring for a marginal UX gain; the existing avalúo redirect pattern already works and is what the agent microservice's `paymentUrl` contract assumes. Do not introduce unless explicitly requested. |
| Polling (`setInterval` + `useVisibilityPolling`) | Server-Sent Events (SSE) or WebSockets (e.g., via a small `ws`/`socket.io-client` addition, or Next.js Route Handlers streaming) | Only if the product requires sub-second update latency (e.g., a live typing indicator) or the update volume becomes high enough that 5-30s polling meaningfully degrades UX. Nothing in the 6 pillars (payments, PQRS, documents, case status, agreements, messaging) has that requirement — all are human-paced state transitions. Introducing SSE/WS would also require new infra thought (Vercel serverless functions don't hold long-lived connections well; the agent microservice on :4000 would need to own the stream) — a real architecture change, not a drop-in library swap. |
| Native `<iframe>` / `<img>` document viewing | `react-pdf` (pdf.js wrapper) or `@react-pdf-viewer/core` | Only if a future requirement needs in-browser PDF annotation, page-level thumbnails, text search inside the PDF, or client-side watermarking overlays. Plain viewing/downloading does not need it — browsers render PDFs natively in an iframe, which is exactly what this codebase already does everywhere. |
| `react-signature-canvas` (already installed) reused for payment-agreement e-signature | A dedicated e-signature vendor (DocuSign, HelloSign/Dropbox Sign API) | Only if payment agreements need vendor-witnessed, non-repudiable e-signatures with third-party audit certificates beyond what OTP + canvas + backend PDF-stamping already provides for contracts. Given contracts (a *stronger* legal document) already use the in-house canvas+OTP flow, payment agreements do not need a heavier solution. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| Any Wompi/Bold npm wrapper package (`wompi-node`, unofficial Bold SDKs, etc.) | Both providers' official *frontend* integration is a plain URL (redirect or `<a href>`); wrapper packages target server-side transaction APIs, which live in the agent microservice, not this frontend repo | Keep payment logic in the agent microservice; frontend only builds/redirects to a URL, per the existing `WompiPayButton` pattern |
| A new WebSocket/SSE library for "real-time" messaging or case status | Not justified by this app's update cadence or serverless-first hosting (Vercel); adds an infra dependency (persistent connection owner) with no current requirement driving it | `useVisibilityPolling` (already in-repo) at 5-30s intervals, same as existing chat/cobranza/cotizador surfaces |
| `react-pdf` / `pdf.js` / any client-side PDF rendering library | Existing iframe-based viewing already handles PDFs correctly with zero bundle cost; adding pdf.js means shipping a ~1MB wasm/js payload for a capability the browser already provides | Native `<iframe src={signedUrl}>`, exactly as `documentos/page.tsx` and `ContractDocumentView` already do |
| A second/duplicate signature-capture library | `react-signature-canvas` is already a proven dependency with an established design (white background, black ink, PNG data URL, backend PDF stamping) | Reuse `SignaturePad`; generalize `OTPVerification` (currently hardcoded to `contractsApi.sendOtp/verifyOtp` by `contractId`) to accept an injectable send/verify pair, or add a thin sibling component following the same shape for payment-plan OTP |
| Client-side PII caching / localStorage of documents or payment agreements | Habeas Data (Ley 1581 de 2012) risk — signed URLs are short-TTL by design; persisting them or their content client-side defeats that | Keep documents/agreements fetched on-demand via the existing signed-URL hooks pattern (`useSignedPdfUrl`-style); do not add offline-cache libraries (e.g., IndexedDB wrappers) for this data |

## Stack Patterns by Variant

**If the rent-payment flow moves off the PSE mock (`/pse-mock/process`) to a real rail:**
- Model the new payment-session route on `src/app/api/avaluo/wompi-session/route.ts` (server-side integrity hash, `WOMPI_INTEGRITY_SECRET`/`WOMPI_PUBLIC_KEY` env vars, never `NEXT_PUBLIC_`-prefixed).
- Because the agent microservice's cartera/payment-plans contract already mints `paymentUrl` server-side for `wompi | bold | stub`, prefer routing *all* tenant-initiated payments (recurring rent AND payment agreements) through that microservice contract rather than maintaining two separate integrity-hash implementations in this frontend repo. Confirm with the agent team whether a parallel "single rent payment" (not an installment plan) endpoint exists or needs to be added there — that's a cross-repo/backend research question, not a frontend stack question.

**If "Acuerdos de pago" needs tenant acceptance before payment (not just payment):**
- Reuse `SignatureForm` + `SignaturePad` + a generalized OTP component, exactly as contract signing does, gated on `agreementText` (already returned by the backend) instead of the contract template HTML.

**If PQRS/Solicitudes need file attachments:**
- Reuse `react-dropzone` (already a dependency, already used for application document uploads) — no new upload library needed.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `react-signature-canvas@^1.1.0-alpha.2` | React 18.2 | Alpha version pin already in use and working in production (contract signing); do not "upgrade" to a different signature library as part of this milestone — out of scope and unnecessary |
| Wompi Web Checkout / integrity hash spec | No SDK version to track (URL + SHA-256 spec, unchanged since original avalúo integration) | Verified current against docs.wompi.co (2026-07-16): redirect ("Web Checkout") remains a first-class, documented integration path alongside the embedded Widget |
| Agent microservice OpenAPI types (`src/lib/api/generated/agent.ts`) | Regenerated via `pnpm api:gen` | Payment-agreement fields (`paymentUrl`, `paymentProvider`, `installments`) already present in the currently-committed generated types — no regeneration needed to start planning against them, but re-run `api:gen` before implementation to pick up any tenant-facing endpoint additions the agent team makes |

## Sources

- In-repo (read directly, HIGH confidence): `src/components/avaluo/WompiPayButton.tsx`, `src/app/api/avaluo/wompi-session/route.ts`, `src/app/inquilino/contratos/[contractId]/firmar/page.tsx`, `src/components/contract/SignaturePad.tsx`, `src/components/contract/SignatureForm.tsx`, `src/components/contract/OTPVerification.tsx`, `src/app/inquilino/documentos/page.tsx`, `src/app/inquilino/pagos/page.tsx`, `src/components/tenant/PayRentModal.tsx`, `src/lib/hooks/useMessages.ts`, `src/lib/hooks/useVisibilityPolling.ts`, `src/lib/hooks/useContracts.ts` (`useSignedPdfUrl`), `src/lib/api/generated/agent.ts` (cartera/payment-plans schemas, lines ~2187-2470 and ~3700-3769), `package.json`.
- [Widget & Checkout Web | Wompi Docs](https://docs.wompi.co/en/docs/colombia/widget-checkout-web/) — confirmed redirect ("Web Checkout") is still an official, documented integration mode distinct from the embedded Widget, 2026-07-16.
- [Payments links | Wompi Docs](https://docs.wompi.co/en/docs/colombia/links-de-pago/) — Wompi payment-links surface, relevant if the agent microservice's `paymentProvider: "wompi"` path uses this rather than transaction-signature checkout.
- [API Link de pagos | Bold Developers](https://developers.bold.co/pagos-en-linea/api-link-de-pagos) — confirmed Bold's payment-link API is a server-side POST returning a URL, consistent with the agent microservice's `paymentProvider: "bold"` contract; no frontend SDK involved.
- [API Integración vía API | Bold Developers](https://developers.bold.co/pagos-en-linea/api-integration) — general Bold online-payments API shape (server-side).

---
*Stack research for: Leasefy tenant portal (`rent/mvp`) — v7.0 pillars (Pagos, Solicitudes/PQRS, Documentos, Estado de casos, Acuerdos de pago, Comunicación)*
*Researched: 2026-07-16*
