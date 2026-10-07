/**
 * Lo que la ruta `/api/csp-reporte` hace con un reporte de violación de la CSP:
 * normalizar los dos formatos y quitarle a cada URL lo que puede llevar
 * credenciales. Vive acá y no en `route.ts` (ARREGLOS-4, 03-10-2026): un
 * `route.ts` de Next sólo puede exportar los verbos (`POST`…) y su
 * configuración (`runtime`…); con estas exportaciones de más, `next build`
 * generaba tipos en `.next/types/` que rompían `tsc` (lo escondía
 * `ignoreBuildErrors`). Lo cuida `src/app/rutas-solo-exportan-lo-de-next.test.ts`.
 */

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
