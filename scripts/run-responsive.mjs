#!/usr/bin/env node
// Cross-platform launcher for the responsive e2e suite (T-0173).
//   node scripts/run-responsive.mjs [--fast] [extra playwright args...]
// After the run it prints a loud banner (and exits non-zero) if any persona could not log in:
// a persona that is skipped silently would make the report look cleaner than it is.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const fast = args.includes('--fast');
const rest = args.filter((a) => a !== '--fast');

// Circuit breaker (tests/e2e-responsive/support/breaker.ts): the workers append to this file; when it
// holds a T the target server is gone, so the whole process tree is killed instead of spinning.
const breakerFile = path.resolve(
  process.env.RESPONSIVE_BREAKER_FILE ?? path.join('tests', 'e2e-responsive', '.auth', 'breaker.log'),
);
const breakerN = Number(process.env.RESPONSIVE_BREAKER_N ?? 6) || 6;
const BREAKER_BANNER = [
  '',
  '!'.repeat(72),
  'RESPONSIVE SWEEP ABORTED: THE TARGET SERVER STOPPED ANSWERING',
  `${breakerN} consecutive navigations to ${process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001'} were refused, reset or timed out.`,
  'The report holds only the tests that finished BEFORE the failure. Restart the server and re-run',
  '(RESPONSIVE_REUSE_AUTH=1 RESPONSIVE_REUSE_RESOLVED=1 skips login and crawl).',
  '!'.repeat(72),
  '',
].join('\n');

const cli = require.resolve('@playwright/test/cli');
const child = spawn(
  process.execPath,
  [cli, 'test', '-c', 'playwright.responsive.config.ts', ...rest],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      RESPONSIVE_BREAKER_FILE: breakerFile,
      ...(fast ? { RESPONSIVE_FAST: '1' } : {}),
    },
  },
);
let aborted = false;
const watcher = setInterval(() => {
  let history = '';
  try {
    history = fs.readFileSync(breakerFile, 'utf8');
  } catch {
    return;
  }
  if (!history.includes('T') || aborted) return;
  aborted = true;
  clearInterval(watcher);
  console.error(BREAKER_BANNER);
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill('SIGTERM');
}, 1000);
child.on('exit', (code) => {
  clearInterval(watcher);
  let exit = aborted ? 4 : (code ?? 1);
  const authDir = path.resolve('tests', 'e2e-responsive', '.auth');
  const failed = [];
  if (fs.existsSync(authDir)) {
    for (const name of fs.readdirSync(authDir)) {
      if (!name.endsWith('.status.json')) continue;
      try {
        const status = JSON.parse(fs.readFileSync(path.join(authDir, name), 'utf8'));
        if (!status.ok) failed.push(`${name.replace('.status.json', '')}: ${status.reason ?? 'unknown reason'}`);
      } catch {
        failed.push(`${name}: unreadable status file`);
      }
    }
  }
  if (failed.length) {
    console.error(`\n${'!'.repeat(72)}`);
    console.error('RESPONSIVE SWEEP INCOMPLETE: these personas could NOT log in and were skipped:');
    for (const f of failed) console.error(`  - ${f}`);
    console.error('Their routes are NOT covered by this report.');
    console.error(`${'!'.repeat(72)}\n`);
    if (exit === 0) exit = 2;
  }
  process.exit(exit);
});
