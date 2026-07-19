# v7-05 Comunicación — Plan Check

**Checked:** 2026-07-19
**Plans:** v7-05-01, v7-05-02, v7-05-03 (sequential waves 1→2→3)
**Verdict:** **PASS-WITH-NITS** (execute in order; nits are clarity/robustness, none block the phase goal)

---

## Verdict rationale

The three plans, executed in order, achieve the v7-05 phase goal. Every claim in the plans
was traced to the real source in `/Users/nicolasgarcia/rent/mvp-portal-inquilino`:

- Line references are accurate (`MessagesWidget.tsx` handlers 198-219, attach buttons 538-550,
  quick-actions 655-676, options menu 442-462, info-panel property row 622-636, messages area 471-474;
  `House`/`ChatCircle`/`Info` already imported).
- The honest-unavailable idiom (`isEndpointUnavailable` 404/403/0) exists verbatim in
  `lease-documents.service.ts:67` and `ApiError` is exported from `client.ts:21`.
- `messages.service.ts` is an object literal with `getMessages`/`sendMessage`/`markAsRead` intact;
  `ChatConversation` already carries the real `property` field; `mapToConversation` is the mapper seam.
- The caso detail summary card has the existing "Ver en {origen}" out-link (196-204) next to which the
  deep-link lands; the file currently contains **zero** `applicationId=` (gate won't false-positive).
- `alert-dialog.tsx` and `sonner` (`toast`) are available in-repo and already used (`AutopagoSection`,
  `PayRentModal`, `documentos/page.tsx`). Zero new npm packages required.
- DESIGN.md §4 confirms **sentence case** buttons; all plan copy is sentence case and **no plan gate
  hard-requires an uppercase CTA** (the v7-04 trap is avoided).

The milestone doctrine is fully honored: additive (applicationId path + landlord/agency byte-identical),
frontend-first honesty (contracts + honest "Próximamente", grep-gated absence of fake "enviado"/fake
presence/fabricated thread), and every Colombia legal crux is encoded with a grep gate.

---

## Success-criteria coverage map

| ROADMAP SC | Requirement | Plan / Task | Coverage | Notes |
|---|---|---|---|---|
| SC1 — chat atado al arriendo/caso; `messages.service.ts` lease-scoped | COMU-01 | 01 T1 (lease-scoped contract `getMessagesByLease`/`sendMessageByLease` + `leaseId?`/`caseId?` types), 01 T2 (real-property context header), 01 T3 (caso→inbox deep-link) | **COVERED (honest frontend-first)** | `messages.service.ts` literally extended to lease-scoped; chat *reads as* tied to the arriendo via the REAL `property` field; real per-lease **thread grouping** is a ROADMAP-declared backend dep → contract + "Próximamente" (not silent reduction). Deep-link goes to the real inbox `/inquilino/mensajes` (no fabricated `?applicationId=`) because `TenantCase` carries no thread id. |
| SC2 — adjuntar archivos/fotos + archivar/reportar reales (no `alert()`/inertes) | COMU-02 | 02 T1 (archive/mute/report + sendAttachment contracts, honest-degrade), 02 T2 (real file picker; send = honest "Próximamente"), 02 T3 (replace 3×`alert()` → service + sonner + AlertDialog report confirm) | **COVERED (honest frontend-first)** | Picker UI is REAL; send is honestly pending (RESEARCH §2 verified two backend gaps: no chat-attachment endpoint + no attachment field on `BackendChatMessage`). Grep gates forbid fake "enviado" and any orphaned `/documents` upload. All three `alert()` removed (currently exactly 3 in file). |
| SC3 — saliente respeta gate de contacto del agent; no Twilio; no "por qué" la mora; WhatsApp ruteado | COMU-03 | 03 T1 (`agent-contact.service.ts` `canContact`, default-gated, no sender), 03 T3 (disabled "WhatsApp — ruteado por tu inmobiliaria · Próximamente" + no-motivo/no-presence standing guard) | **COVERED** | Only real send stays in-app `messagesApi.sendMessage` (tenant→agency inbound). Grep gates forbid `twilio|sendgrid|wa.me|whatsapp send` in service + widget and `"recordatorio enviado"` counters. No "motivo…mora / por qué…pagado" field. |
| SC4 — ventana de respuesta esperada, sin humano instantáneo (PITFALLS UX) | COMU-04 (guardrail) | 03 T2 (`PQRS_SLA_BUSINESS_DAYS = 15` constant + static neutral hint) | **COVERED** | Static "hasta 15 días hábiles" hint; grep gates forbid "responde al instante / respuesta inmediata / en línea / escribiendo" and any live countdown. |

**All three roadmap requirement IDs present in plan frontmatter:** 01 `[COMU-01]`, 02 `[COMU-02]`, 03 `[COMU-03]`. ✓

---

## Legal-crux checks (this phase)

| Crux | Status | Evidence |
|---|---|---|
| Ley 2300/2023 — no outbound sender that bypasses a contact gate; `canContact` default-gated | ✅ | 03 T1 has **no** `send*` method; `canContact` returns `{allowed:false,'unavailable'}` on 404/403/0; grep-gated absence of twilio/sendgrid/wa.me in service + widget. Compose path stays tenant→agency inbound (`messagesApi.sendMessage`). |
| No "¿por qué la mora?" field (art. 7) | ✅ | Report reason is optional free-text only; grep gates in 02 T1, 02 T3, 03 T3 assert absence of "motivo…(mora/atraso/pago)" / "por qué no (ha/has) pagado". |
| No fabricated deep-link | ✅ | 01 T3 links to real `/inquilino/mensajes`; grep gate `applicationId=` count 0. |
| Ley 1581 / no IDOR | ✅ | Lease-scoped read/send are contracts (no live thread faked); future attachment retrieval documented via `getSignedUrl`; caso detail keeps own-cases-only resolution (no new fetch/authz). |
| PQRS SLA informational, not a guarantee | ✅ | Static "hasta 15 días hábiles" hint, no countdown (real clock deferred to v7-06). |

---

## Dimension summary

- **D1 Requirement coverage:** PASS — COMU-01/02/03 each mapped to a plan; SC4 covered by 03 T2.
- **D2 Task completeness:** PASS — all 9 tasks are `type="auto"` with files/action/`<verify><automated>`/done.
- **D3 Dependency correctness:** PASS — 01 (w1,[]) → 02 (w2,[v7-05-01]) → 02 → 03 (w3,[v7-05-02]); no cycles; format matches shipped v7-04 convention; strict sequential ordering on the shared `MessagesWidget.tsx` respected.
- **D4 Key links planned:** PASS — header←real `property`; actions←typed service; whatsapp←`canContact`; hint←`PQRS_SLA_BUSINESS_DAYS`. All wired in task actions.
- **D5 Scope sanity:** PASS — 3 tasks / 3-4 files per plan.
- **D6 must_haves derivation:** PASS — truths are user-observable / legally framed; artifacts map to truths.
- **D7 Context compliance (milestone doctrine):** PASS — additive, frontend-first honesty, DESIGN §4 sentence case, all legal cruxes honored.
- **D7b Scope-reduction detection:** PASS — "Próximamente"/contract scoping is **explicitly sanctioned by the ROADMAP external-deps note** and grounded in RESEARCH-verified backend gaps; NOT an invented v1/v2 reduction.
- **D7c Architectural tier compliance:** PASS — matches RESEARCH "Architectural Responsibility Map"; security-sensitive outbound correctly assigned to the `agent` tier, never the frontend.
- **D8 Nyquist:** SKIPPED (RESEARCH.md has no "Validation Architecture" section). Note: every task still carries an `<automated>` grep gate + phase `pnpm build`/`pnpm test`; see optional nit 5.
- **D9 Cross-plan data contracts:** PASS — all edits additive on the shared trio (`leaseId?` added in 01, consumed in 03; `isEndpointUnavailable` added in 01, reused in 02); sequential waves prevent conflict.
- **D10 CLAUDE.md compliance:** PASS — additive, es-CO, DESIGN-first, PR workflow, zero new packages.
- **D11 Research resolution:** PASS — no unresolved "## Open Questions" section; Assumptions Log risks are LOW/MEDIUM and "safe either way".
- **D12 Pattern compliance:** PASS — each new/changed file references its PATTERNS.md analog (lease-documents idiom, documents ARCO/sonner+alert-dialog, casos/page.tsx disabled affordance, pqrs.types SLA source).

---

## Frontmatter check (per the Bash-was-down caveat)

All three plans have **well-formed YAML** and a schema **consistent with shipped v7-04 plans**:

| Plan | keys | wave | depends_on | requirements | truths/artifacts/key_links |
|---|---|---|---|---|---|
| v7-05-01 | phase,plan,type,wave,depends_on,files_modified,autonomous,requirements,must_haves | 1 | `[]` | `[COMU-01]` | 4 / 4 / 2 |
| v7-05-02 | (same) | 2 | `[v7-05-01]` | `[COMU-02]` | 4 / 2 / 2 |
| v7-05-03 | (same) | 3 | `[v7-05-02]` | `[COMU-03]` | 4 / 3 / 2 |

Every artifact entry has `path`/`provides`/`contains`; every key_link has `from`/`to`/`via`/`pattern`.
`depends_on` uses the `[v7-05-0N]` list form exactly as shipped v7-04-02/03/04. **No frontmatter issues.**

---

## Ordered nit list (apply directly; none block execution)

1. **[v7-05-01 · Task 3 · clarity]** `src/app/inquilino/casos/[caseId]/page.tsx` does **not** currently
   import a chat icon (imports are CreditCard, FileText, ClipboardText, CheckCircle, Clock, Warning,
   CaretLeft, MagnifyingGlass, ArrowUpRight, XCircle, User). Make the action explicit: *"add `ChatCircle`
   (or `Chat`) to the existing `@phosphor-icons/react` import block"* so the new `Button asChild` compiles.
   (`pnpm build` in verification would catch an omission, but state it to avoid a wasted loop.)

2. **[v7-05-03 · Task 1 · doc accuracy]** The action/interface says `canContact` is *"routed to
   `AGENT_SERVICE_URL`"*, but the method body uses `apiClient.get('/agent/contact/can-contact…')`.
   `apiClient` targets `NEXT_PUBLIC_BACKEND_URL`, not `AGENT_SERVICE_URL`. This actually **matches the
   repo's existing agent api-client convention** (`agent-credits.service.ts` also uses `apiClient` with
   `/agent/*` routes), and it stays default-gated (404 → `allowed:false`) either way — so behavior is
   correct. **Fix the JSDoc** to describe AGENT_SERVICE_URL as the conceptual *owner of the ledger* (the
   BFF forwards), not the literal fetch target — or route through the `agent-*` BFF pattern explicitly.
   Do not leave the comment implying a direct microservice fetch that isn't wired.

