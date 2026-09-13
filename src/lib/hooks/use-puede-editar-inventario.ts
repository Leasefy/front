'use client';

/**
 * ¿Esta persona puede cargar el inventario de un inmueble?
 *
 * 🔴 Nico, 2026-09-13: «desde el contrato también debería de agregar todo lo
 * que se pueda agregar del inventario». Con el inventario en DOS pantallas, la
 * regla de quién edita tiene que ser UNA: si la ficha del contrato inventara
 * la suya, el mismo usuario editaría en un lado y miraría en el otro.
 *
 * La regla es la de la ficha del inmueble, donde el inventario vive: esa
 * página entera está detrás de `PageGuard module="portafolio"`, así que quien
 * la abre, edita. Acá se dice igual —`portafolio:view`— porque a la ficha del
 * contrato se entra con `contratos:view`, que es otro permiso: un rol que ve
 * contratos y no ve el portafolio mira el inventario, no lo toca.
 *
 * Dos matices, los dos copiados de `PageGuard`:
 *
 *  · **Sin señal no se le quita nada a nadie.** Los permisos salen de
 *    `GET /inmobiliaria/agency/my-permissions`; sin red esa llamada no vuelve
 *    y `canAccess` devuelve `false`, que acá significaría «mirá y no toques»
 *    justo dentro del apartamento sin señal, que es el caso para el que se
 *    hizo todo esto. No se pudo PREGUNTAR no es lo mismo que la respuesta fue
 *    NO, y no afloja ninguna frontera: lo que se escribe queda en el teléfono
 *    y la subida la sigue decidiendo el back con el JWT.
 *  · **Mientras carga, no.** Un `false` de `isLoading` es «todavía no sé», y
 *    ante la duda la tarjeta arranca de sólo lectura y se enciende cuando la
 *    respuesta llega. Al revés —ofrecer y retirar— sería peor.
 */

import { usePermissions } from '@/lib/hooks/usePermissions';
import { useSinSenal } from '@/lib/hooks/use-sin-senal';

export function usePuedeEditarInventario(): boolean {
  const { canAccess, isAdmin, isLoading } = usePermissions();
  const sinSenal = useSinSenal();

  if (sinSenal) return true;
  if (isLoading) return false;
  return isAdmin || canAccess('portafolio', 'view');
}
