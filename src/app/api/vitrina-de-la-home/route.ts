import { NextResponse } from 'next/server';
import { armarVitrina, VITRINA_VACIA } from '@/lib/landing/vitrina-de-la-home';

/**
 * GET /api/vitrina-de-la-home — los inmuebles publicados para la franja de la
 * landing estática y el número junto a «Marketplace». Público como el catálogo
 * (`GET /properties`). Sin respuesta del back, la franja se queda sin tarjetas
 * (nunca se inventan). Ver `src/lib/landing/vitrina-de-la-home.ts`.
 */
export const revalidate = 300;

const SIN_CACHE = { 'Cache-Control': 'no-store' };

export async function GET() {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!base) return NextResponse.json(VITRINA_VACIA, { status: 503, headers: SIN_CACHE });
  try {
    const respuesta = await fetch(`${base}/properties?limit=60`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(6000),
    });
    if (!respuesta.ok) return NextResponse.json(VITRINA_VACIA, { status: 502, headers: SIN_CACHE });
    return NextResponse.json(armarVitrina(await respuesta.json()), {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json(VITRINA_VACIA, { status: 502, headers: SIN_CACHE });
  }
}
