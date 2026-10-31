/**
 * EL DOMINIO PROPIO DE LA INMOBILIARIA (Nico, 31-10-2026): «debemos de dar la posibilidad de que la inmobiliaria ponga
 * su propio dominio si quiere para que cuando lo comparta sea ese dominio y no el de leasefy». Decisiones: su página y
 * las fichas de sus inmuebles; sólo los planes de pago.
 *
 * 🔁 Espejo de `back/src/inmobiliaria/dominio-propio/dominio.ts` (la misma regla y las mismas frases). Pura: la usan
 * el formulario de Configuración, el middleware y los enlaces para compartir.
 */

/** Lo más largo que admite un nombre de dominio (RFC 1035). */
export const LARGO_MAXIMO_DEL_DOMINIO = 253;

const ETIQUETA = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

/** «https://WWW.Loza.com.co/inmuebles» → «www.loza.com.co». Sin protocolo, ruta, puerto ni punto final. */
export function normalizarDominio(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/[/?#].*$/, '')
    .replace(/:\d+$/, '')
    .replace(/\.+$/, '');
}

/** El host es de Leasefy (o de una prueba local): nunca se toma como dominio de una inmobiliaria. */
export function esHostDeLeasefy(host: string | null | undefined): boolean {
  const h = normalizarDominio(host ?? '');
  if (!h) return true;
  if (h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || /^\d+\.\d+\.\d+\.\d+$/.test(h)) return true;
  return (
    h === 'leasefy.co' ||
    h.endsWith('.leasefy.co') ||
    h.endsWith('.vercel.app') ||
    h.endsWith('.amazonaws.com') ||
    h.endsWith('.cloudfront.net') ||
    h.endsWith('.amplifyapp.com')
  );
}

/** Qué tiene mal el dominio escrito, en una frase; `null` si sirve. */
export function problemaDelDominio(texto: string): string | null {
  const d = normalizarDominio(texto);
  if (!d) return 'Escribe tu dominio, por ejemplo inmuebles.tuinmobiliaria.com.';
  if (d.length > LARGO_MAXIMO_DEL_DOMINIO) return 'Ese dominio es demasiado largo.';
  const etiquetas = d.split('.');
  if (etiquetas.length < 2 || etiquetas.some((e) => !ETIQUETA.test(e)) || /^\d+$/.test(etiquetas[etiquetas.length - 1]))
    return 'Ese no parece un dominio: escríbelo como inmuebles.tuinmobiliaria.com, sin espacios ni tildes.';
  if (esHostDeLeasefy(d)) return 'Ese dominio es de Leasefy: escribe el de tu inmobiliaria.';
  return null;
}

/**
 * Qué se sirve en el dominio de la inmobiliaria. Su inicio es su página (`/i/<slug>`); las fichas de los inmuebles y
 * lo que la página necesita para pintarse (imágenes, `_next`, la API de Next) pasan igual. Lo demás —el panel, entrar,
 * el marketplace de Leasefy— vive en leasefy.co.
 */
export type DestinoEnElDominio =
  | { tipo: 'reescribir'; ruta: string }
  | { tipo: 'seguir' }
  | { tipo: 'a-leasefy'; ruta: string };

export function destinoEnElDominioPropio(ruta: string, slug: string): DestinoEnElDominio {
  const sinIdioma = ruta.replace(/^\/(es|en)(?=\/|$)/, '') || '/';
  if (sinIdioma === '/' || sinIdioma === `/i/${slug}`) return { tipo: 'reescribir', ruta: `/i/${slug}` };
  if (sinIdioma.startsWith('/propiedades/')) return { tipo: 'reescribir', ruta: sinIdioma };
  if (
    ruta.startsWith('/_next/') ||
    ruta.startsWith('/api/') ||
    ruta.startsWith('/imagenes/') ||
    ruta.startsWith('/ilustraciones/') ||
    ruta === '/favicon.ico' ||
    ruta === '/robots.txt' ||
    /\.[a-z0-9]{2,5}$/i.test(ruta)
  )
    return { tipo: 'seguir' };
  return { tipo: 'a-leasefy', ruta };
}

/** El enlace público de una ficha: en el dominio de la inmobiliaria si lo tiene activo; si no, el de siempre. */
export function enlaceDeLaFichaEn(origen: string, propertyId: string, dominioActivo?: string | null): string {
  const base = dominioActivo ? `https://${normalizarDominio(dominioActivo)}` : origen.replace(/\/+$/, '');
  return `${base}/propiedades/${propertyId}`;
}
