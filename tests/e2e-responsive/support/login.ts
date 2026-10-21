import { expect, type Page } from '@playwright/test';

import { credentialsFor, type Persona } from './personas';

/** Dev MFA mock: on the second-factor screens `123456` always passes. */
const MFA_CODE = '123456';

/**
 * Logs in through the real UI (password, then the dev MFA code when the second-factor screen
 * shows up) and resolves once the app is past /auth. Used by the auth setup project and,
 * when a long run loses its session, by the re-login fallback in the spec.
 *
 * This is the ONLY place in the suite that submits forms; it runs without the read-only guard.
 */
export async function loginThroughUi(page: Page, persona: Persona, log: (m: string) => void = () => {}) {
  const creds = credentialsFor(persona);
  if (!creds) throw new Error(`No credentials for persona ${persona.id}`);

  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  // The submit button is disabled until the form hydrates; filling earlier loses the values.
  const submit = page.getByRole('button', { name: 'Iniciar sesión' });
  await submit.waitFor({ state: 'visible' });
  await expect(submit).toBeEnabled({ timeout: 30_000 });
  await page.locator('form input[type=email]').fill(creds.email);
  await page.locator('form input[type=password]').fill(creds.password);
  await submit.click();

  const deadline = Date.now() + 120_000;
  let lastMfaAttempt = 0;
  while (Date.now() < deadline) {
    await page.waitForTimeout(700);
    const url = new URL(page.url());
    const path = url.pathname;

    const onMfa = path.startsWith('/auth/mfa-verify') || path.startsWith('/auth/mfa-enroll');
    if (onMfa) {
      // Retry the code now and then: enrolment first shows a QR step, the code box comes later.
      if (Date.now() - lastMfaAttempt > 3500) {
        lastMfaAttempt = Date.now();
        const box = page.locator('input:visible').first();
        if (await box.count()) {
          await box.click({ timeout: 2000 }).catch(() => {});
          await page.keyboard.type(MFA_CODE, { delay: 60 });
          log(`${persona.id}: typed the dev MFA code on ${path}`);
        }
      }
      continue;
    }
    if (!path.startsWith('/auth') || path.startsWith('/auth/post-login')) {
      if (path.startsWith('/auth/post-login')) continue; // role redirect in flight
      return;
    }
    // Still on /auth: surface a visible login error early instead of waiting for the deadline.
    const alert = page.getByRole('alert').first();
    if (await alert.isVisible().catch(() => false)) {
      const text = (await alert.innerText().catch(() => '')).trim().slice(0, 160);
      if (text) throw new Error(`Login for ${persona.id} was rejected: ${text}`);
    }
  }
  throw new Error(`Login for ${persona.id} did not leave /auth within 120s (last URL ${page.url()})`);
}
