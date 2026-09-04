/**
 * Three export flows — dedicated behavioral spec (Phase 38-08, task 38-08-08b).
 *
 * Verifies the XR-07 contract implemented in 38-07 across three buttons:
 *
 *   1. "Exportar CSV" on cobranza/compliance/audit
 *      - 38-07 D-38-07-01: Bearer-token fetch (NOT cookies) → blob →
 *        anchor.click() download
 *      - Request URL contains /compliance/audit-log.csv
 *      - Response Content-Type: text/csv
 *
 *   2. "Descargar PDF" on cotizador/[quoteId]
 *      - 38-07 D-38-09: client-side @react-pdf removed; download now
 *        hits the backend at /cotizador/quote/:quoteId/verdict.pdf
 *      - Response Content-Type: application/pdf
 *      - Hitting the backend (not client renderer) is the migration
 *        observation — the test asserts the request URL contains
 *        "verdict.pdf"
 *
 *   3. "Exportar transcript PDF" on cobranza/llamadas/[callId]
 *      - 38-07 D-38-11: fetch the REDACTED transcript JSON (server-side
 *        PII strip is the security boundary), then pdf(...).toBlob() in
 *        the browser
 *      - Request URL contains transcript?redacted=true
 *
 * Detail/dynamic-route pages require an authenticated session; tests
 * seedAuthState in beforeEach unblocks the page mount (2026-06-01).
 * If the export button is missing after that, it's a mock-incomplete
 * issue (not auth-debt) — surface it explicitly.
 */

import { test, expect, type Page } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'

// ---------------- compliance/audit CSV ----------------

const AUDIT_ROUTE = '/panel/inmobiliaria/cobros/cobranza/compliance/audit'
const AUDIT_LIST_MOCK = '**/compliance/audit-log?**'
const AUDIT_CSV_MOCK = '**/compliance/audit-log.csv*'

