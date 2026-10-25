export interface PreflightOptions {
  timeoutMs?: number;
  attempts?: number;
  delayMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * GET the base URL before anything else. Any HTTP answer counts as "alive" (a 404 or a 500 is
 * the app talking); a refused connection or no answer within the timeout throws a loud error.
 * Several short attempts, because the first request to `next dev` can legitimately be slow.
 */
export async function preflight(baseURL: string, opts: PreflightOptions = {}): Promise<{ status: number }> {
  const { timeoutMs = 10_000, attempts = 3, delayMs = 1_500, fetchImpl = fetch } = opts;
  let last = 'no attempt made';
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetchImpl(baseURL, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) });
      await res.body?.cancel().catch(() => {});
      return { status: res.status };
    } catch (error) {
      const cause = (error as { cause?: { code?: string; message?: string } }).cause;
      last = `${(error as Error).name ?? 'Error'}: ${cause?.code ?? cause?.message ?? (error as Error).message}`;
      if (i < attempts) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  const bar = '!'.repeat(72);
  throw new Error(
    [
      '',
      bar,
      `RESPONSIVE SWEEP NOT STARTED: ${baseURL} does not answer (${attempts} attempts, ${timeoutMs} ms each).`,
      `Last error: ${last}`,
      'Start the target first, e.g. `pnpm build && npx next start -p 3001`, or point',
      'PLAYWRIGHT_BASE_URL at a running server. RESPONSIVE_PREFLIGHT=0 skips this check.',
      bar,
    ].join('\n'),
  );
}
