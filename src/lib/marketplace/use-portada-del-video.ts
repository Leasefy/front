'use client';

import { useEffect, useState } from 'react';

import { portadaDeYoutube, redDelEnlace } from './video';

/**
 * La portada del video tal como la muestra su red (Nico, 09-10-2026: «traer el
 * video o imagen de esa propiedad de esa red social»). YouTube sale del id;
 * TikTok se pregunta a su oEmbed público (responde a cualquier página). Lo que
 * no se puede (Instagram, Facebook, o si la red no contesta) devuelve `null` y
 * quien la usa pone la foto del inmueble.
 */
const deTiktok = new Map<string, Promise<string | null>>();

function portadaDeTiktok(enlace: string): Promise<string | null> {
  let p = deTiktok.get(enlace);
  if (!p) {
    p = fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(enlace)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { thumbnail_url?: unknown } | null) => (typeof d?.thumbnail_url === 'string' ? d.thumbnail_url : null))
      .catch(() => null);
    deTiktok.set(enlace, p);
  }
  return p;
}

export function usePortadaDelVideo(enlace: string | null | undefined): string | null {
  const deYoutube = portadaDeYoutube(enlace);
  const [tiktok, setTiktok] = useState<string | null>(null);
  useEffect(() => {
    if (!enlace || redDelEnlace(enlace) !== 'tiktok') return;
    let vigente = true;
    portadaDeTiktok(enlace.trim()).then((u) => vigente && setTiktok(u));
    return () => {
      vigente = false;
    };
  }, [enlace]);
  return deYoutube ?? tiktok;
}
