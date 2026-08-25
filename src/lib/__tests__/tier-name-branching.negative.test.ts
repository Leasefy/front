/**
 * tier-name-branching.negative.test.ts — contrato 29 · planes dinámicos (Fase C).
 *
 * Mirrors the backend's `tier-name-branching.negative.spec.ts`: the gating /
 * presentation layer must NOT branch on a hardcoded tier NAME. "Paid" and plan
 * shape are derived from data columns (isDefault, billingMode, prices, limits),
 * never from `=== 'flex'` / `=== 'pro'` / `=== 'starter'` / `=== 'enterprise'`.
 *
 * NOTE: default fallbacks like `?? 'starter'` and function-call args like
 * `getAgencyPlanById('flex')` are allowed — this only forbids EQUALITY branching
 * on the tier name (both operand orders).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..', '..');

const FILES = [
  'src/lib/hooks/useAgencyPlan.ts',
  'src/lib/hooks/useSubscription.ts',
  'src/lib/api/subscriptions.service.ts',
  'src/components/pricing/PricingTable.tsx',
  'src/components/auth/AgencySubscriptionGuard.tsx',
  'src/app/panel/inmobiliaria/layout.tsx',
];

// `=== 'flex'` or `'flex' ===` for any tier name (both operand orders).
const TIER = '(?:flex|pro|starter|enterprise)';
const AFTER = new RegExp(`===\\s*['"\`]${TIER}['"\`]`);
const BEFORE = new RegExp(`['"\`]${TIER}['"\`]\\s*===`);

describe('no tier-name equality branching in the gating/presentation layer', () => {
  it.each(FILES)('%s does not compare against a hardcoded tier name', (rel) => {
    const src = readFileSync(resolve(ROOT, rel), 'utf8');
    // Strip line comments so an explanatory comment mentioning a tier can't trip it.
    const code = src
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .join('\n');

    expect(AFTER.test(code)).toBe(false);
    expect(BEFORE.test(code)).toBe(false);
  });
});
