/**
 * GET /api/og/inmueble/:id — la imagen (1200 × 630) que sale al compartir el
 * enlace de un inmueble: la tarjeta del diseño A que eligió Nico el
 * 21-10-2026. La pide `metadataDeLaVistaPrevia` (og:image y twitter:image).
 *
 * Pública (WhatsApp, Facebook e iMessage la piden sin sesión), con techo por
 * IP y guardada un día en la CDN. Sólo lee lo que la ficha pública ya muestra.
 * Si algo falla, manda la imagen genérica de Leasefy: mejor esa que ninguna.
 */

import { ImageResponse } from 'next/og';
import { NextResponse, type NextRequest } from 'next/server';

import { limitarLaRuta, POLITICAS_DE_LAS_RUTAS } from '@/lib/api/limite-de-la-ruta';
import {
  datosDeLaTarjeta,
  enJpeg,
  fotoDeFondo,
  fuentesDeLaMarca,
  logoDeLaInmobiliaria,
  TarjetaDeLaVistaPrevia,
} from '@/lib/inmuebles/imagen-de-la-vista-previa';
import {
  ALTO_DE_LA_IMAGEN,
  ANCHO_DE_LA_IMAGEN,
  paraCompartir,
  pedirInmobiliariaDeLaVistaPrevia,
  pedirInmuebleParaLaVistaPrevia,
  primeraFoto,
} from '@/lib/inmuebles/vista-previa-del-inmueble';

export const runtime = 'nodejs';

/** WhatsApp espera unos segundos; el inmueble tiene un poco más que en la página. */
const ESPERA_DEL_INMUEBLE_MS = 3000;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const demasiadas = limitarLaRuta(req, POLITICAS_DE_LAS_RUTAS.vistaPrevia);
  if (demasiadas) return demasiadas;

  const { id } = await params;
  const inmueble = await pedirInmuebleParaLaVistaPrevia(id, ESPERA_DEL_INMUEBLE_MS);
  if (!inmueble) return NextResponse.json({ error: 'no_encontrado' }, { status: 404 });

  try {
    const inmobiliaria = await pedirInmobiliariaDeLaVistaPrevia(inmueble.agencyId);
    const [foto, logo, fuentes] = await Promise.all([
      fotoDeFondo(primeraFoto(inmueble)),
      logoDeLaInmobiliaria(inmobiliaria?.logoUrl),
      fuentesDeLaMarca(),
    ]);
    const datos = datosDeLaTarjeta({ ...paraCompartir(inmueble), tipo: inmueble.type }, inmobiliaria?.nombre ?? null);
    const png = new ImageResponse(<TarjetaDeLaVistaPrevia datos={datos} foto={foto} logo={logo} />, {
      width: ANCHO_DE_LA_IMAGEN,
      height: ALTO_DE_LA_IMAGEN,
      fonts: fuentes,
    });
    // En JPEG: el PNG de una foto pesa ~900 KB y WhatsApp descarta la vista previa pesada.
    const jpg = await enJpeg(Buffer.from(await png.arrayBuffer()));
    return new NextResponse(new Uint8Array(jpg), {
      headers: {
        'Content-Type': 'image/jpeg',
        // La dirección lleva `?v=` con la fecha del último cambio: guardarla un día no deja nada viejo.
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return NextResponse.redirect(new URL('/opengraph-image', req.url), 307);
  }
}
