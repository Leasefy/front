# Feature Research

**Domain:** Post-signing tenant/renter portal — operating the rental relationship (Colombia)
**Researched:** 2026-07-16
**Confidence:** MEDIUM-HIGH (US/global tenant-portal patterns HIGH confidence via multiple vendor sources; Colombia legal specifics HIGH confidence via official/gov sources; Colombia proptech competitor UX detail LOW-MEDIUM — help-center pages only, no direct product access)

## Context: What Already Exists in This Codebase

Before reading the pillar tables, note these existing assets — the roadmap should extend/reuse them, not rebuild:

| Existing asset | Location | Relevance |
|---|---|---|
| Tenant `pagos` page + `PayRentModal` | `src/app/inquilino/pagos/page.tsx`, `src/components/tenant/PayRentModal.tsx` | Already mocks a **PSE-only** payment flow (`PENDING_VALIDATION` state modeled on real PSE bank-verification lag). No Wompi/Bold, no card, no wallet (Nequi), no autopay yet. |
| `SolicitudMantenimiento` type (full lifecycle) | `src/lib/types/inmobiliaria.ts:380` | Already has `status` pipeline (`reported→quoted→approved→in_progress→completed→cancelled`), `type`, `priority`, `photoUrls`, `quotes[]`, `paidBy` split, `tenantId`. Agency-side UI: `MantenimientoKanban.tsx`, `MantenimientoList.tsx`, `MantenimientoForm.tsx`, `MantenimientoViewer.tsx`. **Tenant portal "Solicitudes" should create/read against this exact model**, not a new one. |
| `SolicitudPqrs` type (v6-06, frontend-first) | `src/lib/api/pqrs.types.ts` | Full PQRS lifecycle already modeled: `tipo` (peticion/queja/reclamo/sugerencia/solicitud/reparacion), `estado` (recibida→asignada→en_proceso→en_cotizacion→resuelta→cerrada), `prioridad`, `canal`, `slaVenceAt`. Agency-side page: `panel/inmobiliaria/pqrs/page.tsx`. **This is the case-tracking backbone** — tenant-side "Estado de casos" and "Solicitudes/PQRS" pillars are the tenant-facing read/write surface onto this same model. |
| Cobranza payment-agreement engine | `panel/inmobiliaria/ai/cobranza/acuerdos/page.tsx`, `use-agreement-propose.ts`, `use-recovery.ts` | Agency/agent side already has a full negotiation engine: `CarteraStage` (S0 pre-vencimiento → S1 fresca → S2/S3 → S4/S5/SX unavailable-for-negotiation), `computeOffer` (discount clamp by agency policy), installment schedule, and a **hard rule (T-323): agreements always require explicit human approval** before activation — never auto-approved, never pressure-based (Ley 2300 compliance baked in). **The tenant portal's "Acuerdos de pago" pillar is a review/accept/pay surface on an agency-approved agreement — tenants do not self-originate the discount/terms.** |
| Tenant messages | `src/app/inquilino/mensajes/page.tsx` (30 lines — thin) | Needs to become the comms hub tying together case updates, agreement notices, and direct messages — currently minimal. |

**Implication for the roadmap:** the highest-leverage, lowest-risk work is building tenant-facing UI on top of already-modeled agency-side data structures (mantenimiento, PQRS, cobranza), plus swapping the PSE-mock payment flow for a real multi-rail one. This is far cheaper than it looks from a blank-slate reading of the 6 pillars.

---

## Feature Landscape by Pillar

