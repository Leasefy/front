# Pitfalls Research — Portal Inquilino (Tenant Portal Expansion)

**Domain:** Tenant-facing rental portal features (Pagos, Solicitudes/PQRS, Documentos, Estado de casos, Acuerdos de pago, Comunicación) for Colombian real-estate agencies — additive expansion of `src/app/inquilino/` in a Next.js 14 frontend that consumes an agency backend (`back-main`) and an AI collections/agent microservice (`Leasefy/agent`).
**Researched:** 2026-07-16
**Confidence:** HIGH (legal citations — cross-verified against official Función Pública / SIC / Corte Constitucional sources and existing in-repo compliance research); HIGH (integration — grounded directly in current repo contracts); MEDIUM (product/UX — verified against multiple property-management-SaaS sources, no Colombia-specific tenant-portal UX literature found).

> This repo already did deep legal research for the **cobranza agent** (`claudedocs/cobranza-research/05-marco-legal-colombia.md` + `skills/cobranza-compliance-guardrails.md`). That research governs the *agent's* WhatsApp/voice outreach. **This document's core warning is that the same law applies to anything the tenant portal itself does or displays** (payment-agreement screens, mora banners, PQRS copy, messaging) — and the portal is not currently wrapped by the agent's `canContact`/`validateMessage`/`requiresHumanReview` gates. Treat that compliance layer as a service to call, not a pattern to reimplement.

---

## Critical Pitfalls

### Pitfall 1: PQRS state built as a second, parallel data model

**What goes wrong:**
The tenant-facing "Solicitudes/PQRS" UI defines its own ticket shape (id, status strings, etc.) instead of reusing the agency-side contract that already exists at `src/lib/api/pqrs.types.ts` (`SolicitudPqrs`, `PqrsEstado`, `PqrsTipo`, `PqrsCanal`, `ResumenPqrs`). Result: a tenant creates a request that the agency dashboard (`src/app/panel/inmobiliaria/pqrs/page.tsx`) never sees, or sees with a different status vocabulary, so tickets silently fork into two truths.

**Why it happens:**
The tenant portal and the agency panel are built in different sessions/sprints; it's faster to define a local type than to trace the existing contract. The existing type file even says the backend engine doesn't exist yet ("NO hay data falsa hasta que exista el motor") — which invites a "just mock something for the tenant side too" shortcut that drifts from the real contract.

**How to avoid:**
Extend/import the existing `PqrsTipo` / `PqrsEstado` / `PqrsCanal` / `SolicitudPqrs` types for the tenant-facing surface. A tenant-submitted PQRS is the same entity with `solicitanteTipo: 'inquilino'`, not a new resource. If the tenant UI needs fields the agency contract lacks (e.g., a tenant-only "categoría de reparación"), extend the shared type — don't fork it.

**Warning signs:** Two different `Pqrs*` type files; agency dashboard "PQRS recibidas" count doesn't match tenant "mis solicitudes" count in QA; tenant-submitted tickets have no `radicado`.

**Phase to address:** Solicitudes/PQRS pillar — first task should be "reuse `pqrs.types.ts`", not "build the tenant form."

---

### Pitfall 2: Payment-agreement UI makes decisions the law reserves for a human

**What goes wrong:**
A self-service "acuerdo de pago" flow lets the tenant (or an unsupervised backend rule) grant capital condonation, an off-policy installment plan, or push the account straight to a pre-legal/S5-equivalent state — decisions that the cobranza compliance research explicitly marks as `requiresHumanReview` (condonación de capital, plan fuera de matriz, vulnerabilidad, disputa no resuelta, paso a S5).

**Why it happens:**
"Self-service payment plan" is a natural product idea (frictionless, autonomous), but it silently re-introduces autonomous high-impact decisions that Sentencia T-323/2024 and Circular Externa SIC 001/2025 require to stay under human/explainable control when they affect the consumer's obligation. The frontend team building this pillar may not know the agent-side guardrails exist.

