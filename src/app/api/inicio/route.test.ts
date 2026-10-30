/**
 * `/api/inicio` alimenta los widgets del inicio de sesión: el blog de Leasefy y los titulares de proptech. Es pública:
 * no puede traer nada de ninguna inmobiliaria, y si Google Noticias no responde el login no se entera.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';
import { blogPosts } from '@/lib/data/blog-posts';

const rss = `<rss><channel><item>
  <title>PropTech invisible - Forbes Centroamérica</title>
  <link>https://news.google.com/rss/articles/abc</link>
  <pubDate>${new Date(Date.now() - 3600_000).toUTCString()}</pubDate>
  <source url="https://forbes.example">Forbes Centroamérica</source>
</item></channel></rss>`;

afterEach(() => vi.restoreAllMocks());

describe('GET /api/inicio', () => {
  it('trae los artículos del blog (sin su texto) y los titulares de proptech', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(rss, { status: 200 })) as unknown as typeof fetch;
    const cuerpo = await (await GET()).json();
    expect(cuerpo.blog).toHaveLength(blogPosts.length);
    expect(Object.keys(cuerpo.blog[0]).sort()).toEqual(['categoria', 'fecha', 'href', 'imagen', 'titulo']);
    expect(cuerpo.blog[0].href).toMatch(/^\/blog\//);
    expect(cuerpo.noticias).toEqual([
      expect.objectContaining({ titulo: 'PropTech invisible', medio: 'Forbes Centroamérica' }),
    ]);
  });

  it('si Google Noticias no responde, igual entrega el blog y las noticias vacías', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed')) as unknown as typeof fetch;
    const respuesta = await GET();
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.noticias).toEqual([]);
    expect(cuerpo.blog.length).toBeGreaterThan(0);
  });
});
