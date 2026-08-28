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
 *
 * ── Por qué se decide por bytes, no por header (T-0036) ──────────────────
 * `portofinopr.arrendasoft.co` sirve JPEGs genuinos rotulados
 * `application/octet-stream`; confiar en el `Content-Type` del origen hacía
 * fallar cada foto de ese CDN. El header lo elige quien responde — puede
 * mentir, a propósito o por config del CDN — así que acá sólo decide la firma
 * de los bytes (`firma-imagen.ts`). El header sigue filtrando ANTES de bajar
 * el cuerpo (sigue sin pedirse `text/html`, por ejemplo); `octet-stream` se
 * suma a esa lista porque es la etiqueta ambigua que puede ser cualquier
 * cosa, no una señal de que no es una imagen.
 */

import { NextRequest, NextResponse } from 'next/server';
import { traerConGuardia, FalloAlTraer } from '@/lib/inmuebles/traer-url';
import { detectarTipoDeImagenPorFirma } from '@/lib/inmuebles/firma-imagen';

export const runtime = 'nodejs';

/** El mismo tope que acepta el back. */
const MAX_IMAGEN_BYTES = 5 * 1024 * 1024;

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')?.trim() ?? '';

  if (!url) {
    return NextResponse.json({ error: 'falta_url' }, { status: 400 });
  }

  try {
    const { bytes, contentType } = await traerConGuardia(url, {
      maxBytes: MAX_IMAGEN_BYTES,
      // 'image/' cubre el caso normal. `application/octet-stream` se suma
      // porque es la etiqueta que usa el CDN real que motivó este cambio
      // (T-0036) — ambigua, no una declaración de que NO es una imagen.
      // Todo lo demás (text/html, application/json, …) se sigue rechazando
      // acá, antes de bajar un solo byte del cuerpo.
      tiposAceptados: ['image/', 'application/octet-stream'],
    });

    // La firma de los bytes manda, no el header: es lo único que el origen
    // no controla. Se sniffea sobre lo ya bajado (acotado a MAX_IMAGEN_BYTES
    // por `traerConGuardia`), nunca sobre una respuesta sin cotas.
    const tipo = detectarTipoDeImagenPorFirma(bytes);
    if (!tipo) {
      return NextResponse.json(
        { error: 'formato_no_soportado', tipoDeclarado: contentType.split(';')[0].trim().toLowerCase() },
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
