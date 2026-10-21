import fs from 'node:fs';

import { test as setup } from '@playwright/test';

import { loginThroughUi } from '../support/login';
import { AUTH_DIR, PERSONAS, authFile, personaSkipReason, statusFile } from '../support/personas';

/**
 * One login per persona through the real UI; storageState is saved to
 * tests/e2e-responsive/.auth/<persona>.json (git-ignored: it contains tokens).
 *
 * A persona that cannot log in does NOT fail the setup project (that would block every
 * dependent device project, including the other personas). The outcome is written to
 * <persona>.status.json; the spec skips that persona with the recorded reason and the report
 * lists it.
 */
setup.describe.configure({ mode: 'parallel' });
setup.setTimeout(300_000);

for (const persona of PERSONAS) {
  if (!persona.envPrefix) continue;
  setup(`auth: ${persona.id}`, async ({ page }) => {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    // Iterating on the suite: keep a session that already logged in (tokens last ~1h).
    if (process.env.RESPONSIVE_REUSE_AUTH === '1' && fs.existsSync(statusFile(persona.id))) {
      const previous = JSON.parse(fs.readFileSync(statusFile(persona.id), 'utf8')) as { ok: boolean };
      if (previous.ok && fs.existsSync(authFile(persona.id))) return;
    }
    // An empty (but valid) state keeps the dependent projects' context creation working
    // for a persona that cannot log in; the spec then skips it using the status file.
    const emptyState = JSON.stringify({ cookies: [], origins: [] });
    fs.writeFileSync(authFile(persona.id), emptyState);

    const skip = personaSkipReason(persona);
    if (skip) {
      fs.writeFileSync(statusFile(persona.id), JSON.stringify({ ok: false, reason: skip }));
      setup.skip(true, skip);
      return;
    }
    try {
      await loginThroughUi(page, persona, (m) => console.log(`[auth] ${m}`));
      await page.context().storageState({ path: authFile(persona.id) });
      fs.writeFileSync(statusFile(persona.id), JSON.stringify({ ok: true }));
    } catch (error) {
      const reason = String(error instanceof Error ? error.message : error).slice(0, 300);
      fs.writeFileSync(statusFile(persona.id), JSON.stringify({ ok: false, reason }));
      fs.writeFileSync(authFile(persona.id), emptyState);
      setup.info().annotations.push({ type: 'auth-failed', description: `${persona.id}: ${reason}` });
      console.warn(`[auth] ${persona.id} could not log in: ${reason}`);
    }
  });
}
