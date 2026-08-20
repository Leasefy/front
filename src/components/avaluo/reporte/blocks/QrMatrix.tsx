/**
 * QrMatrix.tsx — el QR del verificador, dibujado acá desde la matriz.
 *
 * El servidor manda `render.qr = { size, rows }` (`rows[y][x] === '1'` ⇒ módulo
 * oscuro), producida con el MISMO payload que el QR del PDF. La landing lo
 * dibuja con `<rect>`: **nunca inyecta SVG del servidor** — un `<svg>` ajeno
 * dentro de la página es HTML ajeno dentro de la página.
 *
 * Color: los módulos van en `currentColor` sobre un fondo de token. Un QR tiene
 * que ser oscuro-sobre-claro en los DOS temas para que cualquier cámara lo lea,
 * así que el par elegido es `bg-ink-fg` / `text-ink` (blanco / tinta), que
 * cadence define UNA sola vez y no invierte en oscuro — a diferencia de
 * `bg-surface`/`text-fg`, que en oscuro producirían un QR invertido. Es una
 * decisión de tokens, no un hex hardcoded.
 *
 * Zona de silencio: 4 módulos alrededor (lo que pide la norma) van dentro del
 * `viewBox`, así el margen escala con el QR y no depende del padding CSS.
 */

import type { ReportRenderQr } from '@/lib/avaluo/reporte/report-model'
import { cn } from '@/lib/utils'

export const QR_QUIET_ZONE = 4

export function QrMatrix({
  qr,
  label,
  className,
}: {
  qr: ReportRenderQr
  /** Texto para lector de pantalla. Obligatorio: la matriz sola no dice nada. */
  label: string
  className?: string
}) {
  const side = qr.size + QR_QUIET_ZONE * 2
  const dark: { x: number; y: number }[] = []
  qr.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] === '1') dark.push({ x, y })
    }
  })

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`${-QR_QUIET_ZONE} ${-QR_QUIET_ZONE} ${side} ${side}`}
      shapeRendering="crispEdges"
      data-qr-size={qr.size}
      className={cn('block h-auto w-full max-w-[12rem] rounded-sm bg-ink-fg text-ink', className)}
    >
      {dark.map(({ x, y }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
      ))}
    </svg>
  )
}