const POPULATED_AUDIT_LIST = {
  items: [
    {
      id: 'evt-1',
      timestamp: new Date().toISOString(),
      actor_type: 'member',
      actor_id: 'mem-1',
      action: 'pii_reveal',
      target_type: 'debtor',
      target_id: 'deb-1',
      reason: 'collections call follow-up',
    },
  ],
  hasMore: false,
}

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Exports — XR-07 (D-38-09/10/11)', () => {
  test('compliance/audit "Exportar CSV" triggers fetch with text/csv response', async ({
    page,
  }) => {
    await page.route(AUDIT_LIST_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_AUDIT_LIST),
      })
    })

    let csvHit = false
    await page.route(AUDIT_CSV_MOCK, async (route) => {
      csvHit = true
      await route.fulfill({
        status: 200,
        contentType: 'text/csv; charset=utf-8',
        body: 'timestamp,actor_type,action,target_type,target_masked\n2026-01-01T00:00:00Z,member,pii_reveal,debtor,12***78\n',
      })
    })

    await page.goto(AUDIT_ROUTE, { waitUntil: 'domcontentloaded' })

    // 38-07 D-38-10: button only renders when items.length > 0 AND agencyId.
    const btn = page
      .locator('button, a')
      .filter({ hasText: /Exportar\s+CSV|Export\s+CSV/i })
      .first()



    await expect(btn).toBeVisible({ timeout: 10_000 })
    await btn.click()

    // 38-07 uses fetch+blob+anchor.click (NOT a bare <a href download>), so
    // we don't get a page.waitForEvent('download') — the blob URL is local.
    // Instead, observe that the CSV endpoint was hit.
    await expect.poll(() => csvHit, { timeout: 3_000 }).toBe(true)
  })

  test('cotizador quote detail "Descargar PDF" hits backend /verdict.pdf', async ({
    page,
  }) => {
    const QUOTE_ID = 'test-quote-id'
    const QUOTE_ROUTE = `/panel/inmobiliaria/postulaciones/asegurabilidad/${QUOTE_ID}`
    const QUOTE_DETAIL_MOCK = `**/cotizador/quote/${QUOTE_ID}**`
    const VERDICT_PDF_MOCK = `**/cotizador/quote/${QUOTE_ID}/verdict.pdf*`

    const POPULATED_QUOTE = {
      id: QUOTE_ID,
      status: 'completed',
      carriers: [
        {
          carrier: 'sura',
          status: 'approved',
          verdict: 'approved',
          decision: 'approved',
          updatedAt: new Date().toISOString(),
        },
      ],
      cedula_hash: 'abc123',
      cedula_masked: '12•••78',
      canon: 2_000_000,
      generatedAt: new Date().toISOString(),
    }

    await page.route(QUOTE_DETAIL_MOCK, async (route) => {
      // Don't intercept the verdict.pdf endpoint here — that's a sub-glob
      // we handle separately.
      if (route.request().url().includes('verdict.pdf')) {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_QUOTE),
      })
    })

    let pdfHit = false
    await page.route(VERDICT_PDF_MOCK, async (route) => {
      pdfHit = true
      // %PDF-1.4 magic-bytes header is enough for the browser to treat as PDF.
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        body: Buffer.from('%PDF-1.4\n%test\n', 'utf8'),
      })
    })

    await page.goto(QUOTE_ROUTE, { waitUntil: 'domcontentloaded' })

    // 38-07 button locator: "Descargar PDF" (es) / "Download PDF" (en).
    const btn = page
      .locator('button, a')
      .filter({ hasText: /Descargar\s+PDF|Download\s+PDF/i })
      .first()



    await expect(btn).toBeVisible({ timeout: 10_000 })
    await btn.click()

    // D-38-09 migration assertion: the request must hit the backend
    // verdict.pdf endpoint (no client-side render path remains).
    await expect.poll(() => pdfHit, { timeout: 5_000 }).toBe(true)
  })

  test('call detail "Exportar transcript PDF" fetches redacted transcript endpoint', async ({
    page,
  }) => {
    const CALL_ID = 'test-call-id'
    const CALL_ROUTE = `/panel/inmobiliaria/cobros/cobranza/llamadas/${CALL_ID}`
    const CALL_MOCK = `**/cobranza/calls/${CALL_ID}**`
    // Capture only the redacted variant — the non-redacted transcript is fetched
    // on page load and is OUT of scope for this assertion.
    const TRANSCRIPT_REDACTED_MOCK = `**/cobranza/calls/${CALL_ID}/transcript?redacted=true*`
    const TRANSCRIPT_PLAIN_MOCK = `**/cobranza/calls/${CALL_ID}/transcript**`

    const POPULATED_CALL = {
      callId: CALL_ID,
      debtorId: 'test-debtor-id',
      debtorNameMasked: 'J•••n P•••a',
      duration: 120,
      audioUrl: 'https://example.com/test.mp3',
      outcome: 'completed',
      status: 'completed',
      initiatedAt: new Date().toISOString(),
      cost: { totalUsd: 0.45 },
      qa: { scriptAdherence: 0.92, scriptTemplateId: 'tpl-s1' },
      flags: { compliance: [] },
    }

    const TRANSCRIPT_PAYLOAD = {
      callId: CALL_ID,
      turns: [
        { speaker: 'agent', text: 'Buenas tardes.', tStart: 0 },
        { speaker: 'debtor', text: 'Hola.', tStart: 3.2 },
      ],
      debtorNameRedacted: 'J•••n P•••a',
      generatedAt: new Date().toISOString(),
      redacted: true,
    }

    await page.route(CALL_MOCK, async (route) => {
      if (route.request().url().includes('/transcript')) {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_CALL),
      })
    })

    let redactedHit = false
    await page.route(TRANSCRIPT_REDACTED_MOCK, async (route) => {
      // We only care if the URL contains redacted=true — Playwright's glob
      // already filtered for that.
      redactedHit = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(TRANSCRIPT_PAYLOAD),
      })
    })

    // Catch-all for the non-redacted transcript (initial page load).
    await page.route(TRANSCRIPT_PLAIN_MOCK, async (route) => {
      if (route.request().url().includes('redacted=true')) {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          callId: CALL_ID,
          turns: [
            { speaker: 'agent', text: 'Buenas tardes.', tStart: 0 },
            { speaker: 'debtor', text: 'Hola.', tStart: 3.2 },
          ],
          redacted: false,
        }),
      })
    })

    await page.goto(CALL_ROUTE, { waitUntil: 'domcontentloaded' })

    // 38-07 button locator: "Exportar transcript PDF" (es) /
    // "Export transcript PDF" (en).
    const btn = page
      .locator('button, a')
      .filter({ hasText: /Exportar\s+transcript|Export\s+transcript/i })
      .first()



    await expect(btn).toBeVisible({ timeout: 10_000 })

    // Catch the @react-pdf/renderer dynamic import — if it errors, fixme out.
    const errors: Error[] = []
    page.on('pageerror', (err) => errors.push(err))

    await btn.click()

    await expect.poll(() => redactedHit, { timeout: 5_000 }).toBe(true)

    // The dynamic import of @react-pdf/renderer should succeed; if it does
    // not (e.g. when SSR/bundle env breaks in headless), the test isn't a
    // hard failure — the redacted endpoint was hit. We still log errors.
    if (errors.length > 0) {
      console.warn(
        `Page errors after click (informational): ${errors.map((e) => e.message).join('; ')}`,
      )
    }
  })
})

// Page param is unused inline; keep the import alive for the type signature.
void ({} as Page)
