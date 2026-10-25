import type { MetadataRoute } from 'next';
import { PRODUCTOS_DE_LAS_INTERNAS, PUBLICOS_DE_LAS_INTERNAS } from '@/lib/seguridad/politica-de-contenido';

/**
 * El sitemap (SEO, Nico 24-10-2026: «optimiza toda la landing para SEO, para que podamos aparecer en todo lado»;
 * reglas en la skill seo-experto). Sólo direcciones FINALES —con su prefijo de idioma; la de sin prefijo redirige—,
 * cada una con su par de idioma cuando de verdad existe en inglés:
 *   - la landing estática (home, productos, sus ocho módulos y los cuatro públicos): español e inglés;
 *   - avalúo: español e inglés;
 *   - marketplace, cada inmueble publicado, contacto, ayuda y blog: sólo español (en /en se ve lo mismo).
 * `/pricing` no va: los planes están apagados en el encabezado (VER_PLANES) y la página trae precios viejos.
 */
export type Entrada = MetadataRoute.Sitemap[number];

type Frecuencia = NonNullable<Entrada['changeFrequency']>;

export interface InmuebleDelSitemap {
  id: string;
  actualizado?: string | null;
}

export function urlDe(sitio: string, idioma: 'es' | 'en', ruta: string): string {
  return `${sitio}/${idioma}${ruta === '/' ? '' : ruta}`;
}

function bilingue(sitio: string, ruta: string, prioridad: number, frecuencia: Frecuencia, ahora: Date): Entrada[] {
  const languages = { 'es-CO': urlDe(sitio, 'es', ruta), en: urlDe(sitio, 'en', ruta), 'x-default': urlDe(sitio, 'es', ruta) };
  return (['es', 'en'] as const).map((idioma) => ({
    url: urlDe(sitio, idioma, ruta),
    lastModified: ahora,
    changeFrequency: frecuencia,
    priority: idioma === 'es' ? prioridad : Math.round(prioridad * 0.9 * 10) / 10,
    alternates: { languages },
  }));
}

function soloEspanol(sitio: string, ruta: string, prioridad: number, frecuencia: Frecuencia, fecha: Date): Entrada {
  return { url: urlDe(sitio, 'es', ruta), lastModified: fecha, changeFrequency: frecuencia, priority: prioridad };
}

export function entradasDelSitemap({
  sitio,
  ahora = new Date(),
  articulos = [],
  inmuebles = [],
}: {
  sitio: string;
  ahora?: Date;
  articulos?: readonly string[];
  inmuebles?: readonly InmuebleDelSitemap[];
}): MetadataRoute.Sitemap {
  const landing: Entrada[] = [
    ...bilingue(sitio, '/', 1, 'weekly', ahora),
    ...bilingue(sitio, '/productos', 0.9, 'monthly', ahora),
    ...PRODUCTOS_DE_LAS_INTERNAS.flatMap((p) => bilingue(sitio, `/productos/${p}`, 0.8, 'monthly', ahora)),
    ...PUBLICOS_DE_LAS_INTERNAS.flatMap((p) => bilingue(sitio, `/para/${p}`, 0.8, 'monthly', ahora)),
    ...bilingue(sitio, '/avaluo', 0.8, 'monthly', ahora),
  ];
  const publicas: Entrada[] = [
    soloEspanol(sitio, '/propiedades', 0.9, 'daily', ahora),
    soloEspanol(sitio, '/contacto', 0.6, 'yearly', ahora),
    soloEspanol(sitio, '/ayuda', 0.5, 'monthly', ahora),
    soloEspanol(sitio, '/blog', 0.6, 'weekly', ahora),
    ...articulos.map((slug) => soloEspanol(sitio, `/blog/${slug}`, 0.5, 'yearly', ahora)),
  ];
  const vistos = new Set<string>();
  const fichas: Entrada[] = [];
  for (const i of inmuebles) {
    if (!i.id || vistos.has(i.id)) continue;
    vistos.add(i.id);
    const fecha = i.actualizado ? new Date(i.actualizado) : ahora;
    fichas.push(soloEspanol(sitio, `/propiedades/${encodeURIComponent(i.id)}`, 0.7, 'weekly', Number.isNaN(fecha.getTime()) ? ahora : fecha));
  }
  return [...landing, ...publicas, ...fichas];
}

/** Los inmuebles publicados que van al sitemap: los disponibles de `GET /properties` (público). */
export function inmueblesDelCatalogo(respuesta: unknown): InmuebleDelSitemap[] {
  const lista = (respuesta as { data?: unknown } | null)?.data;
  if (!Array.isArray(lista)) return [];
  return lista
    .filter((p): p is { id: string; status?: string; updatedAt?: string } => !!p && typeof (p as { id?: unknown }).id === 'string')
    .filter((p) => !p.status || p.status === 'AVAILABLE')
    .map((p) => ({ id: p.id, actualizado: p.updatedAt ?? null }));
}
