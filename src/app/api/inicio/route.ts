/**
 * GET /api/inicio — lo que muestran los widgets del inicio de sesión (Nico, 29-10-2026: «uno que sea widget de blogs
 * que vaya pasando entre blogs, otro de noticias sobre proptech, otro sobre novedades de nosotros y que tengan vida,
 * si doy clic que me lleven a algún lado»).
 *
 * Es público (el login no tiene sesión) y no toca nada de ninguna inmobiliaria: los artículos del blog de Leasefy
 * (sólo lo que el widget pinta, no el texto entero: el login no carga los 27 KB del blog) y los titulares de proptech
 * de Google Noticias. Se arma una vez por hora; si Google no responde, van las del blog solas y el widget de noticias
 * lleva a la búsqueda.
 */

import { NextResponse } from 'next/server';
import { blogPosts } from '@/lib/data/blog-posts';
import { leerNoticiasDelRss, RSS_DE_NOTICIAS_PROPTECH, type NoticiaProptech } from '@/lib/inicio/noticias-proptech';
import type { LoDelInicio } from '@/lib/inicio/lo-del-inicio';

export const revalidate = 3600;

export async function GET() {
  let noticias: NoticiaProptech[] = [];
  try {
    const respuesta = await fetch(RSS_DE_NOTICIAS_PROPTECH, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'LeasefyNoticias/1.0 (+https://leasefy.co)', Accept: 'application/rss+xml, application/xml' },
    });
    if (respuesta.ok) noticias = leerNoticiasDelRss(await respuesta.text());
  } catch {
    // Sin Google Noticias el login sigue igual: el widget de noticias lleva a la búsqueda.
  }

  const cuerpo: LoDelInicio = {
    blog: blogPosts.map((p) => ({ titulo: p.title, categoria: p.category, fecha: p.date, imagen: p.image, href: p.href })),
    noticias,
  };
  return NextResponse.json(cuerpo, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
