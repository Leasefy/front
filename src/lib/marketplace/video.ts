/**
 * El video del inmueble (marketplace, Nico 09-10-2026): el enlace del video que
 * la inmobiliaria ya subió a Instagram, TikTok, YouTube o Facebook. La tarjeta
 * y la ficha lo abren en esa red; no hay integración con Meta.
 *
 * Espejo de `back/src/properties/dto/video-del-inmueble.ts`: las MISMAS redes,
 * los MISMOS dominios y la MISMA frase. Si cambias algo acá, cámbialo allá.
 */

export type RedDelVideo = 'instagram' | 'tiktok' | 'youtube' | 'facebook';

export const LARGO_MAXIMO_DEL_ENLACE = 500;

export const MENSAJE_DEL_VIDEO =
  'El enlace del video tiene que ser de Instagram, TikTok, YouTube o Facebook y empezar por https://.';

const DOMINIOS: Record<string, RedDelVideo> = {
  'instagram.com': 'instagram',
  'tiktok.com': 'tiktok',
  'youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'facebook.com': 'facebook',
  'fb.watch': 'facebook',
};

export const NOMBRE_DE_LA_RED: Record<RedDelVideo, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  facebook: 'Facebook',
};

/** La red del enlace, o `null` si no es un enlace https de una de las cuatro. */
export function redDelEnlace(valor: unknown): RedDelVideo | null {
  if (typeof valor !== 'string') return null;
  let url: URL;
  try {
    url = new URL(valor.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  const host = url.hostname.toLowerCase();
  for (const [dominio, red] of Object.entries(DOMINIOS)) {
    if (host === dominio || host.endsWith(`.${dominio}`)) return red;
  }
  return null;
}

/** El video del inmueble listo para pintar, o `null` si no tiene (o el enlace no sirve). */
export function videoDelInmueble(p: { videoUrl?: string | null }): { url: string; red: RedDelVideo } | null {
  const red = redDelEnlace(p.videoUrl);
  return red && p.videoUrl ? { url: p.videoUrl.trim(), red } : null;
}

/** Escribió algo y no es un enlace que sirva (vacío sí sirve: el video es opcional). */
export function videoInvalido(valor: string | null | undefined): boolean {
  const v = (valor ?? '').trim();
  return v.length > 0 && (v.length > LARGO_MAXIMO_DEL_ENLACE || !redDelEnlace(v));
}

/**
 * El reproductor OFICIAL de la red, para ponerlo dentro de nuestra ventana
 * (Nico, 09-10-2026: «reproductor propio, como tipo modal»). Las redes no
 * dejan bajar el archivo: se inserta su reproductor, que es lo permitido.
 * `null` si el enlace no dice qué video es (un enlace corto de TikTok, un
 * perfil): ese se abre en la red.
 */
export interface InsercionDelVideo {
  src: string;
  /** Vertical (reel, short, TikTok) o apaisado (un video de YouTube). */
  vertical: boolean;
}

function idDeYoutube(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  const limpio = (id: string | null | undefined) => (id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null);
  if (host === 'youtu.be' || host.endsWith('.youtu.be')) return limpio(url.pathname.split('/')[1]);
  const v = url.searchParams.get('v');
  if (v) return limpio(v);
  const [, tipo, id] = url.pathname.split('/');
  return ['shorts', 'embed', 'live'].includes(tipo) ? limpio(id) : null;
}

export function insercionDelVideo(enlace: string | null | undefined): InsercionDelVideo | null {
  const red = redDelEnlace(enlace);
  if (!red || !enlace) return null;
  const url = new URL(enlace.trim());
  const partes = url.pathname.split('/').filter(Boolean);
  switch (red) {
    case 'youtube': {
      const id = idDeYoutube(url);
      if (!id) return null;
      return {
        src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`,
        vertical: partes[0] === 'shorts',
      };
    }
    case 'tiktok': {
      const id = enlace.match(/\/video\/(\d{8,25})/)?.[1];
      return id ? { src: `https://www.tiktok.com/player/v1/${id}?autoplay=1&loop=1&rel=0&description=1`, vertical: true } : null;
    }
    case 'instagram': {
      const i = partes.findIndex((p) => ['p', 'reel', 'reels', 'tv'].includes(p));
      const codigo = i >= 0 ? partes[i + 1] : null;
      if (!codigo || !/^[A-Za-z0-9_-]+$/.test(codigo)) return null;
      const tipo = partes[i] === 'p' ? 'p' : 'reel';
      return { src: `https://www.instagram.com/${tipo}/${codigo}/embed/`, vertical: true };
    }
    case 'facebook':
      return {
        src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(enlace.trim())}&show_text=false&autoplay=true`,
        vertical: partes.includes('reel') || url.hostname.toLowerCase() === 'fb.watch',
      };
  }
}

/**
 * La portada del video que da la red sin pedir permisos: la de YouTube sale
 * del id. La de TikTok se pregunta a su oEmbed (`usePortadaDelVideo`); la de
 * Instagram y Facebook pide un permiso de Meta: ahí va la foto del inmueble.
 */
export function portadaDeYoutube(enlace: string | null | undefined): string | null {
  if (redDelEnlace(enlace) !== 'youtube' || !enlace) return null;
  const id = idDeYoutube(new URL(enlace.trim()));
  return id ? `https://i.ytimg.com/vi/${id}/hq720.jpg` : null;
}
