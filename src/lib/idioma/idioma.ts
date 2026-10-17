/**
 * El idioma de la parte pública (Nico, 16-10-2026: «la landing debería tener un
 * ES/EN para cambiarla de idioma fácilmente, y hasta detectar el idioma del
 * sistema»). Las páginas públicas viven en `leasefy.co/es/...` y
 * `leasefy.co/en/...`; el panel no cambia de rutas.
 *
 * Sin 'use client': lo usan el middleware, el layout raíz y los componentes.
 */

export const IDIOMAS = ['es', 'en'] as const;
export type Idioma = (typeof IDIOMAS)[number];
export const IDIOMA_POR_DEFECTO: Idioma = 'es';

/** La que dice en qué idioma va la página (la pone el middleware en la petición). */
export const CABECERA_DEL_IDIOMA = 'x-idioma';
/** El idioma con el que la persona navegó la última vez (lo elige el selector o la URL). */
export const COOKIE_DEL_IDIOMA = 'leasefy-idioma';

/**
 * Las rutas públicas que llevan idioma en la URL. El resto (panel, auth,
 * /publicar, la API…) sigue como siempre, sin prefijo.
 */
const PUBLICAS = ['/propiedades', '/i', '/productos', '/contacto', '/avaluo', '/ayuda', '/terminos', '/privacidad', '/blog', '/para', '/pricing'];

export function esIdioma(valor: unknown): valor is Idioma {
  return valor === 'es' || valor === 'en';
}

/** ¿Esta ruta (sin prefijo de idioma) es de la parte pública? */
export function esRutaPublica(ruta: string): boolean {
  if (ruta === '/' || ruta === '') return true;
  return PUBLICAS.some((p) => ruta === p || ruta.startsWith(`${p}/`));
}

/** «/en/propiedades/1» → { idioma: 'en', ruta: '/propiedades/1' }; sin prefijo, idioma `null`. */
export function separarIdioma(ruta: string): { idioma: Idioma | null; ruta: string } {
  const m = /^\/(es|en)(?=\/|$)/.exec(ruta);
  if (!m) return { idioma: null, ruta };
  const resto = ruta.slice(m[0].length);
  return { idioma: m[1] as Idioma, ruta: resto || '/' };
}

/** «/propiedades» + 'en' → «/en/propiedades»; «/» + 'es' → «/es». Lo que no es público queda igual. */
export function conIdioma(ruta: string, idioma: Idioma): string {
  const { ruta: limpia } = separarIdioma(ruta);
  const [camino, ...extra] = limpia.split(/(?=[?#])/);
  if (!esRutaPublica(camino)) return limpia;
  return `/${idioma}${camino === '/' ? '' : camino}${extra.join('')}`;
}

/**
 * El idioma del navegador, de la cabecera `Accept-Language` («en-US,en;q=0.9,es;q=0.8»):
 * el primero que sea español o inglés según su peso; si no aparece ninguno, español.
 */
export function idiomaDelNavegador(acceptLanguage: string | null | undefined): Idioma {
  if (!acceptLanguage) return IDIOMA_POR_DEFECTO;
  const pedidos = acceptLanguage
    .split(',')
    .map((parte, orden) => {
      const [etiqueta, ...params] = parte.trim().split(';');
      const q = Number(params.find((x) => x.trim().startsWith('q='))?.trim().slice(2) ?? '1');
      return { base: etiqueta.trim().toLowerCase().split('-')[0], q: Number.isFinite(q) ? q : 0, orden };
    })
    .filter((p) => p.q > 0)
    .sort((a, b) => b.q - a.q || a.orden - b.orden);
  const elegido = pedidos.find((p) => esIdioma(p.base));
  return elegido ? (elegido.base as Idioma) : IDIOMA_POR_DEFECTO;
}

/** A qué idioma mandar una visita sin prefijo: lo que eligió antes, si no su navegador. */
export function idiomaParaLaVisita(cookie: string | null | undefined, acceptLanguage: string | null | undefined): Idioma {
  return esIdioma(cookie) ? cookie : idiomaDelNavegador(acceptLanguage);
}
