# Responsive e2e sweep

Finds responsive bugs (overflow, occluded buttons, broken mobile menu, cut-off dialogs...) across a
device matrix. It reports findings; it never fixes application code. Separate from the mocked
suite in `tests/e2e` (own config: `playwright.responsive.config.ts`).

## Run

The stack must already be running (front :3001, back :3000, agent :4000).

**Recommended target: a production build.** `pnpm build && npx next start -p 3001` has no dev
overlay, no per-route compile and no 6-8 GB dev-server memory growth; runs are several times faster
and steadier than against `next dev`. With it, `RESPONSIVE_WARMUP=0` is enough. Against `next dev`
the warm-up pass (below) is what keeps cold compiles from becoming page errors.

```bash
pnpm e2e:responsive:fast      # iPhone 11, iPhone 12-14, Pixel 7, Galaxy S23, Desktop Chrome 1366x768
pnpm e2e:responsive           # the full approved matrix (28 projects)
pnpm e2e:responsive -- --project "Pixel 7-8 412x915" -g "pagos/cartera"   # extra Playwright args
```

| Variable | Meaning |
| --- | --- |
| `E2E_ENV_FILE` | Credentials file. Default `./.env.e2e.local` relative to the front root. |
| `PLAYWRIGHT_BASE_URL` | Default `http://localhost:3001`. |
| `RESPONSIVE_WORKERS` | Parallel workers (default 4). The dev server is the bottleneck. |
| `RESPONSIVE_REPORT_DIR` | Output dir (default `./responsive-report`). It is wiped when the first test finishes unless `RESPONSIVE_REPORT_KEEP=1`; `--list`, and a run that aborts in global setup, never touch it. |
| `RESPONSIVE_ALLOW_POST` | Regex of URLs the read-only guard may let through. Default: none (Supabase token refresh is always allowed). |
| `RESPONSIVE_SAMPLE` | Keep every Nth route of each persona (default 1 = all). |
| `RESPONSIVE_ROUTE_FILTER` | Regex tested against `<persona> <route>`; only matches run. |
| `RESPONSIVE_WARMUP` | `0` skips the warm-up pass, `1` forces it. Default: on for localhost, off otherwise. `RESPONSIVE_WARMUP_ROUTE_MS` caps each warm-up navigation (default 90000). |
| `RESPONSIVE_RETRIES` | Playwright retries per test (default 1). |
| `RESPONSIVE_IPHONE_ENGINE` | `chromium` runs the iPhone projects on Chromium (same viewport, DPR, `isMobile`, `hasTouch`, iPhone UA); names get a ` [chromium]` suffix. Default `webkit`. See "iPhones without WebKit". |
| `RESPONSIVE_PREFLIGHT` | `0` skips the start-up GET of the base URL. Default on: a server that does not answer stops the run in seconds. |
| `RESPONSIVE_BREAKER_N` | Consecutive refused/reset/timed-out navigations that abort the run (default 6). |
| `RESPONSIVE_REUSE_AUTH` / `RESPONSIVE_REUSE_RESOLVED` | `1` = keep the session / resolved ids of a previous run (iterating on the suite). |

Credentials come from `E2E_TENANT_*`, `E2E_LANDLORD_*`, `E2E_AGENCY_ADMIN_*`, `E2E_AGENCY_AGENT_*`
(`_EMAIL` / `_PASSWORD`). A persona with an empty password is skipped with a message, the run does
not fail.

Browsers: `npx playwright install chromium firefox webkit` and, for the Edge projects, a local
Microsoft Edge (`npx playwright install msedge`). A missing browser makes its projects fail with
Playwright's "executable doesn't exist" error; nothing is skipped silently.

### iPhones without WebKit

WebKit hangs on some Windows machines. Run every iPhone project on Chromium instead:

```bash
RESPONSIVE_IPHONE_ENGINE=chromium pnpm e2e:responsive          # PowerShell: $env:RESPONSIVE_IPHONE_ENGINE='chromium'
```

Projects are then named like `iPhone 12-13-14 390x844 [chromium]`, so a report can never be mistaken
for a Safari run. **Chromium emulation does not catch Safari-only rendering bugs** (dvh/svh and URL-bar
resizing, safe-area insets, `position: fixed` in Safari, flex/grid and `aspect-ratio` quirks, input
zoom on focus). It checks layout at the iPhone viewport; it is not a Safari sign-off. The desktop WebKit
projects are unaffected by this switch.

### Dead server

Global setup GETs the base URL (3 attempts, 10 s each) and aborts with a banner if nothing answers.
During the run every navigation feeds a circuit breaker (`support/breaker.ts`, state in
`tests/e2e-responsive/.auth/breaker.log`): after `RESPONSIVE_BREAKER_N` consecutive refused/reset/timed-out
navigations the launcher (`pnpm e2e:responsive*`) kills the run, prints a banner and exits 4. Plain
`npx playwright test -c ...` still stops navigating but cannot kill itself. The report keeps the tests that
finished before the failure.

### Suite self-tests

