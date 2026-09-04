/**
 * El dibujo ÚNICO del cierre: chip redondo gris.
 *
 * Vive suelto en su propio módulo —y no dentro de `dialog.tsx`— por dos
 * razones. La primera es de peso: la pantalla de acceso también cierra, y no
 * tiene por qué arrastrar Radix Dialog entero para pintar un botón. La
 * segunda es la que importa: mientras el dibujo estuvo escrito adentro de la
 * primitiva del modal, cualquier pantalla que no fuera un modal se inventaba
 * el suyo. `/auth` llegó a mostrar un `XCircle` de trazo fino —un aro hueco
 * flotando, que no se lee como botón—; era el tercer dibujo del producto.
 *
 * El chip es gris y no transparente a propósito: un aspa sin fondo depende de
 * lo que tenga detrás para verse, y en una pantalla de mucho aire desaparece.
 *
 * Quien lo use pone adentro `<X size={16} weight="bold" aria-hidden />` y un
 * `aria-label` que empiece por «Cerrar»: así se cuenta y se anuncia igual en
 * todos lados (ver `una-sola-aspa.test.tsx`).
 */
export const ASPA_DE_CIERRE = [
  'inline-flex size-8 shrink-0 items-center justify-center rounded-full',
  'bg-surface-muted text-fg-muted transition-colors',
  'hover:bg-border hover:text-fg',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
].join(' ')
