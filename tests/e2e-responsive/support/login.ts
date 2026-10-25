import fs from 'node:fs';

import { expect, type BrowserContext, type Page } from '@playwright/test';

import { credentialsFor, hasSupabaseSession, type Persona } from './personas';

/** Dev MFA mock: on the second-factor screens `123456` always passes. */
const MFA_CODE = '123456';

/** The login was refused by the app (wrong credentials): retrying cannot help. */
class LoginRejectedError extends Error {}

/**
 * Waits until React has attached to the login form. Under a slow `next dev` the form is
 * server-rendered long before it hydrates; text typed in that window is wiped by hydration
 * (the "Escribe tu correo" symptom). React stamps `__reactProps$*` on every hydrated DOM node.
 */
async function waitForHydratedForm(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const input = document.querySelector('form input[type=email]');
      return !!input && Object.keys(input).some((k) => k.startsWith('__reactProps$') || k.startsWith('__reactFiber$'));
    },
    undefined,
    { timeout: 120_000 },
  );
}

/** Fills a field and checks the value stuck, refilling if a late re-render cleared it. */
async function fillAndVerify(page: Page, selector: string, value: string): Promise<boolean> {
  const field = page.locator(selector);
  for (let i = 0; i < 4; i++) {
    await field.fill(value);
    await page.waitForTimeout(300);
    if ((await field.inputValue().catch(() => '')) === value) return true;
    await page.waitForTimeout(700);
  }
  return false;
}

/** One login attempt: form -> (MFA) -> past /auth. */
async function attemptLogin(page: Page, persona: Persona, creds: { email: string; password: string }, log: (m: string) => void) {
  await page.goto('/auth', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const submit = page.getByRole('button', { name: 'Iniciar sesión' });
  await submit.waitFor({ state: 'visible', timeout: 120_000 });
  await waitForHydratedForm(page);
  await expect(submit).toBeEnabled({ timeout: 60_000 });

  // Fill, then re-check both fields right before submitting: a late re-render can still clear them.
  for (let round = 0; round < 3; round++) {
    const okEmail = await fillAndVerify(page, 'form input[type=email]', creds.email);
    const okPassword = await fillAndVerify(page, 'form input[type=password]', creds.password);
    const stillThere =
      (await page.locator('form input[type=email]').inputValue().catch(() => '')) === creds.email &&
      (await page.locator('form input[type=password]').inputValue().catch(() => '')) === creds.password;
    if (okEmail && okPassword && stillThere) break;
    if (round === 2) throw new Error(`The login form for ${persona.id} kept clearing its fields (not hydrated?)`);
    log(`${persona.id}: the form cleared its fields, filling again`);
  }
  await submit.click();

  const deadline = Date.now() + 240_000;
  let lastMfaAttempt = 0;
  let mfaAttempts = 0;
  while (Date.now() < deadline) {
    await page.waitForTimeout(700);
    const url = new URL(page.url());
    const path = url.pathname;

    const onMfa = path.startsWith('/auth/mfa-verify') || path.startsWith('/auth/mfa-enroll');
    if (onMfa) {
      // One attempt per ~12s. The first one waits for hydration (digits typed earlier are
      // lost); a retry reloads the page so the boxes start empty instead of appending.
      if (Date.now() - lastMfaAttempt > 12_000) {
        lastMfaAttempt = Date.now();
        mfaAttempts++;
        if (mfaAttempts > 1) await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
        await page.waitForTimeout(3000);
        const box = page.locator('input:visible').first();
        if (await box.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false)) {
          await box.click({ timeout: 2000 }).catch(() => {});
          await page.keyboard.type(MFA_CODE, { delay: 80 }).catch(() => {});
          log(`${persona.id}: typed the dev MFA code on ${path} (attempt ${mfaAttempts})`);
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
      if (text) throw new LoginRejectedError(`Login for ${persona.id} was rejected: ${text}`);
    }
  }
  throw new Error(`Login for ${persona.id} did not leave /auth within 240s (last URL ${page.url()})`);
}

/**
 * Logs in through the real UI (password, then the dev MFA code when the second-factor screen
 * shows up) and resolves once the app is past /auth. Waits for hydration before typing and
 * retries the whole flow ONCE (fresh cookies) on anything but an explicit rejection. Used by
 * the auth setup project and, when a long run loses its session, by the re-login fallback in
 * the spec.
 *
 * This is the ONLY place in the suite that submits forms; it runs without the read-only guard.
 */
export async function loginThroughUi(page: Page, persona: Persona, log: (m: string) => void = () => {}) {
  const creds = credentialsFor(persona);
  if (!creds) throw new Error(`No credentials for persona ${persona.id}`);
  try {
    await attemptLogin(page, persona, creds, log);
  } catch (first) {
    if (first instanceof LoginRejectedError) throw first;
    log(`${persona.id}: first login attempt failed (${String(first).split('\n')[0].slice(0, 140)}); retrying once`);
    await page.context().clearCookies().catch(() => {});
    await attemptLogin(page, persona, creds, log);
  }
}

/**
 * Saves the context's storageState to `file` ONLY if it holds the Supabase session. Written to
 * a temp file first and renamed, so a failed or interrupted login can never leave an empty or
 * half-written `.auth/<persona>.json` behind. Throws (loudly) when the state is not a session.
 */
export async function saveValidatedState(context: BrowserContext, file: string, personaId: string): Promise<void> {
  const tmp = `${file}.tmp`;
  await context.storageState({ path: tmp });
  let state: unknown;
  try {
    state = JSON.parse(fs.readFileSync(tmp, 'utf8'));
  } catch {
    state = null;
  }
  if (!hasSupabaseSession(state)) {
    fs.rmSync(tmp, { force: true });
    throw new Error(`Login for ${personaId} finished but the saved state has no Supabase session (sb-*-auth-token); not saved`);
  }
  fs.renameSync(tmp, file);
}
