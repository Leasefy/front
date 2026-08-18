/**
 * config.test.ts — the mock-mode guard.
 *
 * Project rule: mock mode must NEVER be active in production (fabricated data must
 * not reach real users). Outside prod, mock defaults ON unless explicitly disabled.
 * This is the guard the mantenimiento hooks rely on (they gate mock via getApiConfig).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { getApiConfig, isMockMode } from './config';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API;

function setEnv(nodeEnv: string | undefined, useMock: string | undefined) {
  if (nodeEnv === undefined) delete (process.env as Record<string, string | undefined>).NODE_ENV;
  else (process.env as Record<string, string | undefined>).NODE_ENV = nodeEnv;
  if (useMock === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK_API;
  else process.env.NEXT_PUBLIC_USE_MOCK_API = useMock;
}

afterEach(() => {
  setEnv(ORIGINAL_NODE_ENV, ORIGINAL_USE_MOCK);
});

describe('getApiConfig — mock-mode guard', () => {
  it('forces mock OFF in production even when the flag is unset', () => {
    setEnv('production', undefined);
    expect(getApiConfig().useMockApi).toBe(false);
    expect(isMockMode()).toBe(false);
  });

  it('forces mock OFF in production even when the flag says "true"', () => {
    setEnv('production', 'true');
    expect(getApiConfig().useMockApi).toBe(false);
  });

  it('defaults to mock ON outside production when the flag is unset', () => {
    setEnv('development', undefined);
    expect(getApiConfig().useMockApi).toBe(true);
  });

  it('respects the explicit "false" opt-out outside production', () => {
    setEnv('development', 'false');
    expect(getApiConfig().useMockApi).toBe(false);
  });
});
