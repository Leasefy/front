/**
 * GET /api/inmuebles/imagen-remota?url=… — devuelve los bytes de una foto.
 *
 * Las fotos del inmueble viven en el CDN del portal o del CRM, y el back las
 * quiere como archivo subido (`POST /properties/:id/images`, multipart). El
 * navegador no puede bajarlas para reenviarlas: `fetch` a otro dominio sin CORS
 * devuelve una respuesta opaca, de la que no se pueden leer los bytes. Así que
 * pasan por acá, con la misma guardia que el HTML.
 *
 * El contrato del back manda los límites, no este archivo: jpg/png/webp y 5 MB
 * (ver `property-photos.ts`). Traer un GIF de 30 MB para que el back lo rechace
 * es gastar la conexión de la inmobiliaria en un no.
 */

import { NextRequest, NextResponse } from 'next/server';
import { traerConGuardia, FalloAlTraer } from '@/lib/inmuebles/traer-url';

export const runtime = 'nodejs';

/** El mismo tope que acepta el back. */
const MAX_IMAGEN_BYTES = 5 * 1024 * 1024;
const TIPOS_QUE_ACEPTA_EL_BACK = ['image/jpeg', 'image/png', 'image/webp'];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')?.trim() ?? '';

  if (!url) {
    return NextResponse.json({ error: 'falta_url' }, { status: 400 });
  }

  try {
    const { bytes, contentType } = await traerConGuardia(url, {
      maxBytes: MAX_IMAGEN_BYTES,
      tiposAceptados: ['image/'],
    });

    const tipo = contentType.split(';')[0].trim().toLowerCase();
    if (!TIPOS_QUE_ACEPTA_EL_BACK.includes(tipo)) {
      return NextResponse.json(
        { error: 'formato_no_soportado', tipo },
        { status: 415 },
      );
    }

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': tipo,
        'Content-Length': String(bytes.length),
        // Es contenido de terceros: que no lo cachee un intermediario nuestro.
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (err) {
    if (err instanceof FalloAlTraer) {
      return NextResponse.json({ error: err.motivo, mensaje: err.message }, { status: 502 });
    }
    return NextResponse.json({ error: 'no_responde' }, { status: 502 });
  }
}