3. **[v7-05-02 & v7-05-03 · sequential line-number drift]** Plans 01/02/03 all edit the same input/composer
   region of `MessagesWidget.tsx` (header ~471-474, attach buttons ~537-551, SLA hint ~535-581, quick-actions
   ~655-676) across three waves. Cited absolute line numbers **will shift** after each wave. Add a one-line
   guardrail to the later plans' actions: *"locate anchors by grep (the Paperclip `IconButton`, the message
   `<Input>` row, the Quick-Actions block) rather than trusting absolute line numbers."* Prevents mis-placed
   inserts during execution.

4. **[v7-05-03 · Task 2 · optional robustness]** Consider adding the `Info` icon usage note is already fine;
   no change needed — the tenant-only gating (`isTenant`) is correctly specified. (No action.)

5. **[phase · optional test coverage — nice-to-have, not required]** Dimension 8 is skipped (no Validation
   Architecture section) and this is a composition/contract phase, so verification leans on grep gates +
   `pnpm build` + manual smoke — acceptable and consistent with prior v7 UI phases. The three honest-degrade
   contracts are pure and cheaply unit-testable; optionally add a tiny test asserting
   `getMessagesByLease` → `null` on `ApiError(404)` and `canContact` → `{allowed:false,reason:'unavailable'}`
   on `ApiError(404)`, to lock the honest-degrade invariant against future regressions. Not a blocker.

---

## Recommendation

**Proceed to execution in strict order 01 → 02 → 03.** Apply nits 1-3 to the plan text first (they are
one-line clarifications that prevent avoidable execution-loop churn); nit 5 is optional. No blockers.