**How to avoid:**
Payment-agreement UI should only *propose* within a pre-approved policy matrix (`politica.abono_inicial_pct`, `politica.max_cuotas` — see `cobranza-planes-pago-hardship.md`) and must call the same `requiresHumanReview()` gate (or its HTTP equivalent exposed by the agent microservice) before finalizing anything outside that matrix. Never let the frontend independently decide capital forgiveness, discount %, or stage escalation.

**Warning signs:** A payment-agreement "acepto" button that writes directly to a `status: agreed` field with no queue/approval step; no reference to the agent's PTP/compromiso object; discount inputs with no upper bound enforced server-side.

**Phase to address:** Acuerdos de pago pillar.

---

### Pitfall 3: Portal-initiated reminders/messages double-count against the legal contact cap

**What goes wrong:**
The agent microservice already enforces Ley 2300/2023 art. 3: max 1 contact/day per tenant (summed across ALL channels) and max 1 channel/week after first direct contact — enforced via `canContact()` in `cobranza-compliance-guardrails`. If the tenant portal's "Comunicación" pillar (or an "enviar recordatorio" button in Pagos/Acuerdos de pago) sends its own WhatsApp/email/push message without going through that same gate, the tenant can legally receive 2+ contacts in one day — a direct statutory violation, sanctionable by the SIC.

**Why it happens:**
The portal and the agent are separate codebases/teams; a frontend engineer adding a "notify tenant" button has no visibility into the agent's contact counter, which lives in the agent's own DB.

**How to avoid:**
Any outbound tenant-facing message triggered from this frontend (payment reminder, PQRS update, mora nudge) must go through the agent microservice's contact API (or a shared contact-ledger service) rather than calling Twilio/email directly from the frontend or agency backend. If the agent doesn't yet expose that as an HTTP endpoint, that's a blocking dependency for this milestone, not something to route around.

**Warning signs:** Frontend or `back-main` code that imports Twilio/SendGrid directly for tenant notifications; two different systems both showing a tenant "1 recordatorio enviado hoy" independently.

**Phase to address:** Comunicación pillar (and any "reminder" action inside Pagos/Acuerdos de pago).

---

### Pitfall 4: UI implies or threatens credit-bureau reporting without the legal gate

**What goes wrong:**
A mora/case-status screen shows copy like "su cuenta será reportada a Datacrédito" or a badge "en riesgo de reporte" to create urgency, without the three cumulative conditions being verified: (1) individual express authorization from the tenant, (2) prior communication(s) sent, (3) 20 calendar days elapsed since that communication (doubled if the obligation ≤ 15% of 1 SMLMV). Most agencies do not have this in place per-tenant.

**Why it happens:**
It reads as a natural "motivate payment" UX pattern, and the person writing the copy is a frontend/product person, not counsel — they don't know Ley 1266/2008 + Ley 2157/2021 gate the claim, and that an unsubstantiated threat is also deceptive-information under the Estatuto del Consumidor (Ley 1480/2011 arts. 3, 23, 29–30).

**How to avoid:**
Any UI copy referencing centrales de riesgo/Datacrédito must be driven by the same `reporteCentralesGate` object the agent already models (`autorizacionExpresaIndividual`, `comunicacionPreviaEnviada`, `dobleComunicacionSiAplica`, `dias20Vencidos`, `aprobadoPorHumano`) and render nothing if the gate isn't fully satisfied and human-approved. Default: omit any mention of centrales de riesgo entirely.

**Warning signs:** Any hardcoded string containing "Datacrédito", "central de riesgo", "reportado" in tenant-facing components without a corresponding gate check.

**Phase to address:** Estado de casos + Acuerdos de pago pillars.

---

### Pitfall 5: Portal asks the tenant "why" they're late

**What goes wrong:**
A payment-agreement or PQRS intake form includes a "motivo del atraso" / "¿por qué no ha pagado?" field to segment hardship cases — which is expressly prohibited by Ley 2300/2023 art. 7 for anyone doing gestión de cobranza (which the SIC has confirmed applies to residential rent, Concepto SIC 23-463720).

**Why it happens:**
It's an obviously useful product/segmentation field from a pure UX lens, and the prohibition is non-obvious — it lives in a collections-conduct law, not somewhere a frontend engineer would think to check when building a form.

