# Responsive e2e sweep

Finds responsive bugs (overflow, occluded buttons, broken mobile menu, cut-off dialogs...) across a
device matrix. It reports findings; it never fixes application code. Separate from the mocked
suite in `tests/e2e` (own config: `playwright.responsive.config.ts`).

## Run

The stack must already be running (front :3001, back :3000, agent :4000).

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
| `RESPONSIVE_REPORT_DIR` | Output dir (default `./responsive-report`). It is wiped at the start of a run unless `RESPONSIVE_REPORT_KEEP=1`. |
| `RESPONSIVE_ALLOW_POST` | Regex of URLs the read-only guard may let through. Default: none. |

Credentials come from `E2E_TENANT_*`, `E2E_LANDLORD_*`, `E2E_AGENCY_ADMIN_*`, `E2E_AGENCY_AGENT_*`
(`_EMAIL` / `_PASSWORD`). A persona with an empty password is skipped with a message, the run does
not fail.

Browsers: `npx playwright install chromium firefox webkit` and, for the Edge projects, a local
Microsoft Edge (`npx playwright install msedge`). A missing browser makes its projects fail with
Playwright's "executable doesn't exist" error; nothing is skipped silently.

## Output

- `responsive-report/summary.md` - counts by finding type, worst routes, routes with hard findings,
  page errors, skipped routes.
- `responsive-report/findings.json` - everything: route -> finding type -> devices, selector, screenshot.
- `responsive-report/screenshots/<persona>/<device>/<route>.jpg` - full-page screenshot per route x device.
- `playwright-report-responsive/` - the standard HTML report.

None of these (nor `tests/e2e-responsive/.auth/`, which holds tokens) is committed.

## How it works

1. `setup/auth.setup.ts` logs in once per persona through the real UI (password, then `123456` on the
   dev MFA screens) and stores `.auth/<persona>.json`. If a long run loses a session, one worker
   re-logs-in and shares the fresh state (`support/session.ts`).
2. `setup/resolve.setup.ts` turns `[param]` routes into real paths by following the first matching
   link on the parent list page (`support/resolve.ts`). Nothing is hardcoded; routes that cannot be
   resolved are reported as skipped with the reason.
3. `responsive.spec.ts` opens each route of each persona on the project's device and runs the checks.

Routes live in ONE file: `support/routes.ts` (persona -> routes, plus list-page overrides and the
excluded routes with reasons). Devices: `support/devices.ts`.

### Checks

| # | Check | Severity |
| --- | --- | --- |
| 1 | Horizontal overflow: page scrollbar and, because `body { overflow-x: clip }` hides it, every element that extends past the viewport (not contained by a clipping/scrolling ancestor, not an off-canvas panel) | hard |
| 2 | Text clipped by a fixed-size box without ellipsis | soft |
| 3 | Occluded clickables: `elementFromPoint` at the centre must hit the element at SOME scroll position of a sweep down the page; an element covered at every position is reported with what covers it | hard |
| 4 | Tap targets under 44x44 (touch devices; inline text links exempt) | soft |
| 5 | Fixed/sticky elements overlapping each other, or content hidden under a fixed bar at the top/bottom of the page | soft |
| 6 | Mobile navigation (< 1024px): toggle opens, every item is reachable, menu closes | hard |
| 7 | Dialogs / drawers / menus opened from allowlisted triggers fit the viewport and have a reachable close control | hard |
| 8 | Full-page screenshot | - |

An error page ("No pudimos cargar esto", 404, 5xx) is reported as `page-error` and its layout is not
measured. A route that redirects away (e.g. a role without access) is `redirected` (informational).

## Safety: read only

The suite never submits, creates, edits, deletes, pays, signs or uploads.

- Interactions are an allowlist (`support/interactions.ts`): navigation toggles, `aria-haspopup`
  dialog/menu triggers (minus logout/download/pay/export/print), tabs, close controls, Escape.
- Every non-GET/HEAD/OPTIONS request is aborted at the network layer (`support/guard.ts`) and listed
  as `blocked-mutation` in the report. The only form the suite submits is the login in the auth setup
  (and the re-login fallback), which runs outside the guard.

## False-positive risks

- Viewports are the sizes of the matrix with NO browser chrome subtracted: `100vh`/URL-bar bugs on real
  iOS Safari are under-reported (WebKit on desktop does not reproduce them either).
- Tap targets are measured against the element's own box; a larger invisible hit area is not detected.
- Decorative absolutely-positioned elements with text may be flagged as overflow; check the screenshot.
- A cookie banner, tour or modal open on load makes the occlusion check judge only inside it.
- Dev-server compilation makes first hits slow; a navigation timeout shows as a `suite-error`.
