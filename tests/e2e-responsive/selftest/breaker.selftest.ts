import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { breakerTripped, isDeadServerError, isTripped, recordNavigation, resetBreaker } from '../support/breaker';
import { preflight } from '../support/preflight';

test.beforeEach(() => {
  process.env.RESPONSIVE_BREAKER_FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'brk-')), 'breaker.log');
  process.env.RESPONSIVE_BREAKER_N = '3';
  resetBreaker();
});

test('isDeadServerError recognises refused, reset and navigation timeouts only', () => {
  expect(isDeadServerError('page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3001/')).toBe(true);
  expect(isDeadServerError('page.goto: Timeout 75000ms exceeded.')).toBe(true);
  expect(isDeadServerError('page.goto: NS_ERROR_CONNECTION_REFUSED')).toBe(true);
  expect(isDeadServerError('page.goto: net::ERR_ABORTED')).toBe(false);
  expect(isDeadServerError('HTTP 500')).toBe(false);
});

test('isTripped needs N consecutive failures and is sticky', () => {
  expect(isTripped('FFSFF', 3)).toBe(false);
  expect(isTripped('SFFF', 3)).toBe(true);
  expect(isTripped('FFFS', 3)).toBe(false);
  expect(isTripped('FFFST', 3)).toBe(true);
});

test('recordNavigation trips after N consecutive dead outcomes; a success in between resets the run', () => {
  expect(recordNavigation('dead')).toBe(false);
  expect(recordNavigation('dead')).toBe(false);
  expect(recordNavigation('ok')).toBe(false);
  expect(recordNavigation('dead')).toBe(false);
  expect(recordNavigation('dead')).toBe(false);
  expect(recordNavigation('dead')).toBe(true);
  expect(breakerTripped()).toBe(true);
  recordNavigation('ok');
  expect(breakerTripped()).toBe(true);
  resetBreaker();
  expect(breakerTripped()).toBe(false);
});

test('preflight accepts any HTTP answer and fails loudly on a refused port', async () => {
  const server = http.createServer((_req, res) => res.writeHead(404).end());
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as net.AddressInfo;
  expect((await preflight(`http://127.0.0.1:${port}`, { attempts: 1 })).status).toBe(404);
  await new Promise((r) => server.close(r));
  await expect(preflight(`http://127.0.0.1:${port}`, { attempts: 2, delayMs: 50, timeoutMs: 1500 })).rejects.toThrow(
    /RESPONSIVE SWEEP NOT STARTED/,
  );
});
