/**
 * El dibujo ÚNICO del cierre: círculo con borde fino (Nico, 02-10-2026: «una
 * ✕ dentro de un círculo con borde»). Es el mismo que pinta Cadence en su
 * `DialogCloseButton` (`dialogCloseClassName`).
 *
 * Vive suelto en su propio módulo —y no dentro de `dialog.tsx`— por dos
 * razones. La primera es de peso: la pantalla de acceso también cierra, y no
 * tiene por qué arrastrar Radix Dialog entero para pintar un botón. La
 * segunda es la que importa: mientras el dibujo estuvo escrito adentro de la
 * primitiva del modal, cualquier pantalla que no fuera un modal se inventaba
 * el suyo. `/auth` llegó a mostrar un `XCircle` de trazo fino —un aro hueco
 * flotando, que no se lee como botón—; era el tercer dibujo del producto.
 *
 * El círculo lleva fondo de superficie (no transparente) a propósito: sobre
 * una foto o un fondo de color sigue leyéndose como botón. Nada de
 * `surface-muted`: en oscuro es un gris cálido, amarillento sobre el negro.
 *
 * Quien lo use pone adentro `<X size={16} weight="bold" aria-hidden />` y un
 * `aria-label` que empiece por «Cerrar»: así se cuenta y se anuncia igual en
 * todos lados (ver `una-sola-aspa.test.tsx`).
 */
export const ASPA_DE_CIERRE = [
  'inline-flex size-9 shrink-0 items-center justify-center rounded-full',
  'border border-border bg-surface text-fg-muted transition-colors',
  'hover:border-border-strong hover:bg-surface-hover hover:text-fg',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
].join(' ')