**How to avoid:**
Never collect a mandatory or suggested "reason for late payment" field anywhere in the tenant portal. It's fine to let the tenant *voluntarily* add a free-text note when requesting a plan (the law prohibits interrogating, not receiving unsolicited context), but the UI must not prompt, require, or dropdown-suggest reasons. Ask only forward-looking questions ("¿cuánto puede abonar hoy?", "¿qué fecha le sirve?"), matching the agent's own script design (`cobranza-planes-pago-hardship.md` §"Cómo aplicar" step 2).

**Warning signs:** A required or optional `motivo` / `razon_mora` field in any acuerdo-de-pago or PQRS-de-mora form.

**Phase to address:** Acuerdos de pago pillar (form design review).

---

### Pitfall 6: PQRS/consumer-complaint statutory response deadline is not tracked

**What goes wrong:**
Under Ley 1480/2011 (Estatuto del Consumidor) art. 58 núm. 5, a provider must respond to a consumer's queja/reclamo within **15 business days** of receipt; silence counts as a grave indicio against the provider if the tenant escalates to the SIC. If "Estado de casos" only shows a status enum with no SLA clock, the agency has no way to know it's about to breach the statutory term, and the tenant has no visibility into the deadline either.

**Why it happens:**
The existing `SolicitudPqrs` type already has a `slaVenceAt` field marked "que calculará el motor (M1)" — i.e., it's explicitly deferred to a future backend milestone. It's easy for this milestone to ship the tenant-facing UI without that field ever being populated, leaving the SLA promise entirely cosmetic.

**How to avoid:**
Either (a) compute `slaVenceAt` client-side as `createdAt + 15 business days` (Colombia business-day calendar, excluding festivos) as an interim measure and surface it honestly as "estimado" until the real engine exists, or (b) explicitly do not display a deadline commitment until the backend can guarantee it. Do not silently drop the SLA concept from the tenant-facing surface just because the backend isn't built.

**Warning signs:** `slaVenceAt` rendered as `undefined`/blank in the tenant timeline; no escalation path shown when a ticket is close to or past 15 business days.

**Phase to address:** Solicitudes/PQRS pillar + Estado de casos pillar.

---

### Pitfall 7: Sensitive tenant documents (cédula, extractos bancarios, laboral) handled without Habeas Data discipline

**What goes wrong:**
`documentos/page.tsx` already stores/serves `id_document`, `bank_statements`, `income_proof`, `employment_letter` — precisely the categories Ley 1581/2012 + Circular Externa SIC 001/2025 require explicit, prior, informed authorization for, with purpose limitation, and ARCO rights (access, rectify, update, **suprimir**). Expanding "Documentos" as a pillar (more doc types, longer retention, agency staff browsing) without (a) a clear consent record per document/purpose, (b) a working "solicitar eliminación" path, and (c) access logging risks a Habeas Data violation the moment volume/scope grows.

**Why it happens:**
Document upload already "works" from onboarding (application-time), so it's tempting to treat "Documentos" as just adding a nicer viewer/download UI on data that's already there, without re-examining whether the original consent covers the *new* uses (agency staff browsing anytime post-lease, PQRS attachments, payment-agreement proof-of-income, etc.). Consent in Colombia is purpose-specific — reusing data collected "for the application" for a new purpose (e.g., ongoing cobranza scoring) generally needs its own basis.

**How to avoid:**
Treat each document category's consent as purpose-scoped, log every read/download (who, when, why) for SIC-auditability, implement a real "eliminar mi dato" action honoring ARCO rights, and never gate core portal functionality on providing *sensitive* categories beyond what's strictly necessary (biometric ID-selfie matching, if added later, needs separate **explicit** authorization per Decreto 1377/2013 — it cannot be bundled into a general terms checkbox).

**Warning signs:** A single blanket "acepto tratamiento de datos" checkbox covering all document types and future uses; no delete/download-log UI; documents served from predictable URLs (see Pitfall 11).

**Phase to address:** Documentos pillar.

---

### Pitfall 8: Tenant-facing payment/mora UI reintroduces the exact dark patterns the collections agent was built to avoid

