'use client'

/**
 * ReportPrintOpener — «plegado ≠ ausente» también en papel, con JS.
 *
 * `report-print.css` abre los `<details>` por CSS (incluido `::details-content`
 * para Chrome ≥ 131), pero un motor sin ese pseudo-elemento imprime el resumen
 * ejecutivo vacío. Esta isla no pinta nada: en `beforeprint` abre todos los
 * `<details>` cerrados del informe y en `afterprint` los devuelve a como estaban.
 * Sin estado React, sin re-render, y sin efecto en pantalla.
 */

import { useEffect } from 'react'

export function ReportPrintOpener() {
  useEffect(() => {
    let opened: HTMLDetailsElement[] = []
    const before = () => {
      opened = Array.from(
        document.querySelectorAll<HTMLDetailsElement>('#main-content details:not([open])'),
      )
      for (const d of opened) d.open = true
    }
    const after = () => {
      for (const d of opened) d.open = false
      opened = []
    }
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [])
  return null
}
