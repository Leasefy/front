import fs from 'node:fs';
import path from 'node:path';

let loaded = false;

/**
 * Loads the e2e credentials file into process.env (never overriding variables that are
 * already set). The file is located through E2E_ENV_FILE and defaults to
 * `./.env.e2e.local` relative to the front root (the directory Playwright runs from).
 * Values are never logged.
 */
export function loadE2eEnv(): string | null {
  if (loaded) return null;
  loaded = true;
  const file = path.resolve(process.env.E2E_ENV_FILE ?? path.join(process.cwd(), '.env.e2e.local'));
  if (!fs.existsSync(file)) return null;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return file;
}
