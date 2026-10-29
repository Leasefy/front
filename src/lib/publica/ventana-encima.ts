/**
 * «Publicar gratis» encima de la página donde está (Nico, 28-10-2026: «cuando uno le dé clic en publicar gratis el modal
 * debe aparecer ahí mismo, no lo tiene porque llevar a la otra pantalla hasta que seleccione qué es y cree la cuenta»).
 * La home y las internas son HTML sin React: `public/landing/js/conexion.js` abre `/publica/ventana` encima, en un
 * iframe transparente, y se hablan con estos mensajes (mismo origen).
 *
 * El marco se carga ANTES del clic (al pasar el mouse o enfocar «Publicar gratis») y se queda cargado al cerrar
 * (Nico 28-10: «eso se queda cargando horrible un rato»): por eso la ventana no se abre sola en el marco, espera a que
 * la página de atrás se lo pida.
 *
 *   marco → atrás   `MENSAJE_CARGADA`  ya cargó y puede abrir
 *   atrás → marco   `MENSAJE_ABRIR`    la persona hizo clic: ábrela (empieza por el principio)
 *   marco → atrás   `MENSAJE_LISTA`    ya está abierta: muéstrala
 *   marco → atrás   `MENSAJE_CERRADA`  la cerró: quita el velo (el marco se queda para la próxima)
 *   marco → atrás   `MENSAJE_IR`       creó la cuenta o entró: la página de atrás sigue a ese destino
 */
export const MENSAJE_CARGADA = 'leasefy:ventana-cargada';
export const MENSAJE_ABRIR = 'leasefy:abrir-ventana';
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

/** ¿Este mensaje es de la página de atrás pidiendo abrir la ventana? Sólo del mismo origen y de la ventana padre. */
export function esElPedidoDeAbrir(e: Pick<MessageEvent, 'origin' | 'source' | 'data'>, origen: string, padre: unknown): boolean {
  if (e.origin !== origen || e.source !== padre) return false;
  const datos = e.data as { tipo?: unknown } | null;
  return !!datos && typeof datos === 'object' && datos.tipo === MENSAJE_ABRIR;
}
