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

export const runtime = 'nodejs';

/** Un reporte real pesa ~1 KB; `report-to` puede agrupar varios. */
export const TOPE_DEL_CUERPO = 32 * 1024;
/** Cuántas violaciones de un mismo envío se registran, como mucho. */
const MAX_POR_ENVIO = 20;

export interface ViolacionRegistrada {
  directiva: string;
  bloqueado: string;
  pagina: string;
  modo: string;
  muestra: string;
}

/** Deja sólo esquema + host + ruta: nada de `?token=` ni `#access_token=`. */
export function sinCredenciales(cruda: unknown): string {
  if (typeof cruda !== 'string' || !cruda) return '';
  // Valores especiales de la CSP: 'inline', 'eval', 'self', 'data', 'blob'…
  if (!cruda.includes('/')) return cruda.slice(0, 40);
  try {
    const u = new URL(cruda);
    if (u.protocol === 'data:' || u.protocol === 'blob:') return u.protocol;
    return `${u.origin}${u.pathname}`.slice(0, 300);
  } catch {
    return cruda.split(/[?#]/)[0].slice(0, 300);
  }
}

function texto(v: unknown, max: number): string {
  return typeof v === 'string' ? v.replace(/[\r\n\t]+/g, ' ').slice(0, max) : '';
}

/** Normaliza los dos formatos a una lista de violaciones sin credenciales. */
export function violacionesDelCuerpo(cuerpo: unknown): ViolacionRegistrada[] {
  const crudas: Record<string, unknown>[] = [];
  if (Array.isArray(cuerpo)) {
    for (const r of cuerpo) {
      if (r && typeof r === 'object' && (r as { type?: unknown }).type === 'csp-violation') {
        const b = (r as { body?: unknown }).body;
        if (b && typeof b === 'object') crudas.push(b as Record<string, unknown>);
      }
    }
  } else if (cuerpo && typeof cuerpo === 'object') {
    const r = (cuerpo as Record<string, unknown>)['csp-report'];
    if (r && typeof r === 'object') crudas.push(r as Record<string, unknown>);
  }
  return crudas.slice(0, MAX_POR_ENVIO).map((r) => ({
    directiva: texto(r.effectiveDirective ?? r['effective-directive'] ?? r['violated-directive'], 60),
    bloqueado: sinCredenciales(r.blockedURL ?? r['blocked-uri']),
    pagina: sinCredenciales(r.documentURL ?? r['document-uri']),
    modo: texto(r.disposition, 10) || 'desconocido',
    // `'report-sample'`: los primeros 40 caracteres del script bloqueado.
    muestra: texto(r.sample ?? r['script-sample'], 60),
  }));
}

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