**What goes wrong:**
The agent's compliance layer explicitly bans "guilt nudges," fabricated urgency/scarcity, and shaming language in tenant-facing collections *messages* (`cobranza-compliance-guardrails.md` §E, §"Qué NUNCA hacer"). But the **portal itself is not wrapped by that gate** — a designer building a "estado de cuenta" screen or a mora banner can independently reintroduce the same patterns ("¡Última oportunidad!", a red pulsing "EN MORA" badge with no context, a payment method pre-selected because it has the highest fee/float for the agency, hiding the total cost of a "cuota de manejo" until the final confirmation step) without anyone flagging it as a collections-conduct issue, because "it's just a UI component," not a WhatsApp message.

**Why it happens:**
Compliance review naturally focuses on the agent's outbound messages (they look like "cobranza"); a dashboard screen doesn't get the same scrutiny even though it has the same legal/consumer-protection exposure (Estatuto del Consumidor Ley 1480/2011 art. 3, 23; SIC has an active initiative studying dark patterns in digital commerce as of 2026).

**How to avoid:**
Extend the same DO/DON'T checklist from `05-marco-legal-colombia.md` §6 to portal *screens*, not just agent *messages*: no invented urgency, no shaming badges, transparent total cost before commitment, no pre-selected expensive payment rail, honest empty/neutral states for "al día" tenants (no low-key guilt framing). Route mora-related copy through the same `validateMessage()`-style honesty check where feasible, or at minimum a design review checklist referencing it.

**Warning signs:** Red/alarming color used for "próximo a vencer" (not yet overdue); countdown timers on payment; a payment method selector that defaults to the highest-fee option; PQRS/mora screens written by whoever is fastest, without a compliance pass.

**Phase to address:** Pagos + Estado de casos pillars (design review gate).

---

### Pitfall 9: Payment state duplicated between the portal, the agency treasury (tesorería/dispersiones), and the agent's cobranza ledger

**What goes wrong:**
There are already at least three payment-adjacent sources of truth in this codebase's data model: `tenant-payment-requests.types.ts` (tenant-submitted requests, explicitly documented as "**fuente única** del historial de pagos del tenant"), `tesoreria.types.ts` (agency-side egresos/dispersiones to owners), and — once wired — the agent microservice's own cobranza state (S0–S5 stage, PTP compromisos, `cuenta.saldo_total`). If "Pagos" or "Acuerdos de pago" introduce a fourth local notion of "paid" or "saldo," a tenant can see "al día" in the portal while the agency's treasury/dispersión ledger (and the agent's cobranza cadence) still treats them as in arrears — and the collections agent may keep contacting a tenant who believes they've paid.

**Why it happens:**
Each pillar is built to look complete on its own screen; nobody explicitly draws the "who owns `saldo_actual`" line across the three systems before building the UI.

**How to avoid:**
Follow the pattern the repo already established correctly for tenant payment requests (single documented source of truth, explicit status enum, `paymentId` linkage to the confirmed `Payment` once approved). Any new "acuerdo de pago" or "saldo" concept must reference that same lineage — `paymentId` → treasury/dispersión record → agent's `cuenta.saldo_total` — rather than compute or cache its own number. Reconciliation between portal-shown balance and agent-side balance should be a named integration test, not an assumption.

**Warning signs:** More than one endpoint/service independently computing "how much does this tenant owe"; a payment-agreement screen with no `leaseId`/`paymentId` cross-reference; the agent still messaging a tenant the portal shows as current.

**Phase to address:** Pagos + Acuerdos de pago pillars (data-model design step, before any UI).

---

### Pitfall 10: No legal payment receipt / DIAN electronic-invoice gap

**What goes wrong:**
Rental income in Colombia generally requires the arrendador (or the agency acting as mandatario under a contrato de mandato) to issue an electronic invoice/comprobante per DIAN Resolución 000042 de 2020 / Decreto 1625, independent of VAT status (residential leasing is IVA-excluded but the invoicing duty is separate). If the "Pagos" pillar's "descargar recibo" produces a purely internal PDF that is presented as if it were the official proof of payment, tenants (and the agency's accounting) can end up relying on a document with no fiscal standing — a problem for tenants who need it for tax/legal purposes and for the agency's own DIAN compliance.

