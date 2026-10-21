#!/usr/bin/env node
// Cross-platform launcher for the responsive e2e suite (T-0173).
//   node scripts/run-responsive.mjs [--fast] [extra playwright args...]
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

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
child.on('exit', (code) => process.exit(code ?? 1));
