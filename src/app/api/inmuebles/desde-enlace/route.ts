/**
 * POST /api/inmuebles/desde-enlace — lee la ficha detrás de un enlace.
 *
 * Va del lado del servidor por dos razones, y las dos son inevitables:
 *  - El navegador no puede traer otro dominio (CORS). No es un rodeo: es que
 *    desde el cliente esto directamente no se puede hacer.
 *  - La guardia contra SSRF necesita resolver DNS y seguir las redirecciones a
 *    mano, y eso sólo existe en Node. Ver `traer-url.ts`.
 *
 * Devuelve 200 con lo que se pudo leer aunque falten campos: la pantalla
 * muestra qué falta y la persona lo completa. Un enlace que no se pudo leer
 * devuelve 200 con `{ ok: false, motivo }` — es el resultado de ESE enlace,
 * no un fallo de la petición, y quien pide manda varios a la vez.
 */

import { NextRequest, NextResponse } from 'next/server';
import { traerConGuardia, FalloAlTraer } from '@/lib/inmuebles/traer-url';
import { leerInmuebleDeHtml, loQueFalta } from '@/lib/inmuebles/leer-enlace';

export const runtime = 'nodejs';

const MAX_HTML_BYTES = 3 * 1024 * 1024;

/**
 * Una página puede venir en UTF-8 o en latin-1, y el `charset` del encabezado
 * a veces miente o no está. UTF-8 se verifica solo (hay secuencias de bytes
 * imposibles); 1252 acepta cualquier byte. Por eso 1252 va de último: si fuera
 * primero, «Bogotá» entraría como «BogotÃ¡» y nadie se enteraría.
 */
function decodificar(bytes: Uint8Array, contentType: string): string {
  const declarado = contentType.match(/charset=["']?([\w-]+)/i)?.[1]?.toLowerCase();

  if (declarado && declarado !== 'utf-8' && declarado !== 'utf8') {
    try {
      return new TextDecoder(declarado).decode(bytes);
    } catch {
      // Charset inventado por el sitio: seguimos con la deducción de abajo.
    }
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

export async function POST(req: NextRequest) {
  const cuerpo = await req.json().catch(() => null);
  const url = typeof cuerpo?.url === 'string' ? cuerpo.url.trim() : '';

  if (!url) {
    return NextResponse.json({ ok: false, motivo: 'url_invalida', mensaje: 'Falta el enlace.' });
  }

  try {
    const { bytes, contentType, urlFinal } = await traerConGuardia(url, {
      maxBytes: MAX_HTML_BYTES,
      tiposAceptados: ['text/html', 'application/xhtml'],
    });

    const html = decodificar(bytes, contentType);
    const inmueble = leerInmuebleDeHtml(html, urlFinal);

    return NextResponse.json({
      ok: true,
      inmueble,
      falta: loQueFalta(inmueble),
    });
  } catch (err) {
    if (err instanceof FalloAlTraer) {
      return NextResponse.json({ ok: false, motivo: err.motivo, mensaje: err.message });
    }
    return NextResponse.json({
      ok: false,
      motivo: 'no_responde',
      mensaje: 'No se pudo leer el enlace.',
    });
  }
}