**Why it happens:**
"Generate a receipt PDF" looks like a self-contained frontend feature; the DIAN e-invoicing obligation lives in the agency's accounting/back-office (this program's v6.0 FACT module — "FE-DIAN"), which may not yet be wired to tenant payment confirmation.

**How to avoid:**
Label any portal-generated PDF clearly as "comprobante interno" unless/until it is backed by an actual DIAN electronic invoice from the FACT module; do not call it "factura" in the UI. Track "issue real factura electrónica on payment confirmation" as a dependency on the FACT/DIAN backend milestone, not something this frontend-only milestone can silently satisfy with a client-rendered PDF.

**Warning signs:** A button labeled "Descargar factura" that produces a document with no CUFE/DIAN validation data; tenants asking for "la factura" and receiving a non-fiscal PDF.

**Phase to address:** Pagos pillar (labeling/scoping only — actual DIAN integration is out of scope per CLAUDE.md's FACT/M1-M3 backend milestones).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Mock/local "acuerdo de pago" object stored client-side before the agent exposes a real PTP/compromiso API | Ship the UI now | Silent fork from the agent's real cobranza state (S0-S5); tenant sees an "agreement" the agency/agent never recorded | Only behind an explicit `MOCK`/demo flag, never in a path a real tenant with a real lease can reach |
| Copy-pasting the agent's DO/DON'T compliance rules into frontend components instead of calling a shared gate/service | Fast, no new API dependency | Rules drift the moment the law or the agent's policy matrix changes (this area is explicitly "revisar cada 6 meses" per the agent's own compliance doc) | Never for anything mentioning mora, planes de pago, or centrales de riesgo — only for pure copy/UI text with no legal claim |
| Rendering `slaVenceAt` as blank/"—" instead of computing an estimate | Avoids building a business-day calendar util | Tenant has no visibility into their statutory 15-business-day right; looks like a broken feature | Acceptable briefly during initial build, must be resolved before pillar ships to real tenants |
| Reusing the `pse-mock` deterministic last-digit-of-document response logic as if it reflects real bank behavior in prod copy/tests | No real PSE integration needed yet | QA and demo scripts encode wrong assumptions about real payment failure modes | Mock-only environments; must be clearly separated from prod payment flows |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|-------------------|
| Agency backend (`back-main`) — tenant payments | New pillar defines its own payment/status shape instead of extending `BackendTenantPaymentRequest` (`src/lib/api/tenant-payment-requests.types.ts`), which is already documented as the single source of truth | Extend the existing status enum/contract; add `AGREEMENT_PENDING`-style states there rather than a parallel table |
| Agent microservice (`Leasefy/agent`) — cobranza state machine | Portal builds its own S0-S5-equivalent stage/PTP logic instead of calling the agent's endpoints for `canContact`, `validateMessage`, `requiresHumanReview`, and PTP/compromiso creation | Treat the agent as the sole owner of collections state and gating logic; frontend calls it via `AGENT_SERVICE_URL`, never reimplements the rules locally |
| Agency backend — PQRS | Tenant PQRS submission posts to a different endpoint/shape than `src/app/panel/inmobiliaria/pqrs/page.tsx` reads | Reuse `pqrs.types.ts` contract end-to-end; tenant submission is just `solicitanteTipo: 'inquilino'` on the same resource |
| PSE / payment gateway (`pse-payments.service.ts`) | Treating the deterministic mock (`last digit of document number` → SUCCESS/FAILURE/PENDING) as representative of real PSE failure modes when designing error-state UX | Design error UI around real PSE/bank failure taxonomy (insufficient funds, timeout, bank unavailable, user-cancelled), not just the 3 mock buckets |
| Twilio / WhatsApp (owned by agent microservice) | Frontend or `back-main` sends its own tenant notification (payment reminder, PQRS update) directly via Twilio/email, outside the agent's contact-frequency counter | Route all tenant-facing outbound messages through the agent's contact ledger/gate so the 1-per-day / 1-channel-per-week cap (Ley 2300 art. 3) is enforced once, centrally |
| DIAN e-invoicing (agency FACT module, separate milestone) | Portal's payment-confirmation PDF is presented to tenants/agency staff as a fiscal "factura" | Label it "comprobante interno" until wired to the real DIAN electronic-invoice engine; track the real integration as a FACT-module dependency |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Eagerly loading/previewing all document files (cédula scans, extractos PDFs) inline on page load | Slow "Documentos" page, large payloads | Lazy-load previews on click; paginate by document type; stream signed URLs on demand | Noticeable once a tenant/agency has >20-30 documents across a multi-year lease history |
| Full, unpaginated PQRS/case timeline render | Slow "Estado de casos" page for long-running or reopened tickets | Paginate/virtualize timeline events; summarize older entries | Breaks once a ticket has dozens of status changes/messages (common for recurring maintenance PQRS) |
| Polling the agent microservice for cobranza/acuerdo status on every dashboard mount | Increased load + cost on `Leasefy/agent`, redundant calls across pillars (Pagos, Estado de casos, Acuerdos de pago all asking the same question) | Single shared fetch/cache layer per tenant session instead of per-component polling | Becomes visible in agent service metrics/cost once agency portfolio + tenant count scales past pilot |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Predictable/sequential IDs for documents or PQRS `radicado` used directly in download/view URLs | IDOR — tenant A can guess/enumerate tenant B's cédula scan, bank statement, or PQRS ticket | Use signed, short-lived, per-request URLs (or opaque UUIDs + server-side ownership check) for every document and case fetch |
| Pre-checked "acepto tratamiento de datos personales" checkbox on upload/onboarding forms | Invalid consent under Decreto 1377/2013 (requires an unambiguous affirmative action, not a default) | All Habeas Data consent checkboxes must be unchecked by default, with the specific purpose stated inline, not bundled into generic ToS |
| Agency staff able to open a tenant's document/PQRS/message view with no audit trail of who accessed what | Habeas Data purpose-limitation violation; no evidence trail if SIC investigates a complaint | Log every staff access to tenant-sensitive data (who, when, which record, why/context) |
| Storing PSE bank codes, payment references, or any card/account-adjacent identifiers without considering them sensitive | Data exposure risk even though these aren't "sensitive data" under Ley 1581's narrow category, they're still financial-privacy data under Ley 1266 | Encrypt at rest, restrict to server-side only, never log full payment identifiers client-side |
| Mentioning "reporte a centrales de riesgo" anywhere in tenant-facing code/copy without the `reporteCentralesGate` check | Illegal threat (Ley 1266/2157) + deceptive claim (Ley 1480) if unsubstantiated | Gate every such string behind the same 4-condition check the agent uses; default to omitting it |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Guilt-tripping / alarming mora banners ("¡Está en mora, actúe ahora!" in red with icons) | Anxiety-driven engagement, erodes trust, contradicts the calm/empathetic tone the agent itself is designed to use | Neutral, factual balance display ("Saldo pendiente: $X, vence el Y") with a clear, low-friction path to resolve — matches `cobranza-planes-pago-hardship.md`'s "validar sin juzgar" principle |
| Hiding total cost (cuota de manejo, PSE/card surcharge) until the final confirmation step | Feels deceptive, drives complaints/chargebacks, likely a "dark pattern" under SIC's active scrutiny | Show full cost breakdown before the tenant selects a payment method, not after |
| Pre-selecting the highest-fee payment method as default | Extracts more fee revenue at the tenant's expense, erodes trust | Default to the lowest-friction/lowest-cost method (e.g., PSE/bank transfer) and let the tenant opt into cards if they prefer |
| Case-status / PQRS screens with no honest "sin actualizaciones" or "al día" empty state (implying activity that hasn't happened) | Confusing, feels broken or dishonest once the tenant realizes nothing changed | Follow the discipline already established in `pqrs.types.ts` ("UI con estado vacío honesto; NO hay data falsa") consistently across all 6 pillars |
| Messaging pillar with no explicit response-time expectation | Tenant assumes live chat/instant reply from a human, gets frustrated when the reply is hours/days later | State expected response window explicitly (and keep it consistent with the PQRS SLA, Pitfall 6) |

## "Looks Done But Isn't" Checklist

- [ ] **Pagos — "pago exitoso" confirmation:** Often missing reconciliation against the agency's treasury/dispersión ledger and the agent's `saldo_total` — verify the same payment is reflected in `tenant-payment-requests`, `tesoreria`, and (once wired) the agent's cobranza balance, not just a green checkmark in the portal.
- [ ] **PQRS ticket creation:** Often missing SLA countdown + automatic flag when approaching/breaching the 15-business-day statutory term (Ley 1480 art. 58) — verify `slaVenceAt` is populated and surfaced, not left blank.
- [ ] **Documentos upload:** Often missing purpose-specific Habeas Data consent capture at upload time (not just a blanket checkbox from onboarding) and a working delete/ARCO-rights action — verify a tenant can actually request/see deletion of a specific document.
- [ ] **Acuerdos de pago:** Often missing linkage to the agent microservice's own PTP/compromiso object — verify there is exactly one "agreement" record referenced by both systems, not two independent ones that can disagree.
- [ ] **Comunicación / mensajes:** Often missing merge with the WhatsApp thread the agent already uses for the same tenant — verify the portal doesn't create a second, invisible-to-the-agency inbox that duplicates or contradicts the agent's contact-frequency counter.
- [ ] **Estado de casos:** Often missing the "who can see this" boundary — verify a tenant can only see their own case timeline, and that internal agency notes (equivalent of `HostNote`) are excluded from the tenant-facing view.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|----------------|------------------|
| PQRS parallel state (Pitfall 1) | MEDIUM | Migrate tenant-created tickets into the shared `SolicitudPqrs` table/contract; backfill `radicado`s; reconcile counts between the two dashboards before announcing the feature as complete |
| Portal messages bypassing the contact-frequency gate (Pitfall 3) | HIGH | Audit contact logs for tenants who received 2+ same-day contacts across systems; pause portal-initiated messaging until routed through the agent's gate; document the incident for SIC-audit defensibility |
| Unsubstantiated credit-bureau-reporting copy shipped (Pitfall 4) | MEDIUM | Remove/hide the copy immediately; review affected tenants for potential Estatuto del Consumidor complaints; do not re-enable until the `reporteCentralesGate` is wired and human-approved per tenant |
| "Motivo de mora" field shipped (Pitfall 5) | LOW | Remove the field from the form and from stored records going forward; no need to purge already-collected free-text if it was truly voluntary/unprompted, but stop prompting for it |
| Missing PQRS SLA tracking (Pitfall 6) | LOW-MEDIUM | Backfill `slaVenceAt` for open tickets using `createdAt + 15 business days`; surface a "estimado" label until the real engine (M1) exists |
| Duplicated payment/saldo state (Pitfall 9) | HIGH | Requires a reconciliation pass across `tenant-payment-requests`, `tesoreria`, and the agent's ledger to find and resolve divergent balances before trusting any pillar's number again |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| PQRS parallel state (1) | Solicitudes/PQRS | Agency `pqrs` dashboard and tenant "mis solicitudes" read from the same contract/table; ticket counts match in an integration test |
| Human-in-the-loop bypass in payment agreements (2) | Acuerdos de pago | Any agreement outside the policy matrix routes to a human-review queue before being marked "acordado"; automated test asserts no client-side write of `capital_condonado` |
| Portal messages bypass contact-frequency gate (3) | Comunicación (+ any reminder action in Pagos/Acuerdos de pago) | All outbound tenant messages traceable to a single contact ledger; integration test simulates same-day portal + agent message and asserts the second is blocked |
| Credit-bureau threats without gate (4) | Estado de casos, Acuerdos de pago | Grep/lint rule flags any hardcoded "central de riesgo"/"Datacrédito" string not wrapped by the gate check |
| "Motivo de mora" field (5) | Acuerdos de pago | Form-field audit: no required/suggested reason-for-nonpayment input anywhere in tenant-facing code |
| PQRS SLA not tracked (6) | Solicitudes/PQRS, Estado de casos | `slaVenceAt` populated and rendered for every open ticket; alert/escalation visible when within 3 business days of breach |
| Habeas Data gaps on documents (7) | Documentos | Per-document consent record exists; delete/ARCO action functionally removes a document and its consent record; access log entries created on staff view |
| Dark patterns on payment/mora UI (8) | Pagos, Estado de casos | Design review checklist (adapted from `05-marco-legal-colombia.md` §6) signed off before shipping mora/payment screens |
| Duplicated payment/saldo state (9) | Pagos, Acuerdos de pago | Single documented source of truth for "saldo actual" with explicit lineage (`paymentId` → treasury → agent balance); reconciliation integration test |
| No fiscal receipt / DIAN gap (10) | Pagos | Any "receipt" UI copy audited to say "comprobante interno" unless backed by a real DIAN factura; tracked as explicit dependency on FACT/M1-M3 backend milestone |

## Sources

**In-repo (primary grounding for legal/collections rules — already researched and cited to official norms):**
- `claudedocs/cobranza-research/05-marco-legal-colombia.md` — master legal-compliance doc (Ley 2300/2023, Sentencia T-323/2024, Ley 1581/2012, Circular SIC 001/2025, Ley 1266/2008, Ley 2157/2021, Ley 1480/2011), verified vigente as of June 2026
- `claudedocs/cobranza-research/skills/cobranza-compliance-guardrails.md` — the executable gate logic (`canContact`, `validateMessage`, `requiresHumanReview`) that this document argues the tenant portal must also respect
- `claudedocs/cobranza-research/skills/cobranza-planes-pago-hardship.md` — payment-plan/hardship design rules directly relevant to the "Acuerdos de pago" pillar
- `src/lib/api/pqrs.types.ts`, `src/app/panel/inmobiliaria/pqrs/page.tsx` — existing agency-side PQRS contract
- `src/lib/api/tenant-payment-requests.types.ts`, `src/lib/api/pse-payments.types.ts`, `src/lib/api/tesoreria.types.ts` — existing payment/treasury contracts
- `src/app/inquilino/documentos/page.tsx`, `src/app/inquilino/mensajes/page.tsx` — current tenant-portal maturity baseline
- `.planning/PROJECT.md`, `CLAUDE.md` — program constraints (additive-only, frontend-first, agent lives in sibling repo)

**External (verified via web search, official/primary sources):**
- Ley 2300 de 2023 ("Dejen de Fregar") — [Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=213990)
- Sentencia T-323 de 2024 — [Corte Constitucional](https://www.corteconstitucional.gov.co/relatoria/2024/t-323-24.htm)
- Ley 1581 de 2012 (Habeas Data) + Decreto 1377 de 2013 (sensitive/biometric data, explicit consent) — [Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981)
- Ley 1266 de 2008 + Ley 2157 de 2021 (reporte a centrales de riesgo) — [Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=173246)
- Ley 1480 de 2011 (Estatuto del Consumidor), art. 58 — 15-business-day term for quejas/reclamos — [Consumoteca](https://consumoteca.com.co/articulo-58-de-la-ley-1480-estatuto-del-consumidor/), [SIC](https://www.sic.gov.co/estatutos-consumidor)
- Ley 1755 de 2015 / Ley 1437 de 2011 (derecho de petición general terms — 15/10/3-8 días) — [Función Pública](https://www1.funcionpublica.gov.co/-/la-ley-reestablece-terminos-de-respuesta-a-las-peticiones-de-los-ciudadanos)
- SIC dark-patterns initiative (Foro Internacional sobre Patrones Oscuros, 2026, with Universidad Javeriana) — confirms active regulatory attention to manipulative digital-commerce UX in Colombia
- DIAN Resolución 000042 de 2020 / Decreto 1625 — electronic-invoice obligation for arrendadores/mandatarios — [DIAN](https://www.dian.gov.co/impuestos/factura-electronica/factura-electronica/Paginas/default.aspx)
- General property-management tenant-portal UX/fee-transparency patterns (MEDIUM confidence, non-Colombia-specific) — TenantCloud, ExactEstate, DoorLoop industry write-ups (2026)

---
*Pitfalls research for: Portal Inquilino v7.0 (Pagos, Solicitudes/PQRS, Documentos, Estado de casos, Acuerdos de pago, Comunicación)*
*Researched: 2026-07-16*
