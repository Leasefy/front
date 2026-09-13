/**
 * El lado del navegador del service worker del inventario.
 *
 * El worker vive en `public/sw-inventario.js` (un archivo suelto: lo tiene
 * que servir el origen, no el bundler). Acá está lo que la pantalla necesita
 * para hablarle: cuándo registrarlo, qué archivos decirle que guarde y cómo
 * esperar la respuesta.
 *
 * 🔴 **Dónde se registra**: en producción, y en desarrollo SÓLO si
 * `NEXT_PUBLIC_SW_INVENTARIO=1`. Un service worker en cada `next dev` se
 * queda pegado al `localhost` de todo el equipo y sirve HTML viejo cuando uno
 * cambia de rama; eso cuesta más de lo que ayuda.
 */

/** ¿Este entorno registra el worker? */
export function debeRegistrarse(entorno: {
  nodeEnv?: string;
  activadoAMano?: string;
}): boolean {
  return entorno.nodeEnv === 'production' || entorno.activadoAMano === '1';
}

/** El archivo del worker. Con `scope: '/'` cubre la lista y la ficha. */
export const RUTA_DEL_WORKER = '/sw-inventario.js';

function hayServiceWorker(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

/**
 * Registra el worker si corresponde. Devuelve `false` cuando no se registró
 * —entorno equivocado, navegador sin soporte o el navegador lo rechazó—, y
 * NUNCA tira: que no haya worker deja la pantalla exactamente como estaba.
 */
export async function registrarServiceWorker(
  entorno: { nodeEnv?: string; activadoAMano?: string } = {
    nodeEnv: process.env.NODE_ENV,
    activadoAMano: process.env.NEXT_PUBLIC_SW_INVENTARIO,
  },
): Promise<boolean> {
  if (!debeRegistrarse(entorno) || !hayServiceWorker()) return false;
  try {
    await navigator.serviceWorker.register(RUTA_DEL_WORKER, {
      scope: '/',
      // Sin esto el navegador puede servir el worker desde SU caché HTTP
      // (hasta 24 h) y un despliegue nuevo tardaría un día en verse.
      updateViaCache: 'none',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Los archivos de código que ESTA pantalla cargó de verdad.
 *
 * Se lee del navegador en vez de listarlos a mano porque los nombres llevan
 * el hash del build: cualquier lista escrita acá quedaría vieja en el
 * despliegue siguiente.
 */
export function estaticosCargados(): string[] {
  if (typeof performance === 'undefined' || !performance.getEntriesByType) return [];
  return performance
    .getEntriesByType('resource')
    .map((e) => e.name)
    .filter((n) => n.includes('/_next/static/'));
}

/**
 * «Preparar para trabajar sin señal»: le pide al worker que guarde esta ruta
 * y su código. Devuelve `false` si no hay worker activo o si el guardado
 * falló — el botón dice la verdad en vez de prometer.
 */
export async function prepararRutaSinSenal(
  url: string,
  estaticos: string[] = estaticosCargados(),
): Promise<boolean> {
  if (!hayServiceWorker()) return false;
  try {
    const registro = await navigator.serviceWorker.ready;
    const activo = registro.active;
    if (!activo) return false;
    return await new Promise<boolean>((resolve) => {
      const canal = new MessageChannel();
      // Si el worker no contesta no se deja el botón girando para siempre.
      const reloj = setTimeout(() => resolve(false), 15_000);
      canal.port1.onmessage = (evento: MessageEvent) => {
        clearTimeout(reloj);
        resolve(Boolean((evento.data as { ok?: boolean } | null)?.ok));
      };
      activo.postMessage({ tipo: 'preparar', url, estaticos }, [canal.port2]);
    });
  } catch {
    return false;
  }
}
