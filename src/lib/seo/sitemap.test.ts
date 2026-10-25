import { describe, expect, it } from 'vitest';
import { entradasDelSitemap, inmueblesDelCatalogo } from './sitemap';

const S = 'https://leasefy.co';
const ahora = new Date('2026-10-24T12:00:00Z');

describe('el sitemap', () => {
  const e = entradasDelSitemap({ sitio: S, ahora, articulos: ['guia'], inmuebles: [{ id: 'a1', actualizado: '2026-10-20T00:00:00Z' }, { id: 'a1' }] });
  const urls = e.map((x) => x.url);

  it('sólo direcciones finales, con prefijo de idioma (la de sin prefijo redirige)', () => {
    for (const u of urls) expect(u).toMatch(/^https:\/\/leasefy\.co\/(es|en)(\/|$)/);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('la landing va en los dos idiomas con su par (hreflang recíproco)', () => {
    for (const ruta of ['', '/productos', '/productos/crm', '/productos/asegurabilidad', '/para/agentes', '/avaluo']) {
      const es = e.find((x) => x.url === `${S}/es${ruta}`)!;
      const en = e.find((x) => x.url === `${S}/en${ruta}`)!;
      expect(es, ruta).toBeTruthy();
      expect(en, ruta).toBeTruthy();
      expect(es.alternates?.languages).toEqual({ 'es-CO': `${S}/es${ruta}`, en: `${S}/en${ruta}`, 'x-default': `${S}/es${ruta}` });
      expect(en.alternates?.languages).toEqual(es.alternates?.languages);
    }
  });

  it('lo que existe sólo en español no declara un inglés', () => {
    for (const ruta of ['/propiedades', '/contacto', '/ayuda', '/blog', '/blog/guia', '/propiedades/a1']) {
      expect(urls).toContain(`${S}/es${ruta}`);
      expect(urls).not.toContain(`${S}/en${ruta}`);
    }
  });

  it('cada inmueble publicado una vez, con su fecha', () => {
    const fichas = e.filter((x) => x.url.includes('/propiedades/'));
    expect(fichas).toHaveLength(1);
    expect(fichas[0].lastModified).toEqual(new Date('2026-10-20T00:00:00Z'));
  });

  it('los precios viejos no se promueven', () => {
    expect(urls.some((u) => u.includes('/pricing'))).toBe(false);
  });

  it('del catálogo sólo lo disponible', () => {
    expect(inmueblesDelCatalogo({ data: [{ id: 'a', status: 'AVAILABLE', updatedAt: 'x' }, { id: 'b', status: 'RENTED' }, { nada: 1 }] })).toEqual([{ id: 'a', actualizado: 'x' }]);
    expect(inmueblesDelCatalogo(null)).toEqual([]);
  });
});
