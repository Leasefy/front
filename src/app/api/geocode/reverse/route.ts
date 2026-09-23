/**
 * /api/geocode/reverse — server-only proxy to LocationIQ `/v1/reverse`.
 *
 * Mirrors the transport, validation and error handling of
 * `../autocomplete/route.ts` (T-0011 contract.md §7) rather than inventing a
 * second style. `LOCATIONIQ_API_KEY` MUST NEVER be prefixed NEXT_PUBLIC_ —
 * this route is the single place that holds it for reverse lookups. The
 * client (geocode.service.ts) only ever calls this route, never
 * locationiq.com directly.
 *
 * Fail-closed: if the key isn't configured we return 503 rather than
 * inventing an address. LocationIQ upstream failures return 502. A 404 from
 * LocationIQ (no address for these coordinates — e.g. open water) is a
 * normal empty result, not an error. Errors never echo the key.
 */

import { NextRequest, NextResponse } from 'next/server';
import { normalizeReverseResult } from '@/lib/api/geocode.normalize';
import { limitarLaRuta, POLITICAS_DE_LAS_RUTAS } from '@/lib/api/limite-de-la-ruta';
import { haySesionValida } from '@/lib/api/sesion-de-la-ruta';

export const runtime = 'nodejs';

const LOCATIONIQ_REVERSE_URL = 'https://us1.locationiq.com/v1/reverse';

function parseCoordinate(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: NextRequest) {
  // Límite por IP ANTES de verificar la sesión (que le pregunta a Supabase):
  // una ráfaga se corta sin costar nada. Por instancia en Vercel; ver
  // `limite-de-la-ruta.ts`.
  const demasiadas = limitarLaRuta(req, POLITICAS_DE_LAS_RUTAS.geocode);
  if (demasiadas) return demasiadas;

  // 🔴 Auditoría de seguridad (23-09): sin sesión, cualquiera en internet
  // gastaba la cuota de LocationIQ que pagamos. Sólo la usan pantallas con
  // sesión (el asistente de publicar, que está detrás de `ProtectedRoute`, y
  // el panel de la inmobiliaria), así que se exige como en
  // `/api/inmuebles/*`: ver `sesion-de-la-ruta.ts`.
  if (!(await haySesionValida(req))) {
    return NextResponse.json({ error: 'sin_sesion' }, { status: 401 });
  }

  const lat = parseCoordinate(req.nextUrl.searchParams.get('lat'));
  const lon = parseCoordinate(req.nextUrl.searchParams.get('lon'));

  if (lat === null || lon === null) {
    return NextResponse.json({ error: 'invalid_coordinates' }, { status: 400 });
  }

  const apiKey = process.env.LOCATIONIQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'geocoding_not_configured' }, { status: 503 });
  }

  const url = new URL(LOCATIONIQ_REVERSE_URL);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('format', 'json');

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(url.toString());
  } catch {
    return NextResponse.json({ error: 'geocoding_unavailable' }, { status: 502 });
  }

  // LocationIQ returns 404 when there's no address for these coordinates
  // (e.g. open water) — not an error.
  if (upstreamRes.status === 404) {
    return NextResponse.json({ result: null });
  }

  if (!upstreamRes.ok) {
    return NextResponse.json({ error: 'geocoding_upstream_error' }, { status: 502 });
  }

  const raw = await upstreamRes.json().catch(() => null);
  const result = normalizeReverseResult(raw);

  return NextResponse.json({ result });
}
