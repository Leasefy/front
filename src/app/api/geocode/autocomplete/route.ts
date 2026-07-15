/**
 * /api/geocode/autocomplete — server-only proxy to LocationIQ.
 *
 * `LOCATIONIQ_API_KEY` MUST NEVER be prefixed NEXT_PUBLIC_ — this route is
 * the single place that holds it. The client (geocode.service.ts) only ever
 * calls this route, never locationiq.com directly.
 *
 * Fail-closed: if the key isn't configured we return 503 rather than
 * inventing coordinates. LocationIQ upstream failures return 502. Errors
 * never echo the key.
 */

import { NextRequest, NextResponse } from 'next/server';
import { normalizeAutocompleteResults } from '@/lib/api/geocode.normalize';

export const runtime = 'nodejs';

const LOCATIONIQ_AUTOCOMPLETE_URL = 'https://us1.locationiq.com/v1/autocomplete';
const MIN_QUERY_LENGTH = 3;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.LOCATIONIQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'geocoding_not_configured' }, { status: 503 });
  }

  const url = new URL(LOCATIONIQ_AUTOCOMPLETE_URL);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('q', q);
  url.searchParams.set('countrycodes', 'co');
  url.searchParams.set('limit', '5');
  url.searchParams.set('dedupe', '1');
  url.searchParams.set('format', 'json');

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(url.toString());
  } catch {
    return NextResponse.json({ error: 'geocoding_unavailable' }, { status: 502 });
  }

  // LocationIQ returns 404 when there are simply no matches — not an error.
  if (upstreamRes.status === 404) {
    return NextResponse.json({ results: [] });
  }

  if (!upstreamRes.ok) {
    return NextResponse.json({ error: 'geocoding_upstream_error' }, { status: 502 });
  }

  const raw = await upstreamRes.json().catch(() => null);
  const results = normalizeAutocompleteResults(raw);

  return NextResponse.json({ results });
}
