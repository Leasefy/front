import { MetadataRoute } from 'next';
import { blogPosts } from '@/lib/data/blog-posts';
import { entradasDelSitemap, inmueblesDelCatalogo } from '@/lib/seo/sitemap';

/** El sitemap de leasefy.co: ver `src/lib/seo/sitemap.ts` (qué va, con qué idiomas y por qué). Se rehace cada hora. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || 'https://leasefy.co';
  let inmuebles: ReturnType<typeof inmueblesDelCatalogo> = [];
  const back = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (back) {
    try {
      const r = await fetch(`${back}/properties?limit=500`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) });
      if (r.ok) inmuebles = inmueblesDelCatalogo(await r.json());
    } catch {
      // sin el back, el sitemap sale igual con las páginas fijas
    }
  }
  return entradasDelSitemap({ sitio, articulos: blogPosts.map((p) => p.slug), inmuebles });
}
