/**
 * El ancho de TODO menú de acciones («…» de una fila, de una tarjeta o de una
 * ficha). Nico, 10-10-2026, viendo el de Inmuebles: «ese menú que sea más
 * ancho, mira que es súper angosto» y «mira que ese menú quede igual de ancho
 * para el resto de tablas». Cada menú traía su ancho fijo (de 10 a 16rem) y un
 * rótulo largo partía en dos o tres renglones («Preparar para trabajar sin
 * señal»). Ahora miden lo que su rótulo más largo, desde 14rem, cada opción va
 * en un renglón y en el celular nunca pasan del ancho de la pantalla.
 */
export const ANCHO_DEL_MENU_DE_ACCIONES =
  "w-max min-w-[14rem] max-w-[calc(100vw-2rem)] [&_[role=menuitem]]:whitespace-nowrap"
