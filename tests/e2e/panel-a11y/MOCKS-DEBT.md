# Panel-a11y suite — residual mock-shape debt

**Snapshot:** 2026-06-01, after the Phase 38 + post-handoff #4 triage session.

**Baseline trajectory:**

| Stage                                         | Passed | Skipped | Failed |
| --------------------------------------------- | ------ | ------- | ------ |
| Before any fix (orchestrator's baseline)      | 3      | 7       | ~70    |
| After test-infra unblock (auth + skeleton)    | 39     | 11      | 61     |
| After skeleton-delay + audit-URL + role fixes | ~44    | ~13     | ~54    |

The infra and timing fixes (commits `dd3f78f`, `1a8b0ee`, and the role/no-data
follow-up) are load-bearing for the entire suite. Everything below is
per-spec mock-shape work that does NOT generalise — each spec needs the
real production endpoint URL and response shape inspected.

**Scope reminder:** Phase 38 D-38-12 specifies the universal CI gate as
"zero `critical` + `serious` axe-core violations on populated render". The
EmptyState + skeleton assertions are paired observability checks, not gate
gates — they are useful for catching regressions in skeleton coverage but
their failure does NOT block deployment unless they would have caught a
real CI regression.

## Failure categories

| Category                    | Count | Effort                                            | Notes                                                     |
| --------------------------- | ----- | ------------------------------------------------- | --------------------------------------------------------- |
| `axe-violation: sidebar`    | ~22   | High — fix sidebar / inmobiliaria layout, not spec | Real pre-existing a11y issues on `panel/inmobiliaria/layout.tsx` (button-name, color-contrast, link-name). NOT in scope of Phase 38; scope is `/ai/*` pages only. The axe scan runs on the whole page so it picks up these sidebar issues on every spec. Mitigation options: (a) scope axe to `<main>` via `AxeBuilder.include`, (b) raise sidebar a11y in a follow-up phase. |
| `mock-shape: response keys` | ~12   | Low–Medium per spec — 5–15 LOC each                | Hook expects `{ items, next_cursor }` (snake_case + cursor pagination) but spec mocks `{ summary, violations }` or similar. Each fix requires reading the hook to see canonical shape. Examples: `cobranza-compliance-ley-2300.a11y.spec.ts` (FIXED in batch B), `cobranza-compliance-opt-out.a11y.spec.ts`, `cobranza-compliance.a11y.spec.ts`. |
| `mock-shape: URL pattern`   | ~6    | Low — 1 LOC each                                   | Glob doesn't match the production endpoint. Examples: `compliance/audit-log` → `cobranza/audit-log` (FIXED in batch B). Each fix is one constant. |
| `selector-drift: testid`    | ~3    | Low                                                | Spec asserts on `[data-testid=X]` but component renamed/removed it. e.g., `cobranza-overview-skeleton` was renamed during Phase 37 refactor (verify). |
| `next-dev-state: page returns raw JSON` | ~6    | Out of scope                            | Some specs see `{"items":[]}` as plain text in the DOM. This is a Next.js dev-server HMR artefact (page returns the API response body as Component children when the cache is in a bad state). Runs after a full dev server restart usually clear these. Not a spec-fixable issue. |
| `flaky-timeout`             | ~5    | Low                                                | First-compile of a page can exceed the 3–6s skeleton timeout. We bumped to 6s + 2.5s delay (commit `1a8b0ee`) which covered most. Specs still flaky: `cobranza-cartas-detail.a11y.spec.ts:56`, `cobranza-pago-detail.a11y.spec.ts:38`. Consider bumping these specific specs to 10s. |

## Per-spec deferred items (sorted by lowest fix-effort first)

### Category: mock-shape mismatch — fix the response shape

These specs render a populated UI but assert against an empty/EmptyState path
because the mock response doesn't match the hook's expected `{ items, next_cursor }` or similar.

- `cobranza-compliance-opt-out.a11y.spec.ts:46` — `OptOutResponse` shape is
  `{ items: OptOutEntry[]; next_cursor: string | null }` where `OptOutEntry`
  has `event_id`, `debtor_id_masked`, `requested_at`, `source`,
  `acknowledged_at`. Spec currently sends `{ items: [...] }` without
  `next_cursor` and without the canonical entry shape (uses `debtorId`,
  `requestedAt`, `channel`).

- `cobranza-compliance.a11y.spec.ts:32,47` — endpoint is
  `/api/agency/:id/cobranza/compliance/overview` (verify; spec mocks
  `**/compliance/overview**`). Response should be `{ summary, alerts }`
  per the page.

- `cobranza-analitica.a11y.spec.ts:69` — EmptyState branch ONLY fires when
  `agencyGate.calls_30d === 0` (literal). Spec uses `calls_30d: 2` which
  routes to the NoDataYetBadge branch instead. The NoDataYetBadge now has
  `role="status"` (fix shipped 2026-06-01) so this should pass next run.

- `cobranza-pagos.a11y.spec.ts:56` — likely the cursor / pagination shape
  on `/api/agency/:id/cobranza/pagos` is `{ items, next_cursor }`.

- `cobranza-plantillas.a11y.spec.ts:64` — `/api/agency/:id/cobranza/templates`
  shape.

- `cobranza-reporte.a11y.spec.ts:54` — daily-report shape.

- `cobranza-critical-04a.spec.ts:136` — Reporte diario EmptyState path uses
  a different empty-state component (`SampleDataWatermark`) instead of
  `EmptyState` per Phase 37 D-37-07. Spec assertion may need
  `[data-testid="sample-data-watermark"]` instead of `[role="status"].border-dashed`.

- `cobranza-critical-04a.spec.ts:154` — TopScriptsTable `populated=false`
  path renders SampleDataWatermark; spec asserts on the wrong selector.

### Category: axe violations — sidebar / inmobiliaria layout (out of scope)

These all fail with `[critical] button-name: .top-6`, `[serious] color-contrast: ...hover:bg-neutral-50[href$="hoy"]`, `[serious] link-name: a[href="/"]` — three real
a11y issues in the inmobiliaria layout that pre-date Phase 38. Scope: open a
follow-up phase for inmobiliaria layout a11y. Specs are correct; the layout is not.

Specs affected:
- `ai-hub.a11y.spec.ts:66`
- `cobranza-analitica.a11y.spec.ts:80`
- `cobranza-arco.a11y.spec.ts:81`
- `cobranza-cartas-detail.a11y.spec.ts:*` (likely)
- `cobranza-compliance-audit.a11y.spec.ts:76`
- `cobranza-configuracion.a11y.spec.ts:68`
- `cobranza-deudor-detail.a11y.spec.ts:63`
- `cobranza-escalacion-detail.a11y.spec.ts:55`
- `cobranza-overview.a11y.spec.ts:88`
- `cobranza-pago-detail.a11y.spec.ts:53`
- `cobranza-pago-plan.a11y.spec.ts:52`
- `cobranza-pagos.a11y.spec.ts:79` (if axe-violation, otherwise mock-shape)
- `cobranza-plantilla-detail.a11y.spec.ts:54`
- `cobranza-plantillas.a11y.spec.ts:80`
- `cobranza-reporte-suscripcion.a11y.spec.ts:44`
- `cobranza-reporte-thresholds.a11y.spec.ts:44`
- `cobranza-reporte.a11y.spec.ts:71`
- `cobranza-siniestros-detail.a11y.spec.ts:51`
- `cotizador-aseguradoras.a11y.spec.ts:74`
- `cotizador-carrier-detail.a11y.spec.ts:51`
- `cotizador-carrier-sla.a11y.spec.ts:70`
- `cotizador-nueva.a11y.spec.ts:64`
- `cotizador-overview.a11y.spec.ts:77`
- `cotizador-quote-detail.a11y.spec.ts:58`

Recommended remediation: open `mvp/tests/e2e/panel-a11y/_helpers/axe-helpers.ts`
`runAxeOrFixme` and add `.include('main')` to the `AxeBuilder` chain so the
scan is scoped to the page's main content. This narrows the gate to the
Phase 38 surface and unblocks ~22 specs immediately. Sidebar a11y goes into
a follow-up phase.

### Category: audio keyboard specs (3 failures, special case)

- `cobranza-audio-keyboard.a11y.spec.ts:74,94,128` — these need the audio
  player to mount, which depends on a call-detail page's transcript fetch
  succeeding. The `**/calls/:id/transcript` mock is not in seedAuthState,
  so each spec must add it locally. Effort: 30 min total for the 3 specs;
  add the transcript mock + audio src to each.

### Category: next-dev artefacts (out of band)

- `cobranza-compliance-opt-out.a11y.spec.ts:46` and a handful of others
  show `{"items":[]}` as text in the DOM. This is the Next.js dev-server
  HMR returning the API response body as page content when the build cache
  is corrupted. Rerunning the spec after a clean dev-server restart
  resolves this. Not a spec fix; document and move on.

## Next-action checklist (for whoever picks this up)

1. **Free win, 5 min:** add `.include('main')` to `AxeBuilder` in
   `axe-helpers.ts` → unblocks ~22 axe-violation failures.
2. **Per-spec mock-shape fixes, 1–2 hours total:** sweep through the 12
   `mock-shape: response keys` specs, read each hook's response type, update
   the mock body literal.
3. **Audio specs, 30 min:** add `**/calls/*/transcript` route mock to the 3
   audio-keyboard specs.
4. **Restart dev server + re-run:** clears the `{"items":[]}` artefact.
5. **Resulting baseline:** ~85+ pass / ~25 skip / ~5 fail.
