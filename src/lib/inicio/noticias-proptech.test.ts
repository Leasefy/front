import { describe, expect, it } from 'vitest';

import { CUANTAS_NOTICIAS, haceCuanto, leerNoticiasDelRss } from './noticias-proptech';

const AHORA = new Date('2026-10-29T22:00:00.000Z');

const item = (titulo: string, medio: string, fecha: string, url = `https://news.google.com/rss/articles/${encodeURIComponent(titulo)}`) => `
  <item>
    <title>${titulo} - ${medio}</title>
    <link>${url}</link>
    <pubDate>${fecha}</pubDate>
    <source url="https://medio.example">${medio}</source>
  </item>`;

describe('leerNoticiasDelRss', () => {
  it('quita el « - Medio» del titular, lo deja aparte y ordena de la más nueva a la más vieja', () => {
    const xml = `<rss><channel>
      ${item('Las proptech se juegan su papel', 'La Razón', 'Sun, 25 Oct 2026 08:00:00 GMT')}
      ${item('PropTech invisible: las soluciones que no se ven', 'Forbes Centroamérica', 'Thu, 29 Oct 2026 12:00:00 GMT')}
    </channel></rss>`;
    const noticias = leerNoticiasDelRss(xml, AHORA);
    expect(noticias.map((n) => n.titulo)).toEqual([
      'PropTech invisible: las soluciones que no se ven',
      'Las proptech se juegan su papel',
    ]);
    expect(noticias[0].medio).toBe('Forbes Centroamérica');
    expect(noticias[0].fecha).toBe('2026-10-29T12:00:00.000Z');
  });

  it('decodifica las entidades del XML', () => {
    const xml = item('Habi &amp; la IA: &quot;escala&quot;', 'El Ecosistema Startup', 'Mon, 19 Oct 2026 10:00:00 GMT');
    expect(leerNoticiasDelRss(xml, AHORA)[0].titulo).toBe('Habi & la IA: "escala"');
  });

  it('deja afuera las viejas (más de 90 días), las repetidas y las que no traen enlace https', () => {
    const xml = [
      item('Cinco proptech que revolucionan', 'Portafolio', 'Thu, 30 Jun 2022 10:00:00 GMT'),
      item('La misma noticia', 'Medio A', 'Mon, 26 Oct 2026 10:00:00 GMT'),
      item('La misma noticia', 'Medio A', 'Mon, 26 Oct 2026 11:00:00 GMT'),
      item('Sin enlace seguro', 'Medio B', 'Mon, 26 Oct 2026 10:00:00 GMT', 'javascript:alert(1)'),
    ].join('');
    expect(leerNoticiasDelRss(xml, AHORA).map((n) => n.titulo)).toEqual(['La misma noticia']);
  });

  it(`muestra como mucho ${CUANTAS_NOTICIAS}`, () => {
    const xml = Array.from({ length: 10 }, (_, i) => item(`Noticia ${i}`, 'Medio', `Mon, ${10 + i} Oct 2026 10:00:00 GMT`)).join('');
    expect(leerNoticiasDelRss(xml, AHORA)).toHaveLength(CUANTAS_NOTICIAS);
  });

  it('un XML roto o vacío no rompe nada: no hay noticias', () => {
    expect(leerNoticiasDelRss('<html>error</html>', AHORA)).toEqual([]);
    expect(leerNoticiasDelRss('', AHORA)).toEqual([]);
  });
});

describe('haceCuanto', () => {
  const hace = (ms: number) => new Date(AHORA.getTime() - ms).toISOString();
  it('en corto, del momento a la fecha', () => {
    expect(haceCuanto(hace(30_000), AHORA)).toBe('hace un momento');
    expect(haceCuanto(hace(20 * 60_000), AHORA)).toBe('hace 20 min');
    expect(haceCuanto(hace(3 * 3600_000), AHORA)).toBe('hace 3 h');
    expect(haceCuanto(hace(30 * 3600_000), AHORA)).toBe('ayer');
    expect(haceCuanto(hace(4 * 86_400_000), AHORA)).toBe('hace 4 días');
    expect(haceCuanto('2026-10-12T15:00:00.000Z', AHORA)).toBe('12 oct');
  });
});
