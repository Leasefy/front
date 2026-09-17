/**
 * La última respuesta de `GET …/inventarios` guardada en este navegador.
 *
 * Con ella la sección del inventario se arma SIN SEÑAL: en el apartamento
 * no hay back a quién preguntar qué versión está vigente ni qué tiene el
 * borrador. Es la red de seguridad, nunca la fuente: con señal siempre manda
 * el back. `localStorage` y no IndexedDB porque es un JSON chico que se lee al
 * montar, y no obliga a subir la versión de la base local.
 */
import type { InventariosDelInmueble } from '@/lib/types/inventario-del-inmueble';

const PREFIJO = 'leasefy:inventarios:';

export function guardarInventariosEnCache(datos: InventariosDelInmueble): void {
  try {
    window.localStorage.setItem(`${PREFIJO}${datos.consignacionId}`, JSON.stringify(datos));
  } catch {
    /* Sin espacio o sin localStorage: con señal todo funciona igual. */
  }
}

export function leerInventariosDeCache(consignacionId: string): InventariosDelInmueble | null {
  try {
    const crudo = window.localStorage.getItem(`${PREFIJO}${consignacionId}`);
    if (!crudo) return null;
    const datos = JSON.parse(crudo) as InventariosDelInmueble;
    return datos && datos.consignacionId === consignacionId && Array.isArray(datos.versiones)
      ? datos
      : null;
  } catch {
    return null;
  }
}

/**
 * «Preparar para trabajar sin señal» desde la LISTA del portafolio no pasa
 * por la ficha, así que nadie guardaría las versiones: se bajan acá. Nunca
 * hace fallar la preparación —sin la migración del back o sin respuesta, la
 * ficha sin señal monta la tarjeta de siempre, que sigue funcionando—.
 * Devuelve si quedaron guardadas.
 */
export async function bajarInventariosParaSinSenal(
  consignacionId: string,
  listar: (consignacionId: string) => Promise<InventariosDelInmueble>,
): Promise<boolean> {
  try {
    const datos = await listar(consignacionId);
    if (!datos.disponible) return false;
    guardarInventariosEnCache(datos);
    return true;
  } catch {
    return false;
  }
}
