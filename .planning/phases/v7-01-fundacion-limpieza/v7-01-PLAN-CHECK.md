# Plan Check — v7-01 Fundación & Limpieza del Portal

**Checked:** 2026-07-16 · **Plans:** 4 · **Verdict: PASS-WITH-NITS**

Adversarial, goal-backward, pre-execution. All 4 plans are grounded in real repo
code; every cited hook, analog, and mock surface was spot-checked and exists.
The phase goal is deliverable. Two known deviations are both justified. Three
nits should be fixed before execution to avoid a wasted revision loop.

## Success-criteria coverage map

| SC | Delivered by | Status |
|----|--------------|--------|
| #1 Dashboard: arriendo activo + próximo pago + casos abiertos, real data, no hardcoded empties | Plan 01 T1 | **PARTIAL (by design)** — arriendo activo ✓, monto ✓, hardcoded block removed ✓; **fecha del próximo pago NOT rendered** (plan builds `{ amount }` only, drops dueDate); **casos abiertos deferred to v7-03** (honest placeholder, no data) |
| #2 Estado de cuenta traces to single source, no 2nd number, no dark patterns | Plan 01 T1+T2 (dashboard/arriendo reuse `useLeasePaymentInfo`); pagos page already canonical | ✓ |
| #3 Perfil real get/save, Colombia data, no Chilean mock | Plan 02 T1+T2 | ✓ (updateProfile + deleteAccount wired; cédula/+57/es-CO/COP; quick-stats purged; `rut` key preserved) |
| #4 Config real actions / honest empty-state, no setTimeout theater | Plan 03 T1+T2 | ✓ (modulo gate nit below) |
| #5 Nav exposes Notif/Perfil/Config; delete dead sidebar | Plan 04 T1+T2 | ✓ (dead code confirmed: 0 importers, not in barrel) |

## Ruling on the two deviations

**(a) Plan 01 folds in the arriendo "Al día" fix — APPROVED.** Confirmed a real,
live PAGO-01/PITFALLS-8 violation: `arriendo/page.tsx:150-163` hardcodes "Al día /
Todos los pagos al día" with a green CheckCircle regardless of `currentPeriodStatus`
(false reassurance to a tenant who may be in arrears). RESEARCH line 101 flagged this
exact watch-out. The page is a live post-firma tenant surface; the fix reuses the same
single-source hook as the dashboard, is bounded (one status card + `es-CL→es-CO`),
`arriendo/page.tsx` already imports the hooks and defines `activeLeases` (line 27), and
Plan 01 stays at 2 files / 2 tasks. In-scope and correct — not reckless scope creep.

**(b) "casos abiertos" data deferred to v7-03 — ACCEPTABLE / mandated.** No case-
aggregation service exists (hub is v7-03); fabricating a count would violate PITFALLS 1
and PAGO-01's "no second number." Plan 01 T1 correctly forbids a fabricated count and
allows only a neutral non-numeric placeholder. Deferring the *data* while keeping the
shell honest is the correct frontend-first call. **But SC #1 as written overpromises**
("los casos abiertos con data real del lease") — a silent gap the post-exec verifier
would flag. **Recommended reword:** "El dashboard `/inquilino` muestra el arriendo
activo y el próximo pago (fecha + monto) con data real del lease, sin arrays
hardcodeados; los 'casos abiertos' se exponen como placeholder neutro 'Próximamente'
hasta el hub de v7-03 (BASE-01, PAGO-01)."

## Guardrails encoded? (all present)

single-source saldo (no 2nd number) ✓ · neutral mora framing ✓ · `rut` key preserved
(label-only) ✓ · honest sessions empty-state (no device list; `mockSessions==0` +
`signOut({scope:'global'})` gated) ✓ · no Wompi route built here ✓ (forward-ref only) ·
Habeas Data export/delete wired real ✓ (Plan 02 delete + Plan 03 export/delete, gated) ·
additive — only tenant files + 1 deletion; landlord/agency twins READ, not modified ✓.

## Executability / ordering

- All 4 plans `wave:1`, `depends_on:[]`, **disjoint files** (01: page+arriendo · 02:
  perfil · 03: config · 04: layout+delete) → safe parallel, zero merge-conflict risk. ✓
- No plan touches >4 files (max 2) → no timeout risk. ✓
- `pnpm build` + `pnpm test` DoD present in all 4 (correctly notes CI skips `next build`). ✓
- No intra-phase dependency: plans 02/03/04 don't read 01's output; "foundation" refers
  to future phases v7-02..07. `depends_on:[]` is correct. ✓
- File:line drift is minor and grep-gated (match badge 302≠301; es-CL 36/44≠175/183) —
  self-correcting.

## Nits to fix before execution (ordered)

1. **[WARNING] `setTimeout==0` grep gates contradict "mirror landlord" (Plan 03 T2 &
   Plan 02 T1).** Landlord config keeps legitimate redirect `setTimeout`s (:134/:175/:187)
   and Plan 03 T2 says keep `handleResetOnboarding` (tenant :175 `setTimeout(...router.push,500)`)
   "exactly as-is"; landlord perfil delete uses `setTimeout` at :220. The gate
   `grep -c 'setTimeout' == 0` is unsatisfiable alongside those instructions. Change each
   gate to target the fake-await pattern only, e.g. `grep -c 'setTimeout(resolve' == 0`
   (RESEARCH Wave-0 gate intent), OR instruct the executor to convert the redirect
   `setTimeout(()=>router.push(x),n)` to a direct `router.push(x)`.
2. **[WARNING] SC #1 dashboard "fecha + monto" partially unmet.** Plan 01 T1 renders monto
   but drops the due date (`{ amount }`). Add a fecha derived from
   `paymentInfo.paymentDay` + `currentPeriod` (as the pagos page does), or reword SC #1 to
   locate "fecha" on the estado de cuenta. Trivial; data is already available.
3. **[INFO] Reword SC #1 casos-abiertos clause** per deviation (b) so the post-exec
   verifier doesn't flag a false failure. Documentation fix, not a plan defect.

**No BLOCKERS.** Plans are execution-ready once nit #1 is resolved (it will otherwise
cost one revision loop). Nits #2/#3 are alignment fixes.
