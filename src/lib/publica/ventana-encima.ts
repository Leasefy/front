/**
 * «Publicar gratis» encima de la página donde está (Nico, 28-10-2026: «cuando uno le dé clic en publicar gratis el modal
 * debe aparecer ahí mismo, no lo tiene porque llevar a la otra pantalla hasta que seleccione qué es y cree la cuenta»).
 * La home y las internas son HTML sin React: `public/landing/js/conexion.js` abre `/publica/ventana` encima, en un
 * iframe transparente, y se hablan con estos mensajes (mismo origen).
 */
export const MENSAJE_LISTA = 'leasefy:ventana-lista';
export const MENSAJE_CERRADA = 'leasefy:ventana-cerrada';
export const MENSAJE_IR = 'leasefy:ir';

/** Sólo rutas de Leasefy (`/…`, nunca `//otro.sitio`): lo demás vuelve a `/publica`. */
export function destinoSeguro(a: string | null | undefined): string {
  if (!a || a.charAt(0) !== '/' || a.startsWith('//') || a.startsWith('/\\')) return '/publica';
  return a;
}

/** El destino de la ventana, pasando por la página que le dice a la de arriba a dónde ir. */
export function porLaVentana(destino: string): string {
  return `/publica/ventana/ir?a=${encodeURIComponent(destino)}`;
}