### Pillar 1 — Pagos (Payments)

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Pay current rent balance in-app | Baseline of any tenant portal (AppFolio, Buildium, RentRedi, Houm CO all have it) | MEDIUM | Already partially mocked via `PayRentModal` (PSE). Needs real Wompi/Bold integration. |
| Multiple payment methods: PSE, card, Nequi wallet | Colombian renters do not all bank the same way; PSE-only excludes card/Nequi-first users | MEDIUM | Wompi and Bold both support PSE + cards + Nequi + Bancolombia Botón natively — this is a config/API-surface choice, not a build-from-scratch integration. |
| Payment history / receipts (comprobantes) | Users expect a downloadable proof-of-payment for every transaction, esp. for disputes and tax purposes | LOW | Straightforward list + PDF receipt generation. |
| Balance / next due date always visible | Reduces "did I pay?" WhatsApp messages to the agency | LOW | Surface on dashboard + pagos page. |
| Payment reminders (push/email/WhatsApp) before due date | Reduces late payments; standard across all reviewed platforms | MEDIUM | Depends on notification infra + WhatsApp channel (Twilio, already in stack per CLAUDE.md). |
| Partial-payment / late-fee display | Colombian mora accrues interest (Código Civil art. 1617: 6% annual on residential canon unless contract states otherwise) — tenant needs to see this, not just "pending" | MEDIUM | Ties into Acuerdos pillar; must render mora interest transparently to avoid disputes. |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|--------------------|------------|-------|
| Autopay / domiciliación (recurring debit) | Wompi supports tokenized recurring payments via PSE, Nequi, and Bancolombia savings/checking accounts — reduces mora at the source, which is Leasefy's core P1 problem | MEDIUM-HIGH | Requires token storage + retry/dunning logic on failed recurring charge; genuinely differentiating because most small/mid Colombian inmobiliarias don't offer this. |
| Split payment across co-tenants / roommates | Shared apartments are common in Bogotá/Medellín rental market | MEDIUM | Nice differentiator, not urgent for v7.0 given scope; flag as v1.x. |
| Retención en la fuente certificate auto-generation | Tenants who are withholding agents (empresas, algunos independientes) must issue a 3.5% withholding certificate to the landlord annually (deadline: March 31 for prior tax year, per Estatuto Tributario art. 381) — auto-generating this from payment history is a real accounting pain point solved | MEDIUM | Depends on Documentos pillar; strong differentiator because manual certificate issuance is a known friction point in Colombian rental accounting. |
| Real-time payment status (PSE "pendiente de verificación" made transparent) | PSE has a bank-verification lag (already modeled as `PENDING_VALIDATION` in existing code) — clearly explaining "your bank is confirming, this can take up to X hours" prevents duplicate-payment attempts and support tickets | LOW | Already half-built; just needs multi-rail parity (Wompi/Bold also have async states). |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Crypto / buy-now-pay-later for rent | "Modern fintech" appeal | Regulatory ambiguity in Colombia for rent-specific BNPL, adds fraud surface, not requested by the actual user (P1 problem is arrears follow-up, not payment innovation) | Focus on autopay + payment agreements, which directly reduce mora |
| In-app peer-to-peer cash transfer between tenants | Roommates splitting rent informally | Turns Leasefy into a money-transfer/wallet operator — different regulatory regime (financial services) than a rent-collection facilitator | Just show "your share is X" and let each tenant pay their own PSE/Wompi transaction |
| Fully custom/negotiable payment amounts by the tenant, unsupervised | Feels flexible/self-service | Directly conflicts with the existing T-323 rule that all agreement terms require human approval — a tenant typing in "I'll pay $200,000 less" and it silently registering as accepted would be a compliance and revenue risk | Tenant can *request* a different amount/date via the Acuerdos flow, agency/agent approves |

---

