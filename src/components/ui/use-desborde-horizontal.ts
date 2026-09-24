'use client'

import * as React from 'react'

/**
 * ¿El contenido de esta caja no cabe a lo ancho, y hacia dónde queda lo que no se ve?
 *
 * ── 🔴 20-09 · Por qué esto es del PRIMITIVO ────────────────────────────────
 *
 * Nico, con Contratos abierto en 1140 px: la tabla se corta en el borde
 * derecho y NADA lo dice. No hay barra visible (macOS la esconde hasta que se
 * hace el gesto), el último encabezado queda partido por la mitad y la única
 * pista es que la fila termina donde termina la tarjeta. Quien no sepa que la
 * tabla se corre nunca se enteró de que existía una columna más.
 *
 * Pasa en toda tabla ancha del producto —el libro mayor con quince columnas de
 * meses, los contratos, el balance de prueba—, así que el aviso no puede ser
 * una nota escrita a mano en la pantalla donde alguien se acordó: se mide en
 * `Table` y aparece solo, en las que desbordan y sólo mientras desbordan.
 *
 * ── Lo que se mide y cuándo ─────────────────────────────────────────────────
 *
 * `scrollWidth > clientWidth` con 1 px de tolerancia (los anchos subpíxel de
 * una tabla dan diferencias de 0,5 px que no son desborde). Se vuelve a medir
 * cuando cambia el tamaño de la caja Y cuando cambia el del contenido: una
 * tabla que carga sus filas después crece sin que la caja se mueva, y sin
 * observar al hijo el aviso nunca aparecía.
 *
 * En jsdom `scrollWidth` y `clientWidth` son 0, así que `desborda` es `false`
 * y el aviso no existe en las pruebas que no lo simulan a propósito. Eso es
 * deliberado: el aviso no debe cambiar el texto de mil pantallas ya probadas.
 */
export interface DesbordeHorizontal {
  /** El contenido es más ancho que la caja: hay algo que no se ve. */
  desborda: boolean
  /** Queda contenido a la izquierda (ya se corrió de ese lado). */
  haciaLaIzquierda: boolean
  /** Queda contenido a la derecha (todavía no se llegó al final). */
  haciaLaDerecha: boolean
}

const TOLERANCIA_PX = 1

export function useDesbordeHorizontal<T extends HTMLElement>(): DesbordeHorizontal & {
  ref: React.RefObject<T | null>
} {
  const ref = React.useRef<T>(null)
  const [estado, setEstado] = React.useState<DesbordeHorizontal>({
    desborda: false,
    haciaLaIzquierda: false,
    haciaLaDerecha: false,
  })

  React.useEffect(() => {
    const caja = ref.current
    if (!caja) return

    const medir = () => {
      const sobra = caja.scrollWidth - caja.clientWidth
      const desborda = sobra > TOLERANCIA_PX
      const haciaLaIzquierda = desborda && caja.scrollLeft > TOLERANCIA_PX
      const haciaLaDerecha = desborda && caja.scrollLeft < sobra - TOLERANCIA_PX
      setEstado((antes) =>
        antes.desborda === desborda &&
        antes.haciaLaIzquierda === haciaLaIzquierda &&
        antes.haciaLaDerecha === haciaLaDerecha
          ? antes
          : { desborda, haciaLaIzquierda, haciaLaDerecha },
      )
    }

    medir()
    caja.addEventListener('scroll', medir, { passive: true })

    /*
     * Dos observados, no uno. La caja cambia de ancho cuando cambia la ventana
     * o se abre el menú lateral; el contenido cambia cuando llegan las filas o
     * cuando se agrega una columna. Observar sólo la caja deja el segundo caso
     * —el más común, porque la tabla siempre carga después— sin medir.
     */
    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(medir)
      ro.observe(caja)
      if (caja.firstElementChild) ro.observe(caja.firstElementChild)
    }

    return () => {
      caja.removeEventListener('scroll', medir)
      ro?.disconnect()
    }
  }, [])

  return { ref, ...estado }
}
