/**
 * /api/geocode/buscar — server-only proxy to LocationIQ `/v1/search`.
 *
 * 🔴 QA de Portofino (14-10-2026, Nico: «estricto + otro buscador»). Para
 * UBICAR una dirección ya escrita (la carga de inmuebles, la consignación), no
 * para sugerir mientras se teclea: con 30 direcciones reales `/v1/autocomplete`
 * dejó 6 en OTRA calle a 1–3 km, y `/v1/search` encontró la vía correcta en 10
 * y la puerta exacta en 2. Devuelve hasta 3 resultados con la vía (`road`) y el
 * número (`houseNumber`) para que `ubicarDireccion` acepte sólo el que está
 * sobre la misma vía del inmueble.
 *
 * Mismos candados que `autocomplete`: límite por IP, sesión obligatoria, la
 * clave nunca sale del servidor, 503 sin clave, 502 si LocationIQ falla.
 */

import { NextRequest, NextResponse } from 'next/server';
import { normalizeAutocompleteResults } from '@/lib/api/geocode.normalize';
import { limitarLaRuta, POLITICAS_DE_LAS_RUTAS } from '@/lib/api/limite-de-la-ruta';
import { haySesionValida } from '@/lib/api/sesion-de-la-ruta';

export const runtime = 'nodejs';

const LOCATIONIQ_SEARCH_URL = 'https://us1.locationiq.com/v1/search';
const MIN_QUERY_LENGTH = 3;

export async function GET(req: NextRequest) {
  const demasiadas = limitarLaRuta(req, POLITICAS_DE_LAS_RUTAS.geocode);
  if (demasiadas) return demasiadas;

  if (!(await haySesionValida(req))) {
    return NextResponse.json({ error: 'sin_sesion' }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.LOCATIONIQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'geocoding_not_configured' }, { status: 503 });
  }

  const url = new URL(LOCATIONIQ_SEARCH_URL);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('q', q);
  url.searchParams.set('countrycodes', 'co');
  url.searchParams.set('limit', '3');
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('normalizecity', '1');
  url.searchParams.set('accept-language', 'es');

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
  return NextResponse.json({ results: normalizeAutocompleteResults(raw) });
}
