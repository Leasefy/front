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

const cli = require.resolve('@playwright/test/cli');
const child = spawn(
  process.execPath,
  [cli, 'test', '-c', 'playwright.responsive.config.ts', ...rest],
  { stdio: 'inherit', env: { ...process.env, ...(fast ? { RESPONSIVE_FAST: '1' } : {}) } },
);
child.on('exit', (code) => {
  let exit = code ?? 1;
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
