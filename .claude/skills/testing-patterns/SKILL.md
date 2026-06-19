---
name: testing-patterns
description: vitest patterns, component test, service test, Playwright E2E, axe a11y, route.fulfill, happy-dom, test skeleton
license: MIT
metadata:
  author: leasify-front
  version: 1.0.0
---

# testing-patterns

Concrete skeletons for every test type in the repo. Use [[tdd-workflow]] to drive the RED→GREEN cycle.

## Activation Contract

Trigger when writing any `.test.ts`, `.test.tsx`, or `.spec.ts` file. Always read the nearest existing test file first — mirror its import style.

## Hard Rules

- Vitest globals are **enabled** — import `describe/it/expect/vi/beforeEach/afterEach` from `vitest` explicitly (see examples below).
- Environment is **happy-dom** — `document`, `window`, `localStorage` are available. No `jsdom`.
- Path alias `@` → `./src`. Use `@/lib/...`, `@/components/...`.
- **No RTL** — components use `createRoot` + `act` from `react-dom/client`. Mirror `CarrierRegistryTable.test.tsx`.
- `vi.mock(...)` calls go **before** any imports of the module under test.
- Restore mocks in `afterEach` with `vi.restoreAllMocks()`.
- E2E tests use **Playwright** with `route.fulfill` for network mocking — no MSW, no running agent backend needed for cobranza/cotizador specs.
- A11y gate: `critical` + `serious` axe violations fail CI; `moderate` + `minor` are surfaced only.

---

## 1. Unit / Pure Logic Test

```typescript
// src/lib/__tests__/your-util.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { yourFunction } from '@/lib/your-util'

describe('yourFunction', () => {
  it('does X when Y', () => {
    expect(yourFunction(input)).toBe(expectedOutput)
  })

  it('uses fake timers when testing time-dependent behavior', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    // ... assertions ...
    vi.useRealTimers()
  })
})
```

---

## 2. Service / API Layer Test

Pattern from `src/lib/api/__tests__/applications.service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { yourDomainApi } from '../your.service'

function mockApiGet(body: unknown) {
  // apiClient.get uses res.text() then JSON.parse — NOT res.json()
  return vi.fn().mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response)
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_BACKEND_URL = 'http://backend.test'
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('yourApi.getX', () => {
  it('normalizes the response', async () => {
    globalThis.fetch = mockApiGet({ id: '1', status: 'DONE' }) as typeof globalThis.fetch
    const result = await yourDomainApi.getX('1')
    expect(result.status).toBe('done') // lowercase normalization
  })
})
```

> Mock `globalThis.fetch`, NOT `apiClient` directly. The client calls `res.text()` then `JSON.parse`.

---

## 3. Component Render Test

Pattern from `CarrierRegistryTable.test.tsx` and `page.test.tsx`:

```typescript
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // prevent tree-shaking in JSX transform

// Mock BEFORE importing the component
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({ canAccess: () => true }),
}))

import { YourComponent } from './YourComponent'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
  vi.restoreAllMocks()
})

function render(props: React.ComponentProps<typeof YourComponent>) {
  act(() => { root.render(<YourComponent {...props} />) })
}

describe('<YourComponent>', () => {
  it('renders correctly', () => {
    render({ label: 'test' })
    expect(container.querySelector('[data-testid="your-el"]')).toBeTruthy()
  })

  it('handles async interactions', async () => {
    const onAction = vi.fn().mockResolvedValue(undefined)
    render({ onAction })
    const btn = container.querySelector('button')!
    await act(async () => {
      btn.click()
      await new Promise(r => setTimeout(r, 0))
    })
    expect(onAction).toHaveBeenCalled()
  })
})
```

---

## 4. E2E Spec with route.fulfill

Pattern from `tests/e2e/cobranza-overview.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'
// Dev server must be running at :3001 — no webServer in playwright.config.ts

const MOCK_BODY = JSON.stringify({ kpis: { count: 42 } })

test('your page — loads data', async ({ page }) => {
  // 1. Seed auth state BEFORE page.goto
  //    (ProtectedRoute reads localStorage[`arriendo-facil-auth`])
  await page.addInitScript(() => {
    window.localStorage.setItem('arriendo-facil-auth', JSON.stringify({
      id: 'test-user-id', role: 'agency', onboardingCompleted: true,
      agencyId: 'test-agency-id',
    }))
  })

  // 2. Register route mocks BEFORE navigation
  await page.route('**/your/api/endpoint', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_BODY })
  })

  // 3. Navigate with domcontentloaded (avoids timeout on hanging agent fetches)
  await page.goto('/panel/inmobiliaria/ai/your-page', { waitUntil: 'domcontentloaded' })

  // 4. Assert
  await expect(page.locator('[data-testid="kpi-count"]')).toContainText('42')
})
```

> For panels needing full permissions, use `seedAuthState` from `tests/e2e/panel-a11y/_helpers/auth-helpers.ts`.

---

## 5. A11y Test (panel-a11y project)

Pattern from `tests/e2e/panel-a11y/_helpers/axe-helpers.ts`:

```typescript
import { test } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAxeOrFixme, assertNoBlockingViolations, waitForPageReady } from './_helpers/axe-helpers'

// Runs only under the `panel-a11y` Playwright project (testDir: ./tests/e2e/panel-a11y)

test.beforeEach(async ({ page }) => {
  await seedAuthState(page) // seeds localStorage + mocks /users/me + permissions endpoints
})

test('your panel page — zero axe violations', async ({ page }) => {
  await page.route('**/your/data', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  await page.goto('/panel/inmobiliaria/ai/your-page', { waitUntil: 'domcontentloaded' })
  await waitForPageReady(page)

  const result = await runAxeOrFixme(page) // test.fixme if page didn't mount
  if (result.skipped) return
  assertNoBlockingViolations(result.violations) // gates on critical + serious only
})
```

## References

- [[tdd-workflow]] — RED→GREEN cycle and commit cadence.
- [[engineering-standards]] — pre-PR gate checklist.
- `vitest.config.ts` — include glob, environment, coverage config.
- `playwright.config.ts` — projects, baseURL, no webServer (dev server must run).
- `tests/e2e/panel-a11y/_helpers/axe-helpers.ts` — `runAxeOrFixme`, `assertNoBlockingViolations`.
- `tests/e2e/panel-a11y/_helpers/auth-helpers.ts` — `seedAuthState`, `gotoAuthenticated`.
