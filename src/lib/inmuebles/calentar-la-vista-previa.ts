import { rutaDeLaImagen } from './vista-previa-del-inmueble';

/**
 * Deja armada la imagen de la vista previa ANTES de que alguien comparta el enlace (Nico, 27-10-2026: «la ficha
 * no está saliendo con la imagen, que es súper importante»). La imagen se arma la primera vez que se pide (traer el
 * inmueble, la foto y las fuentes) y en frío eso puede pasar del tiempo que WhatsApp espera: entonces la vista previa
 * sale sin foto y WhatsApp la guarda así. Pedirla aquí, con la MISMA dirección (`?v=` con el último cambio), la deja
 * en la CDN un día. Nunca frena ni avisa nada.
 */
export function calentarLaVistaPrevia(p: { id: string; updatedAt?: string | null }): void {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;
  try {
    void fetch(rutaDeLaImagen({ id: p.id, updatedAt: p.updatedAt ?? "" }), { mode: 'no-cors', keepalive: true, credentials: 'omit' }).catch(() => undefined);
  } catch {
    // sin red o sin fetch: no pasa nada
  }
}
