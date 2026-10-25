import fs from 'node:fs';

import { test as setup } from '@playwright/test';

import { loginThroughUi, saveValidatedState } from '../support/login';
import {
  AUTH_DIR,
  PERSONAS,
  authFile,
  hasSupabaseSession,
  personaSkipReason,
  statusFile,
} from '../support/personas';

/**
 * One login per persona through the real UI; storageState is saved to
 * tests/e2e-responsive/.auth/<persona>.json (git-ignored: it contains tokens).
 *
 * The state file is written only after the login produced a Supabase session (validated, via a
 * temp file + rename): a failed or interrupted login never leaves an empty file and never
 * destroys a session that was still valid.
 *
 * A persona that cannot log in does NOT fail the setup project (that would block every
 * dependent device project, including the other personas). It is reported LOUDLY instead: a
 * banner on the console, an annotation in the report, `<persona>.status.json` with the reason
 * (the spec skips that persona with it) and a non-zero exit code from `pnpm e2e:responsive`.
 */
setup.describe.configure({ mode: 'parallel' });
setup.setTimeout(600_000);

function validSavedState(personaId: Parameters<typeof authFile>[0]): boolean {
  try {
    return hasSupabaseSession(JSON.parse(fs.readFileSync(authFile(personaId), 'utf8')));
  } catch {
    return false;
  }
}

for (const persona of PERSONAS) {
  if (!persona.envPrefix) continue;
  setup(`auth: ${persona.id}`, async ({ page }) => {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    // Iterating on the suite: keep a session that already logged in (tokens last ~1h).
    if (process.env.RESPONSIVE_REUSE_AUTH === '1' && fs.existsSync(statusFile(persona.id))) {
      const previous = JSON.parse(fs.readFileSync(statusFile(persona.id), 'utf8')) as { ok: boolean };
      if (previous.ok && validSavedState(persona.id)) return;
    }

    const skip = personaSkipReason(persona);
    if (skip) {
      fs.writeFileSync(statusFile(persona.id), JSON.stringify({ ok: false, reason: skip }));
      console.error(`\n[auth] !!! ${persona.id} UNAVAILABLE: ${skip}\n`);
      setup.skip(true, skip);
      return;
    }
    try {
      await loginThroughUi(page, persona, (m) => console.log(`[auth] ${m}`));
      await saveValidatedState(page.context(), authFile(persona.id), persona.id);
      fs.writeFileSync(statusFile(persona.id), JSON.stringify({ ok: true }));
    } catch (error) {
      const reason = String(error instanceof Error ? error.message : error).slice(0, 300);
      fs.writeFileSync(statusFile(persona.id), JSON.stringify({ ok: false, reason }));
      setup.info().annotations.push({ type: 'auth-failed', description: `${persona.id}: ${reason}` });
      console.error(`\n[auth] !!! ${persona.id} COULD NOT LOG IN: ${reason}\n[auth] its routes will be skipped; any previous valid session file was left untouched\n`);
    }
  });
}
