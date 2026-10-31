/**
 * De qué inmobiliaria es un host que no es de Leasefy (para el middleware). Pregunta al back
 * `GET /dominio-propio/:host` (público) y guarda la respuesta en memoria 5 minutos —también el «no es de nadie»,
 * para que un host desconocido no le pegue al back en cada petición—. Si el back no responde, se responde `null` y
 * la petición sigue como siempre: nunca se tumba una página por esto.
 */

import { normalizarDominio } from './dominio';

const CINCO_MINUTOS = 5 * 60 * 1000;
const UN_MINUTO = 60 * 1000;
const ESPERA_MAXIMA = 1500;

const memoria = new Map<string, { slug: string | null; vence: number }>();

export async function slugDelDominio(
  host: string,
  opciones: { backend?: string; ahora?: number; pedir?: typeof fetch } = {},
): Promise<string | null> {
  const h = normalizarDominio(host);
  const ahora = opciones.ahora ?? Date.now();
  const guardado = memoria.get(h);
  if (guardado && guardado.vence > ahora) return guardado.slug;

  const backend = (opciones.backend ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? '').replace(/\/+$/, '');
  if (!backend || !h) return null;
  const pedir = opciones.pedir ?? fetch;
  try {
    const control = new AbortController();
    const corte = setTimeout(() => control.abort(), ESPERA_MAXIMA);
    const res = await pedir(`${backend}/dominio-propio/${encodeURIComponent(h)}`, { signal: control.signal });
    clearTimeout(corte);
    if (res.status === 404) {
      memoria.set(h, { slug: null, vence: ahora + CINCO_MINUTOS });
      return null;
    }
    if (!res.ok) {
      // Una falla del back no se recuerda 5 minutos: se vuelve a preguntar pronto.
      memoria.set(h, { slug: null, vence: ahora + UN_MINUTO });
      return null;
    }
    const cuerpo = (await res.json()) as { slug?: unknown };
    const slug = typeof cuerpo.slug === 'string' && cuerpo.slug ? cuerpo.slug : null;
    memoria.set(h, { slug, vence: ahora + CINCO_MINUTOS });
    return slug;
  } catch {
    memoria.set(h, { slug: null, vence: ahora + UN_MINUTO });
    return null;
  }
}

/** Sólo para las pruebas. */
export function olvidarLosDominios(): void {
  memoria.clear();
}
