/**
 * Las noticias de proptech del widget del inicio de sesión (Nico, 29-10-2026: «otro de noticias sobre proptech […] y
 * que tengan vida, si doy clic que me lleven a algún lado»).
 *
 * Salen del RSS público de Google Noticias en español de Latinoamérica: titulares reales con su enlace y su medio.
 * Nada se inventa ni se reescribe: se limpia el « - Medio» del final del titular (va aparte), se ordena de la más
 * nueva a la más vieja, se dejan las de los últimos `DIAS_HACIA_ATRAS` días y se quitan las repetidas.
 */

export const RSS_DE_NOTICIAS_PROPTECH =
  'https://news.google.com/rss/search?q=proptech%20when%3A90d&hl=es-419&gl=CO&ceid=CO:es-419';

/** Cuántas se muestran y hasta qué tan viejas. */
export const CUANTAS_NOTICIAS = 6;
export const DIAS_HACIA_ATRAS = 90;

export interface NoticiaProptech {
  titulo: string;
  medio: string | null;
  url: string;
  /** ISO 8601. */
  fecha: string;
}

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodificar(texto: string): string {
  return texto
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTIDADES[n.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

function campo(item: string, etiqueta: string): string | null {
  const m = new RegExp(`<${etiqueta}\\b[^>]*>([\\s\\S]*?)</${etiqueta}>`, 'i').exec(item);
  return m ? decodificar(m[1]) : null;
}

/** Lee el RSS y devuelve las noticias listas para el widget (vacío si el XML no trae nada legible). */
export function leerNoticiasDelRss(xml: string, ahora: Date = new Date()): NoticiaProptech[] {
  const desde = ahora.getTime() - DIAS_HACIA_ATRAS * 24 * 60 * 60 * 1000;
  const vistas = new Set<string>();
  const noticias: NoticiaProptech[] = [];

  for (const [, item] of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const tituloCrudo = campo(item, 'title');
    const url = campo(item, 'link');
    const fecha = new Date(campo(item, 'pubDate') ?? '');
    if (!tituloCrudo || !url || !/^https:\/\//.test(url) || Number.isNaN(fecha.getTime())) continue;
    if (fecha.getTime() < desde || fecha.getTime() > ahora.getTime() + 24 * 60 * 60 * 1000) continue;

    const medio = campo(item, 'source');
    // Google pone « - Medio» al final del titular; el medio va aparte.
    const titulo =
      medio && tituloCrudo.endsWith(` - ${medio}`) ? tituloCrudo.slice(0, -(medio.length + 3)).trim() : tituloCrudo;
    const clave = titulo.toLowerCase();
    if (!titulo || vistas.has(clave)) continue;
    vistas.add(clave);
    noticias.push({ titulo, medio, url, fecha: fecha.toISOString() });
  }

  return noticias.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, CUANTAS_NOTICIAS);
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Hace cuánto salió, en corto: «hace 20 min», «hace 3 h», «ayer», «hace 4 días» o «12 oct». */
export function haceCuanto(iso: string, ahora: Date = new Date()): string {
  const fecha = new Date(iso);
  const minutos = Math.max(0, Math.round((ahora.getTime() - fecha.getTime()) / 60_000));
  if (minutos < 60) return minutos <= 1 ? 'hace un momento' : `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  const enBogota = new Date(fecha.getTime() - 5 * 60 * 60 * 1000);
  return `${enBogota.getUTCDate()} ${MESES[enBogota.getUTCMonth()]}`;
}
