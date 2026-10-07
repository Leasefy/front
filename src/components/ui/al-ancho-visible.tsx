"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Lo de adentro ocupa el ancho QUE SE VE de la tabla, pegado a su borde
 * izquierdo (ARREGLOS-4, 03-10-2026).
 *
 * El vacío de una tabla vive DENTRO del `<TableBody>` (una fila con `colSpan`)
 * para que los encabezados digan qué columnas tiene. Pero a 390 px la tabla
 * mide más que la pantalla (Documentos: 616 px; Actas: 919) y la celda del
 * vacío mide lo que la tabla: el «Todavía no generaste ningún documento»
 * quedaba centrado en 616 px, cortado a la derecha, con su botón afuera.
 *
 * Esto busca el contenedor que se desplaza de lado (el `overflow-auto` de
 * `Table`), toma su ancho visible y se pega a la izquierda (`sticky left-0`):
 * el vacío se ve entero, centrado en lo visible, y se queda quieto si alguien
 * corre la tabla. Cuando la tabla cabe, el ancho visible ES el de la tabla y
 * nada cambia.
 */
export function AlAnchoVisible({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [ancho, setAncho] = React.useState<number | null>(null)

  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    let caja = el.parentElement
    while (caja && !/(auto|scroll)/.test(getComputedStyle(caja).overflowX)) caja = caja.parentElement
    if (!caja) return
    const visible = caja
    const medir = () => setAncho(visible.clientWidth || null)
    medir()
    if (typeof ResizeObserver === "undefined") return
    const observador = new ResizeObserver(medir)
    observador.observe(visible)
    return () => observador.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      data-al-ancho-visible=""
      className={cn("sticky left-0", className)}
      style={ancho ? { width: ancho } : undefined}
    >
      {children}
    </div>
  )
}