### Pillar 2 — Solicitudes / PQRS (Maintenance + Complaints)

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Submit maintenance request with photos | Universal across AppFolio/Buildium/RentRedi/Houm — "attach photos so we understand urgency" is the #1 cited UX pattern | LOW-MEDIUM | `SolicitudMantenimiento.photoUrls` already exists; tenant just needs a create form mirroring `MantenimientoForm.tsx`. |
| Track request status (submitted → assigned → in progress → resolved) | Buildium/AppFolio research explicitly flags "tenants have no idea if the work order exists" as the #1 complaint when this is missing | LOW | Maps directly onto existing `MantenimientoStatus` and `PqrsEstado` enums — read-only view for tenant. |
| Submit a formal PQRS (petición/queja/reclamo/sugerencia) distinct from a maintenance ticket | Colombian consumers are culturally trained to expect a PQRS channel — most Colombian inmobiliarias already publish one (ISA Inmobiliaria, Actual, Multiobras, etc.) | LOW | `SolicitudPqrs.tipo` already models this distinction — tenant-facing form just needs to pick `tipo`. |
| Priority/urgency flagging (emergency leak, no water, no power) | Prevents a burst pipe from queuing behind a paint touch-up | LOW | `MantenimientoPriority` already has `emergency`; needs visual escalation treatment (banner, faster SLA display). |
| SLA / expected response time shown to tenant | Colombian derecho de petición sets a legal expectation: 15 business days for general petitions, 10 for document requests (Ley 1755 de 2015) — and while a private landlord isn't strictly bound by this statute the same way public entities are, tenants culturally expect an equivalent timeframe and silence past ~15 días hábiles reads as non-response | LOW | `slaVenceAt` field already exists on `SolicitudPqrs`; just needs to render as a countdown/deadline for the tenant, and the default SLA policy should not silently exceed the 15-business-day cultural/legal benchmark for non-emergency items. |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|--------------------|------------|-------|
| Cost-responsibility transparency (who pays: owner/tenant/split per Ley 820) | Ley 820 de 2003 explicitly splits repair costs — "reparaciones locativas" (tenant, from normal wear exceptions) vs. structural/common-area (landlord) vs. tenant-caused damage (tenant) — showing this clearly on each ticket prevents the #1 landlord-tenant dispute in Colombian rentals | MEDIUM | `MantenimientoPaidBy` already models `owner/tenant/split/agency`; differentiator is *explaining the legal basis* in-portal, not just showing a value. |
| Quote approval flow for tenant-payable repairs | When `paidBy=tenant` or `split`, the tenant should see and approve the vendor quote before work proceeds — avoids billing surprise | MEDIUM | `MantenimientoQuote[]` already exists agency-side; tenant approval step is new UI + a status transition. |
| Photo/video before-after documentation | Reduces "was this really fixed" disputes, speeds resolution confidence | LOW-MEDIUM | `completionPhotoUrls` field already exists; just needs tenant-facing display. |
| AI-assisted triage (auto-classify urgency/type from description+photo) | Consistent with Leasefy's core "conversación > dashboard, agentes ejecutan" thesis (per PROJECT.md); reduces time-to-assignment | HIGH (backend/agent work, not this milestone) | PQRS types file already notes "El triage automático... lo hará el agente de IA... en la fase de backend (M1)" — defer, don't rebuild in frontend milestone. |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Tenant can directly assign/reassign a vendor/provider | Feels empowering | Vendor relationships, pricing, and liability sit with the agency; letting tenants pick providers breaks the agency's cost control and creates liability ambiguity | Tenant requests → agency/agent assigns from its vetted provider list |
| Auto-close tickets after N days of inactivity without tenant confirmation | Reduces backlog metrics | A silently auto-closed complaint reads as "ignored," which is the exact anti-pattern research flags (tenants CC'ed on vendor emails, no confirmation loop) — and risks contradicting the derecho de petición expectation of an actual response | Auto-*reminder* to agency/agent when SLA is close to breach; only tenant or agent can close, with a closure reason always visible |
| One universal "message the agency" box that silently becomes the PQRS/maintenance record | Simpler UI, one less form | Loses structured tracking (type, priority, SLA, responsible) that the existing `SolicitudPqrs`/`SolicitudMantenimiento` models already provide — regresses to the exact "just a WhatsApp inbox" problem this milestone exists to solve | Keep structured intake forms; use free-text messaging (Pillar 6) only for clarifying conversation *within* a case, not as the system of record |

---

### Pillar 3 — Documentos

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| View/download signed contract | Already exists per milestone context (contratos + e-sign) — confirm it's linked from Documentos, not just Contratos | LOW | Likely just cross-linking, not new build. |
| Payment receipts / comprobantes archive | Table stakes across every platform reviewed (AppFolio, Buildium, Rentec Direct, Houm) | LOW | Ties to Pagos pillar; a documents view is often just a filtered history of the same underlying payment records. |
| Inventory/condition report (acta de entrega) access | Colombian practice almost always includes an "acta de entrega" at move-in documenting property condition — needed later to resolve deposit/damage disputes | LOW-MEDIUM | May not exist yet in the data model; check before assuming it's a pure UI task. |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|--------------------|------------|-------|
| Certificado de retención en la fuente (auto-generated, annual) | Real accounting pain point: tenants who are withholding agents must issue this by March 31 each year (Estatuto Tributario art. 381); most small agencies handle this manually via email requests | MEDIUM | Requires aggregating a full tax-year's payments and a compliant PDF template — genuinely valuable, low competitive coverage among Colombian proptechs found in this research. |
| Paz y salvo (no-debt certificate) self-service generation | Frequently requested by tenants for new-apartment applications, visas, or loan applications — currently a manual request-and-wait process everywhere | MEDIUM | Should only be generatable when ledger is actually current — ties to Estado de Casos / Pagos data integrity. |
| Document expiry/renewal alerts (e.g., insurance/póliza if required by contract) | Proactive rather than reactive — consistent with Leasefy's "agents execute" thesis | LOW-MEDIUM | Defer unless the lease model already tracks policy expiry dates. |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Tenant-uploaded "official" documents that silently override agency records (e.g., self-reported income re-verification) | Feels self-service | Post-signing document uploads from tenants should be informational/supporting, not authoritative — conflicts with the fraud/verification discipline already built into the pre-lease scoring pipeline | Tenant uploads go into a "submitted, pending review" state, never auto-replace agency-verified data |

---

### Pillar 4 — Estado de Casos (Case Status)

This pillar is less a standalone feature set and more the **cross-cutting visualization layer** over Pillars 2 and 5 (PQRS/mantenimiento cases + payment-agreement cases). Treat it as a unifying "my open items" view rather than a new data model.

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Single "mis casos" list aggregating all open PQRS/mantenimiento/acuerdo items with status + next action | This is literally the fix for the stated P1 problem — "the tenant only has someone to write to when there's a problem" — a status list *replaces* the need to ask | MEDIUM | Aggregates `SolicitudPqrs` + `SolicitudMantenimiento` + payment-agreement state; mostly a read/aggregation view, not new backend modeling. |
| Per-case timeline/audit trail (who did what, when) | Standard expectation once a "case" concept exists; also legally useful if a derecho de petición response timeline is ever contested | LOW-MEDIUM | `ApplicationEvent`-style timeline pattern already exists elsewhere in the codebase (pre-lease `ApplicationEvent`) — reuse the pattern. |
| Clear "who is responsible now" (agency vs. tenant vs. provider) per case | Reduces the "I'm waiting on someone but don't know who" anxiety that drives WhatsApp escalation | LOW | `responsableNombre` already exists on `SolicitudPqrs`. |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|--------------------|------------|-------|
| Push/WhatsApp notification the moment a case status changes | Directly targets the "WhatsApp + calls" fallback behavior described in the milestone context — if status changes push proactively, tenants stop needing to ask | MEDIUM | Depends on notification infra reused from Pagos reminders. |
| Case-closure satisfaction rating (1-tap) | Cheap signal for agency quality tracking; also gives tenants a sense their feedback matters (contrasts with "silently closed" anti-pattern) | LOW | Small addition once case detail view exists. |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Real-time chat-style "typing..." / live agent presence indicators on cases | Feels modern/responsive | Case resolution in this domain (maintenance, PQRS, payment negotiation) happens on hours/days timescales, not live-chat timescales — implies false immediacy and sets the wrong expectation | Clear status + SLA countdown is more honest and less engineering-heavy than real-time presence |

---

### Pillar 5 — Acuerdos de Pago (Payment Agreements / Cobranza)

This pillar has the **most existing backend sophistication already** (agency/agent side) and the **most legal sensitivity**. The tenant-side build is primarily a review/accept/pay surface, not a negotiation engine.

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| View an active/proposed payment agreement with full schedule (total debt, initial payment, N installments with dates/amounts) | Colombian legal practice for mora resolution: a written, dated payment plan with bank support "reduces the probability of escalation and leaves evidence of good faith" — this is standard conciliación practice, not novel | MEDIUM | `AgreementProposalDraft` (installments, discount, effective total) already modeled agent-side; tenant view is a read-only render of the same shape once approved. |
| Explicit tenant acceptance action (not silent/implied) | Mirrors the agency-side T-323 rule that agreements always require explicit human approval — the tenant side should equally require an explicit "acepto" action, not an auto-accept-on-view | LOW-MEDIUM | Should log timestamp + method of acceptance (evidentiary value, consistent with "formalize in writing" legal guidance found in research). |
| Pay each installment individually, tied to the agreement (not just generic rent payment) | Otherwise a tenant paying toward an agreement and a tenant paying regular rent look identical in the ledger — invites disputes | MEDIUM | Needs to tag payments against `paymentPlanId` (already referenced in existing agency code comments) rather than treating as generic rent. |
| Consequence-of-default clause shown plainly | Colombian agreements typically state what happens on missed installment (reversion to full mora terms, restitution process risk) — hiding this is both a UX and a legal-clarity problem | LOW | Text/legal-copy addition to the agreement detail view. |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|--------------------|------------|-------|
| Tenant-initiated "request a payment plan" flow (request, not self-approve) | Currently the agency/agent proposes agreements top-down (per `use-agreement-propose.ts`); letting a tenant proactively signal "I can't pay in full, can we talk terms" before going delinquent is a genuine differentiator most Colombian inmobiliarias don't offer digitally | MEDIUM-HIGH | Must feed into the *existing* human-approval pipeline (T-323), not create a parallel unsupervised path — this is additive to, not a replacement of, the agency engine. |
| Proactive pre-mora nudge with self-service agreement request | Catching S0 (pre-vencimiento) stage tenants before they become S1+ is the highest-leverage mora-reduction move, and the `CarteraStage` model already distinguishes this stage | MEDIUM | Directly serves the stated P1 problem (arrears) — worth prioritizing over polish elsewhere. |
| Interest/discount transparency (why the offer is what it is) | The agent-side engine already computes a policy-clamped discount (`discountAppliedPct`, `discountKind`) — showing the *math* (original debt, interest, discount, effective total) builds trust vs. presenting an opaque final number | LOW-MEDIUM | Pure UI over already-computed fields. |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Tenant can set their own discount/interest waiver | "Let me negotiate directly" feels self-service | Breaks the existing agency-policy-clamp + T-323 human-approval architecture; a tenant-facing "propose your own terms" that auto-applies would be a financial-control and compliance failure | Tenant can *request* terms/timeline; agency/agent computes and approves the actual offer |
| Automated collections messaging that ignores Ley 2300 contact windows | "More touchpoints = more collection" | Ley 2300 de 2023 ("Dejen de Fregar") legally restricts collection contact to consumer-authorized channels, business hours (Mon-Fri 7am-7pm, Sat 8am-3pm), max once/day, no multi-channel same week, and forbids asking why the tenant hasn't paid or contacting personal references — violating this exposes the agency to Superintendencia Financiera / SIC sanctions | In-portal self-service (pull, not push) is actually the *safest* channel: tenant checks status/agreement on their own schedule, no contact-window issue at all. This reframes Pillar 5 as a compliance-reducing feature, not just convenience. |
| Auto-escalate to legal/restitution process from the portal without human sign-off | "Full automation of collections funnel" | Existing codebase already treats this as gated ("activa carta pre-jurídica, gated counsel" per prior agent-side QA findings) — a tenant-facing trigger for this would bypass that gate entirely | Portal shows status only; escalation triggers remain agency/agent + counsel-gated, invisible as a tenant action |

---

### Pillar 6 — Comunicación

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| In-app messaging thread with the agency, tied to a case when relevant | Existing `mensajes/page.tsx` is only 30 lines — currently a stub relative to the other pillars | MEDIUM | Needs to become the "clarifying conversation" layer that hangs off cases (Pillar 4), not a replacement for structured intake. |
| WhatsApp as a first-class channel, not just email/push | Research is explicit and consistent: tenants live on WhatsApp/SMS in this market (Colombia especially — WhatsApp is the dominant channel per CLAUDE.md's own architecture notes), email-only or portal-only notification is a known failure pattern ("tenants receiving emails about their own issues... but living on mobile") | MEDIUM-HIGH | Twilio WhatsApp integration already exists in the broader Leasefy stack (per CLAUDE.md); this pillar is about *surfacing* case/payment events through that channel, consistent with existing architecture rather than inventing a new one. |
| Notification preferences (channel + frequency control per event type) | Prevents the over-notification anti-pattern research flags (CC'ed on every vendor email, reminder-spam) | LOW-MEDIUM | Simple settings surface, ties into `configuracion/page.tsx` which already exists. |
| Read receipts / "agency has seen your message" | Reduces "did they even see this?" anxiety, which is the core trust gap this milestone targets | LOW | Standard messaging UX. |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|--------------------|------------|-------|
| Unified inbox merging in-app + WhatsApp history for a given tenant-agency relationship | Most competitors (Buildium/AppFolio) silo portal messages from SMS/WhatsApp entirely — a merged view is a genuine gap-closer, and Leasefy's stated architecture (agent gateway normalizing WhatsApp → orchestrator) makes this feasible without inventing new infra | HIGH | Depends on the agent microservice's message-gateway maturity; likely a v1.x item, not MVP. |
| Proactive status-change messages authored to sound human, not templated | Research explicitly flags "automated responses that sound like they were written by a bot with no bedside manner" as a top complaint — Leasefy's AI-agent thesis (natural language generation, already used for score explanations) can differentiate here | MEDIUM | Reuses existing LLM-generated-explanation pattern from tenant scoring, applied to case/payment updates. |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Tenant can message the property owner directly, bypassing the agency | "More direct = more efficient" | Breaks the agency's intermediary role (liability, consistency, and the entire product's value proposition of the agency operating the relationship, not being disintermediated) | All communication routes through agency/agent; owner-facing summaries are a separate (owner portal) concern |
| Group broadcast messaging tenant → all tenants in building | Feels like "community" features some US platforms (Buildium's message board) offer | Colombian rental relationships here are agency-mediated B2B2C, not community-property-management (HOA/condo) style — this is out of scope and risks scope creep into a different product (propiedad horizontal software, a distinct category confirmed in Colombia PQRS research) | Not applicable to this product; explicitly defer/reject |

---

## Feature Dependencies

```
Pagos: multi-rail (Wompi/Bold) integration
    └──requires──> existing PayRentModal PSE-mock replaced/extended (not rebuilt)

Acuerdos de pago (tenant view/accept/pay)
    └──requires──> existing cobranza agreement engine (CarteraStage, computeOffer, T-323 approval)
                       └──requires──> Pagos multi-rail (installments need to be payable)

Solicitudes (maintenance create/track)
    └──requires──> existing SolicitudMantenimiento model + MantenimientoForm pattern (reuse, don't reinvent)

PQRS (formal petición/queja/reclamo/sugerencia)
    └──requires──> existing SolicitudPqrs model + agency-side pqrs/page.tsx (reuse, don't reinvent)

Estado de Casos (unified "mis casos" view)
    └──requires──> Solicitudes (Pillar 2) AND PQRS (Pillar 2) AND Acuerdos (Pillar 5)
                       [it is an aggregation layer, not an independent data model]

Documentos: certificado de retención en la fuente
    └──requires──> Pagos payment history (full tax-year of transactions)

Documentos: paz y salvo self-service
    └──requires──> Estado de Casos / ledger integrity (must reflect true zero-balance)

Comunicación: WhatsApp channel for case/payment notifications
    └──requires──> Estado de Casos (status-change events) AND existing Twilio WhatsApp infra (agent microservice)

Comunicación: unified inbox (WhatsApp + in-app)
    └──enhances──> in-app messaging (does not block MVP of messaging)

Acuerdos: tenant self-origination of terms ──conflicts──> existing T-323 human-approval architecture
    [do not build unsupervised term-setting; always route through existing approval gate]
```

### Dependency Notes

- **Solicitudes/PQRS/Estado de Casos requires the existing agency-side types be extended with tenant-facing read/write, not duplicated.** Building a parallel `TenantMaintenanceRequest` type would fragment the data model the agency side already relies on (`MantenimientoKanban`, `pqrs/page.tsx`) and break the single-source-of-truth the "estado de casos" pillar depends on.
- **Acuerdos requires Pagos multi-rail** because an agreement without a way to pay its installments individually (tagged to the plan) is just an informational page, not an operational one — this ordering matters for phase sequencing.
- **Estado de Casos is downstream of, not parallel to, Solicitudes/PQRS/Acuerdos** — sequencing it too early means building an aggregation view with nothing real to aggregate.
- **Documentos' two differentiators (certificado de retención, paz y salvo) both require accurate, complete payment history** — sequence Pagos before these, not after.
- **The self-origination anti-feature explicitly conflicts with T-323.** Any "tenant proposes payment plan" feature must produce a *request* object that the existing human-approval flow consumes — never a live agreement.

---

## MVP Definition

### Launch With (v7.0 core)

Minimum viable product for "the tenant can operate the relationship, not just escalate it."

- [ ] Pagos: real Wompi/Bold multi-rail replacing PSE-mock (PSE + card + Nequi at minimum) — table stakes, and the existing mock already models the hard part (async PSE state)
- [ ] Pagos: payment history + downloadable comprobantes — cheap, table stakes, already close given existing pagos page
- [ ] Solicitudes: tenant-facing create + track maintenance request, mirroring `SolicitudMantenimiento`/`MantenimientoForm` — reuses an existing model, high leverage
- [ ] PQRS: tenant-facing create + track petición/queja/reclamo/sugerencia, mirroring `SolicitudPqrs` — same leverage argument
- [ ] Estado de Casos: unified "mis casos" list aggregating Solicitudes + PQRS + Acuerdos with clear status and responsible party — this is the feature that most directly answers the stated P1 problem
- [ ] Acuerdos de pago: tenant view/accept/pay-installment surface on an agency-approved agreement (reads existing `AgreementProposalDraft`/`CarteraStage` shape) — do NOT build tenant term-setting yet
- [ ] Comunicación: functional in-app messaging tied to cases (upgrade from the current 30-line stub) + notification-preference settings

### Add After Validation (v1.x)

- [ ] Pagos: autopay/domiciliación via Wompi tokenized recurring debit — high value but adds retry/dunning complexity, validate manual multi-rail first
- [ ] Acuerdos: tenant-initiated "request a payment plan" (pre-mora self-service nudge into the existing approval pipeline) — powerful for the P1 problem but needs the base agreement-viewing flow proven first
- [ ] Documentos: certificado de retención en la fuente auto-generation — needs a full tax year of clean payment data to be meaningful; natural v1.x once Pagos has run for a while
- [ ] Documentos: paz y salvo self-service — needs Estado de Casos ledger integrity proven first
- [ ] Comunicación: WhatsApp-integrated case/payment status notifications — depends on agent-microservice gateway maturity, worth sequencing after core web flows are validated

### Future Consideration (v2+)

- [ ] Comunicación: unified inbox merging WhatsApp + in-app history — high engineering cost, defer until channel usage patterns are observed
- [ ] Pagos: split payment across co-tenants/roommates — real but niche relative to the core P1 problem
- [ ] Solicitudes: AI-assisted auto-triage of maintenance requests — explicitly deferred to agent-microservice backend work (M1) per existing code comments, not a frontend-milestone task
- [ ] Documentos: expiry/renewal alerts for insurance/póliza — depends on whether lease data model tracks this at all; investigate before committing

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Multi-rail payment (Wompi/Bold: PSE+card+Nequi) | HIGH | MEDIUM | P1 |
| Solicitudes (maintenance) create/track | HIGH | LOW-MEDIUM (reuses model) | P1 |
| PQRS create/track | HIGH | LOW-MEDIUM (reuses model) | P1 |
| Estado de Casos unified view | HIGH | MEDIUM | P1 |
| Acuerdos: view/accept/pay agreement | HIGH | MEDIUM | P1 |
| Comunicación: case-tied messaging + prefs | MEDIUM-HIGH | MEDIUM | P1 |
| Autopay/domiciliación | HIGH | MEDIUM-HIGH | P2 |
| Acuerdos: tenant-initiated plan request | HIGH | MEDIUM-HIGH | P2 |
| Certificado de retención en la fuente | MEDIUM | MEDIUM | P2 |
| Paz y salvo self-service | MEDIUM | MEDIUM | P2 |
| WhatsApp status notifications | MEDIUM-HIGH | MEDIUM-HIGH | P2 |
| Unified WhatsApp+in-app inbox | MEDIUM | HIGH | P3 |
| Split payment co-tenants | LOW-MEDIUM | MEDIUM | P3 |
| AI auto-triage of maintenance | MEDIUM | HIGH (backend, out of milestone) | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | AppFolio / Buildium / RentRedi (US reference) | Houm (Colombia/LatAm) | Our Approach |
|---------|-----------------------------------------------|------------------------|--------------|
| Payment rails | ACH, card, 90k+ retail cash locations (RentRedi) | PSE-based rent payment portal (main-tenant document number lookup) | PSE + card + Nequi via Wompi/Bold, with autopay as a v1.x differentiator most Colombian competitors lack |
| Maintenance requests | Photo/video submission, kanban-style tracking (RentRedi video, Buildium Resident Center) | Repair requests via portal (per Houm help center) | Reuse existing `SolicitudMantenimiento` model — already ahead structurally (typed quotes, paidBy split, completion photos) vs. what's publicly documented for Houm |
| PQRS-style formal complaint channel | Not a US concept (US uses "maintenance ticket" broadly, no formal PQRS legal culture) | Standard practice among Colombian inmobiliarias generally (not confirmed specifically for Houm), separate from maintenance | Distinct `SolicitudPqrs` type already exists — keep this Colombia-specific distinction, don't collapse into one generic "ticket" |
| Payment agreements for arrears | Late-fee display + manual off-platform negotiation typically (US eviction/collections process is different) | Not found in public Houm documentation | Genuine differentiation opportunity — existing agent-side cobranza engine (CarteraStage, T-323 approval) is more sophisticated than what's publicly visible for any Colombian competitor researched |
| Communication channel | In-app messaging + email/text (Buildium/RentRedi both note SMS as tenant-preferred) | Not detailed in available sources | WhatsApp-first, consistent with existing Leasefy architecture (Twilio WhatsApp already in stack) — matches actual Colombian channel behavior better than email-centric US defaults |

## Sources

- [DoorLoop: Top Property Management Software with a Tenant Portal](https://www.doorloop.com/blog/5-best-property-management-software-with-a-tenant-portal)
- [Buildium: Using a tenant portal app for easier rent payments and maintenance](https://www.buildium.com/blog/tenant-portal-app-easy-for-rent-payments-and-maintenance/)
- [Buildium: What is a tenant portal](https://www.buildium.com/dictionary/tenant-portal/)
- [TenantCloud: AppFolio vs Buildium comparison](https://www.tenantcloud.com/review/appfolio-vs-buildium)
- [RentRedi vs AppFolio comparison](https://rentredi.com/blog/rentredi-vs-appfolio-comparing-property-management-platforms/)
- [Wompi Leasing / Bancolombia — PSE integration for property administration](https://www.bancolombia.com/tu360/administraciones)
- [Bold Colombia — Pasarela de Pagos Online](https://bold.co/pagos-en-linea/pasarela-de-pagos)
- [Wompi Docs — Métodos de pago](https://docs.wompi.co/en/docs/colombia/metodos-de-pago/)
- [Wompi Soporte — Débitos automáticos y recurrentes](https://soporte.wompi.co/hc/es-419/sections/46452490473747--DEBITOS-AUTOMATICOS-Y-RECURRENTES)
- [Propiedata — Gestión de PQRS en Propiedad Horizontal](https://www.propiedata.com/blog/lo-que-debes-saber-sobre-la-gestion-de-pqrs-peticiones-quejas-o-reclamos-para-propiedad-horizontal/)
- [Ley 820 de 2003 — Función Pública (texto oficial)](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=8738)
- [Metrocuadrado — ¿Quién paga las reparaciones de una vivienda arrendada en Colombia?](https://www.metrocuadrado.com/noticias/guia-de-arriendo/quien-paga-las-reparaciones-de-una-vivienda-arrendada-en-colombia-2497)
- [Función Pública — Plazos de respuesta al derecho de petición (Ley 1755 de 2015)](https://www1.funcionpublica.gov.co/-/la-ley-reestablece-terminos-de-respuesta-a-las-peticiones-de-los-ciudadanos)
- [Contexto Legal — Derecho inmobiliario en Colombia: mora y restitución](https://contextolegal.com/derecho-inmobiliario-colombia-guia-legal-arrendamiento-mora-restitucion/)
- [Función Pública — Ley 2300 de 2023 (texto oficial)](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=213990)
- [Camacol — Ley 2300 de 2023: Medidas para la Gestión de Cobranza (resumen técnico)](https://camacol.co/sites/default/files/descargables/Ley%202300%20de%202023-Medidas%20para%20la%20Gesti%C3%B3n%20de%20Cobranza%20y%20Env%C3%ADo%20de%20Mensajes%20Publicitarios%20y%20Comerciales.pdf)
- [Gerencie.com — Retención en la fuente por arrendamiento](https://www.gerencie.com/retencion-en-la-fuente-por-arrendamiento.html)
- [Felix Trujillo Falla — Retención en la fuente por arrendamientos 2026](https://felixtrujillofalla.com/retencion-arrendamientos-colombia-2026/)
- [Siempre al Día — Certificado de retención en la fuente: plazo y contenido](https://siemprealdia.co/colombia/impuestos/certificado-de-retencion-en-la-fuente/)
- [Houm Colombia — Centro de ayuda: ¿Cómo pago mi arriendo?](https://help.houm.com/co/articles/492/como-pago-mi-arriendo-1)
- [Atlas Global Advisors — Is Your Property Management Tech Stack Failing Your Tenants?](https://atlasglobaladvisors.com/blog/is-your-property-management-tech-stack-failing-your-tenants/)
- Internal codebase inspection: `src/lib/types/inmobiliaria.ts`, `src/lib/api/pqrs.types.ts`, `src/app/panel/inmobiliaria/ai/cobranza/acuerdos/page.tsx`, `src/lib/hooks/cobranza/use-agreement-propose.ts`, `src/components/tenant/PayRentModal.tsx`, `src/app/inquilino/*`

---
*Feature research for: Portal del Inquilino v7.0 — post-signing tenant relationship operation (Colombia)*
*Researched: 2026-07-16*
