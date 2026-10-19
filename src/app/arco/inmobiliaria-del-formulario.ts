/**
 * A qué inmobiliaria va el formulario de Habeas Data (ARCO-1, Nico
 * 19-10-2026: «formulario por inmobiliaria»).
 *
 * El formulario vive en `/arco/<nombre corto o id>`: se lee con la página
 * pública del marketplace del back (`GET /marketplace/inmobiliarias/:nombre`,
 * que acepta las dos cosas) y el micro recibe su id en `agency_id`. Sin esto,
 * el micro sólo reconocía la inmobiliaria por la dirección web y ninguna tiene
 * una: el titular llenaba todo y al final leía «no está habilitado».
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export interface InmobiliariaDelFormulario {
  id: string;
  /** Su nombre corto (`/arco/<slug>`); `null` si no lo tiene. */
  slug: string | null;
  nombre: string;
  logoUrl: string | null;
  ciudad: string | null;
}

export type LecturaDeLaInmobiliaria =
  | { estado: 'ok'; inmobiliaria: InmobiliariaDelFormulario }
  | { estado: 'no-existe' }
  | { estado: 'sin-respuesta' };

function aInmobiliaria(x: unknown): InmobiliariaDelFormulario | null {
  if (!x || typeof x !== 'object') return null;
  const p = x as Record<string, unknown>;
  if (typeof p.id !== 'string' || typeof p.nombre !== 'string') return null;
  return {
    id: p.id,
    slug: typeof p.slug === 'string' && p.slug.trim() ? p.slug : null,
    nombre: p.nombre,
    logoUrl: typeof p.logoUrl === 'string' && p.logoUrl ? p.logoUrl : null,
    ciudad: typeof p.ciudad === 'string' && p.ciudad ? p.ciudad : null,
  };
}

/** La inmobiliaria de `/arco/<nombre>`. Un 404 del back es «no existe»; lo demás, «sin respuesta». */
export async function leerLaInmobiliaria(nombre: string): Promise<LecturaDeLaInmobiliaria> {
  try {
    const res = await fetch(`${BACKEND_URL}/marketplace/inmobiliarias/${encodeURIComponent(nombre)}`, {
      next: { revalidate: 300 },
    });
    if (res.status === 404) return { estado: 'no-existe' };
    if (!res.ok) return { estado: 'sin-respuesta' };
    const inmobiliaria = aInmobiliaria(await res.json());
    return inmobiliaria ? { estado: 'ok', inmobiliaria } : { estado: 'sin-respuesta' };
  } catch {
    return { estado: 'sin-respuesta' };
  }
}

/** Las inmobiliarias de Leasefy para elegir en `/arco`. `null` = el back no respondió. */
export async function listarLasInmobiliarias(): Promise<InmobiliariaDelFormulario[] | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/marketplace/inmobiliarias?limite=48`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const cuerpo = (await res.json()) as unknown;
    if (!Array.isArray(cuerpo)) return null;
    return cuerpo.map(aInmobiliaria).filter((x): x is InmobiliariaDelFormulario => x !== null);
  } catch {
    return null;
  }
}

/** La dirección del formulario de una inmobiliaria. */
export function rutaDelFormulario(i: { id: string; slug: string | null }): string {
  return `/arco/${encodeURIComponent(i.slug ?? i.id)}`;
}