`pnpm e2e:responsive:selftest` runs `selftest/*.selftest.ts` (config `playwright.responsive.selftest.config.ts`):
the occlusion sweep on inline pages (nested sidebar scroller false positive, real fixed overlap), the
breaker, the preflight and the iPhone engine switch. No app, login or server needed.

## Output

- `responsive-report/summary.md` - counts by finding type, worst routes, routes with hard findings,
  page errors, skipped routes.
- `responsive-report/findings.json` - everything: route -> finding type -> devices, selector, screenshot.
- `responsive-report/screenshots/<persona>/<device>/<route>.jpg` - full-page screenshot per route x device.
- `playwright-report-responsive/` - the standard HTML report.

None of these (nor `tests/e2e-responsive/.auth/`, which holds tokens) is committed.

## How it works

1. `setup/auth.setup.ts` logs in once per persona through the real UI (waits for the form to hydrate,
   fills and re-checks the fields, password, then `123456` on the dev MFA screens; the whole flow is
   retried once) and stores `.auth/<persona>.json` ONLY if it holds the Supabase session (temp file +
   rename: a failed login never leaves an empty file or destroys a valid one). A persona that cannot log
   in is skipped, listed in the report and announced by a banner + non-zero exit code. If a long run loses a session, one worker
   re-logs-in and shares the fresh state (`support/session.ts`).
2. `setup/resolve.setup.ts` turns `[param]` routes into real paths by following the first matching
   link on the parent list page (`support/resolve.ts`). Nothing is hardcoded; routes that cannot be
   resolved are reported as skipped with the reason.
3. `setup/warmup.setup.ts` visits every selected route once per persona before anything is measured (see
   `RESPONSIVE_WARMUP`), ignoring failures, so `next dev` has compiled them.
4. `responsive.spec.ts` opens each route of each persona on the project's device and runs the checks.

Routes live in ONE file: `support/routes.ts` (persona -> routes, plus list-page overrides and the
excluded routes with reasons). Devices: `support/devices.ts`.

### Checks

| # | Check | Severity |
| --- | --- | --- |
| 1 | Horizontal overflow: page scrollbar and, because `body { overflow-x: clip }` hides it, every element that extends past the viewport (not contained by a clipping/scrolling ancestor, not an off-canvas panel) | hard |
| 2 | Text clipped by a fixed-size box without ellipsis (skip links, `sr-only` and sub-8px boxes ignored; text with a `title`/`aria-label` is info) | soft |
| 3 | Occluded clickables (elements inside collapsed accordions / `aria-hidden` are not measured; a coverer inside the same interactive ancestor is not an occluder): `elementFromPoint` at the centre must hit the element at SOME scroll position of a sweep down the page (an element inside its own scroller, e.g. a sidebar nav, is first centred with `scrollIntoView` so its last items are tested where a user could see them); an element covered at every position is reported with what covers it | hard |
| 4 | Tap targets under 44x44 (touch devices; inline text links exempt) | soft |
| 5 | Fixed/sticky elements overlapping each other, or content hidden under a fixed bar at the top/bottom of the page | soft |
| 6 | Mobile navigation (< 1024px): toggle opens (waits for the loading veil and up to 10 s), collapsed groups are expanded through their own `aria-expanded` trigger, every visible item is reachable, menu closes | hard |
| 7 | Dialogs / drawers / menus opened from allowlisted triggers fit the viewport and have a reachable close control | hard |
| 8 | Full-page screenshot | - |

An error page ("No pudimos cargar esto", 404, 5xx) is reported as `page-error` and its layout is not
measured. A route that redirects away (e.g. a role without access) is `redirected` (informational). A screen that
renders the "No tienes acceso a ..." card is recorded as `forbidden-for-role` (informational) and its
layout is not measured. Running a single route: `RESPONSIVE_ROUTE_FILTER='^agencyAgent /panel/inmobiliaria/pagos/cobranza/acuerdos$'`
(anchored; a bare `-g` route pattern also matches its sub-routes).

## Safety: read only

The suite never submits, creates, edits, deletes, pays, signs or uploads.

- Interactions are an allowlist (`support/interactions.ts`): navigation toggles, `aria-haspopup`
  dialog/menu triggers (minus logout/download/pay/export/print), tabs, close controls, Escape.
- Every non-GET/HEAD/OPTIONS request is aborted at the network layer (`support/guard.ts`; the only
  exception is the Supabase access-token refresh) and summarised in the report under "Requests
  aborted by the read-only guard". The only form the suite submits is the login in the auth setup
  (and the re-login fallback), which runs outside the guard.

## False-positive risks

- Viewports are the sizes of the matrix with NO browser chrome subtracted: `100vh`/URL-bar bugs on real
  iOS Safari are under-reported (WebKit on desktop does not reproduce them either).
- Tap targets are measured against the element's own box; a larger invisible hit area is not detected.
- Decorative absolutely-positioned elements with text may be flagged as overflow; check the screenshot.
- A cookie banner, tour or modal open on load makes the occlusion check judge only inside it.
- Dev-server compilation makes first hits slow; a navigation timeout shows as a `suite-error`.
