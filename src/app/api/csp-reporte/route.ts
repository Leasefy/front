/**
 * Destino de los reportes de violación de la CSP (endurecimiento del navegador,
 * 23-09). Antes la política estaba en Report-Only SIN destino: el navegador
 * detectaba las violaciones y no se las contaba a nadie, así que nunca íbamos a
 * saber si se podía pasar a obligatoria.
 *
 * Acepta los dos formatos que mandan los navegadores:
 *   - `application/csp-report` (`report-uri`, el viejo): `{ "csp-report": {…} }`
 *   - `application/reports+json` (`report-to`, el nuevo): `[{ type, body }]`
 *
 * Qué hace con ellos: una línea por violación en el log del servidor, con lo
 * justo para arreglarla (directiva, qué se bloqueó, en qué página). Nada más:
 *   - es PÚBLICA (el navegador no manda sesión) → límite de intentos por IP y
 *     tope de tamaño del cuerpo;
 *   - las URLs se registran SIN query ni fragmento: varias pantallas llevan
 *     credenciales en la URL (enlaces de invitación, estados de cuenta públicos)
 *     y un reporte no puede ser la puerta por la que terminen en un log;
 *   - siempre responde 204: al navegador no le sirve otra cosa, y a quien
 *     tantea no le decimos nada.
 */

import { NextRequest, NextResponse } from 'next/server';
import { limitarLaRuta, POLITICAS_DE_LAS_RUTAS } from '@/lib/api/limite-de-la-ruta';
import { TOPE_DEL_CUERPO, violacionesDelCuerpo } from '@/lib/seguridad/reporte-de-la-csp';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const demasiadas = limitarLaRuta(req, POLITICAS_DE_LAS_RUTAS.reporteCsp);
  if (demasiadas) return demasiadas;

  const largo = Number(req.headers.get('content-length') ?? '0');
  if (largo > TOPE_DEL_CUERPO) return new NextResponse(null, { status: 413 });

  let crudo = '';
  try {
    crudo = await req.text();
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  // `content-length` puede faltar (chunked) o mentir: se mide lo leído.
  if (crudo.length > TOPE_DEL_CUERPO) return new NextResponse(null, { status: 413 });

  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(crudo);
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  for (const v of violacionesDelCuerpo(cuerpo)) {
    console.warn(
      `[csp] ${v.modo} ${v.directiva} bloqueó ${v.bloqueado || '(nada)'} en ${v.pagina || '(?)'}` +
        (v.muestra ? ` — «${v.muestra}»` : ''),
    );
  }
  return new NextResponse(null, { status: 204 });
}
