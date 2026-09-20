import { useSyncExternalStore } from 'react';

/**
 * ¿React ya tomó el control de este HTML? `false` en el servidor y durante la
 * hidratación; `true` desde el primer render en el que los manejadores de
 * eventos existen.
 *
 * 🔴 Existe por el login (prueba en vivo, 2026-09-16): el HTML del servidor
 * llega antes que el JavaScript, y un `<form>` sin React detrás es un
 * formulario de 1995. Si alguien tocaba «Iniciar sesión» en ese hueco, el
 * navegador lo enviaba solo —GET a la misma URL— y dejaba el correo y la
 * contraseña en la barra, en el historial, en el log del servidor y en
 * cualquier proxy del camino. Los formularios con credenciales dejan el botón
 * de enviar apagado mientras esto sea `false`: con el botón por defecto
 * deshabilitado, el navegador tampoco envía al apretar Enter (envío implícito,
 * HTML §4.10.21.2).
 *
 * `useSyncExternalStore` y no un `useEffect` que prenda un estado: el
 * `getServerSnapshot` es el que se usa en el servidor Y al hidratar, así que
 * el HTML y el primer render del cliente coinciden (sin advertencia de
 * hidratación), y React vuelve a renderizar con `true` apenas termina. Un
 * árbol que se monta directo en el cliente —un modal, una prueba con
 * `createRoot`— arranca en `true` sin un render de más.
 */
export function useHidratado(): boolean {
  return useSyncExternalStore(sinSuscripcion, enElCliente, enElServidor);
}

/** No hay nada que escuchar: el valor cambia una sola vez, al hidratar. */
function sinSuscripcion(): () => void {
  return () => {};
}

function enElCliente(): boolean {
  return true;
}

function enElServidor(): boolean {
  return false;
}
