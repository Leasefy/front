import fs from 'node:fs';

import type { Browser, BrowserContext, Page } from '@playwright/test';

import { loginThroughUi, saveValidatedState } from './login';
import { authFile, type Persona } from './personas';

/**
 * Long runs can outlive the access token saved by the auth setup (and refresh-token rotation
 * invalidates the shared copy). When a page bounces to /auth, ONE worker re-logs-in (a
 * directory lock keeps the others waiting), saves the fresh storageState to the shared file,
 * and every worker applies it to its own context.
 */
const LOCK_WAIT_MS = 180_000;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function refreshSharedSession(browser: Browser, persona: Persona, baseURL: string): Promise<void> {
  const file = authFile(persona.id);
  const lock = `${file}.lock`;
  const before = fs.existsSync(file) ? fs.statSync(file).mtimeMs : 0;

  let owner = false;
  try {
    fs.mkdirSync(lock);
    owner = true;
  } catch {
    // Someone else is refreshing: wait for the lock to disappear.
  }

  if (!owner) {
    const deadline = Date.now() + LOCK_WAIT_MS;
    while (fs.existsSync(lock) && Date.now() < deadline) await sleep(1000);
    return;
  }

  try {
    // Another worker may have refreshed between our failed navigation and taking the lock.
    if (fs.existsSync(file) && fs.statSync(file).mtimeMs > before) return;
    const context = await browser.newContext({ baseURL, colorScheme: 'light', viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await loginThroughUi(page, persona);
    await saveValidatedState(context, file, persona.id);
    await context.close();
  } finally {
    fs.rmSync(lock, { recursive: true, force: true });
  }
}

/** Copies the shared (fresh) storageState into a live context. */
export async function applySharedSession(context: BrowserContext, page: Page, persona: Persona): Promise<void> {
  const state = JSON.parse(fs.readFileSync(authFile(persona.id), 'utf8')) as {
    cookies: Parameters<BrowserContext['addCookies']>[0];
    origins: Array<{ origin: string; localStorage: Array<{ name: string; value: string }> }>;
  };
  await context.clearCookies();
  await context.addCookies(state.cookies);
  const origin = new URL(page.url() === 'about:blank' ? 'http://localhost:3001' : page.url()).origin;
  const entries = state.origins.find((o) => o.origin === origin)?.localStorage ?? [];
  if (entries.length) {
    await page.evaluate((items) => {
      for (const { name, value } of items) localStorage.setItem(name, value);
    }, entries);
  }
}
